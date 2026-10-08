import {saveProduct,normalizeProduct} from '../web/products.js';
import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInWithEmailAndPassword} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator,doc,getDoc,getDocs,collection,query,where,FieldPath,setDoc,updateDoc,serverTimestamp,writeBatch,runTransaction} from 'firebase/firestore';
import {createSparkDraft,createSparkCompany} from '../web/spark.js';
import {auditedSet} from '../web/audit.js';
import {registerUserRecord} from '../web/user-record.js';
const require=createRequire(new URL('../functions/package.json',import.meta.url));
const adminApp=require('firebase-admin/app'),adminAuth=require('firebase-admin/auth');
let env,app,db,uid,admin;
const project='demo-facturacion',company='900000010';
const profile={firstName:'Ana',lastName:'Prueba',documentType:'CC',identification:'1234567',phone:'3000000000',jobTitle:'Pruebas'};
const input=(key=crypto.randomUUID())=>({company_id:company,kind:'INVOICE',buyer_name:'Comprador',buyer_id:'123456',reference_id:'',reason:'',request_key:key,lines:[{description:'Servicio',quantity:'1',unit_price:'100.00',iva_rate:'19'}]});
const ctx=(role,verified=true)=>env.authenticatedContext(role,{email:role+'@example.test',email_verified:verified}).firestore();
before(async()=>{
 env=await initializeTestEnvironment({projectId:project,firestore:{host:'127.0.0.1',port:8181,rules:await readFile('firestore.rules','utf8')}});
 process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8181';
 admin=adminApp.initializeApp({projectId:project},'audit-tests');const auth=adminAuth.getAuth(admin);
 const adb=require('firebase-admin/firestore').getFirestore(admin);await adb.recursiveDelete(adb.doc('organizations/'+company));await adb.recursiveDelete(adb.doc('organizations/900000011'));for(const email of ['new@example.test','single@example.test','rogue@example.test'])await adb.doc('companyAssignments/'+email).delete();for(const id of ['new','fake','audit-owner','billing','viewer'])await adb.doc('registeredUsers/'+id).delete();
 try{await auth.createUser({uid:'audit-owner',email:'owner@example.test',password:'TestPassword123!',emailVerified:true});}catch(e){if(e.code!=='auth/uid-already-exists'&&e.code!=='auth/email-already-exists')throw e;}
 await auth.setCustomUserClaims('audit-owner',{platformAdmin:true});
 app=initializeApp({projectId:project,apiKey:'fake-key'},'audit-client');const client=getAuth(app);connectAuthEmulator(client,'http://127.0.0.1:9099',{disableWarnings:true});db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8181);
 uid=(await signInWithEmailAndPassword(client,'owner@example.test','TestPassword123!')).user.uid;
 await registerUserRecord(db,client.currentUser,profile);
});
after(async()=>{await deleteApp(app);await adminApp.deleteApp(admin);await env.cleanup();});
test('registro propio sin roles falsos ni lectura de otras fichas',async()=>{
 await assertSucceeds(setDoc(doc(ctx('new',false),'registeredUsers/new'),{...profile,uid:'new',email:'new@example.test',createdAt:serverTimestamp()}));
 await assertFails(setDoc(doc(ctx('fake'),'registeredUsers/fake'),{...profile,uid:'fake',email:'fake@example.test',platformAdmin:true,createdAt:serverTimestamp()}));
 await assertFails(getDoc(doc(ctx('new'),'registeredUsers/audit-owner')));
 await assertFails(updateDoc(doc(ctx('new'),'registeredUsers/new'),{firstName:'Otro'}));
});
test('empresa, alta y edición con historial exacto y reintento idempotente',async()=>{
 await createSparkCompany(db,uid,{nit:company,name:'Pruebas auditoría'});
 const data=input();await createSparkDraft(db,uid,data);
 const ref=doc(db,'organizations',company,'drafts',data.request_key),before=(await getDoc(ref)).data();
 assert.equal(before.version,1);
 const edited={...data,request_key:crypto.randomUUID(),lines:[{description:'Servicio editado',quantity:'2',unit_price:'100.00',iva_rate:'19'}]};
 await createSparkDraft(db,uid,edited,{id:ref.id,version:1});
 await createSparkDraft(db,uid,edited,{id:ref.id,version:1});
 const after=(await getDoc(ref)).data();assert.equal(after.version,2);assert.equal(after.totalCents,23800);assert.ok(after.createdAt.isEqual(before.createdAt));
 const event=(await getDoc(doc(db,'organizations',company,'audit',after.auditId))).data();assert.equal(event.actorUid,uid);assert.deepEqual(event.before,before);assert.deepEqual(event.after,after);
 await assert.rejects(createSparkDraft(db,uid,{...edited,request_key:crypto.randomUUID()},{id:ref.id,version:1}),/Otra persona/);
 await assertFails(updateDoc(ref,{totalCents:1}));await assertFails(updateDoc(doc(db,'organizations',company,'audit',after.auditId),{actorUid:'otro'}));
});
test('roles, aislamiento y rechazo de auditoría falsificada o omitida',async()=>{
 await env.withSecurityRulesDisabled(async c=>{
  const d=c.firestore();await updateDoc(doc(d,'organizations',company),{members:{'billing@example.test':'billing','viewer@example.test':'viewer'}});
  for(const role of ['billing','viewer'])await setDoc(doc(d,'registeredUsers',role),{...profile,uid:role,email:role+'@example.test',createdAt:serverTimestamp()});
 });
 for(const role of ['billing','viewer']) {
  await assertSucceeds(getDocs(query(collection(ctx(role),'organizations'),where(new FieldPath('members',role+'@example.test'),'in',['admin','billing','viewer']))));
  await assertFails(getDoc(doc(ctx(role),'organizations','900000099')));
 }
 const d=input();await createSparkDraft(db,uid,d);const ref=doc(db,'organizations',company,'drafts',d.request_key),old=(await getDoc(ref)).data();
 async function tamper(client,actor,patch={},before=old){const id=crypto.randomUUID(),target=doc(client,ref.path),after={...old,...patch,version:2,updatedBy:actor,auditId:id,updatedAt:serverTimestamp()};const b=writeBatch(client);b.set(target,after);b.set(doc(client,'organizations',company,'audit',id),{target:'drafts',targetId:ref.id,actorUid:actor,actorEmail:actor+'@example.test',at:serverTimestamp(),before,after});return b.commit();}
 await assertFails(tamper(ctx('viewer'),'viewer'));
 await assertFails(tamper(ctx('billing'),'someone'));
 await assertFails(tamper(ctx('billing'),'billing',{totalCents:1}));
 await assertFails(tamper(ctx('billing'),'billing',{}, {...old,buyer:{name:'Falso',identification:'123456'}}));
 await assertSucceeds(tamper(ctx('billing'),'billing',{lastOperation:crypto.randomUUID()}));
 await assertFails(getDocs(collection(ctx('viewer'),'organizations',company,'audit')));
});
test('notas bloquean cambios de factura referenciada y se rechaza editar emitidas',async()=>{
 const data=input();await createSparkDraft(db,uid,data);
 await createSparkDraft(db,uid,{...input(),kind:'CREDIT_NOTE',reference_id:data.request_key,reason:'Prueba'});
 const ref=doc(db,'organizations',company,'drafts',data.request_key),old=(await getDoc(ref)).data();assert.equal(old.referenceLocked,true);
 await assert.rejects(createSparkDraft(db,uid,input(),{id:ref.id,version:old.version}),/ya no permite/);
 const issued=input();await createSparkDraft(db,uid,issued);
 await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),'organizations',company,'drafts',issued.request_key),{status:'ISSUED',fiscal_validity:true}));
 await assert.rejects(createSparkDraft(db,uid,input(),{id:issued.request_key,version:1}),/ya no permite/);
});
test('datos tributarios y permisos requieren historial atómico',async()=>{
 const ref=doc(db,'organizations',company,'customers','CC_123456');
 const p={name:'Cliente',documentType:'CC',identification:'123456',dv:'',email:'prueba@example.test',phone:'',address:'Calle 1',department:'Bogotá',municipality:'Bogotá',taxResponsibilities:'Por confirmar',vatStatus:'por_confirmar',createdAt:serverTimestamp()};
 await runTransaction(db,async tx=>{await tx.get(ref);auditedSet(tx,db,ref,null,p);});
 await assertFails(updateDoc(ref,{name:'Cambio sin historial',updatedAt:serverTimestamp()}));
 await runTransaction(db,async tx=>{const old=(await tx.get(ref)).data();auditedSet(tx,db,ref,old,{...old,name:'Cambio con historial'});});
 const companyRef=doc(db,'organizations',company);
 await assertFails(updateDoc(companyRef,{members:{},updatedAt:serverTimestamp()}));
 await runTransaction(db,async tx=>{const old=(await tx.get(companyRef)).data();tx.set(doc(db,'companyAssignments','new@example.test'),{companyId:company});auditedSet(tx,db,companyRef,old,{...old,members:{...old.members,'new@example.test':'viewer'},memberChangeEmail:'new@example.test'});});
});
test('tres conceptos y actualización de importes sin superar límites de reglas',async()=>{
 const data=input();data.lines=Array.from({length:3},(_,i)=>({...data.lines[0],description:'Concepto '+i}));
 await createSparkDraft(db,uid,data);
 await createSparkDraft(db,uid,{...data,request_key:crypto.randomUUID(),lines:data.lines.map(l=>({...l,quantity:'2'}))},{id:data.request_key,version:1});
});
test('facturador edita tres conceptos y no puede alterar una factura emitida',async()=>{
 const data=input();data.lines=Array.from({length:3},(_,i)=>({...data.lines[0],description:'Línea '+i}));await createSparkDraft(db,uid,data);
 const ref=doc(db,'organizations',company,'drafts',data.request_key),old=(await getDoc(ref)).data();const client=ctx('billing'),id=crypto.randomUUID();
 const after={...old,version:2,auditId:id,updatedAt:serverTimestamp(),updatedBy:'billing',lastOperation:crypto.randomUUID()};
 const b=writeBatch(client);b.set(doc(client,ref.path),after);b.set(doc(client,'organizations',company,'audit',id),{target:'drafts',targetId:ref.id,actorUid:'billing',actorEmail:'billing@example.test',at:serverTimestamp(),before:old,after});await assertSucceeds(b.commit());
 await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),ref.path),{status:'ISSUED',fiscal_validity:true}));
 await assertFails(updateDoc(doc(client,ref.path),{status:'DRAFT',fiscal_validity:false}));
});

