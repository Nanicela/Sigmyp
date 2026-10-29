import {loadProductComposition} from './product-composition.js';
import {saveProductionProduct,saveProductionOrder,loadProductionOrderLines} from './production-edit.js';
import {loadQuotationDetail} from './quotation-revisions.js';
import {savePurchaseOrder,approveOrder} from './purchase-orders.js';
import {saveQuotationRevision} from './quotation-revisions.js';
import {createCommercialQuotation,updateCommercialQuotation} from './commercial-quotation.js';
import {saveCommercialRecord} from './commercial-record.js';
import {saveCommercialAccount} from './commercial-account.js';
import {savePurchaseEdit,createPurchaseRecord} from './purchase-edit.js';
import {createDemandCache} from './demand-cache.js';
import {loadLegacyProduction} from './legacy-production.js';
import {loadLegacyPurchases} from './legacy-purchases.js';
import {loadLegacyCommercial} from './legacy-commercial.js';
import {modal,table,node,action,details} from './ui.js';
import {createCustomerList} from './customer-list.js';
import {auditedSet} from './audit.js';
import { doc, collection, getDoc, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';
export function normalizeProfile(input) {
  const fields = ['name','documentType','identification','dv','email','phone','address','department','municipality','taxResponsibilities','vatStatus'];
  const p = Object.fromEntries(fields.map(k => [k, String(input[k] || '').trim()]));
  const bounds = { name:200,email:254,phone:30,address:250,department:100,municipality:100,taxResponsibilities:300 };
  for (const [k,max] of Object.entries(bounds)) if ((!p[k] && k !== 'phone') || p[k].length > max) throw new Error('Completa los datos de identificación, contacto y tributarios.');
  if (!['NIT','CC','CE'].includes(p.documentType) || !/^[0-9]{5,15}$/.test(p.identification)) throw new Error('Revisa el tipo y número de documento (sin puntos ni guiones).');
  if (p.documentType === 'NIT' ? !/^[0-9]$/.test(p.dv) : p.dv !== '') throw new Error('Indica el dígito de verificación del NIT; para CC o CE déjalo vacío.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) throw new Error('Revisa el correo electrónico.');
  if (!['responsable','no_responsable','por_confirmar'].includes(p.vatStatus)) throw new Error('Selecciona la condición frente al IVA.');
  return p;
}
export function normalizeCustomerContact(input,customerId) {
  const value={customerId,name:String(input.name||'').trim(),jobTitle:String(input.jobTitle||'').trim(),email:String(input.email||'').trim().toLowerCase(),phone:String(input.phone||'').trim(),active:input.active===true||input.active==='on'};
  if(!customerId||!value.name||value.name.length>150||value.jobTitle.length>100||value.phone.length>30)throw Error('Completa correctamente los datos del contacto.');
  if(value.email&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)||value.email.length>254))throw Error('Revisa el correo electrónico del contacto.');
  if(!value.email&&!value.phone)throw Error('Registra al menos un correo o teléfono para el contacto.');
  return value;
}
export function normalizeCustomerSite(input,customerId) {
  const value={customerId,name:String(input.name||'').trim(),address:String(input.address||'').trim(),department:String(input.department||'').trim(),municipality:String(input.municipality||'').trim(),phone:String(input.phone||'').trim(),active:input.active===true||input.active==='on'};
  const limits={name:150,address:250,department:100,municipality:100,phone:30};
  for(const [key,max] of Object.entries(limits))if((key!=='phone'&&!value[key])||value[key].length>max)throw Error('Completa correctamente los datos de la sede.');
  return value;
}
export function setupProfiles({db, approvalAvailable=false, getUser, getRole, message, onBuyer}) {
  const root = document.querySelector('#profiles');
  const demand=createDemandCache();
  let legacyProduction=null,legacyCommercial=null,legacyPurchases=null;
  let company = '', companyName='', epoch = 0, customers = [], contacts=[], sites=[], editing = '', profile = null, loading = false;
  const companyForm = document.querySelector('#tax-form'), customerForm = root.querySelector('#customer-form');
  const vueCustomer=window.__sigmypCustomerDirectory;
  const customerDialog=customerForm.closest('dialog');
  const customerModal=vueCustomer?{
    get status(){return document.querySelector('#customer-status');},
    close(){if(customerDialog?.open)customerDialog.close();resetCustomer();},
    open(){vueCustomer.openCustomerEditor(editing?customers.find(customer=>customer.id===editing):null);}
  }:modal('Cliente',customerForm,{onClose:()=>resetCustomer()});
  const vueCompany=window.__sigmypCompanyProfile;
  const vueCompanyDialog=document.querySelector('#company-profile-dialog-title')?.closest('dialog');
  const openVueCompany=edit=>{
    const viewer=vueCompanyDialog.querySelector('[data-company-profile-view]'),heading=vueCompanyDialog.querySelector('#company-profile-dialog-title');
    viewer.style.display=edit?'none':'';companyForm.style.display=edit?'':'none';
    heading.textContent=edit?(profile?'Editar datos de empresa':'Completar datos de empresa'):(profile?.name||'Datos de empresa');
    document.querySelector('#company-profile-status').textContent='';
    if(!vueCompanyDialog.open)vueCompanyDialog.showModal();
  };
  const companyModal=vueCompany?{
    get status(){return document.querySelector('#company-profile-status');},
    close(){if(vueCompanyDialog.open)vueCompanyDialog.close();},
    openView(){openVueCompany(false);},openEdit(){openVueCompany(true);}
  }:modal('Datos de empresa',companyForm);
  const companyList=vueCompany?null:node('div');
  if(companyList)root.querySelector('[data-view="empresa"]').append(companyList);
  function renderCompany(){const actions=node('div','','row-actions');
    if(vueCompany){
      vueCompany.render({company,profile,loading,canEdit:['platform','admin'].includes(getRole())});
      return;
    }
    actions.append(action('Ver empresa',()=>showCompany(false)));
    if(['platform','admin'].includes(getRole()))actions.append(action(profile?'Editar':'Completar datos',()=>showCompany(true)));
    table(companyList,['Empresa','NIT','Correo','Acciones'],company?[[profile?.name||'Ficha pendiente',company,profile?.email||'—',actions]]:[],'Datos de empresa');}
  function showCompany(edit=false){if(loading||!company)return;
    if(edit){if(!['platform','admin'].includes(getRole()))return;fields(companyForm,profile||{name:document.querySelector('#company').selectedOptions[0]?.textContent,documentType:'NIT',identification:company});vueCompany?companyModal.openEdit():companyModal.open();return;}
    if(vueCompany){companyModal.openView();return;}
    details(profile?.name||'Empresa',[['Identificación',company],['Nombre',profile?.name],['Correo',profile?.email],['Teléfono',profile?.phone],['Dirección',profile?.address],['Departamento',profile?.department],['Municipio',profile?.municipality],['Responsabilidades',profile?.taxResponsibilities],['Condición IVA',profile?.vatStatus]]);
  }
  if(vueCompany)document.addEventListener('click',event=>{
    const button=event.target.closest('[data-company-profile-action]');
    if(button)showCompany(button.dataset.companyProfileAction==='edit');
  });
  const chooser = document.querySelector('#customer-picker');
  const editCustomer=c=>{
    editing=c.id;fields(customerForm,c);customerForm.hidden=false;customerForm.elements.documentType.disabled=true;customerForm.elements.identification.readOnly=true;customerForm.querySelector('[type=submit]').textContent='Guardar cambios del cliente';customerModal.open('Editar cliente');customerForm.elements.name.focus();
  };
  const directory=vueCustomer?{close:()=>vueCustomer.closeAll(),render:()=>vueCustomer.render({customers,contacts,sites,companyName,loading,saveProduction,ensureProductionDetail,ensureWorkspace,ensureQuotationDetail,legacyCommercial,legacyProduction,legacyPurchases:legacyPurchases?{...legacyPurchases,approvalAvailable}:null,savePurchase,createPurchase,saveAccount,saveRecord,createQuotation,updateQuotation,canEditAccounts:['platform','admin'].includes(getRole()),canEdit:['platform','admin','billing'].includes(getRole())})}:createCustomerList(root.querySelector('#customer-list'),{onEdit:editCustomer});
  async function saveAccount(account,input) {
    if(!['platform','admin'].includes(getRole()))throw Error('Tu rol no permite actualizar cuentas.');
    const current=epoch, companyId=company;
    const found=legacyCommercial?.customers?.find(c=>c.id===account.id && c.sourceDocumentId===account.sourceDocumentId);
    if((!found && !(account.sourceId===null && /^new_[a-f0-9-]{36}$/.test(account.id) && account.id===account.sourceDocumentId && !account.version)) || !legacyCommercial?.editsEnabled)throw Error('Vuelve a abrir la cuenta en la compañía activa.');
    const saved=await saveCommercialAccount(db,companyId,account,input);
    if(current!==epoch)throw Error('La cuenta se guardó en su compañía original; cambiaste de compañía durante el guardado.');
    legacyCommercial={...legacyCommercial,customers:found?legacyCommercial.customers.map(c=>c.id===saved.id?saved:c):[...legacyCommercial.customers,saved]};
    render();
    return saved;
  }
  async function saveRecord(kind,record,input){
    if(!['platform','admin'].includes(getRole()))throw Error('Tu rol no permite actualizar estos datos.');
    const list=kind==='contacts'?'contacts':kind==='offices'?'sites':null,flag=kind==='contacts'?'contactEditsEnabled':'officeEditsEnabled';
    const current=epoch,companyId=company;
    const found=list&&legacyCommercial?.[list]?.some(item=>item.id===record.id&&item.sourceDocumentId===record.sourceDocumentId);
    const native=record.sourceId===null&&/^new_[a-f0-9-]{36}$/.test(record.id)&&record.id===record.sourceDocumentId&&!record.version;
    if(!list||!legacyCommercial?.[flag]||(!found&&!native))throw Error('Vuelve a abrir el registro en la compañía activa.');
    const saved=await saveCommercialRecord(db,companyId,kind,record,input);
    if(current!==epoch)throw Error('Se guardó en su compañía original; cambiaste de compañía durante el guardado.');
    legacyCommercial={...legacyCommercial,[list]:found?legacyCommercial[list].map(item=>item.id===saved.id?saved:item):[...legacyCommercial[list],saved]};
    if(kind==='contacts')legacyCommercial.sites=legacyCommercial.sites.map(site=>site.contactId===saved.id?{...site,contactName:saved.name}:site);
    if(kind==='offices')saved.contactName=legacyCommercial.contacts.find(c=>c.id===saved.contactId)?.name||saved.contactName||'';
    render();return saved;
  }
  async function updateQuotation(record,input){
    if(!['platform','admin'].includes(getRole())||!legacyCommercial?.quotations.some(q=>q.id===record.id))throw Error('No tienes permiso para actualizar esta cotización.');
    const current=epoch,companyId=company;
    const saved=await saveQuotationRevision(db,companyId,record.id,record,input,legacyCommercial);
    if(current!==epoch)throw Error('Se guardó en la compañía original; cambiaste de compañía durante el guardado.');
    legacyCommercial={...legacyCommercial,quotations:legacyCommercial.quotations.map(q=>q.id===saved.id?saved:q)};render();return saved;
  }
  async function createQuotation(id,input){
    if(!['platform','admin'].includes(getRole())||!legacyCommercial?.quotationCreatesEnabled)throw Error('No está habilitada la creación de cotizaciones.');
    const current=epoch,companyId=company;
    const account=legacyCommercial.customers.find(a=>a.id===input.customerId),contact=legacyCommercial.contacts.find(c=>c.id===input.contactId),office=input.officeId?legacyCommercial.sites.find(o=>o.id===input.officeId):null;
    if(input.officeId&&!office)throw Error('Selecciona una oficina válida.');
    const saved=await saveQuotationRevision(db,companyId,id,null,input,legacyCommercial);
    if(current!==epoch)throw Error('Se guardó en su compañía original; cambiaste de compañía durante el guardado.');
    legacyCommercial={...legacyCommercial,quotations:[...legacyCommercial.quotations.filter(q=>q.id!==saved.id),saved]};render();return saved;
  }
  const path = () => ['organizations',company];
  function fields(form, data = {}) {
    form.reset();
    for (const [key,value] of Object.entries(data)) if (form.elements[key]) form.elements[key].value = value;
    form.elements.dv.required = form.elements.documentType.value === 'NIT';
  }
  function resetCustomer() {
    customerForm.hidden=true;
    editing = ''; fields(customerForm); customerForm.elements.documentType.disabled = false; customerForm.elements.identification.readOnly = false;
    customerForm.querySelector('[type=submit]').textContent = 'Guardar cliente';
  }
  function render() {
    const selected=chooser.value;
    const list = root.querySelector('#customer-list'); if(!vueCustomer)list.replaceChildren(); chooser.replaceChildren(new Option('Selecciona un cliente registrado',''));
    for (const c of customers) {
      chooser.add(new Option(`${c.name} · ${c.documentType} ${c.identification}`,c.id));

    }
    if(customers.some(c=>c.id===selected))chooser.value=selected;
    directory.render(customers,['platform','admin','billing'].includes(getRole()));
  }
  async function ensureProductionDetail(record,group){
    const id=company,current=epoch;
    const saved=await demand.run('production:'+record.id+':'+(record.compositionRevision||record.revisionId),()=>group==='products'?loadProductComposition(db,id,record):loadProductionOrderLines(db,id,record));
    if(current!==epoch||id!==company)throw Error('Cambió la compañía seleccionada.');return saved;
  }
  async function saveProduction(group,id,record,input){
    if(!['platform','admin'].includes(getRole())||!legacyProduction?.writeEnabled||!['products','productionOrders'].includes(group))throw Error('El guardado no está habilitado para este usuario.');
    if(record&&!legacyProduction[group]?.some(r=>r.id===id))throw Error('Vuelve a abrir el registro.');
    const current=epoch,companyId=company;
    const saved=group==='products'?await saveProductionProduct(db,companyId,id,record,input,legacyPurchases?.items||[]):await saveProductionOrder(db,companyId,id,record,input,legacyCommercial,legacyProduction.products);
    if(current!==epoch||company!==companyId)throw Error('Guardado en la compañía original. Vuelve a abrirla.');
    legacyProduction={...legacyProduction,[group]:[...legacyProduction[group].filter(r=>r.id!==id),saved]};render();return saved;
  }
  async function createPurchase(group,id,input){
    if(!['platform','admin'].includes(getRole())||!legacyPurchases||!['suppliers','supplierContacts','items','purchaseOrders','kardex'].includes(group))throw Error('No tienes permiso para crear registros de Compras.');
    const current=epoch,companyId=company,saved=group==='purchaseOrders'?await savePurchaseOrder(db,companyId,id,null,input,legacyPurchases):await createPurchaseRecord(db,companyId,group,id,input);
    if(current!==epoch||company!==companyId)throw Error('El registro se guardó en su compañía original. Vuelve a abrirla para consultarlo.');
    if(saved.supplierId&&!saved.orderData)saved.supplierName=legacyPurchases.suppliers.find(s=>s.id===saved.supplierId)?.name||'';
    if(saved.secondSupplierId)saved.secondSupplierName=legacyPurchases.suppliers.find(s=>s.id===saved.secondSupplierId)?.name||'';
    if(saved.itemId)saved.itemName=legacyPurchases.items.find(i=>i.id===saved.itemId)?.name||'';
    legacyPurchases={...legacyPurchases,[group]:[...legacyPurchases[group].filter(r=>r.id!==id),saved]};render();return saved;
  }
  async function savePurchase(group,record,input){
    if(!['platform','admin'].includes(getRole())||!legacyPurchases?.[group]?.some(r=>r.id===record.id))throw Error('No tienes permiso para editar este registro.');
    if(input?.action==='approve'&&(group!=='purchaseOrders'||!approvalAvailable))throw Error('La aprobación todavía no está habilitada.');
    if(group==='supplierContacts'&&!legacyPurchases.suppliers.some(s=>s.id===String(input.supplierId||'').trim()))throw Error('Selecciona un proveedor válido.');
    const companyId=company,current=epoch;const saved=group==='purchaseOrders'?(input?.action==='approve'?await approveOrder(db,companyId,record):await savePurchaseOrder(db,companyId,record.id,record,input,legacyPurchases)):await savePurchaseEdit(db,companyId,group,record,input);
    if(current!==epoch||company!==companyId)throw Error('El registro se guardó en su compañía original. Vuelve a abrirla para consultarlo.');
    if(group==='supplierContacts')saved.supplierName=legacyPurchases.suppliers.find(s=>s.id===saved.supplierId)?.name||'';
    legacyPurchases={...legacyPurchases,[group]:legacyPurchases[group].map(r=>r.id===saved.id?saved:r)};
    if(group==='suppliers')for(const key of ['supplierContacts','items','purchaseOrders'])legacyPurchases[key]=legacyPurchases[key].map(r=>({...r,...(r.supplierId===saved.id&&!r.orderData?{supplierName:saved.name}:{}),...(r.secondSupplierId===saved.id?{secondSupplierName:saved.name}:{})}));
    render();return saved;
  }
  async function ensureQuotationDetail(id){
    const record=legacyCommercial?.quotations?.find(q=>q.id===id);if(!record)throw Error('Vuelve a abrir la cotización.');
    if(!record.detailsPending)return record;
    const current=epoch,companyId=company;
    const saved=await demand.run('quotation:'+id+':'+record.revisionId,()=>loadQuotationDetail(db,companyId,record));
    if(current!==epoch||companyId!==company)throw Error('Cambió la compañía seleccionada.');
    legacyCommercial={...legacyCommercial,quotations:legacyCommercial.quotations.map(q=>q.id===id?saved:q)};render();return saved;
  }
  async function ensureWorkspace(module){
    if(company!=='500123568'||!['platform','admin','viewer'].includes(getRole()))return;
    const key=module==='sales'?'crm':module;
    if(!['crm','purchases','production'].includes(key))return;
    return demand.run(key,async()=>{
      const id=company,current=epoch;
      const set=value=>{if(current!==epoch||company!==id)return;if(key==='crm')legacyCommercial=value;else if(key==='purchases')legacyPurchases=value;else legacyProduction=value;render();};
      set({loading:true});
      try{const loader={crm:loadLegacyCommercial,purchases:loadLegacyPurchases,production:loadLegacyProduction}[key];set({...await loader(db,id),loading:false});}
      catch(error){set({loading:false,error:error.code==='resource-exhausted'?'La cuota de consultas está agotada. Intenta más tarde.':error.code==='permission-denied'?'La consulta de este módulo está pendiente de habilitación.':'No se pudo cargar el módulo. Vuelve a abrir la compañía para reintentar.'});}
    });
  }
  async function load(id, name) {
    quickDialog.close();directory.close();customerModal.close();companyModal.close();
    demand.reset();legacyCommercial=null;legacyPurchases=null;legacyProduction=null; company = id; companyName=name||''; const current = ++epoch; profile = null; customers = [];contacts=[];sites=[]; loading=!!id;resetCustomer(); render();renderCompany();
    root.hidden = !id; chooser.closest('label').hidden = !id;
    if (!id) return;
    fields(companyForm,{ name, documentType:'NIT',identification:id });
    companyForm.elements.documentType.disabled = true; companyForm.elements.identification.readOnly = true;
    [companyForm,customerForm].forEach(f => f.querySelector('fieldset').disabled = true); loading = true;
    try {
      const base = path();
      const optionalRelations=reference=>getDocs(reference).catch(error=>{if(error.code==='permission-denied')return{docs:[]};throw error;});
      const [p,cs,contactDocs,siteDocs] = await Promise.all([getDoc(doc(db,...base,'profiles','tax')),getDocs(collection(db,...base,'customers')),optionalRelations(collection(db,...base,'customerContacts')),optionalRelations(collection(db,...base,'customerSites'))]);
      if (current !== epoch) return;
      profile = p.exists() ? p.data() : null;
      if (profile) fields(companyForm,profile);
      customers = cs.docs.map(d => ({...d.data(),id:d.id})).sort((a,b) => a.name.localeCompare(b.name,'es')); render();
      contacts=contactDocs.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>a.name.localeCompare(b.name,'es'));
      sites=siteDocs.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>a.name.localeCompare(b.name,'es'));render();
      root.querySelector('#profile-status').textContent = profile ? 'Datos guardados. Puedes actualizarlos aquí.' : 'Completa los datos de esta empresa según su RUT.';
      companyForm.querySelector('fieldset').disabled = !['platform','admin'].includes(getRole()); customerForm.querySelector('fieldset').disabled = !['platform','admin','billing'].includes(getRole()); root.querySelector('#new-customer').hidden = getRole() === 'viewer'; loading = false;render();renderCompany();
    } catch(e) { if (current === epoch) { loading = false; message('No pudimos cargar los datos: '+e.message,true); } }
  }
  for (const form of [companyForm,customerForm]) {
    form.elements.documentType.onchange = () => { form.elements.dv.required = form.elements.documentType.value === 'NIT'; if (!form.elements.dv.required) form.elements.dv.value = ''; };
    form.onsubmit = async e => {
      e.preventDefault(); if (loading || !company) return;
      const isCompany = form === companyForm, current = epoch, base = path();
      const data = Object.fromEntries(new FormData(form)); data.documentType = form.elements.documentType.value;
      const button = form.querySelector('[type=submit]');
      const feedback=isCompany?(document.querySelector('#company-profile-status')||companyModal.status):customerModal.status;
      button.disabled = true;
      try {
        if(!feedback)throw new Error('No pudimos preparar el guardado. Cierra el formulario y vuelve a abrirlo.');
        feedback.textContent='Guardando…';
        const value = normalizeProfile(data), id = isCompany ? 'tax' : `${value.documentType}_${value.identification}`;
        const ref = doc(db,...base,isCompany?'profiles':'customers',id);
        const previous = isCompany ? profile : customers.find(c => c.id === editing);
        await runTransaction(db,async tx => {
          const old = await tx.get(ref);
          if (old.exists() && !previous) throw new Error('Este registro ya existe. Recarga los datos y usa Editar.');
          if (previous && (!old.exists() || !old.data().updatedAt.isEqual(previous.updatedAt))) throw new Error('El registro cambió en otra ventana. Recarga antes de editar.');
          auditedSet(tx,db,ref,old.exists()?old.data():null,{...value,createdAt:old.exists()?old.data().createdAt:serverTimestamp()});
        });
        if (current !== epoch) return;
        await load(company,companyForm.elements.name.value);
        message(isCompany?'Datos de la empresa guardados.':'Cliente guardado.');
      } catch(e) { if (current === epoch) {if(feedback)feedback.textContent=e.message;message(e.message,true);} }
      finally { button.disabled = false; }
    };
  }
  if(vueCustomer){
    const contactForm=document.querySelector('#customer-contact-form'),siteForm=document.querySelector('#customer-site-form');
    const fillRelation=(form,value={})=>{form.reset();for(const [key,fieldValue]of Object.entries(value))if(form.elements[key]){if(form.elements[key].type==='checkbox')form.elements[key].checked=fieldValue!==false;else form.elements[key].value=fieldValue??'';}if(!value.id)form.elements.active.checked=true;};
    document.addEventListener('sigmyp:customer-action',event=>{
      const {action,customerId,relationId}=event.detail||{};const customer=customers.find(item=>item.id===customerId);
      if(action==='new-customer'){resetCustomer();customerForm.hidden=false;customerModal.open();return;}
      if(action==='edit-customer'&&customer){editCustomer(customer);return;}
      if(!customer)return;
      if(action==='new-contact'){fillRelation(contactForm);vueCustomer.openContactEditor();}
      if(action==='edit-contact'){const contact=contacts.find(item=>item.id===relationId&&item.customerId===customerId);if(contact){fillRelation(contactForm,contact);vueCustomer.openContactEditor(contact);}}
      if(action==='new-site'){fillRelation(siteForm);vueCustomer.openSiteEditor();}
      if(action==='edit-site'){const site=sites.find(item=>item.id===relationId&&item.customerId===customerId);if(site){fillRelation(siteForm,site);vueCustomer.openSiteEditor(site);}}
    });
    const saveRelation=(form,collectionName,normalize,statusId)=>{
      form.onsubmit=async event=>{event.preventDefault();if(loading||!company)return;
        const activeCustomer=vueCustomer.selectedId();
        const status=document.querySelector(statusId),button=form.querySelector('[type=submit]');button.disabled=true;status.textContent='Guardando…';
        try{if(!activeCustomer)throw Error('Vuelve a abrir la ficha del cliente antes de guardar.');const input=Object.fromEntries(new FormData(form));input.active=form.elements.active.checked;const value=normalize(input,activeCustomer);const id=input.id||crypto.randomUUID(),ref=doc(db,...path(),collectionName,id),items=collectionName==='customerContacts'?contacts:sites,previous=items.find(item=>item.id===id);
          await runTransaction(db,async tx=>{const old=await tx.get(ref);if(old.exists()&&!previous)throw Error('Este registro ya existe.');if(previous&&(!old.exists()||!old.data().updatedAt.isEqual(previous.updatedAt)))throw Error('El registro cambió en otra ventana. Recarga antes de editar.');auditedSet(tx,db,ref,old.exists()?old.data():null,{...value,createdAt:old.exists()?old.data().createdAt:serverTimestamp()});});
          const saved=(await getDoc(ref)).data(),next={...saved,id};if(collectionName==='customerContacts')contacts=[...contacts.filter(item=>item.id!==id),next].sort((a,b)=>a.name.localeCompare(b.name,'es'));else sites=[...sites.filter(item=>item.id!==id),next].sort((a,b)=>a.name.localeCompare(b.name,'es'));render();form.closest('dialog').close();message(collectionName==='customerContacts'?'Contacto guardado.':'Sede guardada.');
        }catch(error){status.textContent=error.message;message(error.message,true);}finally{button.disabled=false;}
      };
    };
    saveRelation(contactForm,'customerContacts',normalizeCustomerContact,'#customer-contact-status');
    saveRelation(siteForm,'customerSites',normalizeCustomerSite,'#customer-site-status');
  }
  if(!vueCustomer)root.querySelector('#new-customer').onclick = ()=>{resetCustomer();customerForm.hidden=false;customerModal.open('Crear cliente');customerForm.elements.name.focus();};
  chooser.onchange = () => { const c = customers.find(c => c.id === chooser.value); onBuyer(c || null); };
  const quickDialog=document.createElement('dialog');quickDialog.className='quick-customer-dialog';
  quickDialog.setAttribute('aria-labelledby','quick-customer-title');
  const heading=document.createElement('h2');heading.id='quick-customer-title';heading.textContent='Crear cliente';
  const hint=document.createElement('p');hint.textContent='Se guardará en la compañía activa y quedará seleccionado en tu factura.';
  const quickForm=customerForm.cloneNode(true);quickForm.id='quick-customer-form';quickForm.hidden=false;
  const status=document.createElement('p');status.setAttribute('role','status');
  const cancel=document.createElement('button');cancel.type='button';cancel.className='quiet';cancel.textContent='Cancelar y volver a la factura';cancel.onclick=()=>quickDialog.close();
  quickDialog.append(heading,hint,status,quickForm,cancel);document.body.append(quickDialog);
  quickForm.elements.documentType.onchange=()=>{quickForm.elements.dv.required=quickForm.elements.documentType.value==='NIT';if(!quickForm.elements.dv.required)quickForm.elements.dv.value='';};
  document.querySelector('#quick-customer').onclick=()=>{
    if(loading||!company||!['platform','admin','billing'].includes(getRole())){message('Espera a que carguen los clientes o revisa tus permisos.',true);return;}
    fields(quickForm);quickForm.querySelector('fieldset').disabled=false;quickForm.elements.documentType.disabled=false;quickForm.elements.identification.readOnly=false;
    quickForm.querySelector('[type=submit]').textContent='Guardar y usar en la factura';status.textContent='';quickDialog.showModal();
  };
  quickForm.onsubmit=async event=>{
    event.preventDefault();const current=epoch,base=path(),button=quickForm.querySelector('[type=submit]');button.disabled=true;status.textContent='Guardando cliente…';
    try {
      const value=normalizeProfile(Object.fromEntries(new FormData(quickForm))),id=`${value.documentType}_${value.identification}`;
      const ref=doc(db,...base,'customers',id);
      await runTransaction(db,async tx=>{
        const old=await tx.get(ref);
        if(old.exists())throw Error('Ya existe un cliente con esta identificación. Cancela y selecciónalo en el directorio.');
        auditedSet(tx,db,ref,null,{...value,createdAt:serverTimestamp()});
      });
      if(current!==epoch)return;
      customers.push({...value,id});customers.sort((a,b)=>a.name.localeCompare(b.name,'es'));render();chooser.value=id;onBuyer({...value,id});quickDialog.close();message('Cliente creado y seleccionado. Puedes continuar con la factura.');
    }catch(e){if(current===epoch)status.textContent=e.message;}
    finally{button.disabled=false;}
  };
  return { load, showCompany, selected:()=>customers.find(c=>c.id===chooser.value), selectBuyer(buyer) {
    const c=customers.find(c=>c.name===buyer.name && c.identification===buyer.identification);
    chooser.value=c?.id||'';
  } };

}
