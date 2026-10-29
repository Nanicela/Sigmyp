<script setup>
import {duplicateQuotationForm} from '../../../../web/quotation-actions.js';
import QuotationOverview from './QuotationOverview.vue';
import {computed,nextTick,onBeforeUnmount,reactive,ref,watch} from 'vue';
import {quotationToday,quotationLine,quotationTotals,quotationEditForm,importedLinesForEdit} from '../../../../web/commercial-quotation.js';
const props=defineProps({initialAction:String,draftId:String,quotation:Object,accounts:Array,contacts:Array,offices:Array,products:Array,canSave:Boolean,createQuotation:Function,updateQuotation:Function});const emit=defineEmits(['close']);
const dialog=ref(null),success=ref(null),saving=ref(false),error=ref(''),saved=ref(null),editing=ref(false);const form=reactive({lines:[]});let opener=null;
const host=(()=>{try{return window.parent.location.origin===window.location.origin?window.parent.document.body:document.body;}catch{return document.body;}})();
const blankLine=()=>({description:'',quantity:'1',price:'0',discount:'0',rate:0});
const accountOptions=computed(()=>(props.accounts||[]).filter(a=>a.sourceDocumentId));
const contacts=computed(()=>(props.contacts||[]).filter(c=>c.customerId===form.customerId&&c.sourceDocumentId));
const offices=computed(()=>(props.offices||[]).filter(o=>o.customerId===form.customerId&&o.contactId===form.contactId&&o.sourceDocumentId));
const totals=computed(()=>{try{return quotationTotals((form.lines||[]).map(quotationLine));}catch{return null;}});
const copyId=ref(''),copySource=ref('');
const shown=computed(()=>saved.value||(copyId.value?null:props.quotation));
function duplicate(){const q=shown.value;Object.assign(form,duplicateQuotationForm(q));copySource.value=q.number;copyId.value='new_'+crypto.randomUUID();saved.value=null;editing.value=false;error.value='';}

const native=computed(()=>shown.value?.schemaVersion===1);
const search=ref(''),picked=ref(''),addQuantity=ref('1'),progress=ref('');
const productOptions=computed(()=>(props.products||[]).filter(p=>(p.name+' '+p.code).toLocaleLowerCase().includes(search.value.toLocaleLowerCase())));
const accountContacts=computed(()=>(props.contacts||[]).filter(c=>c.customerId===form.customerId));
function edit(){
 error.value='';const q=shown.value;const lines=q.pricing?.lines||q.lines;
 Object.assign(form,{...q,customerId:q.customerId||'',contactId:q.contactId||'',officeId:q.officeId||'',approverContactId:q.approverContactId||'',letter:q.letter||'',purchaseOrder:q.purchaseOrder||'',deliveryDays:q.deliveryDays??(parseInt(q.deliveryTime)||0),deliveryUnit:q.deliveryUnit||'CALENDAR_DAYS',validityDays:q.validityDays??(q.validUntil?Math.max(0,Math.round((q.validUntil-new Date(q.date).getTime())/86400000)):30),validityUnit:q.validityUnit||'CALENDAR_DAYS',status:['CREATED','SENT','APPROVED','REJECTED'].includes(q.status)?q.status:'CREATED',lines:lines?lines.map(l=>({productId:l.productId||'',code:l.code||'',description:l.description,quantity:String(l.quantityUnits/1000),price:String(l.unitPriceCents/100),discount:String(l.discountBps/100),rate:l.rate})):(q.productDetails||[]).map(l=>({productId:l.productId,code:l.code,description:l.name,quantity:String(l.quantity??1),price:'',discount:'0',rate:[0,5,19].includes(l.catalogTaxRate)?l.catalogTaxRate:0}))});
 editing.value=true;
}
function addProduct(){const p=props.products?.find(p=>p.id===picked.value);if(!p)return;form.lines.push({productId:p.id,code:p.code||'',description:p.name,quantity:addQuantity.value,price:p.price==null?'':String(p.price),discount:'0',rate:[0,5,19].includes(p.rate)?p.rate:0});picked.value='';addQuantity.value='1';}
function lineTotal(line){try{return money(quotationLine(line).totalCents);}catch{return '—';}}

