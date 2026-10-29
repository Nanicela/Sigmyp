const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { createHash } = require('node:crypto');
const { ValidationError, text, identifier, pathId, normalizeDraft } = require('./domain.cjs');
initializeApp();
const db = getFirestore();
setGlobalOptions({ region: 'us-central1', maxInstances: 3, timeoutSeconds: 30, memory: '256MiB' });
const options = { enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true' };
function uidOf(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  return request.auth.uid;
}
function callable(handler) {
  return onCall(options, async request => {
    try { return await handler(request); }
    catch (error) {
      if (error instanceof HttpsError) throw error;
      if (error instanceof ValidationError) throw new HttpsError('invalid-argument', error.message);
      // No incluir datos fiscales ni credenciales en logs o respuestas.
      throw new HttpsError('internal', 'No fue posible guardar. Reintenta con la misma solicitud.');
    }
  });
}
exports.createCompany = callable(async request => {
  const uid = uidOf(request);
  if (request.auth.token.platformAdmin !== true) throw new HttpsError('permission-denied', 'Solo la administración del proveedor puede registrar empresas.');
  const data = request.data || {};
  const name = text(data.name, 'Razón social'), nit = identifier(data.nit, 'NIT sin dígito de verificación');
  const ref = db.collection('companies').doc(nit);
  await db.runTransaction(async tx => {
    if ((await tx.get(ref)).exists) throw new HttpsError('already-exists', 'Esta empresa ya está registrada.');
    tx.create(ref, { name, nit, createdAt: FieldValue.serverTimestamp(), createdBy: uid });
    tx.create(ref.collection('members').doc(uid), { role: 'owner', active: true });
    tx.set(db.doc(`users/${uid}/companies/${nit}`), { name, nit });
    tx.create(ref.collection('audit').doc(), { event: 'company.created', actor: uid, createdAt: FieldValue.serverTimestamp() });
  });
  return { id: nit, name, nit };
});
exports.createDraft = callable(async request => {
  const uid = uidOf(request), data = request.data || {};
  const companyId = pathId(data.company_id), requestId = pathId(data.request_key);
  const body = normalizeDraft(data);
  const hash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const company = db.doc(`companies/${companyId}`);
  const draftRef = company.collection('drafts').doc();
  const keyRef = company.collection('requests').doc(requestId);
  return db.runTransaction(async tx => {
    const membership = await tx.get(company.collection('members').doc(uid));
    if (!membership.exists || membership.data().active !== true || !['owner', 'editor'].includes(membership.data().role))
      throw new HttpsError('permission-denied', 'No tienes permiso para crear documentos en esta empresa.');
    const existing = await tx.get(keyRef);
    if (existing.exists) {
      if (existing.data().hash !== hash) throw new HttpsError('already-exists', 'Esta solicitud ya se usó con otro contenido.');
      return { id: existing.data().draftId, reused: true };
    }
    if (body.reference_id) {
      const original = await tx.get(company.collection('drafts').doc(body.reference_id));
      if (!original.exists || original.data().kind !== 'INVOICE') throw new HttpsError('invalid-argument', 'Selecciona una factura de esta empresa.');
      if (JSON.stringify(original.data().buyer) !== JSON.stringify(body.buyer))
        throw new HttpsError('invalid-argument', 'La nota debe conservar el comprador de la factura de referencia.');
    }
    tx.create(draftRef, { ...body, status: 'DRAFT', fiscal_validity: false, createdBy: uid, createdAt: FieldValue.serverTimestamp() });
    tx.create(keyRef, { hash, draftId: draftRef.id, createdAt: FieldValue.serverTimestamp() });
    tx.create(company.collection('audit').doc(), { event: 'draft.created', draftId: draftRef.id, actor: uid, createdAt: FieldValue.serverTimestamp() });
    return { id: draftRef.id, reused: false };
  });
});

// Approval is a privileged server operation. Client writes stay denied.
exports.approvePurchaseOrder = callable(request => require('./purchase-approval.cjs').approvePurchaseOrder(db, request));
