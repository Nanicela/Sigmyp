import {table,node,action,modal,details} from './ui.js';
import {normalizePayment,todayColombia,dateText} from './payment-terms.js';
import {setupProducts} from './products.js';
import {chooseCompany} from './company-selection.js';
import {refreshDraftTotals} from './draft-totals.js';
import {userRecord} from './user-record.js';
import {allowedSignInProvider} from './auth-provider.js';
import {canonicalHostingUrl} from './canonical-host.js';
import {setupAudit} from './audit.js';
import {companiesFor, setupAccess, roleLabels} from './access.js';
import { setupHistory } from './history.js';
import { setupSidebar } from './sidebar.js';
import { setupNavigation } from './navigation.js';
import { setupProfiles } from './profiles.js';
import {isDydCompany} from './process-access.js';
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator, onAuthStateChanged, signInWithEmailAndPassword, signOut, getIdTokenResult, GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, doc, getDocFromServer, getDocs, getDocsFromServer, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { sparkCompanies, sparkDrafts, createSparkCompany, createSparkDraft, unpackDraft } from './spark.js';
const $ = selector => document.querySelector(selector);

function setupProcessFrame() {
  const frame = $('#process-map-frame');
  if (!frame) return;
  let observer;
  let scheduled = 0;
  const resize = () => {
    cancelAnimationFrame(scheduled);
    scheduled = requestAnimationFrame(() => {
      try {
        const doc = frame.contentDocument;
        if (!doc?.body) return;
        const mapIndex = doc.body.classList.contains('process-map-page');
        doc.documentElement.style.overflowY = 'hidden';
        doc.body.style.overflowY = 'hidden';
        const indexHeight = frame.clientWidth <= 600 ? 1200 : frame.clientWidth <= 800 ? 900 : 960;
        const content = doc.querySelector('main');
        const contentBottom = content ? Math.max(content.getBoundingClientRect().bottom, content.scrollHeight) : doc.body.scrollHeight;
        const height = mapIndex ? indexHeight : Math.max(1, Math.ceil(contentBottom));
        frame.style.height = `${height}px`;
      } catch { /* El contenido se mide cuando la página de mismo origen termina de cargar. */ }
    });
  };
  frame.addEventListener('load', () => {
    observer?.disconnect();
    resize();
    requestAnimationFrame(resize);
    frame.contentDocument?.fonts?.ready.then(() => {
      resize();
      requestAnimationFrame(resize);
    });
    try {
      observer = new MutationObserver(resize);
      observer.observe(frame.contentDocument.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'open', 'class', 'aria-selected'] });
    } catch { observer = undefined; }
  });
  window.addEventListener('resize', resize, { passive: true });
}

setupProcessFrame();
const labels = { INVOICE: 'Factura electrónica', CREDIT_NOTE: 'Nota crédito', DEBIT_NOTE: 'Nota débito' };
let auth, db, functions, documents = [], user = null, userProfile = null, revision = 0, requestKey = crypto.randomUUID(), pending = null;
let stopCompanies = null, editing = null, audit, companyStatus='loading';
const companyNames = new Map(), companyNameListeners = new Map();
const companyName = c => companyNames.get(c.id) || c.name;
function refreshCompanyNames() {
  for (const option of $('#company').options) {
    const c=companies.find(c=>c.id===option.value);
    if(c) option.textContent=companyName(c);
  }
  for(const card of $('#company-cards').querySelectorAll('[data-company-id]')) {
    const c=companies.find(c=>c.id===card.dataset.companyId);
    if(c) card.querySelector('strong').textContent=companyName(c);
  }
  navigation.update({signedIn:!!user,spark,admin:platform,role:currentRole()});
}
function watchCompanyNames() {
  const ids=new Set(companies.map(c=>c.id));
  for(const [id,stop] of companyNameListeners) if(!ids.has(id)) {
    stop();companyNameListeners.delete(id);companyNames.delete(id);
  }
  if(!spark)return;
  const currentUser=user;
  for(const c of companies) if(!companyNameListeners.has(c.id)) {
    const stop=onSnapshot(doc(db,'organizations',c.id,'profiles','tax'),snapshot=>{
      if(user!==currentUser || !companyNameListeners.has(c.id))return;
      const name=snapshot.exists()?snapshot.data().name:null;
      if(name)companyNames.set(c.id,name);else companyNames.delete(c.id);
      refreshCompanyNames();
    },()=>{
      if(user!==currentUser)return;
      companyNames.delete(c.id);refreshCompanyNames();
      message('No pudimos actualizar el nombre de una compañía. Recarga para intentar de nuevo.',true);
    });
    companyNameListeners.set(c.id,stop);
  }
}

