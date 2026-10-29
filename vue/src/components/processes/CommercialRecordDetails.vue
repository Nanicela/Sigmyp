<script setup>
import {computed,nextTick,onBeforeUnmount,reactive,ref,watch} from 'vue';
import {commercialRecordFields,recordForm,normalizeRecord,isPhone,isEmail} from '../../../../web/commercial-record.js';
const props=defineProps({kind:String,record:Object,creating:Boolean,accounts:{type:Array,default:()=>[]},contacts:{type:Array,default:()=>[]},fields:Array,canEdit:Boolean,canSave:Boolean,saveRecord:Function,locations:{type:Array,default:()=>[]},officeTypes:{type:Array,default:()=>[]}});
const emit=defineEmits(['close']);
const dialog=ref(null),success=ref(null),editing=ref(false),saving=ref(false),error=ref('');const form=reactive({});let original=null,opener=null;
const title=computed(()=>props.kind==='contacts'?'Contacto':'Oficina');
const formId=computed(()=>`commercial-${props.kind}-edit`);
const host=(()=>{try{return window.parent.location.origin===window.location.origin?window.parent.document.body:document.body;}catch{return document.body;}})();
const labels={name:'Nombre',jobTitle:'Cargo',phone1:'Teléfono 1',phone2:'Teléfono 2',mobile:'Celular',email:'Email',comments:'Comentarios',type:'Tipo de oficina',address:'Dirección',municipality:'Ciudad',department:'Departamento',technicianName:'Nombre del técnico',technicianPhone:'Teléfono del técnico',technicianEmail:'Email del técnico'};
const definitions=computed(()=>Object.entries(commercialRecordFields[props.kind]));
function options(key){const values=key==='type'?props.officeTypes:key==='department'?props.locations.map(l=>l.department):props.locations.filter(l=>!form.department||l.department===form.department).map(l=>l.city);return [...new Set([form[key],...values].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));}
function update(key,event){const value=isPhone(key)?event.target.value.replace(/[^0-9]/g,''):event.target.value;form[key]=value;if(event.target.value!==value)event.target.value=value;}
const accountOptions=computed(()=>props.accounts.filter(a=>a.sourceDocumentId));
const contactOptions=computed(()=>props.contacts.filter(c=>c.sourceDocumentId&&c.customerId===form.customerId));
function chooseAccount(){form.accountDocumentId=props.accounts.find(a=>a.id===form.customerId)?.sourceDocumentId||'';form.contactId='';form.contactDocumentId='';}
function chooseContact(){form.contactDocumentId=props.contacts.find(c=>c.id===form.contactId)?.sourceDocumentId||'';}
function edit(){original={...props.record};Object.assign(form,recordForm(props.kind,original),{customerId:original.customerId||'',accountDocumentId:original.accountDocumentId||'',contactId:original.contactId||'',contactDocumentId:original.contactDocumentId||''});editing.value=true;error.value='';}
function accept(){success.value?.close();dialog.value?.querySelector('.sigmyp-account-footer button')?.focus();}
function close(){if(saving.value)return;success.value?.close();dialog.value?.close();editing.value=false;error.value='';emit('close');opener?.focus?.();}
async function save(){if(saving.value||!props.canEdit||!props.canSave)return;saving.value=true;error.value='';try{normalizeRecord(props.kind,form);await props.saveRecord(props.kind,original,{...form});editing.value=false;await nextTick();success.value?.showModal();}catch(e){error.value=e.code==='permission-denied'?'No tienes permiso para guardar este registro.':e.message||'No se pudieron guardar los cambios.';}finally{saving.value=false;}}
watch(()=>props.record,async record=>{if(!record){if(dialog.value?.open)close();return;}if(!dialog.value?.open){opener=host.ownerDocument.activeElement;editing.value=false;error.value='';}if(props.creating)edit();await nextTick();if(props.record&&dialog.value&&!dialog.value.open)dialog.value.showModal();},{immediate:true});
onBeforeUnmount(()=>{success.value?.close();dialog.value?.close();});
</script>
<template>
<Teleport :to="host">
<link rel="stylesheet" href="/procesos/account-detail.css">
<dialog ref="dialog" class="sigmyp-account-dialog sigmyp-contact-dialog sigmyp-editable-account-dialog" :aria-labelledby="`${kind}-heading`" @cancel.prevent="close">
 <header class="sigmyp-account-header"><div><p>{{ title.toUpperCase() }}</p><h2 :id="`${kind}-heading`">{{ creating?'Crear '+title.toLowerCase():(record?.name || title) }}</h2></div><button class="sigmyp-account-close" type="button" :disabled="saving" @click="close" autofocus>Cerrar ✕</button></header>
 <div class="sigmyp-contact-content sigmyp-record-scroll"><section class="sigmyp-account-profile">
  <dl v-if="!editing"><div v-for="[label,value] in fields" :key="label" :class="{'sigmyp-contact-comments':label==='Comentarios'}"><dt>{{ label }}</dt><dd>{{ value===null||value===undefined||value===''?'—':value }}</dd></div></dl>
  <form v-else :id="formId" class="sigmyp-account-form" @submit.prevent="save"><fieldset :disabled="saving">
   <template v-if="creating"><label>Cuenta<select v-model="form.customerId" required @change="chooseAccount"><option value="" disabled>Selecciona una cuenta</option><option v-for="a in accountOptions" :key="a.id" :value="a.id">{{ a.name }}</option></select></label><label v-if="kind==='offices'">Contacto<select v-model="form.contactId" required @change="chooseContact"><option value="" disabled>Selecciona un contacto de la cuenta</option><option v-for="c in contactOptions" :key="c.id" :value="c.id">{{ c.name }}</option></select></label></template>
   <label v-for="[key,max] in definitions" :key="key">{{ labels[key] }}
    <textarea v-if="key==='comments'" v-model="form[key]" :maxlength="max" rows="4"></textarea>
    <select v-else-if="['type','department','municipality'].includes(key)" v-model="form[key]" @change="key==='department' && (form.municipality='')"><option value="">Por confirmar</option><option v-for="option in options(key)" :key="option">{{ option }}</option></select>
    <input v-else :value="form[key]" @input="update(key,$event)" :maxlength="max" :required="key==='name'" :type="isEmail(key)?'email':isPhone(key)?'tel':'text'" :inputmode="isPhone(key)?'numeric':isEmail(key)?'email':undefined" :pattern="isPhone(key)?'[0-9]*':undefined">
    <small v-if="isPhone(key)">Solo números, sin espacios ni símbolos.</small><small v-if="isEmail(key)">Ejemplo: nombre@empresa.com</small>
   </label>
  </fieldset></form>
  <p v-if="error" role="alert" class="sigmyp-account-save-status">{{ error }}</p>
 </section></div>
 <footer class="sigmyp-account-footer"><p v-if="editing&&!canSave" role="status">El guardado está pendiente de habilitación.</p><div class="sigmyp-account-edit-actions">
  <button v-if="!editing&&canEdit&&record?.sourceDocumentId" type="button" @click="edit">Actualizar datos</button>
  <template v-if="editing"><button :form="formId" type="submit" :disabled="saving||!canSave||!canEdit">{{ saving?'Guardando…':creating?'Crear '+title.toLowerCase():'Guardar cambios' }}</button><button v-if="!creating" type="button" :disabled="saving" @click="editing=false;error=''">Cancelar edición</button></template>
  <button type="button" class="sigmyp-account-close" :disabled="saving" @click="close">Cerrar</button>
 </div></footer>
</dialog>
<dialog ref="success" class="sigmyp-account-success" role="alertdialog" :aria-labelledby="`${kind}-success-title`" :aria-describedby="`${kind}-success-message`" @cancel.prevent="accept"><span class="sigmyp-account-success-icon" aria-hidden="true">✓</span><h2 :id="`${kind}-success-title`">Guardado exitoso</h2><p :id="`${kind}-success-message`">Los datos se guardaron correctamente.</p><button type="button" autofocus @click="accept">Aceptar</button></dialog>
</Teleport>
</template>
