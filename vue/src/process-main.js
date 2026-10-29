import { createApp, nextTick } from 'vue';
import pages from './generated/process-pages.js';
import ProcessMap from './components/processes/ProcessMap.vue';
import ProcessWorkspace from './components/processes/ProcessWorkspace.vue';
import { workspaceTabsForProcess } from './domain/module-catalog.js';
import { processByFile } from './domain/process-catalog.js';

const file = location.pathname.split('/').pop() || 'index.html';
const page = pages[file];
const shells = import.meta.glob('./generated/process/*.vue', { eager: true });
const shell = file === 'index.html' ? { default:ProcessMap } : shells[`./generated/process/${file.replace(/\.html$/, '')}.vue`];

if (!page || !shell) throw new Error(`La vista de proceso ${file} no está registrada.`);

document.body.className = page.bodyClass;
createApp(shell.default).mount('#process-app');
await nextTick();
document.documentElement.dataset.ui = 'vue';

const process = processByFile(file);
const processModules = process ? workspaceTabsForProcess(process.id) : [];
if (processModules.length) {
  const tabs = document.querySelector('.detail-tabs');
  const firstPanel = tabs?.nextElementSibling;
  if (tabs && firstPanel) {
    const tab = document.createElement('button');
    tab.id = 'tab-operation';
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    tab.setAttribute('aria-controls', 'panel-operation');
    tab.tabIndex = -1;
    tab.innerHTML = `Gestión <span>${processModules.length}</span>`;
    tabs.append(tab);

    const panel = document.createElement('section');
    panel.id = 'panel-operation';
    panel.className = 'content-panel process-workspace-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.hidden = true;
    const host = document.createElement('div');
    panel.append(host);
    firstPanel.parentElement.insertBefore(panel, firstPanel);
    createApp(ProcessWorkspace, { processId: process.id }).mount(host);
  }
}

// La comprobación de acceso sigue usando la misma sesión y las mismas reglas.
await import('../../web/process-auth.js');

// Los catálogos de procesos actuales son scripts clásicos que comparten datos
// globales. Se cargan en su orden original después de que Vue crea la vista.
for (const source of file === 'index.html' ? [] : page.scripts) {
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `/procesos/${source}`;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`No se pudo cargar ${source}.`));
    document.head.append(script);
  });
}