const money=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP'}).format(n/100);
const date=ms=>{const d=new Date(typeof ms==='string' && /^\d{4}-\d{2}-\d{2}$/.test(ms)?ms+'T12:00:00Z':ms);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota'}).format(d);};
function close(){if(saving.value)return;success.value?.close();dialog.value?.close();emit('close');opener?.focus?.();}
function accept(){success.value?.close();dialog.value?.querySelector('.sigmyp-account-footer button')?.focus();}
async function save(){if(saving.value||!props.canSave)return;saving.value=true;error.value='';progress.value='Preparando cotización…';try{const input={...form,onProgress:(done,total)=>{progress.value=`Guardando productos: ${done} de ${total}`;},lines:form.lines.map(l=>({...l}))};saved.value=shown.value?await props.updateQuotation(shown.value,input):await props.createQuotation(copyId.value||props.draftId,input);editing.value=false;await nextTick();success.value?.showModal();}catch(e){error.value=e.code==='permission-denied'?'No se pudo guardar: revisa los permisos de edición de cotizaciones.':e.message||'No se pudo guardar.';}finally{saving.value=false;progress.value='';}}
watch(()=>[props.draftId,props.quotation],async()=>{if(!props.draftId&&!props.quotation){if(dialog.value?.open)close();return;}if(!dialog.value?.open){opener=host.ownerDocument.activeElement;copyId.value='';copySource.value='';saved.value=null;editing.value=false;error.value='';Object.assign(form,{customerId:'',contactId:'',officeId:'',date:quotationToday(),validUntil:quotationToday(),paymentMethod:'',warranty:'',deliveryTime:'',comments:'',letter:'',purchaseOrder:'',approverContactId:'',deliveryDays:0,deliveryUnit:'CALENDAR_DAYS',validityDays:30,validityUnit:'CALENDAR_DAYS',status:'CREATED',lines:[]});if(props.initialAction==='duplicate' && props.quotation && props.canSave)duplicate();}await nextTick();if(dialog.value&&!dialog.value.open)dialog.value.showModal();},{immediate:true});
onBeforeUnmount(()=>{success.value?.close();dialog.value?.close();});
</script>
<template><Teleport :to="host"><link rel="stylesheet" href="/procesos/account-detail.css">
<dialog ref="dialog" class="sigmyp-account-dialog sigmyp-editable-account-dialog" aria-labelledby="quotation-heading" @cancel.prevent="close">
<header class="sigmyp-account-header"><div><p>COTIZACIÓN</p><h2 id="quotation-heading">{{ shown?.number || 'Crear cotización' }}</h2></div><button class="sigmyp-account-close" type="button" :disabled="saving" @click="close" autofocus>Cerrar ✕</button></header>
<div class="sigmyp-contact-content sigmyp-record-scroll">
<p v-if="copyId && !shown" role="status">Copia de {{ copySource }}. Se asignará un nuevo consecutivo al guardar.</p>
<form v-if="!shown || editing" id="quotation-create-form" class="sigmyp-account-form quotation-editor" @submit.prevent="save"><fieldset :disabled="saving" class="quotation-editor-grid">
<section class="quotation-editor-info"><h3>Cotización</h3><div class="quotation-editor-fields">
<label>Cuenta<select v-model="form.customerId" required @change="form.contactId='';form.officeId='';form.approverContactId=''"><option value="" disabled>Selecciona una cuenta</option><option v-for="a in accountOptions" :key="a.id" :value="a.id">{{ a.name }}</option></select></label>
<label>Contacto<select v-model="form.contactId" required @change="form.officeId=''"><option value="" disabled>Selecciona un contacto</option><option v-for="c in contacts" :key="c.id" :value="c.id">{{ c.name }}</option></select></label>
<label v-if="offices.length || form.officeId">Oficina<select v-model="form.officeId"><option value="">Sin oficina específica</option><option v-for="o in offices" :key="o.id" :value="o.id">{{ o.name }}</option></select></label>
<label v-if="!shown">Fecha<input v-model="form.date" type="date" required :min="quotationToday().slice(0,4)+'-01-01'" :max="quotationToday().slice(0,4)+'-12-31'"></label>
<label>Texto de la carta<textarea v-model="form.letter" rows="6" maxlength="10000"></textarea></label>
<label>Garantía<input v-model="form.warranty" maxlength="2000"></label>
<label>Forma de pago<input v-model="form.paymentMethod" maxlength="2000"></label>
<div class="quotation-day-fields"><label>Tiempo de entrega<input v-model="form.deliveryDays" type="number" min="0" max="36500" step="1" required></label><label>Tipo de días<select v-model="form.deliveryUnit"><option value="CALENDAR_DAYS">Días calendario</option><option value="WORKING_DAYS">Días hábiles</option></select></label></div>
<div class="quotation-day-fields"><label>Vigencia<input v-model="form.validityDays" type="number" min="0" max="36500" step="1" required></label><label>Tipo de vigencia<select v-model="form.validityUnit"><option value="CALENDAR_DAYS">Días calendario</option><option value="WORKING_DAYS">Días hábiles</option></select></label></div>
<label>Contacto que aprueba<select v-model="form.approverContactId"><option value="">Sin definir</option><option v-for="c in accountContacts" :key="c.id" :value="c.id">{{ c.name }}</option></select></label>
<label>Orden de compra<input v-model="form.purchaseOrder" maxlength="200"></label>
<label>Estado<select v-model="form.status"><option value="CREATED">Creada</option><option value="SENT">Enviada</option><option value="APPROVED">Aprobada</option><option value="REJECTED">Rechazada</option></select></label>
<label>Comentarios<textarea v-model="form.comments" rows="4" maxlength="2000"></textarea></label>
</div></section>
<section class="quotation-editor-products"><h3>Productos y servicios <span>{{ form.lines.length }}</span></h3>
<div class="quotation-product-picker"><label>Buscar por nombre o código<input v-model="search" type="search" placeholder="Nombre o código"></label><label>Producto / servicio<select v-model="picked"><option value="">Selecciona un producto</option><option v-for="p in productOptions" :key="p.id" :value="p.id">{{ p.code }} · {{ p.name }}</option></select></label><label>Cantidad<input v-model="addQuantity" type="number" min="0.001" step="0.001"></label><button type="button" :disabled="!picked || !(Number(addQuantity)>0)" @click="addProduct">+ Agregar</button></div>
<p v-if="shown && !shown.pricing && !native" class="quotation-reference">Confirma los precios unitarios para recalcular. El registro original se conserva.</p>
<div class="sigmyp-account-table-scroll"><table class="quotation-lines"><thead><tr><th>Acción</th><th>Código</th><th>Nombre</th><th>Cantidad</th><th>Precio unitario</th><th>Descuento %</th><th>IVA %</th><th>Total</th></tr></thead><tbody>
<tr v-for="(line,index) in form.lines" :key="index"><td><button type="button" class="sigmyp-account-close" title="Quitar producto" :aria-label="'Quitar producto '+(index+1)" @click="form.lines.splice(index,1)">−</button></td><td>{{ line.code || '—' }}</td><td><input v-model="line.description" :aria-label="'Descripción '+(index+1)" required maxlength="500"></td><td><input v-model="line.quantity" :aria-label="'Cantidad '+(index+1)" type="number" min="0.001" step="0.001" required></td><td><input v-model="line.price" :aria-label="'Precio '+(index+1)" type="number" min="0" step="0.01" required></td><td><input v-model="line.discount" :aria-label="'Descuento '+(index+1)" type="number" min="0" max="100" step="0.01" required></td><td><select v-model="line.rate" :aria-label="'IVA '+(index+1)"><option :value="0">0</option><option :value="5">5</option><option :value="19">19</option></select></td><td>{{ lineTotal(line) }}</td></tr>
<tr v-if="!form.lines.length"><td colspan="8">Agrega productos o servicios a la cotización.</td></tr>
</tbody></table></div><button type="button" class="sigmyp-account-close quotation-add-manual" @click="form.lines.push(blankLine())">+ Agregar concepto manual</button>
<dl v-if="totals" class="quotation-total-card quotation-editor-totals"><div><dt>Descuento</dt><dd>{{ money(totals.discountCents) }}</dd></div><div><dt>Subtotal</dt><dd>{{ money(totals.subtotalCents) }}</dd></div><div><dt>IVA</dt><dd>{{ money(totals.taxCents) }}</dd></div><div class="quotation-grand-total"><dt>Total</dt><dd>{{ money(totals.totalCents) }}</dd></div></dl>
</section></fieldset></form>
<QuotationOverview v-else :quotation="shown" :accounts="accounts" />
<p v-if="progress" role="status">{{ progress }}</p><p v-if="error" class="sigmyp-account-save-status" role="alert">{{ error }}</p>
</div><footer class="sigmyp-account-footer"><p v-if="!shown&&!canSave">El guardado está pendiente de habilitación.</p><div class="sigmyp-account-edit-actions"><button v-if="!shown || editing" form="quotation-create-form" type="submit" :disabled="saving||!canSave">{{ saving?'Guardando…':shown?'Actualizar cotización':'Crear cotización' }}</button><button v-if="shown && !editing && canSave && true" type="button" @click="edit">Editar cotización</button><button v-if="editing" type="button" class="sigmyp-account-close" :disabled="saving" @click="editing=false;error=''">Cancelar edición</button><button type="button" class="sigmyp-account-close" :disabled="saving" @click="close">Cerrar</button></div></footer></dialog>
<dialog ref="success" class="sigmyp-account-success" role="alertdialog" aria-labelledby="quotation-success-title" aria-describedby="quotation-success-message" @cancel.prevent="accept"><span class="sigmyp-account-success-icon" aria-hidden="true">✓</span><h2 id="quotation-success-title">Guardado exitoso</h2><p id="quotation-success-message">La cotización se guardó correctamente.</p><button type="button" autofocus @click="accept">Aceptar</button></dialog>
</Teleport></template>
