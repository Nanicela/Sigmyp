import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const projectId = 'demo-facturacion';
let env, admin, adminDb, token;
before(async () => {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8181' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099')
    throw new Error('Estas pruebas solo se ejecutan con los emuladores locales indicados.');
  env = await initializeTestEnvironment({ projectId, firestore: { rules: await readFile('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8181 } });
  await env.clearFirestore(); admin = initializeApp({ projectId }, 'integration-test'); adminDb = getFirestore(admin);
  const auth = getAuth(admin);
  try { await auth.deleteUser('editor-test'); } catch (e) { if (e.code !== 'auth/user-not-found') throw e; }
  await auth.createUser({ uid: 'editor-test', email: 'editor@example.test', password: 'ExamplePassword123!' });
  const res = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'editor@example.test', password: 'ExamplePassword123!', returnSecureToken: true }) });
  token = (await res.json()).idToken; assert.ok(token);
  await adminDb.doc('companies/empresa-a').set({ name: 'Empresa A' });
  await adminDb.doc('companies/empresa-b').set({ name: 'Empresa B' });
  await adminDb.doc('companies/empresa-a/members/editor-test').set({ active: true, role: 'editor' });
  await adminDb.doc('companies/empresa-a/members/lector').set({ active: true, role: 'viewer' });
  await adminDb.doc('companies/empresa-a/drafts/original').set({ kind: 'INVOICE', buyer: { name: 'Comprador', identification: '123456' } });
});
after(async () => { await env?.cleanup(); if (admin) await deleteApp(admin); });
test('reglas: usuario anónimo y usuario de otra empresa no pueden leer', async () => {
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'companies/empresa-a/drafts/original')));
  await assertFails(getDoc(doc(env.authenticatedContext('extraño').firestore(), 'companies/empresa-a/drafts/original')));
  await assertSucceeds(getDoc(doc(env.authenticatedContext('editor-test').firestore(), 'companies/empresa-a/drafts/original')));
  await assertFails(getDoc(doc(env.authenticatedContext('editor-test').firestore(), 'companies/empresa-b')));
});
test('reglas: no puede falsificar documentos, membresías ni auditoría', async () => {
  const db = env.authenticatedContext('editor-test').firestore();
  for (const path of ['companies/empresa-a/drafts/falso', 'companies/empresa-b/members/editor-test', 'companies/empresa-a/audit/falso'])
    await assertFails(setDoc(doc(db, path), { role: 'owner', status: 'VALIDATED' }));
  await assertFails(getDocs(collection(db, 'companies')));
});
const payload = { company_id: 'empresa-a', request_key: 'save-1', kind: 'INVOICE', buyer_name: 'Comprador', buyer_id: '123456',
  lines: [{ description: 'Servicio', quantity: '1', unit_price: '100000.00', iva_rate: '19' }] };
async function call(data, bearer = token, name = 'createDraft') {
  const res = await fetch(`http://127.0.0.1:5501/${projectId}/us-central1/${name}`, { method: 'POST',
    headers: { 'content-type': 'application/json', ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) }, body: JSON.stringify({ data }) });
  return { status: res.status, body: await res.json() };
}
test('función: exige sesión y pertenencia a la empresa', async () => {
  assert.equal((await call(payload, '')).status, 401);
  assert.equal((await call({ ...payload, company_id: 'empresa-b' })).status, 403);
});
test('función: calcula, guarda auditoría y evita duplicados incluso con concurrencia', async () => {
  const results = await Promise.all([call(payload), call(payload)]);
  assert.equal(results[0].status, 200); assert.equal(results[1].status, 200);
  const id = results[0].body.result.id; assert.equal(results[1].body.result.id, id);
  const document = (await adminDb.doc(`companies/empresa-a/drafts/${id}`).get()).data();
  assert.equal(document.total, '119000.00'); assert.equal(document.fiscal_validity, false); assert.equal(document.status, 'DRAFT');
  assert.equal((await adminDb.collection('companies/empresa-a/audit').where('draftId', '==', id).get()).size, 1);
  assert.equal((await call({ ...payload, buyer_name: 'Otra persona' })).status, 409);
});
test('función: nota referencia factura propia y conserva comprador', async () => {
  assert.equal((await call({ ...payload, request_key: 'note-1', kind: 'CREDIT_NOTE', reference_id: 'original', reason: 'Devolución' })).status, 200);
  assert.equal((await call({ ...payload, request_key: 'note-2', kind: 'DEBIT_NOTE', reference_id: 'original', reason: 'Ajuste' })).status, 200);
  assert.equal((await call({ ...payload, request_key: 'note-3', kind: 'CREDIT_NOTE', reference_id: 'original', reason: 'Devolución', buyer_id: '999999' })).status, 400);
  assert.equal((await call({ ...payload, request_key: 'note-4', kind: 'CREDIT_NOTE', reference_id: 'missing', reason: 'Devolución' })).status, 400);
});
test('función: registrar empresa requiere administración del proveedor', async () => {
  assert.equal((await call({ name: 'Ejemplo', nit: '123456789' }, token, 'createCompany')).status, 403);
});
test('revocación de membresía impide leer y crear', async () => {
  await adminDb.doc('companies/empresa-a/members/editor-test').update({ active: false });
  await assertFails(getDoc(doc(env.authenticatedContext('editor-test').firestore(), 'companies/empresa-a/drafts/original')));
  assert.equal((await call({ ...payload, request_key: 'revoked' })).status, 403);
});
