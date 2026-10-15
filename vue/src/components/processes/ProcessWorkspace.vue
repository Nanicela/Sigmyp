<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { modulesForProcess } from '../../domain/module-catalog.js';
import { processById } from '../../domain/process-catalog.js';

const props = defineProps({ processId: { type: String, required: true } });
const process = computed(() => processById(props.processId));
const modules = computed(() => modulesForProcess(props.processId));
const activeModuleId = ref(modules.value[0]?.id || '');
const moduleData = ref({});
const bridgeNames = { company:'__sigmypCompanyProfile', access:'__sigmypUserAccess', crm:'__sigmypCustomerDirectory' };
const activeModule = computed(() => modules.value.find(module => module.id === activeModuleId.value) || modules.value[0]);
const activeData = computed(() => moduleData.value[activeModule.value?.id] || null);

function parentWindow() {
  try { return window.parent !== window && window.parent.location.origin === window.location.origin ? window.parent : null; }
  catch { return null; }
}
function refresh() {
  const source = parentWindow();
  if (!source) return;
  const next = {};
  for (const module of modules.value) {
    const bridge = source[bridgeNames[module.id]];
    if (typeof bridge?.snapshot === 'function') next[module.id] = bridge.snapshot();
  }
  moduleData.value = next;
}
function selectModule(moduleId) { activeModuleId.value = moduleId; refresh(); }
function relationCount(items, customerId) { return (items || []).filter(item => item.customerId === customerId).length; }
function onWorkspaceUpdate() { refresh(); }

onMounted(() => {
  refresh();
  parentWindow()?.addEventListener('sigmyp:workspace-data', onWorkspaceUpdate);
});
onBeforeUnmount(() => parentWindow()?.removeEventListener('sigmyp:workspace-data', onWorkspaceUpdate));
</script>

<template>
  <p class="section-caption">OPERACIÓN DEL PROCESO</p>
  <h2>Herramientas de {{ process?.name || 'este proceso' }}</h2>
  <p class="process-workspace-intro">Consulta la información de la compañía seleccionada sin salir del proceso.</p>
  <div class="process-module-tabs" role="tablist" aria-label="Herramientas del proceso">
    <button v-for="module in modules" :id="`workspace-tab-${module.id}`" :key="module.id" type="button" role="tab" :aria-selected="module.id===activeModule?.id" :aria-controls="`workspace-panel-${module.id}`" @click="selectModule(module.id)">{{ module.label }}</button>
  </div>
  <section v-if="activeModule" :id="`workspace-panel-${activeModule.id}`" class="process-module-content" role="tabpanel" :aria-labelledby="`workspace-tab-${activeModule.id}`">
    <div class="process-module-heading"><h3>{{ activeModule.label }}</h3><a :href="`/app.html#${activeModule.route}`" target="_top">Abrir gestión completa</a></div>
    <p v-if="!activeData" class="process-workspace-empty">Abre el mapa desde SIGMYP para consultar los datos de la compañía activa.</p>

    <div v-else-if="activeModule.id==='company'" class="process-data-table-wrap">
      <table class="process-data-table"><thead><tr><th>Empresa</th><th>NIT</th><th>Correo</th><th>Ubicación</th></tr></thead><tbody><tr><td>{{ activeData.profile?.name || 'Ficha pendiente' }}</td><td>{{ activeData.company }}</td><td>{{ activeData.profile?.email || '—' }}</td><td>{{ [activeData.profile?.municipality,activeData.profile?.department].filter(Boolean).join(', ') || '—' }}</td></tr></tbody></table>
    </div>

    <div v-else-if="activeModule.id==='access'" class="process-data-table-wrap">
      <table class="process-data-table"><thead><tr><th>Usuario</th><th>Rol</th><th>Alcance</th></tr></thead><tbody><tr v-for="member in activeData.members" :key="member.email"><td>{{ member.email }}</td><td>{{ member.roleLabel }}</td><td>{{ member.globalAccess ? 'Todas las compañías' : 'Compañía activa' }}</td></tr></tbody></table>
      <p v-if="!activeData.members?.length" class="process-workspace-empty">No hay usuarios asignados.</p>
    </div>

    <div v-else-if="activeModule.id==='crm'" class="process-data-table-wrap">
      <table class="process-data-table"><thead><tr><th>Cliente</th><th>Identificación</th><th>Correo</th><th>Teléfono</th><th>Relaciones</th></tr></thead><tbody><tr v-for="customer in activeData.customers" :key="customer.id"><td>{{ customer.name }}</td><td>{{ customer.documentType }} {{ customer.identification }}</td><td>{{ customer.email }}</td><td>{{ customer.phone || '—' }}</td><td>{{ relationCount(activeData.contacts,customer.id) }} contactos · {{ relationCount(activeData.sites,customer.id) }} sedes</td></tr></tbody></table>
      <p v-if="activeData.loading" class="process-workspace-empty">Cargando clientes…</p><p v-else-if="!activeData.customers?.length" class="process-workspace-empty">No hay clientes registrados.</p>
    </div>
  </section>
</template>
