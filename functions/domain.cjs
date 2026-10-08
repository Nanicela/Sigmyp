// Cálculo preliminar COP: enteros escalados, sin coma flotante.
// Descuentos efectivos por línea e IVA diferenciado; no genera UBL.
class ValidationError extends Error {}
function text(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    throw new ValidationError(`${label}: ingresa entre 1 y ${max} caracteres.`);
  return value.trim();
}
function identifier(value, label = 'Identificación') {
  const v = text(value, label, 15);
  if (!/^[0-9]{5,15}$/.test(v)) throw new ValidationError(`${label}: usa entre 5 y 15 dígitos, sin puntos ni guiones.`);
  return v;
}
function pathId(value) {
  const v = text(value, 'Identificador', 80);
  if (!/^[a-zA-Z0-9_-]+$/.test(v)) throw new ValidationError('Identificador inválido.');
  return v;
}
function scaled(value, places, max, label) {
  if (typeof value !== 'string' || value.length > 24 || !/^[0-9]+(?:\.[0-9]+)?$/.test(value))
    throw new ValidationError(`${label}: ingresa un decimal con punto, sin separadores de miles.`);
  const [integer, fraction = ''] = value.split('.');
  if (fraction.length > places) throw new ValidationError(`${label}: máximo ${places} decimales.`);
  const n = BigInt(integer + fraction.padEnd(places, '0'));
  if (n <= 0n || n > max) throw new ValidationError(`${label}: valor fuera de rango.`);
  return n;
}
function money(cents) { return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`; }
function round(n, divisor) { return (n + divisor / 2n) / divisor; }
function calculate(lines) {
  if (!Array.isArray(lines) || !lines.length || lines.length > 100) throw new ValidationError('Agrega entre 1 y 100 conceptos.');
  let subtotal = 0n, tax = 0n, gross = 0n, discount = 0n;
  const result = lines.map(line => {
    if (!line || typeof line !== 'object') throw new ValidationError('Concepto inválido.');
    const description = text(line.description, 'Descripción');
    const q = scaled(line.quantity, 4, 10000000000n, 'Cantidad');
    const p = scaled(line.unit_price, 2, 10000000000000n, 'Precio unitario');
    const enhanced = line.discount_rate !== undefined || line.tax_treatment !== undefined || ['EXEMPT','EXCLUDED','NOT_SUBJECT'].includes(line.iva_rate);
    const treatment = line.tax_treatment || (['EXEMPT','EXCLUDED','NOT_SUBJECT'].includes(line.iva_rate) ? line.iva_rate : 'TAXED');
    const rate = treatment === 'TAXED' ? line.iva_rate : '0';
    if (!['TAXED','EXEMPT','EXCLUDED','NOT_SUBJECT'].includes(treatment) || (treatment === 'TAXED' && !['5','19'].includes(rate)) || (treatment !== 'TAXED' && !['0',treatment].includes(line.iva_rate)))
      throw new ValidationError('Selecciona un tratamiento de IVA válido.');
    const rawDiscount = line.discount_rate === undefined ? '0' : line.discount_rate;
    if (typeof rawDiscount !== 'string' || !/^[0-9]{1,3}(\.[0-9]{1,2})?$/.test(rawDiscount)) throw new ValidationError('Descuento: usa un porcentaje de 0 a 100 con hasta dos decimales.');
    const [di, df=''] = rawDiscount.split('.'), bp = BigInt(di + df.padEnd(2,'0'));
    if(bp > 10000n) throw new ValidationError('El descuento no puede superar el 100 %.');
    const before = round(q * p, 10000n), reduction = round(before * bp, 10000n), base = before - reduction, iva = round(base * BigInt(rate), 100n);
    if (before === 0n) throw new ValidationError('El concepto debe valer al menos $0,01 antes del descuento.');
    gross += before; discount += reduction;
    subtotal += base; tax += iva;
    return { description, quantity: `${q / 10000n}.${String(q % 10000n).padStart(4, '0')}`, unit_price: money(p), iva_rate: rate, ...(enhanced ? {tax_treatment:treatment,discount_rate:money(bp),gross:money(before),discount:money(reduction)} : {}),
      subtotal: money(base), tax: money(iva), total: money(base + iva) };
  });
  return { lines: result, gross:money(gross), discount:money(discount), subtotal: money(subtotal), tax: money(tax), total: money(subtotal + tax), currency: 'COP' };
}
function normalizeDraft(data) {
  if (!data || !['INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(data.kind)) throw new ValidationError('Tipo de documento inválido.');
  const buyer = { name: text(data.buyer_name, 'Nombre del comprador'), identification: identifier(data.buyer_id) };
  const note = data.kind !== 'INVOICE';
  if (!note && data.reference_id) throw new ValidationError('Una factura no debe referenciar un borrador.');
  return { kind: data.kind, buyer, reference_id: note ? pathId(data.reference_id) : null,
    reason: note ? text(data.reason, 'Motivo', 500) : null, ...calculate(data.lines) };
}
module.exports = { ValidationError, text, identifier, pathId, calculate, normalizeDraft };