test('cliente registrado: rechazo de otra compañía o datos obsoletos y copia histórica',async()=>{
 const id='CC_7654321',ref=doc(db,'organizations',company,'customers',id);
 const value={name:'Cliente registrado',documentType:'CC',identification:'7654321',dv:'',email:'cliente@example.test',phone:'',address:'Calle 1',department:'Bogotá',municipality:'Bogotá',taxResponsibilities:'Por confirmar',vatStatus:'por_confirmar',createdAt:serverTimestamp()};
 await runTransaction(db,async tx=>{await tx.get(ref);auditedSet(tx,db,ref,null,value);});
 const data={...input(),customer_id:id,buyer_name:value.name,buyer_id:value.identification};
 await createSparkDraft(db,uid,data);
 await assert.rejects(createSparkDraft(db,uid,{...data,request_key:crypto.randomUUID(),customer_id:'CC_9999999'}),/cliente cambió/);
 await runTransaction(db,async tx=>{const old=await tx.get(ref);auditedSet(tx,db,ref,old.data(),{...old.data(),name:'Nombre nuevo'});});
 await assert.rejects(createSparkDraft(db,uid,{...data,request_key:crypto.randomUUID()}),/cliente cambió/);
 assert.equal((await getDoc(doc(db,'organizations',company,'drafts',data.request_key))).data().buyer.name,'Cliente registrado');
});


