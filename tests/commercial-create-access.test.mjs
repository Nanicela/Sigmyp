import {before,after,test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,writeBatch,serverTimestamp} from 'firebase/firestore';
import {normalizeQuotation,quotationToday,runQuotationTransaction} from '../web/commercial-quotation.js';
let env;const company='500123568',root='organizations/'+company,accountKey='a'.repeat(64),contactKey='b'.repeat(64),officeKey='c'.repeat(64);
const context=role=>env.authenticatedContext(role,{email:role+'@test.example',email_verified:true,platformAdmin:role==='platform'}).firestore();
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-commercial-create',firestore:{host:'127.0.0.1',port:8181,rules:await readFile(process.env.MIGRATION_RULES_FILE,'utf8')}});await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();await setDoc(doc(db,root),{members:{'admin@test.example':'admin','viewer@test.example':'viewer'}});for(const role of ['admin','viewer','outsider','platform'])await setDoc(doc(db,'registeredUsers/'+role),{uid:role});for(const [table,key,data] of [['accounts',accountKey,{id:1}],['contacts',contactKey,{id:2,account_id:1}],['offices',officeKey,{id:3,contact_id:2}]])await setDoc(doc(db,root+'/legacyData/'+table+'/records/'+key),{data});});});
after(async()=>env?.cleanup());
function audit(batch,db,target,id,values,role='admin',before=null){const auditId=crypto.randomUUID(),after={...values,version:(before?.version||0)+1,auditId,updatedBy:role,updatedAt:serverTimestamp()};batch.set(doc(db,root+'/'+target+'/'+id),after);batch.set(doc(db,root+'/audit/'+auditId),{target,targetId:id,actorUid:role,actorEmail:role+'@test.example',at:serverTimestamp(),before,after});}
const contact=()=>({name:'Nuevo',jobTitle:'',phone1:'123',phone2:'',mobile:'',email:'',comments:'',sourceId:null,customerId:'legacy-account-1',accountDocumentId:accountKey,createdAt:serverTimestamp()});
const office=()=>({name:'Oficina',type:'Principal',address:'',municipality:'',department:'',phone1:'',phone2:'',email:'',technicianName:'',technicianPhone:'',technicianEmail:'',comments:'',sourceId:null,customerId:'legacy-account-1',accountDocumentId:accountKey,contactId:'legacy-contact-2',contactDocumentId:contactKey,createdAt:serverTimestamp()});
async function create(target,values,role='admin'){const db=context(role),id='new_'+crypto.randomUUID(),b=writeBatch(db);audit(b,db,target,id,{...values,sourceDocumentId:id},role);await b.commit();return id;}
test('crea maestros con vínculos válidos y rechaza cruces o roles de consulta',async()=>{
 const id=await assertSucceeds(create('commercialContacts',contact()));
 await assertSucceeds(create('commercialOffices',office()));
 await assertSucceeds(create('commercialOffices',{...office(),contactId:id,contactDocumentId:id}));
 await assertFails(create('commercialContacts',{...contact(),customerId:'legacy-account-99'}));
 await assertFails(create('commercialOffices',{...office(),contactId:'legacy-contact-99'}));
 for(const role of ['viewer','outsider'])await assertFails(create('commercialContacts',contact(),role));
 const db=context('admin'),before=(await getDoc(doc(db,root+'/commercialContacts/'+id))).data(),b=writeBatch(db);audit(b,db,'commercialContacts',id,{...before,name:'Editado'},'admin',before);await assertSucceeds(b.commit());
});
function quoteValues(count=1){const date=quotationToday(),values=normalizeQuotation({date,validUntil:date,lines:Array.from({length:count},()=>({description:'Servicio',quantity:'1.5',price:'125.25',discount:5,rate:19}))});return {...values,companyId:company,customerId:'legacy-account-1',accountDocumentId:accountKey,contactId:'legacy-contact-2',contactDocumentId:contactKey,officeId:'legacy-office-3',officeDocumentId:officeKey,snapshot:{accountName:'Cuenta',identification:'1',accountEmail:'',address:'',city:'',contactName:'Contacto',contactEmail:'',contactPhone:'',officeName:'Oficina'},createdAt:serverTimestamp(),createdBy:'admin'};}
async function quote(extra={},count=1,role='admin',omitCounter=false){const db=context(role),id='new_'+crypto.randomUUID(),values={...quoteValues(count),...extra,createdBy:role},counter=doc(db,root+'/commercialCounters/quotations-'+values.businessYear);return runQuotationTransaction(db,counter,async (tx,last)=>{const sequence=last+1;audit(tx,db,'commercialQuotations',id,{...values,sequence,number:'COT-'+values.businessYear+'-'+sequence},role);if(!omitCounter)tx.set(counter,{last:sequence,lastQuotationId:id,updatedAt:serverTimestamp()});return id;});}
test('crea cotización de tres conceptos y verifica importes, relaciones, auditoría y consecutivo',async()=>{
 await assertSucceeds(quote({},3));
 await assertFails(quote({totalCents:1}));await assertFails(quote({customerId:'legacy-account-99'}));await assertFails(quote({},1,'admin',true));await assertFails(quote({},1,'viewer'));
 await assertSucceeds(quote());const ids=await Promise.all([quote(),quote()]);const db=context('admin');const records=await Promise.all(ids.map(id=>getDoc(doc(db,root+'/commercialQuotations/'+id))));assert.notEqual(records[0].data().number,records[1].data().number);
 await assertSucceeds(getDoc(doc(context('viewer'),root+'/commercialQuotations/'+ids[0])));
});
test('edición nativa mantiene consecutivo, vínculos y origen; exige importes y auditoría',async()=>{
 const id=await quote({},3),db=context('admin'),ref=doc(db,root+'/commercialQuotations/'+id),before=(await getDoc(ref)).data();
 const edit=async(extra={},role='admin',withAudit=true)=>{const db=context(role),b=writeBatch(db),values={...before,...normalizeQuotation({date:quotationToday(),validUntil:quotationToday(),lines:Array.from({length:3},()=>({description:'Actualizado',quantity:2,price:100,discount:10,rate:19}))}),...extra};if(withAudit)audit(b,db,'commercialQuotations',id,values,role,before);else b.set(doc(db,root+'/commercialQuotations/'+id),values);return b.commit();};
 await assertFails(edit({number:'COT-otro'}));await assertFails(edit({customerId:'legacy-account-99'}));await assertFails(edit({totalCents:1}));await assertFails(edit({},'viewer'));await assertFails(edit({},'admin',false));await assertSucceeds(edit());await assertFails(edit());
 const after=(await getDoc(ref)).data();assert.equal(after.number,before.number);assert.equal(after.version,2);
});
test('condiciones importadas se actualizan sin alterar el original ni importes',async()=>{
 const id='d'.repeat(64);await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),root+'/legacyData/quotations/records/'+id),{data:{id:25,total:345}}));
 const values={sourceId:25,sourceDocumentId:id,paymentMethod:'Contado',warranty:'1 año',deliveryTime:'5 días',comments:'Actualizado'};
 const save=async(extra={},role='admin',before=null)=>{const db=context(role),b=writeBatch(db);audit(b,db,'commercialQuotationEdits',id,{...values,...extra},role,before);return b.commit();};
 await assertFails(save({},'viewer'));await assertFails(save({sourceId:26}));await assertFails(save({total:0}));await assertSucceeds(save());
 const db=context('admin'),before=(await getDoc(doc(db,root+'/commercialQuotationEdits/'+id))).data();await assertSucceeds(save({comments:'Segunda revisión'},'admin',before));await assertFails(save());
 assert.equal((await getDoc(doc(db,root+'/legacyData/quotations/records/'+id))).data().data.total,345);
 await assertSucceeds(getDoc(doc(context('viewer'),root+'/commercialQuotationEdits/'+id)));
});
test('productos importados exigen cálculos completos, auditoría y administrador',async()=>{
 const id='e'.repeat(64);await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),root+'/legacyData/quotations/records/'+id),{data:{id:26,total:900}}));
 const {importedPricing}=await import('../web/commercial-quotation.js');const pricing=importedPricing({lines:Array.from({length:3},()=>({description:'Servicio',quantity:'2',price:'100',discount:'10',rate:19}))});
 const values={sourceId:26,sourceDocumentId:id,paymentMethod:'',warranty:'',deliveryTime:'',comments:'',pricing};
 const save=async(p=pricing,role='admin',withAudit=true)=>{const db=context(role),b=writeBatch(db);if(withAudit)audit(b,db,'commercialQuotationEdits',id,{...values,pricing:p},role);else b.set(doc(db,root+'/commercialQuotationEdits/'+id),{...values,pricing:p});return b.commit();};
 await assertFails(save(pricing,'viewer'));await assertFails(save(pricing,'outsider'));await assertFails(save(pricing,'admin',false));await assertFails(save({...pricing,totalCents:1}));
 for(const index of [0,1,2]){const tampered=structuredClone(pricing);tampered.lines[index].unitPriceCents=1;await assertFails(save(tampered));}
 await assertSucceeds(save());assert.equal((await getDoc(doc(context('admin'),root+'/legacyData/quotations/records/'+id))).data().data.total,900);
});
