import {collection,doc,getDoc,getDocs,runTransaction,serverTimestamp,query,orderBy,limit} from 'firebase/firestore';
import {getAuth} from 'firebase/auth';
import {auditedSet} from './audit.js';
import {quotationLine,quotationTotals,quotationToday} from './commercial-quotation.js';
export const sumKeys=['amountCents','discountCents','subtotalCents','taxCents','totalCents'];
export function revisionLines(inputs){
 if(!Array.isArray(inputs)||!inputs.length)throw Error('Agrega al menos un producto o servicio.');
 let sums=Object.fromEntries(sumKeys.map(k=>[k,0]));
 return inputs.map((input,index)=>{const line={...quotationLine(input),productId:String(input.productId||''),code:String(input.code||'')};if(line.productId.length>100||line.code.length>100)throw Error('El código de producto es demasiado largo.');sums=Object.fromEntries(sumKeys.map(k=>[k,sums[k]+line[k]]));if(Object.values(sums).some(n=>!Number.isSafeInteger(n)))throw Error('Los importes de esta cotización son demasiado grandes.');return {index,line,sums:{...sums}};});
}
export function revisionConditions(input){
 const text=(key,max=2000)=>{const value=String(input[key]??'').trim();if(value.length>max)throw Error('Revisa la longitud del campo '+key);return value;};
 const days=key=>{const n=Number(input[key]);if(!Number.isInteger(n)||n<0||n>36500)throw Error('Revisa los días de entrega y vigencia.');return n;};
 const unit=key=>{const v=input[key];if(!['CALENDAR_DAYS','WORKING_DAYS'].includes(v))throw Error('Selecciona el tipo de días.');return v;};
 if(!['CREATED','SENT','APPROVED','REJECTED'].includes(input.status))throw Error('Selecciona un estado válido.');
 return {letter:text('letter',10000),warranty:text('warranty'),paymentMethod:text('paymentMethod'),comments:text('comments'),purchaseOrder:text('purchaseOrder',200),deliveryDays:days('deliveryDays'),deliveryUnit:unit('deliveryUnit'),validityDays:days('validityDays'),validityUnit:unit('validityUnit'),status:input.status};
}
export function revisionView(data,id,lines,base={}){
 return {...base,...data.conditions,id,revisionVersion:data.version,version:data.version,revisionSourceKind:data.sourceKind,revisionSourceDocumentId:data.sourceDocumentId,revisionSourceId:data.sourceId,revisionId:data.revisionId,schemaVersion:2,number:data.number,date:data.date,customerId:data.links.customerId,contactId:data.links.contactId,officeId:data.links.officeId,approverContactId:data.links.approverContactId,snapshot:data.snapshot,approverName:data.snapshot.approverName,deliveryTime:data.conditions.deliveryDays+' '+(data.conditions.deliveryUnit==='WORKING_DAYS'?'días hábiles':'días calendario'),applicability:data.conditions.validityDays+' '+(data.conditions.validityUnit==='WORKING_DAYS'?'días hábiles':'días calendario'),pricing:{lines,...data.totals},total:data.totals.totalCents/100,revisionData:data};
}
export async function loadQuotationRevisions(db,company,records,{details=true}={}){
 const versions=await getDocs(collection(db,'organizations',company,'commercialQuotationVersions'));const result=new Map(records.map(q=>[q.id,q]));
 for(const snapshot of versions.docs){const data=snapshot.data();if(!details){result.set(snapshot.id,{...revisionView(data,snapshot.id,[],result.get(snapshot.id)),detailsPending:true});continue;}const nodes=await getDocs(query(collection(db,'organizations',company,'commercialQuotationRevisions',data.revisionId,'lines'),orderBy('index'),limit(data.lineCount)));if(nodes.size!==data.lineCount)throw Error('No se pudo cargar el detalle completo de una cotización.');result.set(snapshot.id,revisionView(data,snapshot.id,nodes.docs.map(n=>n.data().line),result.get(snapshot.id)));}
 return [...result.values()];
}
export function commercialLinks(input,accounts,contacts,offices){
 const account=accounts.find(a=>a.id===input.customerId),contact=contacts.find(c=>c.id===input.contactId&&c.customerId===account?.id),office=input.officeId?offices.find(o=>o.id===input.officeId&&o.contactId===contact?.id&&o.customerId===account?.id):null,approver=input.approverContactId?contacts.find(c=>c.id===input.approverContactId&&c.customerId===account?.id):null;
 if(!account?.sourceDocumentId||!contact?.sourceDocumentId||(input.officeId&&!office)||(input.approverContactId&&!approver))throw Error('Selecciona una cuenta, contacto y oficina válidos.');
 return {links:{customerId:account.id,accountDocumentId:account.sourceDocumentId,contactId:contact.id,contactDocumentId:contact.sourceDocumentId,officeId:office?.id||'',officeDocumentId:office?.sourceDocumentId||'',approverContactId:approver?.id||'',approverDocumentId:approver?.sourceDocumentId||''},snapshot:{accountName:account.name||'',contactName:contact.name||'',officeName:office?.name||'',approverName:approver?.name||''}};
}
export async function saveQuotationRevision(db,company,id,record,input,directory){
 if(company!=='500123568')throw Error('Abre la cotización en su compañía.');
 const uid=getAuth(db.app).currentUser?.uid;if(!uid)throw Error('Inicia sesión nuevamente.');
 const nodes=revisionLines(input.lines),conditions=revisionConditions(input),relations=commercialLinks(input,directory.customers,directory.contacts,directory.sites);
 const root=['organizations',company],ref=doc(db,...root,'commercialQuotationVersions',id),beforeSnap=await getDoc(ref),before=beforeSnap.exists()?beforeSnap.data():null;
 if(!record && before?.sourceKind==='NEW'){const previous=await getDocs(query(collection(db,...root,'commercialQuotationRevisions',before.revisionId,'lines'),orderBy('index'),limit(before.lineCount)));if(previous.size!==before.lineCount)throw Error('No se pudo recuperar la cotización creada.');return revisionView(before,id,previous.docs.map(d=>d.data().line));}
 if((before?.version||0)!==(record?.revisionVersion||0))throw Error('Otra persona actualizó la cotización. Cierra y vuelve a abrirla.');
 const revisionId=crypto.randomUUID(),revision=doc(db,...root,'commercialQuotationRevisions',revisionId);
 const date=record?.date?new Date(record.date).getTime():Date.parse(input.date+'T12:00:00Z');if(!Number.isFinite(date))throw Error('Revisa la fecha de la cotización.');
 const sourceKind=before?.sourceKind||record?.revisionSourceKind||(record?.schemaVersion===1?'NATIVE':record?'IMPORTED':'NEW'),sourceDocumentId=before?.sourceDocumentId||record?.revisionSourceDocumentId||(sourceKind==='NATIVE'?record.id:record?.sourceDocumentId||''),sourceId=before?.sourceId??record?.revisionSourceId??record?.sourceId??0;
 await runTransaction(db,async tx=>{tx.set(revision,{quoteId:id,ownerUid:uid,sealed:false,createdAt:serverTimestamp()});});
 for(let offset=0;offset<nodes.length;offset+=5){const chunk=nodes.slice(offset,offset+5);await runTransaction(db,async tx=>{const last=doc(db,...root,'commercialQuotationRevisions',revisionId,'lines',String(chunk.at(-1).index));if((await tx.get(last)).exists())return;for(const node of chunk)tx.set(doc(db,...root,'commercialQuotationRevisions',revisionId,'lines',String(node.index)),node);});input.onProgress?.(Math.min(offset+5,nodes.length),nodes.length);}
 await runTransaction(db,async tx=>{
  const now=await tx.get(ref);const current=now.exists()?now.data():null;if((current?.version||0)!==(before?.version||0))throw Error('Otra persona actualizó la cotización. No se reemplazó su versión.');
  const year=Number(quotationToday().slice(0,4)),counter=doc(db,...root,'commercialQuotationCountersV2',String(year));let sequence=current?.sequence||0;
  if(!record&&!current){const c=await tx.get(counter);sequence=(c.data()?.last||0)+1;}
  const number=current?.number||record?.number||`COT-${year}-V2-${sequence}`;
  const values={sourceKind,sourceDocumentId,sourceId,number:String(number),date,year:new Date(date).getUTCFullYear(),sequence,...relations,conditions,revisionId,lineCount:nodes.length,totals:nodes.at(-1).sums};
  auditedSet(tx,db,ref,current,values);tx.update(revision,{sealed:true});if(!record&&!current)tx.set(counter,{last:sequence,quoteId:id,updatedAt:serverTimestamp()});
 });
 const after=(await getDoc(ref)).data();return revisionView(after,id,nodes.map(n=>n.line),record||{});
}

export async function loadQuotationDetail(db,company,record){
 if(!record.detailsPending)return record;
 const data=record.revisionData;
 const nodes=await getDocs(query(collection(db,'organizations',company,'commercialQuotationRevisions',data.revisionId,'lines'),orderBy('index'),limit(data.lineCount)));
 if(nodes.size!==data.lineCount)throw Error('No se pudo cargar el detalle completo de la cotización.');
 return {...record,pricing:{lines:nodes.docs.map(n=>n.data().line),...data.totals},detailsPending:false};
}