test('una compañía por usuario: reserva, duplicado, baja y traslado atómicos',async()=>{
 const second='900000011',email='single@example.test',binding=doc(db,'companyAssignments',email);
 await createSparkCompany(db,uid,{nit:second,name:'Prueba de aislamiento única'});
 async function assign(id,role){await runTransaction(db,async tx=>{
   const ref=doc(db,'organizations',id),snap=await tx.get(ref),old=snap.data(),current=await tx.get(binding);
   const members={...old.members};if(role)members[email]=role;else delete members[email];
   if(role&&!current.exists())tx.set(binding,{companyId:id});if(!role)tx.delete(binding);
   auditedSet(tx,db,ref,old,{...old,members,memberChangeEmail:email});
 });}
 await assign(company,'viewer');
 await assertFails(assign(second,'billing'));
 await assertFails(setDoc(binding,{companyId:second}));
 await assertFails(setDoc(doc(db,'companyAssignments','rogue@example.test'),{companyId:second}));
 await assertFails(runTransaction(db,async tx=>{const ref=doc(db,'organizations',second),old=(await tx.get(ref)).data();auditedSet(tx,db,ref,old,{...old,members:{[email]:'viewer','rogue@example.test':'admin'},memberChangeEmail:email});}));
 await assign(company,null);await assign(second,'billing');
 assert.equal((await getDoc(binding)).data().companyId,second);
 assert.equal((await getDoc(doc(db,'organizations',company))).data().members[email],undefined);
});


