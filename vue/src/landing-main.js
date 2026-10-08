import { createApp, nextTick } from 'vue';
import { createPinia } from 'pinia';
import LandingShell from './generated/LandingShell.vue';
import { useApplicationStore } from './stores/application.js';

const pinia = createPinia();
createApp(LandingShell).use(pinia).mount('#app');
await nextTick();

// La lógica validada se mantiene durante la primera fase para conservar
// autenticación, recuperación, registro y redirecciones sin alterar datos.
await import('../../web/landing.js');
useApplicationStore(pinia).markReady();
document.documentElement.dataset.ui = 'vue';
