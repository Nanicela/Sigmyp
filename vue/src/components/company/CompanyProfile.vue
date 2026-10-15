<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';

const dialog = ref(null);
const modalStatus = ref(null);
const mode = ref('view');
const state = reactive({ company:'', profile:null, loading:false, canEdit:false });
const title = computed(() => mode.value === 'edit' ? (state.profile ? 'Editar datos de empresa' : 'Completar datos de empresa') : (state.profile?.name || 'Datos de empresa'));
const entries = computed(() => [
  ['Identificación',state.company],['Nombre',state.profile?.name],['Correo',state.profile?.email],['Teléfono',state.profile?.phone],
  ['Dirección',state.profile?.address],['Departamento',state.profile?.department],['Municipio',state.profile?.municipality],
  ['Responsabilidades',state.profile?.taxResponsibilities],['Condición IVA',state.profile?.vatStatus]
]);

function render(payload = {}) { Object.assign(state, payload); window.dispatchEvent(new CustomEvent('sigmyp:workspace-data',{detail:{moduleId:'company'}})); }
function snapshot() {
  return { company:state.company, profile:state.profile ? {...state.profile} : null, loading:state.loading, canEdit:state.canEdit };
}
function openView() { if (!state.company || state.loading) return; mode.value='view'; modalStatus.value.textContent=''; dialog.value.showModal(); }
function openEdit() { if (!state.company || state.loading || !state.canEdit) return; mode.value='edit'; modalStatus.value.textContent=''; dialog.value.showModal(); }
function close() { if (dialog.value?.open) dialog.value.close(); }
function onDialogClick(event) { if (event.target === dialog.value) close(); }

defineExpose({ render, snapshot, openView, openEdit, close, get status(){ return modalStatus.value; } });
onMounted(() => dialog.value.addEventListener('click',onDialogClick));
onBeforeUnmount(() => dialog.value?.removeEventListener('click',onDialogClick));
</script>

<template>
  <summary>Datos de la empresa activa</summary>
  <p id="profile-status" class="hint"></p>
  <div class="history-table-scroll" role="region" aria-label="Datos de empresa">
    <table class="history-table"><caption>Datos de empresa</caption><thead><tr><th>Empresa</th><th>NIT</th><th>Correo</th><th>Acciones</th></tr></thead>
      <tbody><tr v-if="state.company"><td>{{ state.profile?.name || 'Ficha pendiente' }}</td><td>{{ state.company }}</td><td>{{ state.profile?.email || '—' }}</td><td><div class="row-actions"><button type="button" class="quiet" data-company-profile-action="view">Ver empresa</button><button v-if="state.canEdit" type="button" class="quiet" data-company-profile-action="edit">{{ state.profile ? 'Editar' : 'Completar datos' }}</button></div></td></tr></tbody>
    </table>
    <p v-if="!state.company" class="empty">No hay registros.</p>
  </div>
  <Teleport to="body">
    <dialog ref="dialog" class="record-dialog" aria-labelledby="company-profile-dialog-title" @cancel.prevent="close">
      <div class="section-head"><h2 id="company-profile-dialog-title">{{ title }}</h2><button type="button" class="quiet" @click="close">Cerrar</button></div>
      <dl v-show="mode==='view'" class="customer-details" data-company-profile-view><div v-for="([label,value]) in entries" :key="label"><dt>{{ label }}</dt><dd>{{ value || 'No registrado' }}</dd></div></dl>
      <form v-show="mode==='edit'" id="tax-form" data-company-profile-edit>
        <fieldset><div class="two">
          <label>Nombre completo o razón social<input name="name" maxlength="200" required></label>
          <label>Tipo de documento<select name="documentType"><option value="NIT">NIT</option><option value="CC">Cédula de ciudadanía</option><option value="CE">Cédula de extranjería</option></select></label>
          <label>Número sin puntos ni guiones<input name="identification" pattern="[0-9]{5,15}" required></label>
          <label>Dígito de verificación (solo NIT)<input name="dv" pattern="[0-9]" maxlength="1" required></label>
          <label>Correo electrónico<input name="email" type="email" maxlength="254" required></label>
          <label>Teléfono (opcional)<input name="phone" maxlength="30"></label>
          <label>Dirección en Colombia<input name="address" maxlength="250" required></label>
          <label>Departamento<input name="department" maxlength="100" required></label>
          <label>Municipio<input name="municipality" maxlength="100" required></label>
          <label>Condición frente al IVA<select name="vatStatus"><option value="por_confirmar">Por confirmar</option><option value="responsable">Responsable de IVA</option><option value="no_responsable">No responsable de IVA</option></select></label>
        </div><label>Responsabilidades tributarias según RUT<textarea name="taxResponsibilities" rows="2" maxlength="300" required placeholder="Transcribe los códigos y descripciones que figuran en el RUT"></textarea></label><button type="submit">Guardar datos de la empresa</button></fieldset>
      </form>
      <p ref="modalStatus" id="company-profile-status" class="modal-status" role="status"></p>
    </dialog>
  </Teleport>
</template>
