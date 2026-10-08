import {table,node,action,modal} from './ui.js';
import {doc, serverTimestamp, collection, query, orderBy, limit, getDocsFromServer, startAfter} from 'firebase/firestore';
import {getAuth} from 'firebase/auth';
// Todas las escrituras se enlazan atómicamente con un evento inmutable.
export function auditedSet(tx, db, ref, before, values, auditId = crypto.randomUUID()) {
  const user = getAuth(db.app).currentUser;
  if (!user) throw new Error('Inicia sesión de nuevo.');
  const pieces = ref.path.split('/'), company = pieces[1];
  const after = {...values, version:(before?.version || 0)+1, auditId, updatedBy:user.uid, updatedAt:serverTimestamp()};
  tx.set(ref, after);
  tx.set(doc(db,'organizations',company,'audit',auditId), {
    target: pieces.length === 2 ? 'company' : pieces[2], targetId:ref.id,
    actorUid:user.uid, actorEmail:user.email, at:serverTimestamp(), before:before || null, after
  });
  return after;
}
const fieldNames={schemaVersion:'Versión del modelo',context:'Datos históricos de empresa y cliente',payment:'Condiciones de pago',code:'Código',description:'Descripción',type:'Tipo',priceCents:'Precio antes de IVA',rate:'IVA (%)',active:'Activo',name:'Nombre',nit:'NIT',members:'Accesos por correo',buyer:'Comprador',lines:'Conceptos',kind:'Tipo de documento',reference_id:'Factura de referencia',reason:'Motivo',currency:'Moneda',subtotalCents:'Subtotal',taxCents:'IVA',totalCents:'Total',status:'Estado',fiscal_validity:'Validez fiscal',referenceLocked:'Bloqueo por notas asociadas',documentType:'Tipo de identificación',identification:'Identificación',dv:'Dígito de verificación',email:'Correo',phone:'Teléfono',address:'Dirección',department:'Departamento',municipality:'Municipio',taxResponsibilities:'Responsabilidades tributarias',vatStatus:'Condición frente al IVA'};
function readable(key,value){
 if(value===undefined||value===null)return 'Sin valor anterior';
 if(key.endsWith('Cents'))return (value/100).toLocaleString('es-CO',{style:'currency',currency:'COP'});
 if(key==='buyer')return `${value.name} · ${value.identification}`;
 if(key==='lines')return value.map(l=>`${l.description} · ${l.quantityUnits/10000} × ${readable('priceCents',l.priceCents)} · IVA ${l.rate}%`).join('\n');
 if(key==='members')return Object.entries(value).map(([email,role])=>`${email}: ${{admin:'Administrador',billing:'Facturador',viewer:'Consulta',platform:'Superadministrador · acceso global'}[role]||role}`).join('\n')||'Sin accesos asignados';
 if(key==='context'||key==='payment')return JSON.stringify(value,null,2);
 if(typeof value==='boolean')return value?'Sí':'No';
 return ({INVOICE:'Factura',CREDIT_NOTE:'Nota crédito',DEBIT_NOTE:'Nota débito',DRAFT:'Borrador'})[value]||String(value);
}
export function setupAudit({db,getCompany,message}) {
  const dialog=document.querySelector('#audit-dialog'), list=document.querySelector('#audit-events'), more=document.querySelector('#audit-more');
  let cursor=null,company='',epoch=0,rows=[];
  const labels={company:'Empresa y permisos',drafts:'Borrador',profiles:'Datos tributarios',customers:'Comprador',products:'Producto o servicio'};
  async function page() {
    const current=epoch;more.disabled=true;
    try {
      const base=collection(db,'organizations',company,'audit');
      const constraints=[orderBy('at','desc'),...(cursor?[startAfter(cursor)]:[]),limit(26)];
      const snap=await getDocsFromServer(query(base,...constraints));if(current!==epoch)return;
      for(const record of snap.docs.slice(0,25)) {
        const event=record.data(),item=document.createElement('div'),title=document.createElement('h3');
        title.textContent=`${event.before?'Actualización':'Creación'} · ${labels[event.target]} · ${event.actorEmail} · ${event.at.toDate().toLocaleString('es-CO',{timeZone:'America/Bogota'})}`;
        const id=document.createElement('p');id.textContent=`Usuario: ${event.actorUid} · Registro: ${event.targetId}`;
        const content=document.createElement('pre');
        const keys=new Set([...Object.keys(event.before||{}),...Object.keys(event.after)]);
        const changes=[];for(const key of keys)if(!['auditId','updatedAt','updatedBy','version','requestHash','createdAt','lastOperation'].includes(key) && JSON.stringify(event.before?.[key])!==JSON.stringify(event.after[key]))changes.push(`${fieldNames[key]||key}\nAntes: ${readable(key,event.before?.[key])}\nDespués: ${readable(key,event.after[key])}`);
        content.textContent=changes.join('\n\n');item.append(title,id,content);rows.push([event.at.toDate().toLocaleString('es-CO',{timeZone:'America/Bogota'}),labels[event.target],event.before?'Actualización':'Creación',event.actorEmail,action('Ver cambio',()=>{const m=modal('Detalle del cambio',item,{onClose:()=>m.dialog.remove()});m.open();})]);
      }
      table(list,['Fecha','Registro','Operación','Usuario','Acciones'],rows,'Historial de cambios','No hay cambios registrados desde la activación del historial.');
      cursor=snap.docs.slice(0,25).at(-1)||cursor;more.hidden=snap.docs.length<=25;
      if(!list.children.length)list.textContent='No hay cambios registrados desde la activación del historial. Los registros anteriores no tienen autor retrospectivo.';
    }catch(e){message('No se pudo consultar el historial: '+e.message,true);}finally{more.disabled=false;}
  }
  document.querySelector('#audit-close').onclick=()=>{epoch++;dialog.close();};
  more.onclick=page;
  return {open(){company=getCompany();if(!company)return;epoch++;cursor=null;rows=[];list.replaceChildren();more.hidden=true;dialog.showModal();page();},close(){epoch++;dialog.close();}};
}
