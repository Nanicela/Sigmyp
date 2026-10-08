import { where, orderBy, limit, startAfter, Timestamp } from 'firebase/firestore';
export function colombiaDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Revisa las fechas seleccionadas.');
  const ms = Date.parse(value+'T00:00:00-05:00');
  if (!Number.isFinite(ms) || new Date(ms-5*3600000).toISOString().slice(0,10)!==value) throw new Error('La fecha no es válida.');
  return ms;
}
export function normalizeFilters(raw) {
  const from = raw.from || '', to = raw.to || '', kind = raw.kind || '', buyer = (raw.buyer || '').trim();
  const lower = from ? colombiaDay(from) : null, upper = to ? colombiaDay(to)+86400000 : null;
  if (lower !== null && upper !== null && lower >= upper) throw new Error('La fecha Desde no puede ser posterior a Hasta.');
  if (kind && !['INVOICE','CREDIT_NOTE','DEBIT_NOTE'].includes(kind)) throw new Error('Tipo de documento no válido.');
  if (buyer && !/^[0-9]{5,15}$/.test(buyer)) throw new Error('Usa la identificación completa del comprador, sin puntos ni guiones.');
  return { from,to,kind,buyer,lower,upper };
}
export function documentConstraints(filters, cursor = null, size = 25) {
  const clauses = [];
  if (filters.kind) clauses.push(where('kind','==',filters.kind));
  if (filters.buyer) clauses.push(where('buyer.identification','==',filters.buyer));
  if (filters.lower !== null) clauses.push(where('createdAt','>=',Timestamp.fromMillis(filters.lower)));
  if (filters.upper !== null) clauses.push(where('createdAt','<',Timestamp.fromMillis(filters.upper)));
  clauses.push(orderBy('createdAt','desc'));
  if(cursor) clauses.push(startAfter(cursor));
  clauses.push(limit(size+1));
  return clauses;
}
export function formatCreated(value) {
  return value?.toDate ? new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',dateStyle:'medium',timeStyle:'short'}).format(value.toDate()) : 'Fecha no disponible';
}
