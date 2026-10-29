<script setup>
import {computed,nextTick,onBeforeUnmount,ref,watch,reactive} from 'vue';
import {accountForm,normalizeAccount,accountTextFields,accountFieldInput} from '../../../../web/commercial-account.js';
const props=defineProps({account:Object,creating:Boolean,canEdit:Boolean,canSave:Boolean,locations:{type:Array,default:()=>[]},saveAccount:Function,contacts:{type:Array,default:()=>[]},offices:{type:Array,default:()=>[]}});
const emit=defineEmits(['close']);
const dialog=ref(null),editing=ref(false),saving=ref(false),message=ref(''),error=ref(false);
const successDialog=ref(null);
function acceptSuccess(){successDialog.value?.close();dialog.value?.querySelector('.sigmyp-account-footer button')?.focus();}
const form=reactive({});
let editingAccount=null;
function updateField(key,event){const value=accountFieldInput(key,event.target.value);form[key]=value;if(event.target.value!==value)event.target.value=value;}
const fieldLabels={identification:'Cédula o NIT',name:'Nombre',phone1:'Teléfono 1',phone2:'Teléfono 2',email:'Email',billingEmail:'Email de facturación electrónica',website:'Sitio web',address:'Dirección'};
const departments=computed(()=>[...new Set([form.department,...props.locations.map(l=>l.department)].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')));
const cities=computed(()=>[...new Set([form.municipality,...props.locations.filter(l=>!form.department||l.department===form.department).map(l=>l.city)].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')));
function startEdit(){editingAccount={...props.account};Object.assign(form,accountForm(editingAccount));editing.value=true;message.value='';error.value=false;}
function cancelEdit(){if(saving.value)return;if(props.creating){close();return;}editing.value=false;message.value='';error.value=false;}
async function save(){
 if(saving.value||!props.canEdit||!props.canSave)return;
 error.value=false;message.value='';saving.value=true;
 try{const wasCreating=props.creating;normalizeAccount(form);await props.saveAccount(editingAccount,{...form});editing.value=false;message.value=wasCreating?'La cuenta se creó correctamente.':'Los datos se guardaron correctamente.';await nextTick();successDialog.value?.showModal();}
 catch(e){error.value=true;message.value=e.code==='permission-denied'?'No tienes permiso para guardar esta cuenta.':e.message||'No se pudieron guardar los cambios.';}
 finally{saving.value=false;}
}
let opener=null;
const host=(()=>{try{return window.parent.location.origin===window.location.origin?window.parent.document.body:document.body;}catch{return document.body;}})();
const display=value=>value===null||value===undefined||value===''?'—':String(value);
const status=value=>({NEW:'Nuevo',ACTIVE:'Activo',QUOTED:'Cotizado',INACTIVE:'Inactivo'})[value]||value;
const fields=computed(()=>{
 const a=props.account||{};
 return [
  ['NIT / identificación',a.identification],['Nombre',a.name],
  ['Teléfono 1',a.phone1??a.phone],['Teléfono 2',a.phone2],
  ['Email',a.email],['Email de facturación electrónica',a.billingEmail],
  ['Sitio web',a.website],['Dirección',a.address],['Ciudad',a.municipality],
  ['Departamento',a.department],
  ['Responsable de IVA',typeof a.vatResponsible==='boolean'?(a.vatResponsible?'Sí':'No'):({responsable:'Sí',no_responsable:'No',por_confirmar:'Por confirmar'})[a.vatStatus]],
  ['Tipo de persona',({JURIDICA:'Jurídica',NATURAL:'Natural'})[a.personType]||a.personType],['Estado',status(a.status)]
 ];
});
function close(){if(saving.value)return;successDialog.value?.close();editing.value=false;message.value='';if(dialog.value?.open)dialog.value.close();emit('close');opener?.focus?.();}
watch(()=>props.account,async account=>{
 if(!account){if(dialog.value?.open)close();return;}
 if(!dialog.value?.open){opener=document.activeElement;editing.value=false;message.value='';}
 if(props.creating)startEdit();
 await nextTick();
 if(props.account && dialog.value && !dialog.value.open)dialog.value.showModal();
},{immediate:true});
onBeforeUnmount(()=>{successDialog.value?.close();if(dialog.value?.open)dialog.value.close();});
</script>

<template>
  <Teleport :to="host">
    <link rel="stylesheet" href="/procesos/account-detail.css">
    <dialog ref="dialog" class="sigmyp-account-dialog sigmyp-editable-account-dialog" aria-labelledby="account-detail-heading" @cancel.prevent="close" @close="emit('close')">
      <header class="sigmyp-account-header">
        <div><p>CUENTA</p><h2 id="account-detail-heading">{{ creating?'Crear cuenta':(account?.name || 'Detalle de cuenta') }}</h2></div>
        <button type="button" class="sigmyp-account-close" @click="close" autofocus aria-label="Cerrar detalle de cuenta" :disabled="saving">Cerrar ✕</button>
      </header>
      <div class="sigmyp-account-layout" :class="{'sigmyp-account-create-layout':creating}">
        <section class="sigmyp-account-profile" aria-labelledby="account-profile-heading">
          <h3 id="account-profile-heading">Datos de la cuenta</h3>
          <dl v-if="!editing"><div v-for="[label,value] in fields" :key="label"><dt>{{ label }}</dt><dd>{{ display(value) }}</dd></div></dl>
          <form v-else id="sigmyp-account-edit-form" class="sigmyp-account-form" @submit.prevent="save">
            <fieldset :disabled="saving">
              <label v-for="(label,key) in fieldLabels" :key="key">{{ label }}<input :value="form[key]" @input="updateField(key,$event)" :type="['email','billingEmail'].includes(key)?'email':(['phone1','phone2'].includes(key)?'tel':'text')" :inputmode="['phone1','phone2'].includes(key)?'numeric':(['email','billingEmail'].includes(key)?'email':undefined)" :pattern="['phone1','phone2'].includes(key)?'[0-9]*':undefined" :title="['phone1','phone2'].includes(key)?'Ingresa solo números, sin espacios ni símbolos':undefined" :maxlength="accountTextFields[key]" :required="key==='name'"><small v-if="['phone1','phone2'].includes(key)">Solo números, sin espacios ni símbolos.</small><small v-else-if="['email','billingEmail'].includes(key)">Ejemplo: nombre@empresa.com</small></label>
              <label>Departamento<select v-model="form.department" @change="form.municipality=''"><option value="">Por confirmar</option><option v-for="department in departments" :key="department">{{ department }}</option></select></label>
              <label>Ciudad<select v-model="form.municipality"><option value="">Por confirmar</option><option v-for="city in cities" :key="city">{{ city }}</option></select></label>
              <label>Responsable de IVA<select v-model="form.vatResponsible"><option value="unknown">Por confirmar</option><option value="true">Sí</option><option value="false">No</option></select></label>
              <label>Tipo de persona<select v-model="form.personType" required><option value="" disabled>Selecciona una opción</option><option value="NATURAL">Natural</option><option value="JURIDICA">Jurídica</option></select></label>
              <label>Estado<select v-model="form.status" required><option value="NEW">Nuevo</option><option value="QUOTED">En cotización</option><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option></select></label>
            </fieldset>
          </form>
          <p v-if="message && error" role="alert" class="sigmyp-account-save-status">{{ message }}</p>
        </section>
        <div v-if="!creating" class="sigmyp-account-related">
          <section aria-labelledby="account-offices-heading">
            <h3 id="account-offices-heading">Oficinas <span>{{ offices.length }}</span></h3>
            <div v-if="offices.length" class="sigmyp-account-table-scroll" tabindex="0" role="region" aria-label="Oficinas de la cuenta">
              <table><thead><tr><th>Contacto</th><th>Nombre</th><th>Dirección</th><th>Teléfono 1</th><th>Teléfono 2</th><th>Ciudad</th><th>Email</th><th>Nombre del técnico</th><th>Teléfono del técnico</th><th>Email del técnico</th><th>Comentarios</th></tr></thead>
                <tbody><tr v-for="office in offices" :key="office.id">
                  <td>{{ display(office.contactName) }}</td><td>{{ display(office.name) }}</td><td>{{ display(office.address) }}</td>
                  <td>{{ display(office.phone1??office.phone) }}</td><td>{{ display(office.phone2) }}</td><td>{{ display(office.municipality) }}</td>
                  <td>{{ display(office.email) }}</td><td>{{ display(office.technicianName) }}</td><td>{{ display(office.technicianPhone) }}</td>
                  <td>{{ display(office.technicianEmail) }}</td><td>{{ display(office.comments) }}</td>
                </tr></tbody>
              </table>
            </div>
            <p v-else class="sigmyp-account-empty">Esta cuenta no tiene oficinas registradas.</p>
          </section>
          <section aria-labelledby="account-contacts-heading">
            <h3 id="account-contacts-heading">Contactos <span>{{ contacts.length }}</span></h3>
            <div v-if="contacts.length" class="sigmyp-account-table-scroll" tabindex="0" role="region" aria-label="Contactos de la cuenta">
              <table><thead><tr><th>Nombre</th><th>Cargo</th><th>Teléfono 1</th><th>Teléfono 2</th><th>Celular</th><th>Email</th><th>Comentarios</th></tr></thead>
                <tbody><tr v-for="contact in contacts" :key="contact.id">
                  <td>{{ display(contact.name) }}</td><td>{{ display(contact.jobTitle) }}</td><td>{{ display(contact.phone1??contact.phone) }}</td>
                  <td>{{ display(contact.phone2) }}</td><td>{{ display(contact.mobile) }}</td><td>{{ display(contact.email) }}</td><td>{{ display(contact.comments) }}</td>
                </tr></tbody>
              </table>
            </div>
            <p v-else class="sigmyp-account-empty">Esta cuenta no tiene contactos registrados.</p>
          </section>
        </div>
      </div>
      <footer class="sigmyp-account-footer">
        <p v-if="editing && !canSave" role="status">El guardado está pendiente de habilitación.</p>
        <div class="sigmyp-account-edit-actions">
          <button v-if="!editing && canEdit" type="button" @click="startEdit">Actualizar datos</button>
          <template v-if="editing">
            <button type="submit" form="sigmyp-account-edit-form" :disabled="saving || !canEdit || !canSave">{{ saving?'Guardando…':(creating?'Crear cuenta':'Guardar cambios') }}</button>
            <button v-if="!creating" type="button" :disabled="saving" @click="cancelEdit">Cancelar edición</button>
          </template>
          <button type="button" class="sigmyp-account-close" :disabled="saving" @click="close">Cerrar</button>
        </div>
      </footer>
    </dialog>
    <dialog ref="successDialog" class="sigmyp-account-success" role="alertdialog" aria-labelledby="account-success-title" aria-describedby="account-success-message" @cancel.prevent="acceptSuccess">
      <span class="sigmyp-account-success-icon" aria-hidden="true">✓</span>
      <h2 id="account-success-title">Guardado exitoso</h2>
      <p id="account-success-message">{{ message }}</p>
      <button type="button" autofocus @click="acceptSuccess">Aceptar</button>
    </dialog>
  </Teleport>
</template>
