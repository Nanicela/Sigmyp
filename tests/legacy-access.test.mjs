import {before,after,test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection} from 'firebase/firestore';
let env;
const company='500123568';
const path=table=>'organizations/'+company+'/legacyData/'+table+'/records';
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-legacy-import',firestore:{host:'127.0.0.1',port:8181,rules:await readFile(process.env.MIGRATION_RULES_FILE||'firestore.rules','utf8')}});
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore();
  await setDoc(doc(db,'organizations/'+company),{members:{'admin@test.example':'admin','viewer@test.example':'viewer','billing@test.example':'billing'}});
  for(const table of ['accounts','contacts','offices','cities','states','quotations','users','roles','machines'])
   await setDoc(doc(db,path(table)+'/one'),{data:{name:'Ficticio'}});
 });
});
after(async()=>{await env?.cleanup();});
test('lectura comercial autorizada y sin escritura, incluso para superadmin',async()=>{
 for(const role of ['admin','viewer','platform']){
  const db=env.authenticatedContext(role,{email:role+'@test.example',email_verified:true,platformAdmin:role==='platform'}).firestore();
  for(const table of ['accounts','contacts','offices','cities','states','quotations'])
   await assertSucceeds(getDocs(collection(db,path(table))));
  await assertFails(setDoc(doc(db,path('accounts')+'/new'),{data:{}}));
  for(const table of ['users','roles','machines'])await assertFails(getDoc(doc(db,path(table)+'/one')));
 }
});
test('rechaza otras compañías, facturador, correo sin verificar y anónimo',async()=>{
 const contexts=[
  env.unauthenticatedContext(),
  env.authenticatedContext('outsider',{email:'other@test.example',email_verified:true}),
  env.authenticatedContext('billing',{email:'billing@test.example',email_verified:true}),
  env.authenticatedContext('unverified',{email:'admin@test.example',email_verified:false})];
 for(const c of contexts)await assertFails(getDocs(collection(c.firestore(),path('accounts'))));
 const admin=env.authenticatedContext('admin',{email:'admin@test.example',email_verified:true}).firestore();
 await assertFails(getDocs(collection(admin,'organizations/other/legacyData/accounts/records')));
});
