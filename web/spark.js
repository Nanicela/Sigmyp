import {normalizePayment} from './payment-terms.js';
import {auditedSet} from './audit.js';
// Borradores privados por operador en Spark. Firestore Rules verifica los importes.
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import domain from '../functions/domain.cjs';
export const sparkCompanies = (db, uid) => collection(db, 'organizations');
export const sparkDrafts = (db, uid, id) => collection(db, 'organizations', id, 'drafts');
export function unpackDraft(data) {
  const money = n => (BigInt(n) / 100n).toString() + '.' + (BigInt(n) % 100n).toString().padStart(2, '0');
  return { ...data, subtotal: money(data.subtotalCents), tax: money(data.taxCents), total: money(data.totalCents),
    gross: money(data.lines.reduce((s,l)=>s+(l.grossCents??l.subtotalCents),0)), discount: money(data.lines.reduce((s,l)=>s+(l.discountCents||0),0)),
    lines: data.lines.map(l => ({ description: l.description, quantity: String(l.quantityUnits / 10000),
      unit_price: money(l.priceCents), iva_rate: String(l.rate), ...(l.taxTreatment ? {tax_treatment:l.taxTreatment,discount_rate:money(l.discountBps),gross:money(l.grossCents),discount:money(l.discountCents)} : {}), subtotal: money(l.subtotalCents), tax: money(l.taxCents), total: money(l.subtotalCents + l.taxCents) })) };
}
export async function createSparkCompany(db, uid, data) {
  const name = domain.text(data.name, 'Razón social'), nit = domain.identifier(data.nit, 'NIT');
  const ref = doc(sparkCompanies(db, uid), nit);
  return runTransaction(db, async tx => {
    const existing = await tx.get(ref);
    if (existing.exists()) return { id: nit, ...existing.data(), reused: true };
    auditedSet(tx,db,ref,null,{ name, nit, members: {}, createdAt: serverTimestamp() });
    return { id: nit, name, nit };
  });
}
export async function createSparkDraft(db, uid, data, editing = null) {
  const body = domain.normalizeDraft(data);
  if (body.lines.length > 3) throw new Error('Esta etapa gratuita admite hasta 3 conceptos por borrador.');
  const cents = v => Number(BigInt(v.replace('.', '')));
  const lines = body.lines.map(l => {
    const quantityUnits = Number(BigInt(l.quantity.replace('.', ''))), priceCents = cents(l.unit_price);
    if (quantityUnits > 100000000 || priceCents > 10000000000 || BigInt(quantityUnits) * BigInt(priceCents) > 100000000000000n)
      throw new Error('El concepto supera los límites de importe o cantidad de esta etapa.');
    return { description: l.description, quantityUnits, priceCents, rate: Number(l.iva_rate), ...(l.tax_treatment ? {taxTreatment:l.tax_treatment,discountBps:cents(l.discount_rate),grossCents:cents(l.gross),discountCents:cents(l.discount)} : {}), subtotalCents: cents(l.subtotal), taxCents: cents(l.tax) };
  });
  const packed = { kind: body.kind, buyer: body.buyer, reference_id: body.reference_id, reason: body.reason,
    currency: 'COP', lines, subtotalCents: cents(body.subtotal), taxCents: cents(body.tax), totalCents: cents(body.total), status: 'DRAFT', fiscal_validity: false };
  const v2=data.schema_version===2;
  const payment=v2&&body.kind==='INVOICE'?normalizePayment(data):null;
  const hashInput=v2?{...packed,schemaVersion:2,payment,customerId:data.customer_id||null,refreshContext:data.refresh_context===true}:packed;
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(hashInput)));
  const hash = [...new Uint8Array(hashBuffer)].map(x => x.toString(16).padStart(2, '0')).join('');
  const ref = doc(sparkDrafts(db, uid, domain.pathId(data.company_id)), domain.pathId(editing?.id || data.request_key));
  return runTransaction(db, async tx => {
    const snapshot = await tx.get(ref), old = snapshot.exists() ? snapshot.data() : null;
    if (old?.lastOperation === data.request_key || (!editing && old)) {
      if (old.requestHash !== hash) throw new Error('Esta solicitud ya tiene otro contenido.');
      return {id:ref.id,reused:true};
    }
    if (editing) {
      if (!old || (old.version||0) !== editing.version) throw new Error('Otra persona modificó este borrador. Abre de nuevo el documento antes de editar.');
      if (old.status !== 'DRAFT' || old.fiscal_validity !== false || old.referenceLocked) throw new Error('Este documento ya no permite edición.');
      if (old.kind !== body.kind || old.reference_id !== body.reference_id) throw new Error('La edición conserva el tipo y la factura de referencia.');
    }
    const preserve=v2&&old?.context&&!data.refresh_context;
    let customer=null;
    if(body.kind==='INVOICE' && data.customer_id && !preserve) {
      const customerSnap=await tx.get(doc(db,'organizations',data.company_id,'customers',domain.pathId(data.customer_id)));
      if(!customerSnap.exists() || customerSnap.data().name!==body.buyer.name || customerSnap.data().identification!==body.buyer.identification)
        throw new Error('El cliente cambió o ya no existe. Recarga el directorio y selecciónalo de nuevo.');
      customer=customerSnap.data();
    }
    let originalRef, original;
    if (body.reference_id) {
      originalRef=doc(sparkDrafts(db,uid,data.company_id),body.reference_id);
      const originalSnap=await tx.get(originalRef);original=originalSnap.exists()?originalSnap.data():null;
      if(!original || original.kind !== 'INVOICE' || JSON.stringify(original.buyer)!==JSON.stringify(body.buyer)) throw new Error('La nota debe conservar el comprador de la factura de referencia.');
    }
    let context=null;
    if(v2){
      if(body.kind!=='INVOICE')context=original?.context||null;
      else if(preserve){
        if(data.customer_id!==old.context.customerId||body.buyer.name!==old.buyer.name||body.buyer.identification!==old.buyer.identification)throw Error('Activa actualizar datos para cambiar el cliente del borrador.');
        context=old.context;
      }else if(!old||data.refresh_context){
        const issuer=await tx.get(doc(db,'organizations',data.company_id,'profiles','tax'));
        if(!issuer.exists()||!customer)throw Error('Completa la ficha de la empresa y selecciona un cliente antes de guardar.');
        context={issuer:issuer.data(),buyer:customer,customerId:data.customer_id};
      }
    }else if(old?.schemaVersion===2)throw Error('Recarga la aplicación para editar este documento.');
    if(original && !original.referenceLocked) auditedSet(tx,db,originalRef,original,{...original,referenceLocked:true});
    auditedSet(tx,db,ref,old,{...packed,...(v2?{schemaVersion:2,context,payment}:{}),requestHash:hash,createdAt:old?.createdAt||serverTimestamp(),referenceLocked:old?.referenceLocked||false,lastOperation:data.request_key},data.request_key);
    return {id:ref.id,reused:false};
  });
}
