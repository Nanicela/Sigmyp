import {getFunctions,httpsCallable} from 'firebase/functions';
import {collection,doc,getDoc,getDocs,query,orderBy,limit,runTransaction,serverTimestamp} from 'firebase/firestore';
import {getAuth} from 'firebase/auth';
import {auditedSet} from './audit.js';
import {revisionLines} from './quotation-revisions.js';
export const paymentDays=[0,5,15,30,45,60,90,180];
export function orderConditions(input){
 const text=(k,n)=>{const v=String(input[k]??'').trim();if(v.length>n)throw Error('Revisa el campo '+k);return v;};
 const date=text('date',10),deliveryDate=text('deliveryDate',10),days=Number(input.paymentDays);
 for(const value of [date,deliveryDate])if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value)throw Error('Selecciona fechas válidas.');
 if(!date.startsWith('2026-')||deliveryDate<date||!paymentDays.includes(days))throw Error('Revisa la fecha de entrega y la forma de pago.');
 return {date,deliveryDate,paymentDays:days,deliveryAddress:text('deliveryAddress',300),reference:text('reference',200),comments:text('comments',2000),status:'DRAFT'};
}
export function orderLines(inputs,items){
 return revisionLines(inputs.map(line=>{const item=items.find(i=>i.id===line.productId);if(!item)throw Error('Selecciona un ítem válido para cada fila.');return {...line,description:item.name,code:item.code||'',discount:0};}));
}
export function orderView(id,data,lines){return {id,...data.conditions,supplierId:data.supplierId,supplierName:data.supplierName,paymentMethod:data.conditions.paymentDays===0?'Contado':data.conditions.paymentDays+' días',number:'BOR-'+id.replace(/^new_/,'').toUpperCase(),native:true,orderVersion:data.version,lines,totals:data.totals,total:data.totals.totalCents/100,orderData:data};}
export async function loadPurchaseOrders(db,company,rows){
 const docs=await getDocs(collection(db,'organizations',company,'purchaseOrderVersions'));const map=new Map(rows.map(r=>[r.id,r]));
 for(const d of docs.docs){const data=d.data(),lines=await getDocs(query(collection(db,'organizations',company,'purchaseOrderRevisions',data.revisionId,'lines'),orderBy('index'),limit(data.lineCount)));if(lines.size!==data.lineCount)throw Error('No se pudo cargar el detalle completo de una orden de compra.');map.set(d.id,orderView(d.id,data,lines.docs.map(x=>x.data().line)));}try{const approvals=await getDocs(collection(db,'organizations',company,'purchaseOrderApprovals'));for(const a of approvals.docs){const row=map.get(a.id);if(row)map.set(a.id,{...row,status:'APPROVED',approval:a.data()});}}catch(e){if(e.code!=='permission-denied')throw e;}return [...map.values()];
}
export async function savePurchaseOrder(db,company,id,record,input,directory){
 if(company!=='500123568'||!id)throw Error('Abre la orden en DyD.');
 if(record?.status&&record.status!=='DRAFT')throw Error('Solo se pueden editar borradores.');
 const supplier=directory.suppliers.find(s=>s.id===(record?.supplierId||input.supplierId));if(!supplier)throw Error('Selecciona un proveedor.');
 const conditions=orderConditions({...input,date:record?.date||input.date}),nodes=orderLines(input.lines||[],directory.items),uid=getAuth(db.app).currentUser?.uid;if(!uid)throw Error('Inicia sesión nuevamente.');
 const root=['organizations',company],ref=doc(db,...root,'purchaseOrderVersions',id),before=(await getDoc(ref)).data()||null;
 if(!record&&before)return orderView(id,before,(await getDocs(query(collection(db,...root,'purchaseOrderRevisions',before.revisionId,'lines'),orderBy('index')))).docs.map(x=>x.data().line));
 if((before?.version||0)!==(record?.orderVersion||0))throw Error('Otra persona actualizó la orden. Cierra y vuelve a abrirla.');
 const revisionId=crypto.randomUUID(),revision=doc(db,...root,'purchaseOrderRevisions',revisionId);
 await runTransaction(db,async tx=>{tx.set(revision,{quoteId:id,ownerUid:uid,sealed:false,createdAt:serverTimestamp()});});
 for(let offset=0;offset<nodes.length;offset+=3){const chunk=nodes.slice(offset,offset+3);await runTransaction(db,async tx=>{if((await tx.get(doc(db,...root,'purchaseOrderRevisions',revisionId,'lines',String(chunk.at(-1).index)))).exists())return;for(const node of chunk)tx.set(doc(db,...root,'purchaseOrderRevisions',revisionId,'lines',String(node.index)),node);});}
 await runTransaction(db,async tx=>{const current=(await tx.get(ref)).data()||null;if((current?.version||0)!==(before?.version||0))throw Error('Otra persona actualizó la orden. No se reemplazaron sus cambios.');auditedSet(tx,db,ref,current,{supplierId:supplier.id,supplierName:supplier.name,conditions,revisionId,lineCount:nodes.length,totals:nodes.at(-1).sums});tx.update(revision,{sealed:true});});
 return orderView(id,(await getDoc(ref)).data(),nodes.map(n=>n.line));
}

export async function approveOrder(db,company,record){
 if(!record?.orderVersion||record.status!=='DRAFT')throw Error('Guarda y revisa el detalle de la orden antes de aprobar.');
 await httpsCallable(getFunctions(db.app,'us-central1'),'approvePurchaseOrder')({companyId:company,orderId:record.id,version:record.orderVersion,revisionId:record.orderData.revisionId});
 const approval=await getDoc(doc(db,'organizations',company,'purchaseOrderApprovals',record.id));
 if(!approval.exists())throw Error('No se pudo verificar la aprobación. Recarga la compañía.');
 return {...record,status:'APPROVED',approval:approval.data()};
}
