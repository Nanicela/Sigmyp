import {doc,getDoc,runTransaction,serverTimestamp} from 'firebase/firestore';
import {auditedSet} from './audit.js';
import {getAuth} from 'firebase/auth';
export function quotationToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function decimalUnits(value,precision){
 const text=String(value??'').trim().replace(',','.');
 if(!new RegExp('^\\d+(?:\\.\\d{1,'+precision+'})?$').test(text))throw Error('Revisa cantidades y valores: usa números positivos con hasta '+precision+' decimales.');
 const [whole,fraction='']=text.split('.'),n=Number(whole)*10**precision+Number(fraction.padEnd(precision,'0'));
 if(!Number.isSafeInteger(n))throw Error('El valor es demasiado grande.');return n;
}
export function quotationLine(input){
 const description=String(input.description||'').trim(),quantityUnits=decimalUnits(input.quantity,3),unitPriceCents=decimalUnits(input.price,2),discountBps=decimalUnits(input.discount||0,2),rate=Number(input.rate);
 if(!description||description.length>500||quantityUnits<1||quantityUnits>1e9||unitPriceCents>1e9||quantityUnits*unitPriceCents>1e13||discountBps>10000||![0,5,19].includes(rate))throw Error('Revisa la descripción, cantidad, precio, descuento e IVA de cada concepto.');
 const amountCents=Math.floor((quantityUnits*unitPriceCents+500)/1000),discountCents=Math.floor((amountCents*discountBps+5000)/10000),subtotalCents=amountCents-discountCents,taxCents=Math.floor((subtotalCents*rate+50)/100);
 return {description,quantityUnits,unitPriceCents,discountBps,rate,amountCents,discountCents,subtotalCents,taxCents,totalCents:subtotalCents+taxCents};
}
export function quotationTotals(lines){return Object.fromEntries(['amountCents','discountCents','subtotalCents','taxCents','totalCents'].map(key=>[key,lines.reduce((sum,line)=>sum+line[key],0)]));}
export function normalizeQuotation(input){
 const date=String(input.date||''),validUntil=String(input.validUntil||'');
 for(const value of [date,validUntil])if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value)throw Error('Revisa la fecha y la vigencia.');
 if(date.slice(0,4)!==quotationToday().slice(0,4)||validUntil<date)throw Error('La fecha debe pertenecer al año actual y la vigencia no puede ser anterior.');
 if(!Array.isArray(input.lines)||!input.lines.length||input.lines.length>3)throw Error('Agrega entre 1 y 3 conceptos.');
 const lines=input.lines.map(quotationLine),result={date:Date.parse(date+'T12:00:00Z'),validUntil:Date.parse(validUntil+'T12:00:00Z'),businessYear:Number(date.slice(0,4)),lines,...quotationTotals(lines),currency:'COP',status:'CREATED',schemaVersion:1};
 for(const key of ['paymentMethod','warranty','deliveryTime','comments']){const value=String(input[key]||'').trim();if(value.length>2000)throw Error('Las condiciones comerciales son demasiado largas.');result[key]=value;}
 return result;
}
// A competing counter commit can surface as permission-denied before the SDK retries.
// Retry only when a fresh read proves that the sequence changed.
export async function runQuotationTransaction(db,counter,action){
 for(let attempt=0;attempt<3;attempt++){
  let observed=null;
  try{return await runTransaction(db,async tx=>{const snapshot=await tx.get(counter);observed=snapshot.data()?.last||0;return action(tx,observed);});}
  catch(error){if(error.code!=='permission-denied'||observed===null||attempt===2)throw error;const current=(await getDoc(counter)).data()?.last||0;if(current===observed)throw error;}
 }
}
export async function createCommercialQuotation(db,company,id,input,account,contact,office){
 if(company!=='500123568'||!/^new_[a-f0-9-]{36}$/.test(id)||!account?.sourceDocumentId||!contact?.sourceDocumentId||contact.customerId!==account.id|| (office&&(office.customerId!==account.id||office.contactId!==contact.id)))throw Error('Selecciona una cuenta y un contacto válidos de la compañía.');
 const data=normalizeQuotation(input),ref=doc(db,'organizations',company,'commercialQuotations',id),counter=doc(db,'organizations',company,'commercialCounters','quotations-'+data.businessYear);
 const links={customerId:account.id,accountDocumentId:account.sourceDocumentId,contactId:contact.id,contactDocumentId:contact.sourceDocumentId,officeId:office?.id||'',officeDocumentId:office?.sourceDocumentId||''};
 const text=value=>String(value||'');
 const snapshot={accountName:text(account.name),identification:text(account.identification),accountEmail:text(account.email),address:text(account.address),city:text(account.municipality),contactName:text(contact.name),contactEmail:text(contact.email),contactPhone:text(contact.mobile||contact.phone1||contact.phone),officeName:text(office?.name)};
 await runQuotationTransaction(db,counter,async (tx,last)=>{
 const existing=await tx.get(ref);
 if(existing.exists())return;
 const sequence=last+1;
 const values={...data,...links,snapshot,companyId:company,sequence,number:'COT-'+data.businessYear+'-'+sequence,createdAt:serverTimestamp(),createdBy:getAuth(db.app).currentUser.uid};
 auditedSet(tx,db,ref,null,values);
 tx.set(counter,{last:sequence,lastQuotationId:id,updatedAt:serverTimestamp()});
 });
 const saved=(await getDoc(ref)).data();return {...saved,id,total:saved.totalCents/100};
}

