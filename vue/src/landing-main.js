import { createApp } from 'vue';
import { createPinia } from 'pinia';
import AuthLanding from './components/auth/AuthLanding.vue';
import { useApplicationStore } from './stores/application.js';

const pinia = createPinia();
createApp(AuthLanding).use(pinia).mount('#app');
useApplicationStore(pinia).markReady();
document.documentElement.dataset.ui = 'vue';
