import {table,node,action,modal,details} from './ui.js';
import {auditedSet} from './audit.js';
import {collection, query, where, FieldPath, doc, runTransaction, serverTimestamp} from 'firebase/firestore';
export const roleLabels = {platform:'Superadministrador · acceso global',admin:'Administrador',billing:'Acceso anterior',viewer:'Consulta'};
export const companyPath = id => ['organizations', id];
export function companiesFor(db, user, platform) {
  const all = collection(db, 'organizations');
  return platform ? all : query(all, where(new FieldPath('members', user.email), 'in', ['admin','billing','viewer']));
}
export function setupAccess({db, getCompany, getRole, message}) {
  const form = document.querySelector('#access-form'), list = document.querySelector('#access-list');
  const vueAccess=window.__sigmypUserAccess;
  const editor=vueAccess?{
    get status(){return document.querySelector('#user-access-status');},
    open(title){vueAccess.openEditor({email:form.elements.email.value,role:form.elements.role.value,edit:form.elements.email.readOnly,title});},
    close(){vueAccess.close();}
  }:modal('Acceso de usuario',form);
  let activeCompany='',currentCompany=null,currentUser=null,registeredUsers=[];
  const create=vueAccess?null:action('+ Asignar usuario',()=>{form.reset();form.elements.email.readOnly=false;editor.open('Asignar usuario a la compañía');});
  if(create)list.before(create);
  async function save(email, role) {
    const id = getCompany();
    if (!id || !['platform','admin'].includes(getRole())) throw new Error('No tienes permiso para administrar accesos.');
    await runTransaction(db, async tx => {
      const ref = doc(db, ...companyPath(id)), snapshot = await tx.get(ref);
      const bindingRef=doc(db,'companyAssignments',email),binding=await tx.get(bindingRef);
      if(binding.exists() && binding.data().companyId!==id)throw Error('Este usuario ya pertenece a otra compañía. Retira primero su acceso anterior.');
      const members = {...snapshot.data().members};
      if (role) members[email] = role; else delete members[email];
      if (Object.keys(members).length > 50) throw new Error('Esta versión admite hasta 50 accesos por empresa.');
      if(role && !binding.exists())tx.set(bindingRef,{companyId:id});
      if(!role && binding.exists())tx.delete(bindingRef);
      auditedSet(tx,db,ref,snapshot.data(),{...snapshot.data(),members,memberChangeEmail:email});
    });
  }
  form.onsubmit = async event => {
    event.preventDefault(); const button = form.querySelector('button'); button.disabled = true;
    try { await save(form.elements.email.value.trim(), form.elements.role.value); form.reset(); editor.close();message('Acceso guardado. La persona podrá entrar con ese correo verificado. No se envió un correo de invitación.'); }
    catch(e) { editor.status.textContent=e.message;message(e.message,true); } finally { button.disabled = false; }
  };
  const showDetails=rows=>{
    if(!vueAccess){details('Acceso de usuario',rows);return;}
    const target=document.querySelector('#user-access-details');target.replaceChildren();
    for(const [label,value] of rows){const item=node('div'),term=node('dt',label),description=node('dd',value||'No registrado');item.append(term,description);target.append(item);}
    vueAccess.openDetails();
  };
  if(vueAccess)document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-user-access-action]');if(!button)return;
    const kind=button.dataset.userAccessAction,email=button.dataset.email;
    if(kind==='close'){vueAccess.close();return;}
    if(kind==='assign'){vueAccess.openEditor();return;}
    if(kind==='registered-view'){
      const person=registeredUsers[Number(button.dataset.index)];if(!person)return;
      showDetails([['Nombre',[person.firstName,person.lastName].filter(Boolean).join(' ')],['Correo',person.email],['Documento',[person.documentType,person.identification].filter(Boolean).join(' ')],['Teléfono',person.phone],['Cargo',person.jobTitle]]);return;
    }
    const storedRole=currentCompany?.members?.[email],globalAccess=getRole()==='platform'&&email?.toLocaleLowerCase('es')===currentUser?.email?.toLocaleLowerCase('es');
    if(kind==='view'){const role=globalAccess?'platform':storedRole;showDetails([['Correo',email],['Rol',roleLabels[role]],['Alcance',globalAccess?'Todas las compañías':'Solo esta compañía'],['Compañía consultada',currentCompany?.name],['NIT',currentCompany?.id]]);return;}
    if(kind==='edit'){vueAccess.openEditor({email,role:storedRole,edit:true});return;}
    if(kind==='remove'){
      button.disabled=true;
      try{await save(email,null);message('Acceso retirado.');}
      catch(error){message(error.message,true);button.disabled=false;}
    }
  });
  return {render(company, user) {
    if(activeCompany!==(company?.id||'')){editor.close();activeCompany=company?.id||'';}
    currentCompany=company;currentUser=user;
    if(vueAccess){vueAccess.render({company,userEmail:user?.email||'',effectiveRole:getRole(),roleLabels});return;}
    list.replaceChildren();create.hidden=!company||!['platform','admin'].includes(getRole());
    if(create.hidden){editor.close();return;}
    const members=Object.entries(company.members||{}),isPlatform=getRole()==='platform';
    if(isPlatform&&!members.some(([email])=>email.toLocaleLowerCase('es')===user.email.toLocaleLowerCase('es')))members.unshift([user.email,'platform']);
    const rows=members.map(([email,storedRole])=>{const actions=node('div','','row-actions');
      const globalAccess=isPlatform&&email.toLocaleLowerCase('es')===user.email.toLocaleLowerCase('es'),role=globalAccess?'platform':storedRole;
      actions.append(action('Ver usuario',()=>details('Acceso de usuario',[['Correo',email],['Rol',roleLabels[role]],['Alcance',globalAccess?'Todas las compañías':'Solo esta compañía'],['Compañía consultada',company.name],['NIT',company.id]])));
      if(!globalAccess){
        actions.append(action('Editar rol',()=>{form.elements.email.value=email;form.elements.email.readOnly=true;form.elements.role.value=storedRole;editor.open('Editar rol');}));
        const remove=action('Retirar acceso',async()=>{remove.disabled=true;try{await save(email,null);message('Acceso retirado.');}catch(e){message(e.message,true);remove.disabled=false;}});
        remove.disabled=email===user.email;actions.append(remove);
      }
      return [email,roleLabels[role],actions];});
    table(list,['Correo','Rol','Acciones'],rows,'Usuarios de la compañía','Aún no hay usuarios asignados.');
  },renderRegistered(records=[],visible=false){
    registeredUsers=records;
    if(vueAccess)vueAccess.renderRegistered(records,visible);
  }};
}
