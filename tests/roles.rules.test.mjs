import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,updateDoc,collection,query,where,FieldPath,serverTimestamp} from 'firebase/firestore';
let env;
const path='organizations/900000001';
const ctx=(role,verified=true)=>env.authenticatedContext(role,{email:role+'@example.test',email_verified:verified,...(role==='super'?{platformAdmin:true}:{})}).firestore();
const draft=()=>({kind:'INVOICE',buyer:{name:'Prueba',identification:'123456'},reference_id:null,reason:null,currency:'COP',lines:[{description:'Servicio',quantityUnits:10000,priceCents:10000,rate:19,subtotalCents:10000,taxCents:1900}],subtotalCents:10000,taxCents:1900,totalCents:11900,status:'DRAFT',fiscal_validity:false,requestHash:'a'.repeat(64),createdAt:serverTimestamp()});
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-role-tests',firestore:{host:'127.0.0.1',port:8181,rules:await readFile('firestore.rules','utf8')}});
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async c=>{
  for(const [id,members] of [['900000001',{'admin@example.test':'admin','billing@example.test':'billing','viewer@example.test':'viewer'}],['900000002',{'other@example.test':'admin'}]]) await setDoc(doc(c.firestore(),'organizations',id),{name:'Prueba',nit:id,members,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
 });
});
after(()=>env?.cleanup());
test('aislamiento, correo verificado y consultas por pertenencia',async()=>{
 for(const role of ['admin','billing','viewer']) {
  await assertSucceeds(getDoc(doc(ctx(role),path)));
  await assertFails(getDoc(doc(ctx(role),'organizations/900000002')));
  const result=await assertSucceeds(getDocs(query(collection(ctx(role),'organizations'),where(new FieldPath('members',role+'@example.test'),'in',['admin','billing','viewer']))));
  assert.equal(result.size,1);
  await assertFails(getDocs(collection(ctx(role),'organizations')));
 }
 assert.equal((await getDocs(collection(ctx('super'),'organizations'))).size,2);
 await assertFails(getDoc(doc(ctx('admin',false),path)));
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),path)));
});
test('facturador crea, consulta solo lee; importes e inmutabilidad',async()=>{
 await assertSucceeds(setDoc(doc(ctx('billing'),path+'/drafts/invoice'),draft()));
 await assertSucceeds(getDoc(doc(ctx('viewer'),path+'/drafts/invoice')));
 await assertFails(setDoc(doc(ctx('viewer'),path+'/drafts/forbidden'),draft()));
 await assertFails(setDoc(doc(ctx('other'),path+'/drafts/foreign'),draft()));
 await assertFails(setDoc(doc(ctx('billing'),path+'/drafts/tampered'),{...draft(),totalCents:1}));
 await assertFails(updateDoc(doc(ctx('super'),path+'/drafts/invoice'),{totalCents:1}));
 await assertSucceeds(setDoc(doc(ctx('billing'),path+'/drafts/note'),{...draft(),kind:'CREDIT_NOTE',reference_id:'invoice',reason:'Devolución'}));
 await assertFails(setDoc(doc(ctx('billing'),path+'/drafts/bad-note'),{...draft(),kind:'CREDIT_NOTE',reference_id:'missing',reason:'Devolución'}));
});
test('permisos: administración, sin autoescalado, retirada efectiva',async()=>{
 const members={'admin@example.test':'admin','billing@example.test':'billing','viewer@example.test':'viewer','new@example.test':'viewer'};
 await assertSucceeds(updateDoc(doc(ctx('admin'),path),{members,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(ctx('billing'),path),{members:{...members,'billing@example.test':'admin'},updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(ctx('viewer'),path),{members,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(ctx('admin'),path),{members:{...members,'admin@example.test':'platform'},updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(ctx('admin'),path),{members:{...members,'admin@example.test':'viewer'},updatedAt:serverTimestamp()}));
 delete members['viewer@example.test'];
 await assertSucceeds(updateDoc(doc(ctx('admin'),path),{members,updatedAt:serverTimestamp()}));
 await assertFails(getDoc(doc(ctx('viewer'),path+'/drafts/invoice')));
 await assertFails(setDoc(doc(ctx('admin'),'organizations/900000003'),{name:'Falso',nit:'900000003',members:{},createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(doc(ctx('super'),'organizations/900000003'),{name:'Nueva',nit:'900000003',members:{},createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
});
const profile=()=>({name:'Prueba',documentType:'NIT',identification:'900000001',dv:'7',email:'test@example.test',phone:'',address:'Calle 1',department:'Bogotá',municipality:'Bogotá',taxResponsibilities:'Por confirmar',vatStatus:'por_confirmar',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
test('fichas de empresa y compradores respetan rol',async()=>{
 await assertFails(setDoc(doc(ctx('billing'),path+'/profiles/tax'),profile()));
 await assertSucceeds(setDoc(doc(ctx('admin'),path+'/profiles/tax'),profile()));
 await assertSucceeds(setDoc(doc(ctx('billing'),path+'/customers/NIT_900000001'),profile()));
 await assertFails(setDoc(doc(ctx('other'),path+'/customers/NIT_900000001'),profile()));
 await assertFails(updateDoc(doc(ctx('billing'),path+'/customers/NIT_900000001'),{identification:'999999',updatedAt:serverTimestamp()}));
});

test('el archivo anterior conserva lectura propia y rechaza nuevas escrituras',async()=>{
 const db=ctx('admin');
 await assertSucceeds(getDoc(doc(db,'workspaces/admin/companies/900000001')));
 await assertFails(getDoc(doc(ctx('other'),'workspaces/admin/companies/900000001')));
 await assertFails(setDoc(doc(db,'workspaces/admin/companies/900000001'),{name:'Antigua',nit:'900000001',createdAt:serverTimestamp()}));
});