test('catálogo: alta, edición, duplicados, versiones y desactivación conservan documentos',async()=>{
 const inputProduct={code:'SERV-001',name:'Servicio de prueba',description:'Producto ficticio',type:'SERVICE',price:'1200.50',rate:'19',active:'true'};
 const p=normalizeProduct(inputProduct);assert.equal(p.priceCents,120050);
 for(const invalid of ['0','-1','1.001','1e2','1,50'])assert.throws(()=>normalizeProduct({...inputProduct,price:invalid}));
 await saveProduct(db,company,inputProduct);
 const ref=doc(db,'organizations',company,'products','SERV-001'),old=(await getDoc(ref)).data();
 await assert.rejects(saveProduct(db,company,inputProduct),/existe/);
 const invoice={...input(),lines:[{description:p.name,quantity:'1',unit_price:inputProduct.price,iva_rate:'19'}]};await createSparkDraft(db,uid,invoice);
 await saveProduct(db,company,{...inputProduct,price:'1500.00',active:'false'},{code:p.code,version:old.version});
 await assert.rejects(saveProduct(db,company,inputProduct,{code:p.code,version:old.version}),/Otra persona/);
 assert.equal((await getDoc(ref)).data().active,false);
 assert.equal((await getDoc(doc(db,'organizations',company,'drafts',invoice.request_key))).data().lines[0].priceCents,120050);
});
test('catálogo: aislamiento, consulta permitida y escritura restringida con auditoría',async()=>{
 const ref=doc(db,'organizations',company,'products','SERV-001'),old=(await getDoc(ref)).data();
 for(const role of ['billing','viewer']){
  const client=ctx(role);await assertSucceeds(getDoc(doc(client,ref.path)));
  const auditId=crypto.randomUUID(),after={...old,name:'Alterado',version:old.version+1,auditId,updatedAt:serverTimestamp(),updatedBy:role};
  const batch=writeBatch(client);batch.set(doc(client,ref.path),after);batch.set(doc(client,'organizations',company,'audit',auditId),{target:'products',targetId:'SERV-001',actorUid:role,actorEmail:role+'@example.test',at:serverTimestamp(),before:old,after});await assertFails(batch.commit());
 }
 await assertFails(getDoc(doc(ctx('outsider'),ref.path)));
 await assertFails(updateDoc(ref,{priceCents:10}));
 // Use a literal map field path to avoid treating the email dots as nesting.
 await env.withSecurityRulesDisabled(async context=>{const r=doc(context.firestore(),'organizations',company),d=(await getDoc(r)).data();await updateDoc(r,{members:{...d.members,'admin@example.test':'admin'}});});
 const client=ctx('admin'),auditId=crypto.randomUUID(),after={...old,name:'Edición administradora',version:old.version+1,auditId,updatedAt:serverTimestamp(),updatedBy:'admin'};
 const batch=writeBatch(client);batch.set(doc(client,ref.path),after);batch.set(doc(client,'organizations',company,'audit',auditId),{target:'products',targetId:'SERV-001',actorUid:'admin',actorEmail:'admin@example.test',at:serverTimestamp(),before:old,after});
 await env.withSecurityRulesDisabled(async context=>{await setDoc(doc(context.firestore(),'registeredUsers','admin'),{...profile,uid:'admin',email:'admin@example.test',createdAt:serverTimestamp()});});
 await assertSucceeds(batch.commit());
});

