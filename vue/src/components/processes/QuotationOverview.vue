<script setup>
import {computed} from 'vue';
import {quotationText} from '../../../../web/quotation-presentation.js';
const props=defineProps({quotation:{type:Object,required:true},accounts:{type:Array,default:()=>[]}});
const q=computed(()=>props.quotation),native=computed(()=>q.value.schemaVersion===1),priced=computed(()=>native.value||!!q.value.pricing),amounts=computed(()=>q.value.pricing||q.value);
const account=computed(()=>props.accounts.find(a=>a.id===q.value.customerId));
const money=value=>value==null?'—':new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0,maximumFractionDigits:2}).format(value);
const date=value=>{if(!value)return '—';const d=new Date(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value+'T12:00:00Z':value);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('es-CO',{timeZone:'America/Bogota'});};
const status=computed(()=>({CREATED:'Creada',SENT:'Enviada',APPROVED:'Aprobada'}[q.value.status]||q.value.status||'—'));
const rows=computed(()=>priced.value?amounts.value.lines.map((l,i)=>({id:i,code:l.code||'—',name:l.description,quantity:l.quantityUnits/1000,price:l.unitPriceCents/100,discount:l.discountBps/100,rate:l.rate,total:l.totalCents/100})):(q.value.productDetails||[]).map((l,i)=>({...l,id:i,price:l.catalogPrice,rate:l.catalogTaxRate})));
const conditions=computed(()=>({Carta:quotationText(q.value.letter),'Garantía':quotationText(q.value.warranty),'Forma de pago':quotationText(q.value.paymentMethod),'Plazo de entrega':q.value.deliveryTime,'Vigencia':native.value?date(q.value.validUntil):q.value.applicability,'Contacto que aprueba':q.value.approverName,'Orden de compra':q.value.purchaseOrder,'Comentarios':quotationText(q.value.comments)}));
</script>
<template>
<div class="quotation-overview">
 <section class="quotation-information"><h3>Datos de la cotización</h3><dl>
  <div><dt>Número</dt><dd>{{ q.number }}</dd></div><div><dt>Fecha</dt><dd>{{ date(q.date) }}</dd></div>
  <div><dt>Cuenta</dt><dd>{{ q.snapshot?.accountName || q.accountName || account?.name || '—' }}</dd></div>
  <div><dt>Contacto</dt><dd>{{ q.snapshot?.contactName || q.contactName || '—' }}</dd></div>
  <div v-if="q.snapshot?.officeName"><dt>Oficina</dt><dd>{{ q.snapshot.officeName }}</dd></div>
  <div><dt>Estado</dt><dd><span class="quotation-status">{{ status }}</span></dd></div>
  <div v-for="(value,label) in conditions" :key="label"><dt>{{ label }}</dt><dd>{{ value || '—' }}</dd></div>
 </dl></section>
 <section class="quotation-products"><h3>Productos y servicios <span v-if="priced || q.detailsAvailable">{{ rows.length }}</span></h3>
  <p v-if="!priced && !q.detailsAvailable" class="sigmyp-account-empty" role="status">El detalle de productos está pendiente de habilitación.</p>
  <div v-else class="sigmyp-account-table-scroll"><table><thead><tr><th>Código</th><th>Producto / servicio</th><th>Cantidad</th><th>{{ priced?'Precio unitario':'Precio de catálogo' }}</th><th v-if="priced">Descuento %</th><th>{{ priced?'IVA %':'IVA de catálogo %' }}</th><th v-if="priced">Total</th></tr></thead><tbody><tr v-for="line in rows" :key="line.id"><td>{{ line.code || '—' }}</td><td>{{ line.name }}</td><td>{{ line.quantity ?? '—' }}</td><td>{{ money(line.price) }}</td><td v-if="priced">{{ line.discount }}</td><td>{{ line.rate ?? '—' }}</td><td v-if="priced">{{ money(line.total) }}</td></tr><tr v-if="!rows.length"><td :colspan="priced?7:5">No hay productos asociados a esta cotización.</td></tr></tbody></table></div>
  <p v-if="!priced && q.detailsAvailable" class="quotation-reference">Los precios de catálogo son una referencia del sistema anterior. Los totales guardados de la cotización se conservan sin recalcular.</p>
  <dl class="quotation-total-card"><div v-if="priced"><dt>Descuento</dt><dd>{{ money(amounts.discountCents/100) }}</dd></div><div><dt>Subtotal</dt><dd>{{ money(priced?amounts.subtotalCents/100:q.subtotal) }}</dd></div><div><dt>IVA</dt><dd>{{ money(priced?amounts.taxCents/100:q.tax) }}</dd></div><div class="quotation-grand-total"><dt>Total</dt><dd>{{ money(priced?amounts.totalCents/100:q.total) }}</dd></div></dl>
 </section>
</div>
</template>
