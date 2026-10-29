import {productionNumberingEnabled,nextProductionNumber,withProductionCounterRetry} from './production-numbering.js';
import {normalizeComposition,prepareComposition,productCompositionEnabled} from './product-composition.js';
import {doc,getDoc,getDocs,collection,query,orderBy,limit,runTransaction,serverTimestamp,writeBatch} from 'firebase/firestore';
import {getAuth} from 'firebase/auth';
import {auditedSet} from './audit.js';
export const productionProductFields={code:100,name:200,description:20000,checklist:20000,techSpecs:20000,comments:4000};
const text=(v,n)=>{const s=String(v??'').trim();if(s.length>n)throw Error('Uno de los campos supera el tamaño permitido.');return s;};
function amount(v,label,max,nullable=false){if(nullable&&(v==null||v===''))return null;const s=String(v??'');if(!/^\d+(\.\d{1,2})?$/.test(s)||Number(s)>max)throw Error('Revisa '+label+'. Usa un valor positivo o cero, con hasta dos decimales.');return Number(s);}
export function normalizeProductionProduct(input){const out=Object.fromEntries(Object.entries(productionProductFields).map(([k,n])=>[k,text(input[k],n)]));if(!out.code||!out.name)throw Error('Escribe el código y el nombre del producto.');return {...out,cost:amount(input.cost,'el costo',1e12,true),price:amount(input.price,'el precio',1e12),tax:amount(input.tax,'el impuesto',100)};}
export function productionDate(v){const s=String(v||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s+'T12:00Z').toISOString().slice(0,10)!==s)throw Error('Selecciona una fecha válida.');return s;}
export function normalizeProductionOrder(input,directory,record=null){
 const date=productionDate(input.date),deliveryDate=productionDate(input.deliveryDate);if(!date.startsWith('2026-')||deliveryDate<date)throw Error('La creación debe ser de 2026 y la entrega no puede ser anterior.');
 const a=directory.customers?.find(a=>a.id===input.accountId);if(!a?.sourceDocumentId)throw Error('Selecciona una cuenta válida.');
 const c=directory.contacts?.find(c=>c.id===input.contactId);if(input.contactId&&(!c?.sourceDocumentId||c.customerId!==a.id))throw Error('El contacto debe pertenecer a la cuenta.');
 const q=directory.quotations?.find(q=>q.id===input.quotationId);const historical=!q&&record&&a.id===record.accountId&&String(input.quotationId)===String(record.quotationId).replace(/^(\d+)$/,'legacy-quotation-$1');if(!historical&&(!q||q.customerId!==a.id))throw Error('Selecciona una cotización de la cuenta.');
 return {date,deliveryDate,accountId:a.id,accountDocumentId:a.sourceDocumentId,accountName:text(a.name,200),contactId:c?.id||'',contactDocumentId:c?.sourceDocumentId||'',contactName:text(c?.name,200),quotationId:q?.id||input.quotationId,quotationDocumentId:q?(q.sourceDocumentId||q.id):'',quotationNumber:String(q?.number||record?.quotationNumber||record?.quotationId||''),quotationContactDocumentId:q?.id.startsWith('legacy-quotation-')?(directory.contacts.find(c=>c.id===q.contactId)?.sourceDocumentId||''):'',comments:text(input.comments,4000),status:'CREATED'};
}
export function productionLines(inputs,products){if(!Array.isArray(inputs)||!inputs.length)throw Error('Agrega al menos un producto.');return inputs.map((l,index)=>{const p=products.find(p=>p.id===l.productId);if(!p)throw Error('Selecciona un producto válido en cada fila.');const s=String(l.quantity);if(!/^\d+(\.\d{1,3})?$/.test(s)||Number(s)<=0||Number(s)>1e9)throw Error('La cantidad debe ser positiva, con hasta tres decimales.');return {index,line:{productId:p.id,code:text(p.code,100),name:text(p.name,200),quantity:Number(s),serial:text(l.serial,500),comments:text(l.comments,2000)}};});}
export function productionOrderView(id,data,lines){return {id,...data.values,number:data.number,editVersion:data.version,revisionId:data.revisionId,lineCount:data.lineCount,lines,native:id.startsWith('new_')};}
export async function loadProductionOrderLines(db,company,row){if(!row.revisionId)return row;const result=await getDocs(query(collection(db,'organizations',company,'productionRevisions',row.revisionId,'lines'),orderBy('index'),limit(row.lineCount)));if(result.size!==row.lineCount)throw Error('No se pudo cargar el detalle completo.');return {...row,lines:result.docs.map(d=>d.data().line),detailsPending:false};}
export async function saveProductionProduct(db,company,id,record,input,catalog=[]){
 if(company!=='500123568')throw Error('Selecciona DyD.');const values=normalizeProductionProduct(input),ref=doc(db,'organizations',company,'productionProducts',id);
 const nodes=normalizeComposition(input,catalog),uid=getAuth(db.app).currentUser?.uid;if(!uid)throw Error('Inicia sesión de nuevo.');
 if(!productCompositionEnabled && JSON.stringify(nodes)!==JSON.stringify(normalizeComposition(record||{},catalog)))throw Error('El guardado de ítems y procesos está preparado, pendiente de habilitación.');
 const composition=productCompositionEnabled?await prepareComposition(db,company,id,nodes,uid):{};
 await runTransaction(db,async tx=>{const snap=await tx.get(ref),before=snap.data()||null;if((before?.version||0)!==(record?.editVersion||0))throw Error('Otra persona actualizó el producto. Vuelve a abrir la compañía.');auditedSet(tx,db,ref,before,{values,...composition});if(productCompositionEnabled)tx.update(doc(db,'organizations',company,'productCompositions',composition.compositionRevision),{sealed:true});});const saved=(await getDoc(ref)).data();return {...record,id,...saved.values,...composition,items:nodes.filter(n=>n.line.kind==='item').map(n=>n.line),processes:nodes.filter(n=>n.line.kind==='process').map(n=>n.line),editVersion:saved.version,native:id.startsWith('new_')};
}
export async function saveProductionOrder(db,company,id,record,input,directory,products){
 if(company!=='500123568')throw Error('Selecciona DyD.');if(record&&record.status!=='CREATED')throw Error('Solo pueden editarse órdenes en estado Creado.');
 const values=normalizeProductionOrder({...input,date:record?.date||input.date},directory,record),nodes=productionLines(input.lines,products),uid=getAuth(db.app).currentUser?.uid;if(!uid)throw Error('Inicia sesión de nuevo.');
 const root=['organizations',company],ref=doc(db,...root,'productionOrders',id),before=(await getDoc(ref)).data()||null;
 if((before?.version||0)!==(record?.editVersion||0))throw Error('Otra persona actualizó la orden. Vuelve a abrir la compañía.');
 const revisionId=crypto.randomUUID(),revision=doc(db,...root,'productionRevisions',revisionId);
 const b=writeBatch(db);b.set(revision,{orderId:id,ownerUid:uid,sealed:false,createdAt:serverTimestamp()});await b.commit();
 for(let i=0;i<nodes.length;i+=3){const b=writeBatch(db);for(const node of nodes.slice(i,i+3))b.set(doc(db,...root,'productionRevisions',revisionId,'lines',String(node.index)),node);await b.commit();}
 const commit=()=>runTransaction(db,async tx=>{const current=(await tx.get(ref)).data()||null;if((current?.version||0)!==(record?.editVersion||0))throw Error('Otra persona actualizó la orden. Se conservaron sus cambios.');
 let number=record?.number||'OP-2026-'+id.slice(4).toUpperCase();
 if(!record&&productionNumberingEnabled){const counterRef=doc(db,...root,'productionCounters','orders'),counter=(await tx.get(counterRef)).data();const year=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric'}).format(new Date());const next=nextProductionNumber(counter,year);number=next.number;tx.update(counterRef,{last:next.sequence,orderId:id,year:Number(year),updatedBy:uid,updatedAt:serverTimestamp()});}
 auditedSet(tx,db,ref,current,{values,number,revisionId,lineCount:nodes.length});tx.update(revision,{sealed:true});});if(!record&&productionNumberingEnabled)await withProductionCounterRetry(commit,async()=>(await getDoc(doc(db,...root,'productionCounters','orders'))).data()?.last);else await commit();return productionOrderView(id,(await getDoc(ref)).data(),nodes.map(n=>n.line));
}
