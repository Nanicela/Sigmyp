<script setup>
import { computed, onBeforeUnmount, onMounted, ref, reactive, watch } from 'vue';
import ProductionRecords from './ProductionRecords.vue';
import PurchaseRecords from './PurchaseRecords.vue';
import QuotationDetails from './QuotationDetails.vue';
import AccountDetails from './AccountDetails.vue';
import ContactDetails from './ContactDetails.vue';
import OfficeDetails from './OfficeDetails.vue';
import { workspaceTabsForProcess } from '../../domain/module-catalog.js';
import { filterCommercial, paginate, sortCommercialByName } from '../../domain/commercial-table.js';
import { processById } from '../../domain/process-catalog.js';

const props = defineProps({ processId: { type: String, required: true } });
const process = computed(() => processById(props.processId));
const modules = computed(() => workspaceTabsForProcess(props.processId));
const activeModuleId = ref(modules.value[0]?.id || '');
const moduleData = ref({});
const bridgeNames = { production:'__sigmypCustomerDirectory', company:'__sigmypCompanyProfile', access:'__sigmypUserAccess', purchases:'__sigmypCustomerDirectory', crm:'__sigmypCustomerDirectory' };
const activeModule = computed(() => modules.value.find(module => module.id === activeModuleId.value) || modules.value[0]);
const activeData = computed(() => {
  const current=moduleData.value[activeModule.value?.dataModule==='sales'?'crm':activeModule.value?.dataModule];
  if(!current)return null;
  if(activeModule.value?.dataModule==='purchases')return current.legacyPurchases?{...current.legacyPurchases,canEdit:!!current.canEditAccounts}:{unavailable:true};
  if(activeModule.value?.dataModule==='production')return current.legacyProduction?{...current.legacyProduction,canEdit:!!current.canEditAccounts,directory:current.legacyCommercial,purchases:current.legacyPurchases}:{pending:true};
  const imported=current.legacyCommercial;
  if(!imported)return current;
  return {...current,...imported,
    customers:[...(current.customers||[]),...(imported.customers||[])],
    contacts:[...(current.contacts||[]),...(imported.contacts||[])],
    sites:[...(current.sites||[]),...(imported.sites||[])]};
});
const money = value => value == null ? '—' : new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP'}).format(Number(value));
const dateLabel = value => value ? new Date(value).toLocaleDateString('es-CO',{timeZone:'America/Bogota'}) : '—';

