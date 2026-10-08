import { before, after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
let env, db;
const company = 'workspaces/alice/companies/900000001';
const line = { description: 'Servicio', quantityUnits: 10000, priceCents: 10000000, rate: 19, subtotalCents: 10000000, taxCents: 1900000 };
const draft = () => ({ kind: 'INVOICE', buyer: { name: 'Ejemplo', identification: '123456' }, reference_id: null, reason: null,
  currency: 'COP', lines: [line], subtotalCents: 10000000, taxCents: 1900000, totalCents: 11900000, status: 'DRAFT', fiscal_validity: false,
  requestHash: 'a'.repeat(64), createdAt: serverTimestamp() });
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-spark-tests', firestore: { host: '127.0.0.1', port: 8181, rules: await readFile('firestore.rules','utf8') } });
  await env.clearFirestore(); db = env.authenticatedContext('alice').firestore();
});
after(async () => env?.cleanup());
test('operador registra su empresa; terceros no leen ni escriben', async () => {
  await assertSucceeds(setDoc(doc(db, company), { name: 'Ejemplo', nit: '900000001', createdAt: serverTimestamp() }));
  await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(), company)));
  await assertFails(setDoc(doc(env.authenticatedContext('bob').firestore(), company + '/drafts/falso'), draft()));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), company)));
});
test('reglas verifican totales y bloquean modificación de documentos', async () => {
  await assertSucceeds(setDoc(doc(db, company + '/drafts/valid'), draft()));
  await assertFails(setDoc(doc(db, company + '/drafts/invalid'), { ...draft(), totalCents: 1 }));
  await assertFails(setDoc(doc(db, company + '/drafts/invalid-line'), { ...draft(), lines: [{ ...line, taxCents: 1 }] }));
  await assertFails(setDoc(doc(db, company + '/drafts/fiscal'), { ...draft(), fiscal_validity: true }));
  await assertFails(updateDoc(doc(db, company + '/drafts/valid'), { totalCents: 1 }));
});
test('tres conceptos válidos y límites de cantidad e importe', async () => {
  await assertSucceeds(setDoc(doc(db, company + '/drafts/ten'), { ...draft(), lines: Array(3).fill(line), subtotalCents: 30000000, taxCents: 5700000, totalCents: 35700000 }));
  await assertFails(setDoc(doc(db, company + '/drafts/eleven'), { ...draft(), lines: Array(4).fill(line) }));
  await assertFails(setDoc(doc(db, company + '/drafts/negative'), { ...draft(), lines: [{ ...line, quantityUnits: -1 }] }));
});
test('notas requieren referencia propia y mismo comprador', async () => {
  await assertSucceeds(setDoc(doc(db, company + '/drafts/note'), { ...draft(), kind: 'CREDIT_NOTE', reference_id: 'valid', reason: 'Devolución' }));
  await assertFails(setDoc(doc(db, company + '/drafts/note-bad'), { ...draft(), kind: 'CREDIT_NOTE', reference_id: 'valid', reason: 'Devolución', buyer: { name: 'Otro', identification: '999999' } }));
});

const profile = () => ({ name:'Cliente de prueba',documentType:'NIT',identification:'900000001',dv:'7',email:'prueba@example.test',phone:'',address:'Calle de prueba 1',department:'Bogotá D.C.',municipality:'Bogotá D.C.',taxResponsibilities:'Por confirmar con RUT',vatStatus:'por_confirmar',createdAt:serverTimestamp(),updatedAt:serverTimestamp() });
test('fichas y clientes privados; validación e identidad inmutable', async () => {
  const tax = doc(db,company+'/profiles/tax'), customer = doc(db,company+'/customers/NIT_900000001');
  await assertSucceeds(setDoc(tax,profile()));
  await assertSucceeds(setDoc(customer,profile()));
  await assertSucceeds(updateDoc(customer,{address:'Calle nueva 2',updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(customer,{identification:'123456',updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(customer,{dv:'',updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(customer,{email:'incorrecto',updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(customer,{admin:true,updatedAt:serverTimestamp()}));
  await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(),company+'/customers/NIT_900000001')));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),company+'/profiles/tax')));
  await assertFails(setDoc(doc(db,'workspaces/alice/companies/999999/customers/NIT_900000001'),profile()));
  await assertFails(setDoc(doc(db,company+'/customers/otro-id'),profile()));
  await assertFails(updateDoc(tax,{documentType:'CC',dv:'',updatedAt:serverTimestamp()}));
  await assertSucceeds(setDoc(doc(db,company+'/customers/CC_123456'),{...profile(),documentType:'CC',identification:'123456',dv:''}));
});
