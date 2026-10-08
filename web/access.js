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
  const editor=modal('Acceso de usuario',form);let activeCompany='';
  const create=action('+ Asignar usuario',()=>{form.reset();form.elements.email.readOnly=false;editor.open('Asignar usuario a la compañía');});list.before(create);
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
  return {render(company, user) {
    if(activeCompany!==(company?.id||'')){editor.close();activeCompany=company?.id||'';}
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
  }};
}
