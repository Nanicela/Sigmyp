import { createApp, nextTick } from 'vue';
import { createPinia } from 'pinia';
import AppShell from './generated/AppShell.vue';
import AppHeader from './components/app/AppHeader.vue';
import CompanyChooser from './components/app/CompanyChooser.vue';
import CompanyProfile from './components/company/CompanyProfile.vue';
import UserAccess from './components/users/UserAccess.vue';
import { useApplicationStore } from './stores/application.js';

const pinia = createPinia();
createApp(AppShell).use(pinia).mount('#app');
await nextTick();

// Estas dos zonas ya tienen interacción Vue propia. La capa de negocio actual
// conserva temporalmente la sesión, permisos y consultas a Firebase.
createApp(AppHeader).mount('main > header');
createApp(CompanyChooser).mount('.company-bar');
window.__sigmypCompanyProfile = createApp(CompanyProfile).mount('[data-view="empresa"]');
window.__sigmypUserAccess = createApp(UserAccess).mount('[data-view="usuarios"]');
await nextTick();

// Puente de compatibilidad: Vue renderiza la interfaz y la lógica existente
// conserva las operaciones ya verificadas mientras cada módulo se componentiza.
await import('../../web/app.js');
useApplicationStore(pinia).markReady();
document.documentElement.dataset.ui = 'vue';
