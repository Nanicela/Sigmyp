<script setup>
import { computed, reactive, ref } from 'vue';

const dialog = ref(null);
const status = ref(null);
const mode = ref('edit');
const editing = ref(false);
const state = reactive({
  company: null,
  userEmail: '',
  effectiveRole: null,
  roleLabels: {},
  registeredUsers: [],
  registryVisible: false
});

const canManage = computed(() => !!state.company && ['platform','admin'].includes(state.effectiveRole));
const members = computed(() => {
  if (!state.company) return [];
  const platformEmail=state.effectiveRole === 'platform' ? state.userEmail.toLocaleLowerCase('es') : '';
  const rows = Object.entries(state.company.members || {}).map(([email, storedRole]) => ({email, storedRole, globalAccess:email.toLocaleLowerCase('es')===platformEmail}));
  if (state.effectiveRole === 'platform' && !rows.some(row => row.email.toLocaleLowerCase('es') === state.userEmail.toLocaleLowerCase('es')))
    rows.unshift({email:state.userEmail,storedRole:'platform',globalAccess:true});
  return rows.map(row => ({
    ...row,
    role: row.globalAccess ? 'platform' : row.storedRole,
    roleLabel: state.roleLabels[row.globalAccess ? 'platform' : row.storedRole] || row.storedRole,
    removable: !row.globalAccess && row.email !== state.userEmail
  }));
});

function render(payload = {}) { Object.assign(state,payload); }
function renderRegistered(registeredUsers = [], visible = false) {
  state.registeredUsers = registeredUsers;
  state.registryVisible = visible;
}
function openEditor({email = '', role = '', edit = false} = {}) {
  mode.value='edit'; editing.value=edit;
  const form=document.querySelector('#access-form');
  form.reset(); form.elements.email.value=email; form.elements.email.readOnly=edit; form.elements.role.value=role;
  status.value.textContent=''; dialog.value.showModal();
}
function openDetails() { mode.value='view'; status.value.textContent=''; dialog.value.showModal(); }
function close() { if (dialog.value?.open) dialog.value.close(); }

defineExpose({render,renderRegistered,openEditor,openDetails,close,get status(){return status.value;}});
</script>

<template>
  <h2>Usuarios y permisos</h2>
  <p class="hint">Cada usuario pertenece a una sola compañía. El Superadministrador tiene acceso global y puede visualizar todas las compañías; este permiso protegido no se asigna desde el selector común. Para trasladar un usuario, retira primero su acceso anterior. Usa el correo exacto con el que la persona inicia sesión. Para cambiar un rol, usa Editar rol. No se envían invitaciones por correo.</p>

  <details id="registered-users" :hidden="!state.registryVisible">
    <summary>Registro de usuarios de la plataforma (100 más recientes)</summary>
    <div id="registered-users-list" class="history-table-scroll" role="region" aria-label="Usuarios registrados">
      <table class="history-table"><caption>Usuarios registrados</caption><thead><tr><th>Nombre</th><th>Correo</th><th>Identificación</th><th>Acciones</th></tr></thead>
        <tbody><tr v-for="(person,index) in state.registeredUsers" :key="person.id || person.email"><td>{{ person.firstName }} {{ person.lastName }}</td><td>{{ person.email }}</td><td>{{ person.documentType }} {{ person.identification }}</td><td><button type="button" class="quiet" data-user-access-action="registered-view" :data-index="index">Ver ficha</button></td></tr></tbody>
      </table>
      <p v-if="!state.registeredUsers.length" class="empty">No hay usuarios registrados.</p>
    </div>
  </details>

  <div class="section-head user-access-heading"><h3>Usuarios de la compañía</h3><button v-if="canManage" type="button" data-user-access-action="assign">+ Asignar usuario</button></div>
  <div id="access-list" class="history-table-scroll" role="region" aria-label="Usuarios de la compañía">
    <table class="history-table"><caption>Usuarios de la compañía</caption><thead><tr><th>Correo</th><th>Rol</th><th>Acciones</th></tr></thead>
      <tbody><tr v-for="member in members" :key="member.email"><td>{{ member.email }}</td><td>{{ member.roleLabel }}</td><td><div class="row-actions">
        <button type="button" class="quiet" data-user-access-action="view" :data-email="member.email">Ver usuario</button>
        <button v-if="!member.globalAccess" type="button" class="quiet" data-user-access-action="edit" :data-email="member.email">Editar rol</button>
        <button v-if="!member.globalAccess" type="button" class="quiet" data-user-access-action="remove" :data-email="member.email" :disabled="!member.removable">Retirar acceso</button>
      </div></td></tr></tbody>
    </table>
    <p v-if="!members.length" class="empty">Aún no hay usuarios asignados.</p>
  </div>

  <Teleport to="body">
    <dialog ref="dialog" class="record-dialog" aria-labelledby="user-access-dialog-title">
      <div class="section-head"><h2 id="user-access-dialog-title">{{ mode === 'edit' ? (editing ? 'Editar rol' : 'Asignar usuario a la compañía') : 'Información del usuario' }}</h2><button type="button" class="quiet" data-user-access-action="close">Cerrar</button></div>
      <dl v-show="mode==='view'" id="user-access-details" class="customer-details"></dl>
      <form v-show="mode==='edit'" id="access-form">
        <div class="two"><label>Correo electrónico<input type="email" name="email" maxlength="254" required></label><label>Rol<select name="role" required><option value="">Selecciona un rol</option><option value="viewer">Consulta</option><option value="admin">Administrador</option></select></label></div>
        <p class="hint role-help"><strong>Administrador:</strong> puede visualizar y gestionar todos los módulos de esta compañía. Su acceso queda limitado a una sola compañía.</p>
        <button type="submit">Guardar acceso</button>
      </form>
      <p ref="status" id="user-access-status" class="modal-status" role="status"></p>
    </dialog>
  </Teleport>
</template>
