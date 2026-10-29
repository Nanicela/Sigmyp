const {FieldValue}=require('firebase-admin/firestore');
const {HttpsError}=require('firebase-functions/v2/https');
const {randomUUID}=require('node:crypto');
const keys=['amountCents','discountCents','subtotalCents','taxCents','totalCents'];
function validateDetail(order,revision,nodes){
 if(order.conditions?.status!=='DRAFT'||!revision?.sealed||!Number.isInteger(order.lineCount)||order.lineCount<1||nodes.length!==order.lineCount)throw new HttpsError('failed-precondition','La orden no tiene un detalle completo en borrador.');
 let sums=Object.fromEntries(keys.map(k=>[k,0]));
 nodes.forEach((node,index)=>{const l=node.line||{};if(node.index!==index||!Number.isInteger(l.quantityUnits)||l.quantityUnits<=0||!Number.isInteger(l.unitPriceCents)||l.unitPriceCents<0||l.quantityUnits*l.unitPriceCents>1e13||l.discountBps!==0||![0,5,19].includes(l.rate))throw new HttpsError('failed-precondition','Revisa los ítems de la orden.');const amount=Math.floor((l.quantityUnits*l.unitPriceCents+500)/1000),tax=Math.floor((amount*l.rate+50)/100);const expected={amountCents:amount,discountCents:0,subtotalCents:amount,taxCents:tax,totalCents:amount+tax};for(const k of keys){sums[k]+=expected[k];if(l[k]!==expected[k]||!Number.isSafeInteger(sums[k])||node.sums?.[k]!==sums[k])throw new HttpsError('failed-precondition','Los importes de la orden no coinciden.');}});
 if(keys.some(k=>order.totals?.[k]!==sums[k]))throw new HttpsError('failed-precondition','Los totales de la orden no coinciden.');
}
async function approvePurchaseOrder(db,request){
 const auth=request.auth,data=request.data||{};
 if(!auth?.uid||auth.token?.email_verified!==true||!auth.token.email)throw new HttpsError('unauthenticated','Inicia sesión con tu correo verificado.');
 if(data.companyId!=='500123568'||!/^new_[a-f0-9-]{36}$/.test(data.orderId||'')||!Number.isInteger(data.version)||data.version<1||typeof data.revisionId!=='string')throw new HttpsError('invalid-argument','La orden seleccionada no es válida.');
 const root=db.doc('organizations/'+data.companyId),ref=root.collection('purchaseOrderVersions').doc(data.orderId),approval=root.collection('purchaseOrderApprovals').doc(data.orderId);
 return db.runTransaction(async tx=>{
 const [company,user,orderSnap,approved]=await Promise.all([tx.get(root),tx.get(db.doc('registeredUsers/'+auth.uid)),tx.get(ref),tx.get(approval)]);
 if(!company.exists||!user.exists||!(auth.token.platformAdmin===true||company.data().members?.[auth.token.email]==='admin'))throw new HttpsError('permission-denied','No tienes permiso para aprobar órdenes de esta compañía.');
 if(!orderSnap.exists)throw new HttpsError('not-found','No se encontró la orden.');
 const order=orderSnap.data();
 if(order.version!==data.version||order.revisionId!==data.revisionId)throw new HttpsError('failed-precondition','La orden cambió. Ábrela de nuevo antes de aprobar.');
 if(approved.exists){if(approved.data().orderVersion!==order.version||approved.data().revisionId!==order.revisionId)throw new HttpsError('failed-precondition','La aprobación no coincide con la orden.');return {orderId:data.orderId,status:'APPROVED',reused:true};}
 const revisionRef=root.collection('purchaseOrderRevisions').doc(order.revisionId),[revision,lines]=await Promise.all([tx.get(revisionRef),tx.get(revisionRef.collection('lines').orderBy('index'))]);
 if(revision.data()?.quoteId!==data.orderId)throw new HttpsError('failed-precondition','El detalle no corresponde a la orden.');
 validateDetail(order,revision.data(),lines.docs.map(d=>d.data()));
 const auditId=randomUUID(),after={status:'APPROVED',orderVersion:order.version,revisionId:order.revisionId,approvedBy:auth.uid,approvedEmail:auth.token.email,approvedAt:FieldValue.serverTimestamp(),version:1,auditId,updatedBy:auth.uid,updatedAt:FieldValue.serverTimestamp()};
 tx.create(approval,after);tx.create(root.collection('audit').doc(auditId),{target:'purchaseOrderApprovals',targetId:data.orderId,actorUid:auth.uid,actorEmail:auth.token.email,at:FieldValue.serverTimestamp(),before:null,after});
 return {orderId:data.orderId,status:'APPROVED',reused:false};
 });
}
module.exports={approvePurchaseOrder,validateDetail};
