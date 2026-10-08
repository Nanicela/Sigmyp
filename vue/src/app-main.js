import { createApp, nextTick } from 'vue';
import { createPinia } from 'pinia';
import AppShell from './generated/AppShell.vue';
import { useApplicationStore } from './stores/application.js';

const pinia = createPinia();
createApp(AppShell).use(pinia).mount('#app');
await nextTick();

// Puente de compatibilidad: Vue renderiza la interfaz y la lógica existente
// conserva las operaciones ya verificadas mientras cada módulo se componentiza.
await import('../../web/app.js');
useApplicationStore(pinia).markReady();
document.documentElement.dataset.ui = 'vue';
