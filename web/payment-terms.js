// Calendar dates encoded as UTC midnight, never interpreted as a local instant.
import {Timestamp} from 'firebase/firestore';
export const paymentMethods={UNSPECIFIED:'Por definir',CASH:'Efectivo',TRANSFER:'Transferencia',CARD:'Tarjeta',PSE:'PSE',CHECK:'Cheque'};
export function todayColombia(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function dateText(value){return value?.toDate?.().toISOString().slice(0,10)||'';}
export function normalizePayment(input){
 const day=String(input.document_date||'');
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(day))throw Error('Indica una fecha entre 2000 y 2099.');
 const ms=Date.parse(day+'T00:00:00Z');
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==day)throw Error('La fecha no es válida.');
 if(!['CASH','CREDIT'].includes(input.payment_form))throw Error('Selecciona contado o crédito.');
 const raw=String(input.payment_days??'0');
 if(!/^\d{1,4}$/.test(raw))throw Error('El plazo debe ser un número entero de días.');
 const days=Number(raw);
 if(days>3650||(input.payment_form==='CASH'?days!==0:days<1))throw Error('Contado requiere 0 días; crédito admite de 1 a 3650 días.');
 if(!Object.hasOwn(paymentMethods,input.payment_method))throw Error('Selecciona un medio de pago esperado.');
 const due=ms+days*86400000;
 if(new Date(due).getUTCFullYear()>2099)throw Error('El vencimiento debe quedar antes de 2100.');
 return {form:input.payment_form,method:input.payment_method,days,documentDate:Timestamp.fromMillis(ms),dueDate:Timestamp.fromMillis(due)};
}