let spark = false, profiles, products, access, platform = false, companies = [];
const currentRole = () => platform ? 'platform' : companies.find(c => c.id === $('#company').value)?.members?.[user?.email] || null;
function applyAccess() {
  const role = currentRole();
  navigation.update({signedIn:!!user,spark,admin:platform,role,companyStatus});
  $('#current-role').textContent = roleLabels[role] || 'Sin empresa asignada. Solicita acceso a la administradora.';
  $('#company-panel').hidden = !platform;
  $('#new-document-table').hidden=!['platform','admin','billing'].includes(role);
  $('#draft-fields').disabled = !['platform','admin','billing'].includes(role) || !$('#company').value;
  $('#open-audit').hidden = role !== 'platform' || !$('#company').value;
  access?.render(companies.find(c => c.id === $('#company').value),user);
  renderAccountMenu();
}
const history = setupHistory({getCollection: id => draftsCollection(id), unpack: d => ({...(spark ? unpackDraft(d.data()) : d.data()),id:d.id}), onEdit: editDraft, onNote: startNote, canEdit:()=>['platform','admin','billing'].includes(currentRole())});
setupSidebar();
const navigation = setupNavigation();
const accountMenu = $('#account-menu');
const vueAccountMenu = $('#account-actions').dataset.vueAccountMenu === 'true';
function closeAccountMenu(){
  if(vueAccountMenu){window.dispatchEvent(new Event('sigmyp:account-close'));return;}
  accountMenu.hidden=true;$('#account-trigger').setAttribute('aria-expanded','false');
}
function openAccountMenu(){accountMenu.hidden=false;$('#account-trigger').setAttribute('aria-expanded','true');accountMenu.querySelector('[role="menuitem"]:not([hidden])')?.focus();}
function renderAccountMenu(){
  const visible=!!user,role=currentRole(),company=$('#company').value;
  $('#account-actions').hidden=!visible;$('#logout').hidden=!visible;
  if(!visible){closeAccountMenu();return;}
  const fullName=[userProfile?.firstName,userProfile?.lastName].filter(Boolean).join(' ')||user.displayName||'Usuario SIGMYP';
  const initials=fullName.split(/\s+/).filter(Boolean).slice(0,2).map(value=>value[0]).join('').toUpperCase()||'US';
  $('#account-initials').textContent=initials;$('#account-name').textContent=fullName;$('#account-email').textContent=user.email||'';$('#account-role').textContent='Rol · '+(roleLabels[role]||'Sin rol asignado');
  $('#account-company').hidden=!company;
  $('#account-customers').hidden=!company;
  $('#account-users').hidden=!company||!['platform','admin'].includes(role);
}
function accountRoute(route){closeAccountMenu();if(location.hash.slice(1)===route)navigation.update({signedIn:!!user,spark,admin:platform,role:currentRole(),companyStatus});else location.hash=route;}
function showMyProfile(){
  closeAccountMenu();
  const role=currentRole(),company=$('#company'),provider=(user?.providerData||[]).map(item=>item.providerId==='google.com'?'Google':item.providerId==='password'?'Correo y contraseña':item.providerId).filter(Boolean).join(', ');
  const profileModal=details('Mi perfil',[
    ['Nombres',userProfile?.firstName],['Apellidos',userProfile?.lastName],['Correo electrónico',user?.email],
    ['Tipo de identificación',userProfile?.documentType],['Número de identificación',userProfile?.identification],
    ['Teléfono',userProfile?.phone],['Cargo',userProfile?.jobTitle],['Rol actual',roleLabels[role]],
    ['Compañía activa',company.value?company.selectedOptions[0]?.textContent:'Ninguna seleccionada'],
    ['Alcance',role==='platform'?'Todas las compañías':company.value?'Solo la compañía asignada':'Sin compañía asignada'],
    ['Método de acceso',provider],['Correo verificado',user?.emailVerified?'Sí':'No']
  ]);
  if(isDydCompany(company.value)){
    const back=action('← Volver al mapa de procesos',()=>{profileModal.close();accountRoute('procesos');});
    back.classList.add('back-to-processes','profile-back-to-processes');
    profileModal.dialog.insertBefore(back,profileModal.status);
  }
}
if(!vueAccountMenu)$('#account-trigger').onclick=()=>accountMenu.hidden?openAccountMenu():closeAccountMenu();
$('#account-profile').onclick=showMyProfile;
$('#account-company').onclick=()=>accountRoute('empresa');
$('#account-customers').onclick=()=>accountRoute('clientes');
$('#account-users').onclick=()=>accountRoute('usuarios');
if(!vueAccountMenu){
  document.addEventListener('click',event=>{if(!$('#account-actions').contains(event.target))closeAccountMenu();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!accountMenu.hidden){closeAccountMenu();$('#account-trigger').focus();}});
}
const draftContent=node('div');for(const id of ['edit-notice','cancel-edit','draft-form'])draftContent.append($('#'+id));
const draftModal=modal('Documento',draftContent);
const companyModal=modal('Registrar empresa',$('#company-form'));
$('#open-document').onclick=()=>{if(!['platform','admin','billing'].includes(currentRole()))return;resetForm();draftModal.open('Crear documento');};
$('#new-document-table').onclick=()=>$('#open-document').click();
$('#open-company').onclick=()=>{$('#company-form').reset();companyModal.open();};
$('#create-company-table').onclick=()=>$('#open-company').click();