const filters = reactive({search:'',account:'',status:'',city:'',quality:'',from:'',to:''});
const selectedAccountId=ref('');
const newAccount=ref(null);
function createAccount(){
 const id='new_'+crypto.randomUUID();
 newAccount.value={id,sourceDocumentId:id,sourceId:null,status:'NEW'};
 selectedAccountId.value='';
}
const newQuotationId=ref(''),selectedQuotationId=ref(''),quotationAction=ref('view'),exportingQuotationId=ref(''),quotationActionError=ref('');
async function openQuotation(q,action='view'){quotationActionError.value='';try{await parentWindow()?.__sigmypCustomerDirectory?.ensureQuotationDetail(q.id);quotationAction.value=action;selectedQuotationId.value=q.id;}catch(e){quotationActionError.value=e.message;}}
async function exportQuotation(q){if(exportingQuotationId.value)return;exportingQuotationId.value=q.id;quotationActionError.value='';try{const {downloadQuotationPdf}=await import('../../../../web/quotation-pdf.js');await downloadQuotationPdf(await parentWindow().__sigmypCustomerDirectory.ensureQuotationDetail(q.id),activeData.value?.customers||[]);}catch(e){quotationActionError.value='No se pudo exportar el PDF: '+e.message;}finally{exportingQuotationId.value='';}}
const selectedQuotation=computed(()=>activeData.value?.quotations?.find(q=>q.id===selectedQuotationId.value)||null);
async function createQuotation(id,input){const bridge=parentWindow()?.__sigmypCustomerDirectory;if(!bridge?.createQuotation)throw Error('Abre el módulo desde SIGMYP.');return bridge.createQuotation(id,input);}
async function updateQuotation(record,input){const bridge=parentWindow()?.__sigmypCustomerDirectory;if(!bridge?.updateQuotation)throw Error('Abre el módulo desde SIGMYP.');return bridge.updateQuotation(record,input);}
function startQuotation(){quotationAction.value='view';selectedQuotationId.value='';newQuotationId.value='new_'+crypto.randomUUID();}
const newContact=ref(null),newOffice=ref(null);
function createRecord(kind){const id='new_'+crypto.randomUUID();const record={id,sourceId:null,sourceDocumentId:id};if(kind==='contacts'){selectedContactId.value='';newContact.value=record;}else{selectedOfficeId.value='';newOffice.value=record;}}
const selectedContactId=ref('');
const selectedOfficeId=ref('');
const selectedOffice=computed(()=>newOffice.value||activeData.value?.sites?.find(s=>s.id===selectedOfficeId.value)||null);
const officeAccount=computed(()=>activeData.value?.customers?.find(c=>c.id===selectedOffice.value?.customerId)||null);
const selectedContact=computed(()=>newContact.value||activeData.value?.contacts?.find(c=>c.id===selectedContactId.value)||null);
const contactAccount=computed(()=>activeData.value?.customers?.find(c=>c.id===selectedContact.value?.customerId)||null);
const selectedAccount=computed(()=>newAccount.value||activeData.value?.customers?.find(c=>c.id===selectedAccountId.value)||null);
const selectedContacts=computed(()=>selectedAccount.value?(activeData.value?.contacts||[]).filter(c=>c.customerId===selectedAccountId.value):[]);
const selectedOffices=computed(()=>selectedAccount.value?(activeData.value?.sites||[]).filter(s=>s.customerId===selectedAccountId.value):[]);
const page=ref(1), pageSize=ref(25);
const isCommercial=computed(()=>['accounts','contacts','offices','quotations'].includes(activeModule.value?.id));
const tableReady=computed(()=>isCommercial.value && activeData.value && !activeData.value.loading && !activeData.value.error && (!activeModule.value.pending || activeData.value.quotations));
const allRows=computed(()=>activeData.value?.[{accounts:'customers',contacts:'contacts',offices:'sites',quotations:'quotations'}[activeModule.value?.id]]||[]);
const accountNames=computed(()=>Object.fromEntries((activeData.value?.customers||[]).map(c=>[c.id,c.name])));
const accountOptions=computed(()=>(activeData.value?.customers||[]).slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'','es')));
const cityOptions=computed(()=>[...new Set(allRows.value.map(row=>row.municipality).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')));
const statusOptions=computed(()=>[...new Set(allRows.value.map(row=>row.status).filter(Boolean))].sort());
const invalidDates=computed(()=>filters.from && filters.to && filters.from>filters.to);
const filteredRows=computed(()=>invalidDates.value?[]:filterCommercial(allRows.value,filters,accountNames.value));
const nameSort=reactive({accounts:'',contacts:'',offices:''});
const sortDirection=computed(()=>nameSort[activeModule.value?.id]||'');
const sortLabel=computed(()=>sortDirection.value==='asc'?'Ordenar por nombre de Z a A':'Ordenar por nombre de A a Z');
const sortedRows=computed(()=>sortCommercialByName(filteredRows.value,sortDirection.value));
const pagination=computed(()=>paginate(sortedRows.value,page.value,pageSize.value));
function toggleNameSort(){nameSort[activeModule.value.id]=sortDirection.value==='asc'?'desc':'asc';page.value=1;}

function clearFilters(){for(const key of Object.keys(filters))filters[key]='';page.value=1;}
watch([()=>({...filters}),pageSize],()=>{page.value=1;});
watch(activeModuleId,()=>{clearFilters();selectedAccountId.value='';selectedContactId.value='';selectedOfficeId.value='';newAccount.value=null;newContact.value=null;newOffice.value=null;newQuotationId.value='';selectedQuotationId.value='';});
watch(()=>moduleData.value.company?.company,clearFilters);

function parentWindow() {
  try { return window.parent !== window && window.parent.location.origin === window.location.origin ? window.parent : null; }
  catch { return null; }
}
function refresh() {
  const source = parentWindow();
  if (!source) return;
  const next = {};
  for (const module of modules.value) {
    const bridge = source[bridgeNames[module.dataModule]];
    if (typeof bridge?.snapshot === 'function') next[module.dataModule] = bridge.snapshot();
  }
  moduleData.value = next;
  requestVisibleModule();
}
let visibilityObserver=null;
function requestVisibleModule(){
 const panel=document.getElementById('panel-operation');
 if(!panel||panel.hidden)return;
 parentWindow()?.__sigmypCustomerDirectory?.ensureWorkspace?.(activeModule.value?.dataModule);
}
function selectModule(moduleId) { activeModuleId.value = moduleId; refresh(); }
async function prepareProduction(record,group,detailsOnly=false){const b=parentWindow()?.__sigmypCustomerDirectory;if(!b)throw Error('Abre Producción desde SIGMYP.');if(detailsOnly)return b.ensureProductionDetail(record,group);const key=group==='products'?'purchases':'crm';await b.ensureWorkspace(key);const directory=b.snapshot()[key==='crm'?'legacyCommercial':'legacyPurchases'];if(!directory||directory.error||directory.loading)throw Error('No se pudieron cargar los datos relacionados.');return record?b.ensureProductionDetail(record,group):null;}
async function saveProduction(...args){return parentWindow().__sigmypCustomerDirectory.saveProduction(...args);}
async function createPurchase(group,id,input){const bridge=parentWindow()?.__sigmypCustomerDirectory;if(!bridge?.createPurchase)throw Error('Abre Compras desde SIGMYP.');return bridge.createPurchase(group,id,input);}
async function savePurchase(group,record,input){const bridge=parentWindow()?.__sigmypCustomerDirectory;if(!bridge?.savePurchase)throw Error('Abre Compras desde SIGMYP.');return bridge.savePurchase(group,record,input);}
async function saveAccount(account,input) {
 const bridge=parentWindow()?.__sigmypCustomerDirectory;
 if(!bridge?.saveAccount)throw Error('Abre esta cuenta desde SIGMYP para guardar.');
 const saved=await bridge.saveAccount(account,input);
 if(newAccount.value){newAccount.value=null;selectedAccountId.value=saved.id;}
 return saved;
}
async function saveRecord(kind,record,input){
 const bridge=parentWindow()?.__sigmypCustomerDirectory;
 if(!bridge?.saveRecord)throw Error('Abre este registro desde SIGMYP para guardar.');
 const saved=await bridge.saveRecord(kind,record,input);
 if(kind==='contacts'&&newContact.value){newContact.value=null;selectedContactId.value=saved.id;}
 if(kind==='offices'&&newOffice.value){newOffice.value=null;selectedOfficeId.value=saved.id;}
 return saved;
}
function accountName(customerId) {
  return activeData.value?.customers?.find(item => item.id === customerId)?.name || 'Cuenta no disponible';
}
function moveTab(event, index) {
  const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
  if (!keys.includes(event.key)) return;
  event.preventDefault();
  const count = modules.value.length;
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1
    : (index + (event.key === 'ArrowRight' ? 1 : -1) + count) % count;
  selectModule(modules.value[next].id);
  event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus();
}
function onWorkspaceUpdate() { refresh(); }

onMounted(() => {
  visibilityObserver=new MutationObserver(requestVisibleModule);
  const panel=document.getElementById('panel-operation');if(panel)visibilityObserver.observe(panel,{attributes:true,attributeFilter:['hidden']});
  refresh();
  parentWindow()?.addEventListener('sigmyp:workspace-data', onWorkspaceUpdate);
});
onBeforeUnmount(() => {visibilityObserver?.disconnect();parentWindow()?.removeEventListener('sigmyp:workspace-data', onWorkspaceUpdate);});
</script>

<template>
  <p class="section-caption">OPERACIÓN DEL PROCESO</p>
  <h2>Herramientas de {{ process?.name || 'este proceso' }}</h2>
  <p class="process-workspace-intro">Consulta la información de la compañía seleccionada sin salir del proceso.</p>
  <div class="process-module-tabs" role="tablist" aria-label="Herramientas del proceso">
    <button v-for="(module, index) in modules" :id="`workspace-tab-${module.id}`" :key="module.id" type="button" role="tab" :aria-selected="module.id===activeModule?.id" :aria-controls="`workspace-panel-${module.id}`" :tabindex="module.id===activeModule?.id ? 0 : -1" @keydown="moveTab($event, index)" @click="selectModule(module.id)">{{ module.label }}</button>
  </div>
  <section v-if="activeModule" :id="`workspace-panel-${activeModule.id}`" class="process-module-content" role="tabpanel" :aria-labelledby="`workspace-tab-${activeModule.id}`">
    <div class="process-module-heading"><h3>{{ activeModule.label }}</h3><button v-if="activeModule.id==='accounts' && activeData?.canEditAccounts && !activeData?.loading && !activeData?.error" type="button" class="commercial-create-account" @click="createAccount">+ Crear cuenta</button><button v-if="['contacts','offices'].includes(activeModule.id) && activeData?.canEditAccounts && !activeData?.loading && !activeData?.error" type="button" class="commercial-create-account" @click="createRecord(activeModule.id)">+ Crear {{ activeModule.id==='contacts'?'contacto':'oficina' }}</button><button v-if="activeModule.id==='quotations' && activeData?.canEditAccounts && !activeData?.loading && !activeData?.error" class="commercial-create-account" type="button" @click="startQuotation">+ Crear cotización</button></div>
    <div v-if="tableReady" class="commercial-filters" role="search" :aria-label="'Buscar y filtrar '+activeModule.label">
      <label class="commercial-search">Buscar<input v-model="filters.search" type="search" placeholder="Nombre, identificación, correo…" autocomplete="off"></label>
      <label v-if="activeModule.id!=='accounts'">Cuenta<select v-model="filters.account"><option value="">Todas las cuentas</option><option value="__missing__">Sin cuenta vinculada</option><option v-for="account in accountOptions" :key="account.id" :value="account.id">{{ account.name }} · {{ account.identification || 'Sin identificación' }}</option></select></label>
      <label v-if="activeModule.id==='accounts'">Datos de contacto<select v-model="filters.quality"><option value="">Todos los registros</option><option value="missing-email">Sin correo</option><option value="missing-identification">Sin identificación</option></select></label>
      <label v-if="activeModule.id==='offices'">Municipio<select v-model="filters.city"><option value="">Todos los municipios</option><option v-for="city in cityOptions" :key="city" :value="city">{{ city }}</option></select></label>
      <template v-if="activeModule.id==='quotations'">
        <label>Estado<select v-model="filters.status"><option value="">Todos los estados</option><option v-for="status in statusOptions" :key="status" :value="status">{{ status }}</option></select></label>
        <label>Desde<input v-model="filters.from" type="date" :max="filters.to || undefined"></label>
        <label>Hasta<input v-model="filters.to" type="date" :min="filters.from || undefined"></label>
      </template>
      <button type="button" @click="clearFilters">Limpiar filtros</button>
    </div>
    <p v-if="tableReady && invalidDates" class="process-workspace-empty" role="alert">La fecha inicial debe ser anterior o igual a la fecha final.</p>
    <PurchaseRecords v-if="processId==='compras'" :module="activeModule" :data="activeData" :save-record="savePurchase" :create-record="createPurchase" />
    <ProductionRecords v-else-if="processId==='produccion'" :module="activeModule" :data="activeData" :save-record="saveProduction" :prepare="prepareProduction" />
    <p v-else-if="activeData?.error" class="process-workspace-empty" role="status">{{ activeData.error }}</p>
    <p v-else-if="activeData?.loading" class="process-workspace-empty">Cargando datos…</p>
    <p v-else-if="activeModule.pending && !activeData?.quotations" class="process-workspace-empty">Las cotizaciones de 2026 están pendientes de migración. Estarán disponibles aquí cuando se complete la importación.</p>
    <p v-else-if="!activeData" class="process-workspace-empty">Abre el mapa desde SIGMYP para consultar los datos de la compañía activa.</p>

    <div v-else-if="activeModule.id==='quotations'" class="process-data-table-wrap">
      <p v-if="quotationActionError" role="alert">{{ quotationActionError }}</p>
      <table class="process-data-table"><thead><tr><th>Número</th><th>Cuenta</th><th>Fecha</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead><tbody>
        <tr v-for="quotation in pagination.rows" :key="quotation.id"><td>{{ quotation.number }}</td><td>{{ accountName(quotation.customerId) }}</td><td>{{ dateLabel(quotation.date) }}</td><td>{{ quotation.status==='CREATED'?'Creada':quotation.status || '—' }}</td><td>{{ money(quotation.total) }}</td><td><div style="display:flex;gap:6px;white-space:nowrap"><button type="button" class="commercial-view-account" title="Ver cotización" aria-label="Ver cotización" @click="openQuotation(quotation)"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button>
<button v-if="activeData?.canEditAccounts && activeData?.quotationCreatesEnabled" type="button" class="commercial-view-account" title="Duplicar cotización" aria-label="Duplicar cotización" @click="openQuotation(quotation,'duplicate')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></svg></button>
<button type="button" class="commercial-view-account" :disabled="!!exportingQuotationId" :aria-busy="exportingQuotationId===quotation.id" title="Exportar cotización a PDF" aria-label="Exportar cotización a PDF" @click="exportQuotation(quotation)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 2H5v20h14V7l-5-5Zm0 0v6h5M12 10v8m-4-4 4 4 4-4"/></svg></button></div></td></tr>
      </tbody></table>
      <p v-if="!activeData.quotations?.length" class="process-workspace-empty">No hay cotizaciones registradas para este año.</p>
    </div>
    <div v-else-if="activeModule.id==='company'" class="process-data-table-wrap">
      <table class="process-data-table"><thead><tr><th>Empresa</th><th>NIT</th><th>Correo</th><th>Ubicación</th></tr></thead><tbody><tr><td>{{ activeData.profile?.name || 'Ficha pendiente' }}</td><td>{{ activeData.company }}</td><td>{{ activeData.profile?.email || '—' }}</td><td>{{ [activeData.profile?.municipality,activeData.profile?.department].filter(Boolean).join(', ') || '—' }}</td></tr></tbody></table>
    </div>

    <div v-else-if="activeModule.id==='access'" class="process-data-table-wrap">
      <table class="process-data-table"><thead><tr><th>Usuario</th><th>Rol</th><th>Alcance</th></tr></thead><tbody><tr v-for="member in activeData.members" :key="member.email"><td>{{ member.email }}</td><td>{{ member.roleLabel }}</td><td>{{ member.globalAccess ? 'Todas las compañías' : 'Compañía activa' }}</td></tr></tbody></table>
      <p v-if="!activeData.members?.length" class="process-workspace-empty">No hay usuarios asignados.</p>
    </div>

    <div v-else-if="activeModule.id==='accounts'" class="process-data-table-wrap">
      <table class="process-data-table commercial-accounts-table"><thead><tr><th>NIT</th><th :aria-sort="sortDirection==='asc'?'ascending':sortDirection==='desc'?'descending':'none'">Nombre <button type="button" class="commercial-sort-name" :title="sortLabel" :aria-label="sortLabel" @click="toggleNameSort"><span aria-hidden="true">{{ sortDirection==='asc'?'A–Z ↓':sortDirection==='desc'?'Z–A ↑':'↕' }}</span></button></th><th>Teléfono 1</th><th>Teléfono 2</th><th>Email</th><th>Sitio web</th><th>Dirección</th><th>Ciudad</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody><tr v-for="customer in pagination.rows" :key="customer.id">
          <td>{{ customer.identification || '—' }}</td><td>{{ customer.name || '—' }}</td>
          <td>{{ (customer.phone1 ?? customer.phone) || '—' }}</td><td>{{ customer.phone2 || '—' }}</td>
          <td>{{ customer.email || '—' }}</td><td>{{ customer.website || '—' }}</td>
          <td>{{ customer.address || '—' }}</td><td>{{ customer.municipality || '—' }}</td>
          <td>{{ ({NEW:'Nuevo',ACTIVE:'Activo',QUOTED:'Cotizado',INACTIVE:'Inactivo'})[customer.status] || customer.status || '—' }}</td>
          <td><button type="button" class="commercial-view-account" title="Ver cuenta" :aria-label="'Ver cuenta: '+customer.name" @click="selectedAccountId=customer.id"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
        </tr></tbody>
      </table>
      <p v-if="activeData.loading" class="process-workspace-empty">Cargando cuentas…</p><p v-else-if="!activeData.customers?.length" class="process-workspace-empty">No hay cuentas registradas.</p>
    </div>

    <div v-else-if="activeModule.id==='contacts'" class="process-data-table-wrap">
      <table class="process-data-table"><thead><tr><th :aria-sort="sortDirection==='asc'?'ascending':sortDirection==='desc'?'descending':'none'">Nombre <button type="button" class="commercial-sort-name" :title="sortLabel" :aria-label="sortLabel" @click="toggleNameSort"><span aria-hidden="true">{{ sortDirection==='asc'?'A–Z ↓':sortDirection==='desc'?'Z–A ↑':'↕' }}</span></button></th><th>Cuenta</th><th>Cargo</th><th>Correo</th><th>Teléfono</th><th>Acciones</th></tr></thead>
        <tbody><tr v-for="contact in pagination.rows" :key="contact.id"><td>{{ contact.name }}</td><td>{{ accountName(contact.customerId) }}</td><td>{{ contact.jobTitle || '—' }}</td><td>{{ contact.email || '—' }}</td><td>{{ contact.phone || '—' }}</td><td><button type="button" class="commercial-view-account" title="Ver contacto" :aria-label="'Ver contacto: '+(contact.name||'Sin nombre')" @click="selectedContactId=contact.id"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></td></tr></tbody>
      </table>
      <p v-if="activeData.loading" class="process-workspace-empty">Cargando contactos…</p><p v-else-if="!activeData.contacts?.length" class="process-workspace-empty">No hay contactos registrados.</p>
    </div>
    <div v-else-if="activeModule.id==='offices'" class="process-data-table-wrap">
      <table class="process-data-table"><thead><tr><th :aria-sort="sortDirection==='asc'?'ascending':sortDirection==='desc'?'descending':'none'">Oficina <button type="button" class="commercial-sort-name" :title="sortLabel" :aria-label="sortLabel" @click="toggleNameSort"><span aria-hidden="true">{{ sortDirection==='asc'?'A–Z ↓':sortDirection==='desc'?'Z–A ↑':'↕' }}</span></button></th><th>Cuenta</th><th>Dirección</th><th>Ubicación</th><th>Teléfono</th><th>Acciones</th></tr></thead>
        <tbody><tr v-for="site in pagination.rows" :key="site.id"><td>{{ site.name }}</td><td>{{ accountName(site.customerId) }}</td><td>{{ site.address || '—' }}</td><td>{{ [site.municipality, site.department].filter(Boolean).join(', ') || '—' }}</td><td>{{ site.phone || '—' }}</td><td><button type="button" class="commercial-view-account" title="Ver oficina" :aria-label="'Ver oficina: '+(site.name||'Sin nombre')" @click="selectedOfficeId=site.id"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></td></tr></tbody>
      </table>
      <p v-if="activeData.loading" class="process-workspace-empty">Cargando oficinas…</p><p v-else-if="!activeData.sites?.length" class="process-workspace-empty">No hay oficinas registradas.</p>
    </div>
    <template v-if="tableReady">
      <p v-if="!pagination.total && allRows.length && !invalidDates" class="process-workspace-empty">No se encontraron resultados. Prueba otros filtros.</p>
      <div class="commercial-pagination">
        <p role="status" aria-live="polite">{{ pagination.start }}–{{ pagination.end }} de {{ pagination.total }} resultados<span v-if="pagination.total!==allRows.length"> ({{ allRows.length }} registros en total)</span></p>
        <label>Por página<select v-model.number="pageSize"><option v-for="size in [10,25,50,100]" :key="size" :value="size">{{ size }}</option></select></label>
        <nav aria-label="Paginación">
          <button type="button" :disabled="pagination.page===1" @click="page=1" aria-label="Primera página">Primera</button>
          <button type="button" :disabled="pagination.page===1" @click="page=pagination.page-1">Anterior</button>
          <span>Página {{ pagination.page }} de {{ pagination.pages }}</span>
          <button type="button" :disabled="pagination.page===pagination.pages" @click="page=pagination.page+1">Siguiente</button>
          <button type="button" :disabled="pagination.page===pagination.pages" @click="page=pagination.pages" aria-label="Última página">Última</button>
        </nav>
      </div>
    </template>
  </section>
  <QuotationDetails :initial-action="quotationAction" :products="activeData?.quotationProducts || []" :draft-id="newQuotationId" :quotation="selectedQuotation" :accounts="activeData?.customers || []" :contacts="activeData?.contacts || []" :offices="activeData?.sites || []" :can-save="!!activeData?.canEditAccounts && !!activeData?.quotationCreatesEnabled" :create-quotation="createQuotation" :update-quotation="updateQuotation" @close="newQuotationId='';selectedQuotationId=''" />
  <OfficeDetails :creating="!!newOffice" :accounts="activeData?.customers || []" :contacts="activeData?.contacts || []" :can-edit="!!activeData?.canEditAccounts" :can-save="!!activeData?.officeEditsEnabled" :save-record="saveRecord" :locations="activeData?.locations || []" :office-types="[...new Set((activeData?.sites || []).map(s=>s.type).filter(Boolean))]" :office="selectedOffice" :account="officeAccount" @close="selectedOfficeId='';newOffice=null" />
  <ContactDetails :creating="!!newContact" :accounts="activeData?.customers || []" :can-edit="!!activeData?.canEditAccounts" :can-save="!!activeData?.contactEditsEnabled" :save-record="saveRecord" :contact="selectedContact" :account="contactAccount" @close="selectedContactId='';newContact=null" />
  <AccountDetails :creating="!!newAccount" :can-edit="!!activeData?.canEditAccounts && !!selectedAccount?.sourceDocumentId" :can-save="!!activeData?.editsEnabled" :locations="activeData?.locations || []" :save-account="saveAccount" :account="selectedAccount" :contacts="selectedContacts" :offices="selectedOffices" @close="selectedAccountId='';newAccount=null" />
</template>
