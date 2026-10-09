<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

const open = ref(false);
const trigger = ref(null);
const menu = ref(null);

async function toggleMenu() {
  open.value = !open.value;
  if (open.value) {
    await nextTick();
    menu.value?.querySelector('[role="menuitem"]:not([hidden])')?.focus();
  }
}
function closeMenu({ focus = false } = {}) {
  if (!open.value) return;
  open.value = false;
  if (focus) nextTick(() => trigger.value?.focus());
}
function closeFromOutside(event) {
  if (!event.target.closest('#account-actions')) closeMenu();
}
function closeFromKeyboard(event) {
  if (event.key === 'Escape') closeMenu({ focus:true });
}
function closeFromApplication() { closeMenu(); }

onMounted(() => {
  document.addEventListener('click', closeFromOutside);
  document.addEventListener('keydown', closeFromKeyboard);
  window.addEventListener('sigmyp:account-close', closeFromApplication);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', closeFromOutside);
  document.removeEventListener('keydown', closeFromKeyboard);
  window.removeEventListener('sigmyp:account-close', closeFromApplication);
});
</script>

<template>
  <a class="header-sigmyp-brand" href="/app.html" aria-label="Ir al inicio de SIGMYP">
    <span class="sigmyp-logo sigmyp-logo-header"><img src="/logo-sigmyp.png" alt="SIGMYP by DyD · Sistema integrado de gestión para micro y pequeñas empresas"></span>
  </a>
  <div class="session">
    <span id="mode" hidden></span>
    <div id="account-actions" class="account-actions" data-vue-account-menu="true" hidden>
      <button ref="trigger" id="account-trigger" class="account-icon-button" type="button" aria-haspopup="menu" :aria-expanded="String(open)" aria-controls="account-menu" title="Abrir menú de usuario" @click.stop="toggleMenu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
        <span id="account-initials" aria-hidden="true"></span>
        <span class="sr-only">Abrir menú de usuario</span>
      </button>
      <div ref="menu" id="account-menu" class="account-menu" role="menu" v-show="open">
        <div class="account-summary"><strong id="account-name"></strong><span id="account-email"></span><small id="account-role"></small></div>
        <button id="account-profile" type="button" role="menuitem"><span class="account-menu-icon" aria-hidden="true">●</span><span><strong>Mi perfil</strong><small>Ver mi información personal</small></span></button>
        <button id="account-company" type="button" role="menuitem" hidden><span class="account-menu-icon" aria-hidden="true">▦</span><span><strong>Datos de la empresa</strong><small>Consultar la compañía activa</small></span></button>
        <button id="account-users" type="button" role="menuitem" hidden><span class="account-menu-icon" aria-hidden="true">⚙</span><span><strong>Usuarios y permisos</strong><small>Configurar accesos y roles</small></span></button>
        <button id="logout" type="button" role="menuitem" hidden><span class="account-menu-icon" aria-hidden="true">↪</span><span><strong>Cerrar sesión</strong><small>Salir de SIGMYP</small></span></button>
      </div>
    </div>
  </div>
</template>
