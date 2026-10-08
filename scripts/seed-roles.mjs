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
}
for(const [nit,name,members] of [
  ['900000001','Empresa de demostración',{'admin@example.test':'admin','facturador@example.test':'billing','consulta@example.test':'viewer'}],
  ['900000002','Segunda empresa',{'otra@example.test':'admin'}]
]) {
  await db.doc('organizations/'+nit).set({name,nit,members,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
  await db.doc('organizations/'+nit+'/drafts/ejemplo').set({kind:'INVOICE',buyer:{name:'Comprador de prueba',identification:'123456'},reference_id:null,reason:null,currency:'COP',lines:[{description:'Servicio de prueba',quantityUnits:10000,priceCents:10000000,rate:19,subtotalCents:10000000,taxCents:1900000}],subtotalCents:10000000,taxCents:1900000,totalCents:11900000,status:'DRAFT',fiscal_validity:false,requestHash:'a'.repeat(64),createdAt:FieldValue.serverTimestamp()});
}
console.log('Cuentas ficticias: super, admin, facturador, consulta y otra @example.test. Contraseña local: DemoFirebase123!');