const companiesCollection = () => spark ? companiesFor(db, user, platform) : collection(db, 'users', user.uid, 'companies');
const draftsCollection = id => spark ? sparkDrafts(db, user.uid, id) : collection(db, 'companies', id, 'drafts');
function message(value = '', error = false) { $('#message').textContent = value; $('#message').className = error ? 'error' : '';for(const status of document.querySelectorAll('dialog[open] > .modal-status')){status.textContent=value;status.classList.toggle('error',error);} }
function element(tag, content, className) { const e = document.createElement(tag); e.textContent = content; if (className) e.className = className; return e; }
function money(value) { const [integer, decimals] = value.split('.'); return '$ ' + integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + decimals; }
function addLine(values = null) {
  const line = document.createElement('div'); line.className = 'line';
  line.innerHTML = '<label>Descripción<input data-field="description" required maxlength="200" placeholder="Producto o servicio"></label><div class="line-numbers"><label>Cantidad<input data-field="quantity" required inputmode="decimal" value="1" pattern="[0-9]+([.][0-9]{1,4})?"></label><label>Precio unitario<input data-field="unit_price" required inputmode="decimal" placeholder="100000.00" pattern="[0-9]+([.][0-9]{1,2})?"></label><label>Descuento efectivo %<input data-field="discount_rate" value="0" required inputmode="decimal" pattern="[0-9]+([.][0-9]{1,2})?"></label><label>Tratamiento IVA<select data-field="iva_rate"><option value="19">IVA 19 %</option><option value="5">IVA 5 %</option><option value="EXEMPT">Exento (0 %)</option><option value="EXCLUDED">Excluido</option><option value="NOT_SUBJECT">No gravado</option></select></label><button type="button" class="quiet" aria-label="Quitar concepto">×</button></div>';
  line.querySelector('button').onclick = () => { if ($('#lines').children.length > 1) { line.remove(); changed(); } };
  if(values) for(const input of line.querySelectorAll('[data-field]')) input.value=input.dataset.field==='iva_rate' && values.tax_treatment && values.tax_treatment!=='TAXED' ? values.tax_treatment : (values[input.dataset.field]??(input.dataset.field==='discount_rate'?'0':''));
  products?.attachLine(line);$('#lines').append(line);refreshDraftTotals();
}
function paymentPreview(){
 const f=$('#draft-form');const note=$('#kind').value!=='INVOICE';$('#payment-terms').hidden=note;
 for(const input of $('#payment-terms').querySelectorAll('input,select'))input.disabled=note;
 if(note){$('#payment-preview').textContent='';return;}
 f.elements.document_date.required=!note;f.elements.payment_days.required=!note;
 f.elements.payment_days.readOnly=f.elements.payment_form.value==='CASH';
 if(f.elements.payment_form.value==='CASH')f.elements.payment_days.value='0';
 try{const p=normalizePayment(Object.fromEntries(['document_date','payment_form','payment_days','payment_method'].map(key=>[key,f.elements[key].value])));$('#payment-preview').textContent='Vencimiento previsto: '+dateText(p.dueDate);}catch(e){$('#payment-preview').textContent=e.message;}
}
function changed() { paymentPreview();refreshDraftTotals(); if (!pending) requestKey = crypto.randomUUID(); }
function resetForm() {
  editing=null; $('#edit-notice').hidden=true; $('#cancel-edit').hidden=true; $('#save-label').textContent='Guardar borrador';
  $('#draft-form').reset();$('#draft-form').elements.document_date.value=todayColombia();$('#refresh-context-label').hidden=true;$('#context-help').textContent='Los nuevos documentos conservarán una copia de los datos de empresa y cliente al guardar.'; $('#lines').replaceChildren(); addLine();
  requestKey = crypto.randomUUID(); pending = null; updateReference();
}
async function startNote(d, kind) {
  const company=$('#company').value;
  try {
    if(!['platform','admin','billing'].includes(currentRole())) throw Error('No tienes permiso para crear notas.');
    const fresh=await getDocFromServer(doc(draftsCollection(company),d.id));
    if(company!==$('#company').value)return;
    if(!fresh.exists())throw Error('La factura de origen ya no está disponible.');
    const original={...unpackDraft(fresh.data()),id:fresh.id};
    if(original.kind!=='INVOICE'||original.status!=='DRAFT'||original.fiscal_validity!==false)throw Error('Este flujo de prueba solo admite facturas en borrador.');
    resetForm();
    if(!documents.some(x=>x.id===original.id)) documents.push(original);
    else documents=documents.map(x=>x.id===original.id?original:x);
    renderDocuments();$('#kind').value=kind;$('#reference').value=original.id;updateReference();
    location.hash='documentos';draftModal.open('Crear '+(kind==='CREDIT_NOTE'?'nota crédito':'nota débito'));changed();
    $('#draft-form').elements.reason.focus();
  }catch(e){message(e.message,true);}
}
async function editDraft(d) {
  try {
    const company=$('#company').value;
    const fresh=await getDocFromServer(doc(draftsCollection(company),d.id));
    if(company!==$('#company').value)return;
    if(!fresh.exists())throw Error('El documento ya no está disponible.');
    d={...unpackDraft(fresh.data()),id:fresh.id};
    if(d.status!=='DRAFT'||d.fiscal_validity!==false||d.referenceLocked)throw Error('Solo se editan borradores sin notas asociadas.');
    resetForm();editing={id:d.id,version:d.version||0,company,kind:d.kind,reference_id:d.reference_id,buyer:d.buyer,context:d.context||null};
    const form=$('#draft-form');
    if(d.payment){form.elements.document_date.value=dateText(d.payment.documentDate);form.elements.payment_form.value=d.payment.form;form.elements.payment_days.value=d.payment.days;form.elements.payment_method.value=d.payment.method;}
    $('#refresh-context-label').hidden=d.kind!=='INVOICE';$('#context-help').textContent=d.context?'Se conservan los datos guardados. Marca actualizar solo si deseas reemplazarlos por las fichas actuales.':'Documento antiguo sin copia completa. Puedes conservar esa ausencia o capturar explícitamente las fichas actuales; no se recuperan datos históricos.';
    form.elements.kind.value=d.kind;form.elements.buyer_name.value=d.buyer.name;form.elements.buyer_id.value=d.buyer.identification;
    if(d.reference_id&&!Array.from($('#reference').options).some(o=>o.value===d.reference_id))$('#reference').add(new Option(d.reference_id,d.reference_id));
    form.elements.reference_id.value=d.reference_id||'';form.elements.reason.value=d.reason||'';
    $('#lines').replaceChildren();for(const line of d.lines)addLine(line);updateReference();
    $('#edit-notice').hidden=false;$('#edit-notice').textContent='Editando borrador · '+d.id+' · Los cambios quedarán en el historial.';
    if(d.kind==='INVOICE'){profiles?.selectBuyer(d.buyer);form.elements.buyer_name.value=d.buyer.name;form.elements.buyer_id.value=d.buyer.identification;}
    $('#cancel-edit').hidden=false;$('#save-label').textContent='Guardar cambios';updateReference();draftModal.open('Editar documento');
  }catch(e){message(e.message,true);}
}
$('#cancel-edit').onclick=()=>{if($('#save').disabled)return;draftModal.close();resetForm();message('Edición cancelada.');};
function updateReference() {
  $('#kind').disabled=!!editing;$('#reference').disabled=!!editing;
  const note = $('#kind').value !== 'INVOICE';
  $('#reference-fields').hidden = !note;
  $('#reference').required = note;
  $('#draft-form').elements.reason.required = note;
  const form=$('#draft-form');
  form.elements.buyer_name.readOnly=true;form.elements.buyer_id.readOnly=true;
  const preserve=!!editing?.context&&!$('#refresh-context').checked;
  $('#customer-picker').disabled=note||preserve;$('#customer-picker').required=!note&&!preserve;
  $('#quick-customer').hidden=note||preserve;
  $('#note-guidance').textContent = note ? ( $('#kind').value==='CREDIT_NOTE'
    ? 'Nota crédito: registra aquí el importe que deseas disminuir, con valores positivos.'
    : 'Nota débito: registra aquí el importe adicional, con valores positivos.') + ' Se guarda como un documento separado. Al guardar, el borrador de origen queda bloqueado para edición. No modifica saldos ni se envía a la DIAN.' : '';
  if (note) copyBuyer();
  else if(preserve){form.elements.buyer_name.value=editing.buyer.name;form.elements.buyer_id.value=editing.buyer.identification;}
  else {const c=profiles?.selected();form.elements.buyer_name.value=c?.name||'';form.elements.buyer_id.value=c?.identification||'';}
  paymentPreview();
}
function copyBuyer() {
  if(editing && editing.kind !== 'INVOICE') {$('#note-origin').textContent='Factura origen · '+editing.reference_id;$('#draft-form').elements.buyer_name.value=editing.buyer.name;$('#draft-form').elements.buyer_id.value=editing.buyer.identification;return;}
  const original = documents.find(d => d.id === $('#reference').value);
  if (!original) { $('#draft-form').elements.buyer_name.value='';$('#draft-form').elements.buyer_id.value=''; }
  $('#note-origin').textContent=original ? 'Origen · '+original.id+' · Total '+money(original.total) : 'Selecciona una factura de esta compañía. También puedes iniciar la nota desde Documentos guardados.';
  if (original) { $('#draft-form').elements.buyer_name.value = original.buyer.name; $('#draft-form').elements.buyer_id.value = original.buyer.identification; }
}
function renderDocuments() {
  const previous = $('#reference').value;
  $('#reference').replaceChildren(new Option('Selecciona una factura', ''));
  for (const d of documents) if (d.kind === 'INVOICE' && d.status === 'DRAFT' && d.fiscal_validity === false) $('#reference').add(new Option(`${d.buyer.name} · ${d.id.slice(0, 8)} · ${money(d.total)}`, d.id));
  if (documents.some(d => d.id === previous)) $('#reference').value = previous;
}
async function loadDocuments() {
  const current = ++revision, companyId = $('#company').value;
  documents = []; renderDocuments(); $('#draft-fields').disabled = true;
  history.load(companyId);
  if (!companyId || !user) return;
  const snap = await getDocs(query(draftsCollection(companyId), orderBy('createdAt', 'desc'), limit(100)));
  if (current !== revision) return;
  documents = snap.docs.map(d => ({ ...(spark ? unpackDraft(d.data()) : d.data()), id: d.id })); renderDocuments(); applyAccess();
}
async function renderCompanies(snapshot, selected = '') {
  const oldRole = currentRole();
  companies = snapshot.docs.map(d => ({...d.data(),id:d.id}));
  const previous = $('#company').value;
  const ids = snapshot.docs.map(d => d.id);
  const next = chooseCompany(ids,{platform,selected,previous});
  companyStatus=ids.length===0?'empty':!platform&&ids.length>1?'conflict':'ready';
  $('#company').replaceChildren(new Option('Selecciona una empresa', ''));
  for (const d of snapshot.docs) $('#company').add(new Option(companyName({...d.data(),id:d.id}), d.id));
  $('#company').value = next;
  $('#company-cards').replaceChildren();
  $('#companies-empty').hidden = companies.length > 0;
  table($('#company-cards'),['Compañía','NIT','Acciones'],companies.map(company=>{
    const name=element('div','');name.dataset.companyId=company.id;name.append(element('strong',companyName(company)));
    const actions=node('div','','row-actions');
    const select=async()=>{$('#company').value=company.id;await $('#company').onchange();};
    actions.append(action('Abrir compañía',select),action('Ver empresa',async()=>{await select();profiles?.showCompany();}),action('Editar',async()=>{await select();profiles?.showCompany(true);}));
    return [name,company.id,actions];
  }),'Compañías');
  watchCompanyNames();
  applyAccess();
  if (previous !== next || oldRole !== currentRole()) { resetForm(); products?.load(next); await Promise.all([loadDocuments(), profiles?.load(next, snapshot.docs.find(d => d.id === next)?.data().name || '')]); }
}
async function loadCompanies(selected = '') {
  if (!user) return;
  const currentUser = user;
  const snapshot = await getDocsFromServer(companiesCollection());
  if (user !== currentUser) return;
  await renderCompanies(snapshot, selected);
}
function watchCompanies(currentUser) {
  stopCompanies = onSnapshot(companiesCollection(), snapshot => {
    if (user !== currentUser) return;
    renderCompanies(snapshot).catch(e => message(e.message, true));
  }, e => { if (user === currentUser) {companyStatus='error';applyAccess();message('No pudimos actualizar las empresas: ' + e.message, true);} });
}
async function run(form, action) {
  const button = form.querySelector('[type=submit]'); button.disabled = true; message();
  try { await action(); } catch (e) { message(e.message || 'No fue posible completar la operación.', true); }
  finally { button.disabled = false; }
}
$('#login').onsubmit = event => { event.preventDefault(); run(event.currentTarget, async () => {
  const data = new FormData($('#login')); await signInWithEmailAndPassword(auth, data.get('email'), data.get('password')); $('#login').reset();
}); };
$('#logout').onclick = () => signOut(auth).catch(e => message(e.message, true));
$('#google-login').onclick = async () => {
  $('#google-login').disabled = true;
  message('Te llevaremos a Google y volverás aquí al completar el acceso.');
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({prompt: 'select_account'});
    await signInWithRedirect(auth, provider);
  }
  catch (e) {
    const help = {
      'auth/unauthorized-domain': 'Esta dirección no está autorizada para iniciar sesión con Google.'
    };
    message(help[e.code] || e.message, true);
  }
  finally { $('#google-login').disabled = false; }
};
$('#company-form').onsubmit = event => { event.preventDefault(); run(event.currentTarget, async () => {
  const data = Object.fromEntries(new FormData($('#company-form')));
  let result;
  try { result = spark ? { data: await createSparkCompany(db, user.uid, data) } : await httpsCallable(functions, 'createCompany')(data); }
  catch (error) {
    if (error.code !== 'functions/already-exists') throw error;
    await loadCompanies(data.nit.trim());
    if ($('#company').value !== data.nit.trim()) throw new Error('Esta empresa ya existe, pero no está asignada a tu usuario. Solicita acceso al administrador.');
    $('#company-form').reset();companyModal.close(); $('#company-panel').open = false;
    message('La empresa ya estaba registrada. La seleccionamos para que puedas preparar tu factura.');
    return;
  }
  $('#company-form').reset();companyModal.close(); await loadCompanies(result.data.id); message('Empresa registrada.');
}); };
$('#company').onchange = async () => {for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close(); location.hash = $('#company').value ? (isDydCompany($('#company').value)?'procesos':'empresa') : 'companias'; audit?.close(); pending = null; resetForm(); products?.load($('#company').value);applyAccess(); try { await Promise.all([loadDocuments(), profiles?.load($('#company').value, $('#company').selectedOptions[0]?.textContent || '')]); } catch (e) { message(e.message, true); } };
$('#refresh-context').onchange=()=>{updateReference();changed();};
$('#kind').onchange = updateReference; $('#reference').onchange = copyBuyer;
$('#add-line').onclick = () => { if ($('#lines').children.length < (spark ? 3 : 100)) { addLine(); changed(); } else message('Alcanzaste el límite de conceptos de este modo.', true); };
$('#draft-form').oninput = changed;
$('#draft-form').onsubmit = event => { event.preventDefault(); run(event.currentTarget, async () => {
  const form = Object.fromEntries(new FormData($('#draft-form')));
  if(editing){form.kind=editing.kind;form.reference_id=editing.reference_id;}
  if (form.kind === 'INVOICE') {
    const customer=editing?.context&&!$('#refresh-context').checked?{id:editing.context.customerId,...editing.buyer}:profiles?.selected();
    if(!customer)throw Error('Selecciona un cliente registrado antes de guardar.');
    form.customer_id=customer.id;form.buyer_name=customer.name;form.buyer_id=customer.identification;
    form.reference_id = ''; form.reason = '';
  }
  if(editing && editing.company !== $('#company').value) throw Error('La empresa activa cambió. Abre el borrador de nuevo.');
  const payload = { ...form, ...(spark?{schema_version:2,refresh_context:$('#refresh-context').checked}:{}), company_id: $('#company').value, request_key: requestKey,
    lines: [...document.querySelectorAll('.line')].map(line => Object.fromEntries([...line.querySelectorAll('[data-field]')].map(e => [e.dataset.field, e.value]))) };
  if (pending && JSON.stringify(pending) !== JSON.stringify(payload)) throw new Error('El último guardado no se confirmó. Reintenta sin cambiar los datos o recarga para consultar los borradores antes de crear otro.');
  pending = payload;
  try {
    if (spark) await createSparkDraft(db, user.uid, payload, editing);
    else await httpsCallable(functions, 'createDraft')(payload);
  } catch (error) {
    if (['functions/invalid-argument', 'functions/permission-denied', 'functions/unauthenticated'].includes(error.code) || (spark && !['unavailable', 'deadline-exceeded', 'internal', 'unknown'].includes(error.code))) pending = null;
    throw error;
  }
  resetForm();draftModal.close();location.hash='documentos'; await loadDocuments(); message('Borrador guardado.');
}); };
async function start() {
  const response = await fetch('/firebase-config.json'); if (!response.ok) throw new Error('No pudimos cargar la configuración de la aplicación.');
  const config = await response.json();
  // Google Authentication autoriza localhost en este proyecto, no su alias IP.
  if (!config.useEmulators && location.hostname === '127.0.0.1') {
    const url = new URL(location.href);
    url.hostname = 'localhost';
    location.replace(url.href);
    return;
  }
  spark = config.mode === 'spark';
  $('#google-login').hidden = !spark;
  $('#login').hidden = spark;
  $('#spark-help').hidden = !spark;
  if (config.useEmulators && !['localhost', '127.0.0.1'].includes(location.hostname)) throw new Error('Esta versión de prueba solo funciona en este equipo.');
  $('#draft-form').elements.document_date.value=todayColombia();paymentPreview();
  const app = initializeApp(config.firebase); auth = getAuth(app); db = getFirestore(app); functions = getFunctions(app, config.region);
  if (config.useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099'); connectFirestoreEmulator(db, '127.0.0.1', 8181); connectFunctionsEmulator(functions, '127.0.0.1', 5501);
    $('#mode').textContent = '● Entorno de prueba'; $('#demo-help').hidden = false;
  } else {
    if (config.appCheckSiteKey) initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(config.appCheckSiteKey), isTokenAutoRefreshEnabled: true });
    $('#mode').textContent = '● Borradores';
  }
  // Firebase administra la sesión persistente; nunca guardamos contraseñas.
  try {
    await setPersistence(auth, browserLocalPersistence);
    await auth.authStateReady();
  } catch {
    throw new Error('El navegador no permite conservar tu sesión. Habilita el almacenamiento de este sitio y recarga la página.');
  }
  audit=setupAudit({db,getCompany:()=>$('#company').value,message});$('#open-audit').onclick=()=>audit.open();
  access = setupAccess({db,getCompany:()=>$('#company').value,getRole:currentRole,message});
  if(spark){products=setupProducts({db,getRole:currentRole,onChange:changed});for(const row of document.querySelectorAll('#lines .line'))products.attachLine(row);}
  if (spark) profiles = setupProfiles({ db, getUser: () => user, getRole:currentRole, message, onBuyer: c => {
    if ($('#kind').value !== 'INVOICE') { copyBuyer(); message('Las notas conservan el comprador de la factura de referencia.'); return; }
    $('#draft-form').elements.buyer_name.value = c?.name || ''; $('#draft-form').elements.buyer_id.value = c?.identification || ''; changed();
  }});
  onAuthStateChanged(auth, async currentUser => {
    for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
    if (!currentUser) {
      location.replace('/?section=' + encodeURIComponent(location.hash.slice(1)));
      return;
    }
    let record;
    try {
      const token=await getIdTokenResult(currentUser,true);record=await userRecord(db,currentUser);
      if(!currentUser.emailVerified || !allowedSignInProvider(token.signInProvider) || !record.exists()){location.replace('/?section='+encodeURIComponent(location.hash.slice(1)));return;}
    }catch(e){$('#session-gate').textContent='No pudimos verificar tu ficha. Recarga para intentar de nuevo.';return;}
    document.body.classList.remove('auth-pending');
    $('#session-gate').hidden = true;
    $('#auth-loading').hidden = true;
    stopCompanies?.(); stopCompanies = null;
    for(const stop of companyNameListeners.values())stop();
    companyNameListeners.clear();companyNames.clear();
    companyStatus='loading';user = currentUser;userProfile=record.data(); platform = false; companies = []; navigation.update({signedIn:!!user,spark,admin:false,companyStatus}); profiles?.load('', '');products?.load(''); revision++; documents = []; renderDocuments(); resetForm();
    $('#company').replaceChildren(new Option('Selecciona una empresa', '')); $('#draft-fields').disabled = true;
    $('#login-panel').hidden = !!user; $('#workspace').hidden = !user; $('#account-actions').hidden = !user; $('#logout').hidden = !user; $('#company-panel').hidden = true;renderAccountMenu();
    if (!user) { $('#company').replaceChildren(); return; }
    $('#identity').textContent = user.email;
    loadUserRegistry().catch(e=>message(e.message,true));
    try { const token = await getIdTokenResult(user, true); if (user !== currentUser) return; platform = token.claims.platformAdmin === true; applyAccess(); watchCompanies(currentUser); }
    catch (e) { message(e.message, true); }
  });
}
const canonicalUrl = canonicalHostingUrl(location.href);
if (canonicalUrl) location.replace(canonicalUrl);
else { addLine(); start().catch(e => {
  $('#auth-loading').hidden = true;
  $('#session-gate').textContent = e.message;
  message(e.message, true);
  $('#login button').disabled = true;
  $('#google-login').disabled = true;
}); }

async function loadUserRegistry(){
 const token=await getIdTokenResult(user),visible=token.claims.platformAdmin===true;
 if(!visible){access?.renderRegistered([],false);return;}
 const snapshot=await getDocs(query(collection(db,'registeredUsers'),orderBy('createdAt','desc'),limit(100)));
 const records=snapshot.docs.map(record=>({...record.data(),id:record.id}));
 if(window.__sigmypUserAccess){access?.renderRegistered(records,true);return;}
 const panel=$('#registered-users');panel.hidden=false;
 const list=$('#registered-users-list');list.replaceChildren();
 table(list,['Nombre','Correo','Identificación','Acciones'],records.map(p=>[p.firstName+' '+p.lastName,p.email,p.documentType+' '+p.identification,action('Ver ficha',()=>details('Ficha de usuario',[['Nombre',p.firstName+' '+p.lastName],['Correo',p.email],['Documento',p.documentType+' '+p.identification],['Teléfono',p.phone],['Cargo',p.jobTitle]]))]),'Usuarios registrados');
}
