<script setup>
import {computed,ref} from 'vue';
import {quotationLine} from '../../../../web/commercial-quotation.js';
import {orderLines,paymentDays} from '../../../../web/purchase-orders.js';
const props=defineProps({form:Object,items:Array,suppliers:Array,editing:Boolean,creating:Boolean,record:Object});
const picker=ref('');
const statusLabel=computed(()=>({CREATED:'Creada',DRAFT:'Borrador',APPROVED:'Aprobada',RECEIVED:'Recibida',CANCELLED:'Anulada'}[props.record?.status]||props.record?.status||'Borrador'));
const quantity=ref(1);
const validQuantity=computed(()=>Number(quantity.value)>0 && Number.isFinite(Number(quantity.value)));
const shownTotals=computed(()=>props.editing?totals.value.value:props.record?.totals);
const money=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP'}).format(n/100);
const totals=computed(()=>{try{return {value:orderLines(props.form.lines||[],props.items||[]).at(-1).sums,error:''};}catch(e){return {value:null,error:e.message};}});
function lineTotal(line){try{return money(quotationLine({...line,discount:0}).totalCents);}catch{return '—';}}
function add(){const item=props.items.find(i=>i.id===picker.value);if(!item||!validQuantity.value)return;props.form.lines.push({key:crypto.randomUUID(),productId:item.id,description:item.name,code:item.code||'',quantity:String(quantity.value),price:'',rate:19});picker.value='';quantity.value=1;}
</script>
<template>
<div class="purchase-order-layout">
<section class="purchase-order-conditions"><h3>Orden de compra</h3>
<div class="purchase-order-summary"><span>Número</span><strong>{{ record?.number || 'Se asigna al guardar' }}</strong><span>Estado</span><strong>{{ statusLabel }}</strong></div>
<p v-if="record?.approval" class="purchase-approval-info">Aprobada por {{ record.approval.approvedEmail }}<br>{{ record.approval.approvedAt?.toDate?.().toLocaleString('es-CO',{timeZone:'America/Bogota'}) }}<br>Esta orden está bloqueada para edición.</p><template v-if="editing">
<label>Proveedor<select v-model="form.supplierId" :disabled="!creating" required><option value="">Selecciona un proveedor</option><option v-for="p in suppliers" :key="p.id" :value="p.id">{{ p.name }}</option></select></label>
<label>Fecha<input v-model="form.date" type="date" min="2026-01-01" max="2026-12-31" :readonly="!creating" required></label>
<label>Forma de pago<select v-model.number="form.paymentDays" required><option v-for="days in paymentDays" :value="days" :key="days">{{ days===0?'Contado':days+' días' }}</option></select></label>
<label>Fecha esperada<input v-model="form.deliveryDate" type="date" :min="form.date" required></label>
<label>Dirección de envío<input v-model="form.deliveryAddress" maxlength="300"></label>
<label>Referencia<input v-model="form.reference" maxlength="200"></label>

</template><dl v-else><div v-for="[label,value] in [['Proveedor',record.supplierName],['Fecha',record.date],['Forma de pago',record.paymentDays==null?record.paymentMethod:record.paymentDays===0?'Contado':record.paymentDays+' días'],['Entrega prevista',record.deliveryDate],['Dirección',record.deliveryAddress],['Referencia',record.reference]]" :key="label"><dt>{{ label }}</dt><dd>{{ value||'—' }}</dd></div></dl>
</section><section class="purchase-order-items"><h3>Ítems</h3>
<div v-if="editing" class="purchase-order-picker"><label class="order-name-picker">Ítem<select v-model="picker"><option value="">Selecciona un ítem</option><option v-for="item in items" :value="item.id" :key="item.id">{{ item.name }}</option></select></label><label class="order-code-picker">Código<select v-model="picker"><option value="">Selecciona un código</option><option v-for="item in items" :value="item.id" :key="item.id">{{ item.code || 'Sin código' }} · {{ item.name }}</option></select></label><label class="order-quantity-picker">Cantidad<input v-model="quantity" type="number" min="0.001" step="0.001" aria-label="Cantidad a agregar"></label><button type="button" :disabled="!picker || !validQuantity" @click="add">+ Agregar</button></div>
<div class="sigmyp-account-table-scroll"><table aria-label="Ítems de la orden"><thead><tr><th>Código</th><th>Nombre</th><th>Cantidad</th><th>Costo unitario</th><th>IVA</th><th>Total</th><th v-if="editing">Acciones</th></tr></thead><tbody>
<tr v-for="(line,index) in (editing?form.lines:record.lines||[])" :key="line.key||index"><td>{{ line.code || '—' }}</td><td>{{ line.description }}</td><td><input v-if="editing" v-model="line.quantity" type="number" min="0.001" step="0.001" required aria-label="Cantidad"><span v-else>{{ line.quantityUnits/1000 }}</span></td><td><input v-if="editing" v-model="line.price" type="number" min="0" step="0.01" required aria-label="Costo unitario"><span v-else>{{ money(line.unitPriceCents) }}</span></td><td><select v-if="editing" v-model.number="line.rate" aria-label="IVA"><option :value="0">0 %</option><option :value="5">5 %</option><option :value="19">19 %</option></select><span v-else>{{ line.rate }} %</span></td><td>{{ editing?lineTotal(line):money(line.totalCents) }}</td><td v-if="editing"><button type="button" title="Quitar ítem" aria-label="Quitar ítem" @click="form.lines.splice(index,1)">×</button></td></tr>
<tr v-if="!(editing?form.lines:record.lines||[]).length"><td :colspan="editing?7:6">{{ editing?'Agrega los ítems de la orden.':'Esta orden todavía no tiene detalle de ítems.' }}</td></tr></tbody></table></div>
<p v-if="editing&&totals.error" role="status">{{ totals.error }}</p>
<div class="purchase-order-bottom"><section class="purchase-order-comments"><h3>Comentarios</h3><label v-if="editing"><span class="order-visually-hidden">Comentarios de la orden</span><textarea v-model="form.comments" rows="4" maxlength="2000"></textarea></label><p v-else>{{ record.comments || 'Sin comentarios.' }}</p></section><section class="purchase-order-totals"><h3>Total</h3><dl class="quotation-total-card"><div v-for="[key,label] in [['subtotalCents','Subtotal'],['taxCents','Valor del impuesto'],['totalCents','Total']]" :key="key"><dt>{{ label }}</dt><dd>{{ shownTotals?money(shownTotals[key]):(form.lines?.length?'—':money(0)) }}</dd></div></dl></section></div>
</section></div>
</template>