export const quotationConditions=['paymentMethod','warranty','deliveryTime','comments'];
export function quotationEditForm(q){
 const result=Object.fromEntries(quotationConditions.map(k=>[k,String(q[k]??'')]));
 if(q.pricing)result.lines=q.pricing.lines.map(l=>({description:l.description,quantity:String(l.quantityUnits/1000),price:String(l.unitPriceCents/100),discount:String(l.discountBps/100),rate:l.rate}));
 if(q.schemaVersion===1)Object.assign(result,{customerId:q.customerId,contactId:q.contactId,officeId:q.officeId,date:new Date(q.date).toISOString().slice(0,10),validUntil:new Date(q.validUntil).toISOString().slice(0,10),lines:q.lines.map(l=>({description:l.description,quantity:String(l.quantityUnits/1000),price:String(l.unitPriceCents/100),discount:String(l.discountBps/100),rate:l.rate}))});
 return result;
}
export function importedPricing(input){
 if(!Array.isArray(input.lines)||input.lines.length<1||input.lines.length>3)throw Error('Agrega entre 1 y 3 productos o servicios.');
 const lines=input.lines.map(quotationLine);
 return {lines,...quotationTotals(lines)};
}
export function quotationDisplay(record){return record.pricing?{...record,total:record.pricing.totalCents/100}:record;}
export function importedLinesForEdit(q){
 return q.pricing?quotationEditForm(q).lines:(q.productDetails||[]).map(l=>({description:l.name,quantity:l.quantity==null?'':String(l.quantity),price:'',discount:'0',rate:[0,5,19].includes(l.catalogTaxRate)?l.catalogTaxRate:0}));
}
export async function updateCommercialQuotation(db,company,record,input){
 if(company!=='500123568'||!record?.id)throw Error('Abre la cotización en su compañía.');
 const native=record.schemaVersion===1;
 const target=native?'commercialQuotations':'commercialQuotationEdits',id=native?record.id:record.sourceDocumentId;
 if(!id)throw Error('No se encontró el origen de esta cotización.');
 const values=native?normalizeQuotation({...input,date:new Date(record.date).toISOString().slice(0,10)}):Object.fromEntries(quotationConditions.map(k=>{const v=String(input[k]??'').trim();if(v.length>2000)throw Error('Las condiciones comerciales son demasiado largas.');return [k,v];}));
 if(!native){if(input.editProducts)values.pricing=importedPricing(input);else if(record.pricing)values.pricing=record.pricing;}
 const ref=doc(db,'organizations',company,target,id);
 await runTransaction(db,async tx=>{
 const current=await tx.get(ref),before=current.exists()?current.data():null;
 if((before?.version||0)!==(record.version||0))throw Error('Otra persona actualizó la cotización. Cierra el modal y recarga antes de guardar.');
 if(native){if(!before||before.status!=='CREATED')throw Error('Esta cotización no permite edición.');auditedSet(tx,db,ref,before,{...before,...values});}
 else{const source=await tx.get(doc(db,'organizations',company,'legacyData','quotations','records',id));if(!source.exists()||source.data().data.id!==record.sourceId)throw Error('No se encontró la cotización original.');auditedSet(tx,db,ref,before,{...values,sourceId:record.sourceId,sourceDocumentId:id});}
 });
 const saved=(await getDoc(ref)).data();return quotationDisplay({...record,...saved,...(native?{total:saved.totalCents/100}:{})});
}
