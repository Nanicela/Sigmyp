import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,writeBatch,serverTimestamp} from 'firebase/firestore';
let env;
const company='500123568',id='a'.repeat(64);
const root='organizations/'+company;
const sample={name:'Registro',phone1:'',phone2:'',email:'',comments:'',type:'',address:'',municipality:'',department:'',technicianName:'',technicianPhone:'',technicianEmail:'',sourceId:1,sourceDocumentId:id};
const context=(role)=>env.authenticatedContext(role,{email:role+'@test.example',email_verified:true,platformAdmin:role==='platform'}).firestore();
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-record-offices',firestore:{host:'127.0.0.1',port:8181,rules:await readFile(process.env.MIGRATION_RULES_FILE||'firestore.rules','utf8')}});
 await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore();
  await setDoc(doc(db,root),{members:{'admin@test.example':'admin','viewer@test.example':'viewer','billing@test.example':'billing'}});
  await setDoc(doc(db,root+'/legacyData/offices/records/'+id),{data:{id:1,name:'Original'}});
  for(const role of ['admin','viewer','billing','platform','outsider'])await setDoc(doc(db,'registeredUsers/'+role),{uid:role});
 });
});
after(async()=>env?.cleanup());
function write(db,role,before=null,extra={},audit=true,actor=role){
 const targetId=extra.sourceDocumentId||id;
 const auditId=crypto.randomUUID(),ref=doc(db,root+'/commercialOffices/'+targetId);
 const after={...sample,createdAt:before?.createdAt||serverTimestamp(),version:(before?.version||0)+1,auditId,updatedBy:role,updatedAt:serverTimestamp(),...extra};
 const batch=writeBatch(db);batch.set(ref,after);
 if(audit)batch.set(doc(db,root+'/audit/'+auditId),{target:'commercialOffices',targetId,actorUid:actor,actorEmail:actor+'@test.example',at:serverTimestamp(),before,after});
 return batch.commit();
}
test('guarda y relee, exige auditoría y protege versión y origen',async()=>{
 const db=context('admin');
 await assertFails(write(db,'admin',null,{},false));
 await assertFails(write(db,'admin',null,{phone1:'INVALID'}));
 await assertFails(write(db,'admin',null,{sourceId:2}));
 await assertFails(write(db,'admin',null,{},true,'outsider'));
 await assertSucceeds(write(db,'admin'));
 const before=(await getDoc(doc(db,root+'/commercialOffices/'+id))).data();
 await assertSucceeds(write(db,'admin',before,{name:'Actualizado'}));
 await assertFails(write(db,'admin',before,{name:'Versión atrasada'}));
 await assertFails(setDoc(doc(db,root+'/legacyData/offices/records/'+id),{data:{id:1,name:'Alterado'}}));
});
test('Consulta puede leer pero no escribir; facturador y otros usuarios no pueden escribir',async()=>{
 const viewer=context('viewer');
 await assertSucceeds(getDoc(doc(viewer,root+'/commercialOffices/'+id)));
 const before=(await getDoc(doc(context('admin'),root+'/commercialOffices/'+id))).data();
 for(const role of ['viewer','billing','outsider'])await assertFails(write(context(role),role,before));
 const p=context('platform');await assertSucceeds(write(p,'platform',before,{name:'Cambio global'}));
 const db=context('admin'),b=writeBatch(db);b.set(doc(db,'organizations/other/commercialOffices/'+id),sample);await assertFails(b.commit());
});