test('datos históricos y pago: captura, preservación, actualización explícita y notas',async()=>{
 const issuerRef=doc(db,'organizations',company,'profiles','tax'),customerRef=doc(db,'organizations',company,'customers','CC_7654321');
 const c=(await getDoc(customerRef)).data();
 await runTransaction(db,async tx=>{const old=await tx.get(issuerRef);auditedSet(tx,db,issuerRef,old.exists()?old.data():null,{...c,name:'Emisor original',documentType:'NIT',identification:company,dv:'1',createdAt:serverTimestamp()});});
 const data={...input('prueba-historica-pago'),schema_version:2,customer_id:customerRef.id,buyer_name:c.name,buyer_id:c.identification,document_date:'2026-12-31',payment_form:'CREDIT',payment_days:'30',payment_method:'TRANSFER'};
 await createSparkDraft(db,uid,data);await createSparkDraft(db,uid,data);
 const ref=doc(db,'organizations',company,'drafts',data.request_key),first=(await getDoc(ref)).data();
 assert.equal(first.context.issuer.name,'Emisor original');assert.equal(first.context.buyer.address,c.address);assert.equal(first.payment.dueDate.toDate().toISOString().slice(0,10),'2027-01-30');assert.equal(first.version,1);
 await runTransaction(db,async tx=>{const old=(await tx.get(issuerRef)).data();auditedSet(tx,db,issuerRef,old,{...old,name:'Emisor nuevo'});});
 await runTransaction(db,async tx=>{const old=(await tx.get(customerRef)).data();auditedSet(tx,db,customerRef,old,{...old,address:'Dirección nueva'});});
 await createSparkDraft(db,uid,{...data,request_key:crypto.randomUUID(),payment_days:'15'},{id:ref.id,version:1});
 let saved=(await getDoc(ref)).data();assert.deepEqual(saved.context,first.context);
 await createSparkDraft(db,uid,{...data,request_key:crypto.randomUUID(),refresh_context:true},{id:ref.id,version:2});
 saved=(await getDoc(ref)).data();assert.equal(saved.context.issuer.name,'Emisor nuevo');assert.equal(saved.context.buyer.address,'Dirección nueva');
 async function tamper(patch){await runTransaction(db,async tx=>{const old=(await tx.get(ref)).data();auditedSet(tx,db,ref,old,{...old,...patch});});}
 await assertFails(tamper({context:{...saved.context,issuer:{...saved.context.issuer,name:'Falso'}}}));
 await assertFails(tamper({context:null}));
 await assertFails(tamper({payment:{...saved.payment,days:31}}));
 await assertFails(tamper({payment:{...saved.payment,form:'CASH'}}));
 await assertFails(tamper({schemaVersion:1}));
 await createSparkDraft(db,uid,{...input('nota-historica-prueba-2026'),schema_version:2,kind:'CREDIT_NOTE',buyer_name:c.name,buyer_id:c.identification,reference_id:ref.id,reason:'Prueba'});
 const note=(await getDoc(doc(db,'organizations',company,'drafts','nota-historica-prueba-2026'))).data();assert.deepEqual(note.context,saved.context);assert.equal(note.payment,null);
});
test('documentos antiguos siguen legibles y su edición no inventa datos históricos',async()=>{
 const data=input('antiguo-sin-ficha-prueba-2026');await createSparkDraft(db,uid,data);
 await createSparkDraft(db,uid,{...data,schema_version:2,request_key:crypto.randomUUID(),document_date:'2026-10-05',payment_form:'CASH',payment_days:'0',payment_method:'UNSPECIFIED'},{id:data.request_key,version:1});
 const d=(await getDoc(doc(db,'organizations',company,'drafts',data.request_key))).data();assert.equal(d.context,null);assert.equal(d.payment.days,0);
});
test('facturador guarda y edita tres conceptos con datos históricos y vencimiento',async()=>{
 const client=ctx('billing'),sample=(await getDoc(doc(db,'organizations',company,'drafts','prueba-historica-pago'))).data();
 const id=crypto.randomUUID(),ref=doc(client,'organizations',company,'drafts',id);
 async function write(before,patch){
  const auditId=crypto.randomUUID(),after={...patch,createdAt:before?.createdAt||serverTimestamp(),version:(before?.version||0)+1,auditId,updatedBy:'billing',updatedAt:serverTimestamp(),lastOperation:auditId};
  const batch=writeBatch(client);batch.set(ref,after);batch.set(doc(client,'organizations',company,'audit',auditId),{target:'drafts',targetId:id,actorUid:'billing',actorEmail:'billing@example.test',at:serverTimestamp(),before,after});return batch.commit();
 }
 const base={...sample,referenceLocked:false,lines:Array(3).fill(sample.lines[0]),subtotalCents:sample.subtotalCents*3,taxCents:sample.taxCents*3,totalCents:sample.totalCents*3};
 await assertSucceeds(write(null,base));
 const old=(await getDoc(ref)).data();
 await assertSucceeds(write(old,{...old,lines:old.lines.map(l=>({...l,quantityUnits:l.quantityUnits*2,subtotalCents:l.subtotalCents*2,taxCents:l.taxCents*2})),subtotalCents:old.subtotalCents*2,taxCents:old.taxCents*2,totalCents:old.totalCents*2}));
});
test('descuentos e IVA: guarda, reabre, edita y rechaza importes manipulados',async()=>{
 const data={...input('descuentos-prueba-2026-10'),lines:[{description:'Gravado',quantity:'1',unit_price:'1000',iva_rate:'19',discount_rate:'10'},{description:'Exento',quantity:'2',unit_price:'100',iva_rate:'EXEMPT',discount_rate:'5'},{description:'Excluido',quantity:'1',unit_price:'50',iva_rate:'EXCLUDED',discount_rate:'0'}]};
 await createSparkDraft(db,uid,data);await createSparkDraft(db,uid,data);
 const ref=doc(db,'organizations',company,'drafts',data.request_key),old=(await getDoc(ref)).data();assert.equal(old.totalCents,131100);assert.equal(old.lines[0].discountCents,10000);assert.equal(old.lines[1].taxTreatment,'EXEMPT');
 const {unpackDraft}=await import('../web/spark.js');const unpacked=unpackDraft(old);assert.equal(unpacked.discount,'110.00');
 await createSparkDraft(db,uid,{...data,lines:unpacked.lines,request_key:crypto.randomUUID()},{id:ref.id,version:1});
 for(const patch of [{discountBps:10001},{discountCents:1},{grossCents:1},{subtotalCents:1},{taxCents:1},{taxTreatment:'EXEMPT'},{rate:0}]){
  await assertFails(runTransaction(db,async tx=>{const before=(await tx.get(ref)).data();auditedSet(tx,db,ref,before,{...before,lines:[{...before.lines[0],...patch},...before.lines.slice(1)]});}));
 }
 for(const index of [1,2])await assertFails(runTransaction(db,async tx=>{const before=(await tx.get(ref)).data();const lines=before.lines.map((l,i)=>i===index?{...l,discountBps:10001}:l);auditedSet(tx,db,ref,before,{...before,lines});}));
 await createSparkDraft(db,uid,{...input(),kind:'CREDIT_NOTE',reference_id:ref.id,reason:'Ajuste de prueba con descuento',lines:data.lines});
 const client=ctx('billing');
 const sample=(await getDoc(doc(db,'organizations',company,'drafts','prueba-historica-pago'))).data();
 const id=crypto.randomUUID(),target=doc(client,'organizations',company,'drafts',id);
 async function write(before,lines){const auditId=crypto.randomUUID(),after={...sample,referenceLocked:false,lines,subtotalCents:lines.reduce((s,l)=>s+l.subtotalCents,0),taxCents:lines.reduce((s,l)=>s+l.taxCents,0),totalCents:lines.reduce((s,l)=>s+l.subtotalCents+l.taxCents,0),createdAt:before?.createdAt||serverTimestamp(),version:(before?.version||0)+1,auditId,updatedBy:'billing',updatedAt:serverTimestamp(),lastOperation:auditId};
 const b=writeBatch(client);b.set(target,after);b.set(doc(client,'organizations',company,'audit',auditId),{target:'drafts',targetId:id,actorUid:'billing',actorEmail:'billing@example.test',at:serverTimestamp(),before,after});return b.commit();}
 await assertSucceeds(write(null,Array(3).fill(old.lines[0])));const saved=(await getDoc(target)).data();await assertSucceeds(write(saved,old.lines));
});
