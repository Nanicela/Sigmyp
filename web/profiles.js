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
export function setupProfiles({db, getUser, getRole, message, onBuyer}) {
  const root = document.querySelector('#profiles');
  let company = '', epoch = 0, customers = [], editing = '', profile = null, loading = false;
  const companyForm = document.querySelector('#tax-form'), customerForm = root.querySelector('#customer-form');
  const customerModal=modal('Cliente',customerForm,{onClose:()=>resetCustomer()});
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
  const directory=createCustomerList(root.querySelector('#customer-list'),{onEdit:c=>{
    editing=c.id;fields(customerForm,c);customerForm.hidden=false;customerForm.elements.documentType.disabled=true;customerForm.elements.identification.readOnly=true;customerForm.querySelector('[type=submit]').textContent='Guardar cambios del cliente';customerModal.open('Editar cliente');customerForm.elements.name.focus();
  }});
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
    const list = root.querySelector('#customer-list'); list.replaceChildren(); chooser.replaceChildren(new Option('Selecciona un cliente registrado',''));
    for (const c of customers) {
      chooser.add(new Option(`${c.name} · ${c.documentType} ${c.identification}`,c.id));

    }
    if(customers.some(c=>c.id===selected))chooser.value=selected;
    directory.render(customers,['platform','admin','billing'].includes(getRole()));
  }
  async function load(id, name) {
    quickDialog.close();directory.close();customerModal.close();companyModal.close();
    company = id; const current = ++epoch; profile = null; customers = []; loading=!!id;resetCustomer(); render();renderCompany();
    root.hidden = !id; chooser.closest('label').hidden = !id;
    if (!id) return;
    fields(companyForm,{ name, documentType:'NIT',identification:id });
    companyForm.elements.documentType.disabled = true; companyForm.elements.identification.readOnly = true;
    [companyForm,customerForm].forEach(f => f.querySelector('fieldset').disabled = true); loading = true;
    try {
      const base = path();
      const [p,cs] = await Promise.all([getDoc(doc(db,...base,'profiles','tax')),getDocs(collection(db,...base,'customers'))]);
      if (current !== epoch) return;
      profile = p.exists() ? p.data() : null;
      if (profile) fields(companyForm,profile);
      customers = cs.docs.map(d => ({...d.data(),id:d.id})).sort((a,b) => a.name.localeCompare(b.name,'es')); render();
      root.querySelector('#profile-status').textContent = profile ? 'Datos guardados. Puedes actualizarlos aquí.' : 'Completa los datos de esta empresa según su RUT.';
      companyForm.querySelector('fieldset').disabled = !['platform','admin'].includes(getRole()); customerForm.querySelector('fieldset').disabled = !['platform','admin','billing'].includes(getRole()); root.querySelector('#new-customer').hidden = getRole() === 'viewer'; loading = false;renderCompany();
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
  root.querySelector('#new-customer').onclick = ()=>{resetCustomer();customerForm.hidden=false;customerModal.open('Crear cliente');customerForm.elements.name.focus();};
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
