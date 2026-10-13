// Datos ficticios: nunca conecta con un proyecto real.
import {createRequire} from 'node:module';
const require = createRequire(new URL('../functions/package.json',import.meta.url));
const {initializeApp} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8181';
initializeApp({projectId:'demo-facturacion'});
const auth=getAuth(),db=getFirestore();
for(const role of ['super','admin','facturador','consulta','otra']) {
  const uid='roles-'+role,email=role+'@example.test';
  try{await auth.getUser(uid);}catch(e){if(e.code!=='auth/user-not-found')throw e;await auth.createUser({uid,email,password:'DemoFirebase123!',emailVerified:true});}
  await auth.setCustomUserClaims(uid,role==='super'?{platformAdmin:true}:{});
  await db.doc('registeredUsers/'+uid).set({uid,email,firstName:'Usuario',lastName:role,documentType:'CC',identification:String(1000000+['super','admin','facturador','consulta','otra'].indexOf(role)),phone:'3000000000',jobTitle:'Pruebas',createdAt:FieldValue.serverTimestamp()});
}
for(const [nit,name,members] of [
  ['900000001','Empresa de demostración',{'admin@example.test':'admin','facturador@example.test':'billing','consulta@example.test':'viewer'}],
  ['900000002','Segunda empresa',{'otra@example.test':'admin'}]
]) {
  await db.doc('organizations/'+nit).set({name,nit,members,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
  await db.doc('organizations/'+nit+'/drafts/ejemplo').set({kind:'INVOICE',buyer:{name:'Comprador de prueba',identification:'123456'},reference_id:null,reason:null,currency:'COP',lines:[{description:'Servicio de prueba',quantityUnits:10000,priceCents:10000000,rate:19,subtotalCents:10000000,taxCents:1900000}],subtotalCents:10000000,taxCents:1900000,totalCents:11900000,status:'DRAFT',fiscal_validity:false,requestHash:'a'.repeat(64),createdAt:FieldValue.serverTimestamp()});
}
for(const [email,companyId]of [['admin@example.test','900000001'],['facturador@example.test','900000001'],['consulta@example.test','900000001'],['otra@example.test','900000002']])await db.doc('companyAssignments/'+email).set({companyId});
const customer={name:'Cliente de demostración',documentType:'NIT',identification:'900000099',dv:'1',email:'cliente@example.test',phone:'3001234567',address:'Calle 10 # 20-30',department:'Bogotá D.C.',municipality:'Bogotá D.C.',taxResponsibilities:'Por confirmar',vatStatus:'por_confirmar',createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),version:1,auditId:'seed-customer-900000099',updatedBy:'seed'};
await db.doc('organizations/900000001/customers/NIT_900000099').set(customer);
console.log('Cuentas ficticias: super, admin, facturador, consulta y otra @example.test. Contraseña local: DemoFirebase123!');
