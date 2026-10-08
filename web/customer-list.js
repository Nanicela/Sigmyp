import {table,node,action} from './ui.js';
const el=(tag,text='',className='')=>{const n=document.createElement(tag);n.textContent=text;n.className=className;return n;};
export function createCustomerList(container,{onEdit}) {
  const dialog=el('dialog','','customer-detail-dialog');
  dialog.setAttribute('aria-labelledby','customer-detail-title');
  const heading=el('h2','Ficha del cliente');heading.id='customer-detail-title';
  const close=el('button','Cerrar','quiet');close.type='button';close.onclick=()=>dialog.close();
  const header=el('div','','section-head');header.append(heading,close);
  const name=el('h3','','customer-detail-name'),company=el('p','','hint'),details=el('dl','','customer-details');
  dialog.append(header,name,company,details);document.body.append(dialog);
  const vat={responsable:'Responsable de IVA',no_responsable:'No responsable de IVA',por_confirmar:'Por confirmar'};
  function open(c){
    name.textContent=c.name;
    company.textContent='Compañía · '+(document.querySelector('#company').selectedOptions[0]?.textContent||'');
    details.replaceChildren();
    for(const [label,value] of [
      ['Tipo de documento',c.documentType],['Número de identificación',c.identification],
      ...(c.documentType==='NIT'?[['Dígito de verificación',c.dv]]:[]),
      ['Correo electrónico',c.email],['Teléfono',c.phone],['Dirección',c.address],
      ['Departamento',c.department],['Municipio',c.municipality],
      ['Condición frente al IVA',vat[c.vatStatus]||c.vatStatus],['Responsabilidades tributarias',c.taxResponsibilities]
    ]) {const group=el('div');group.append(el('dt',label),el('dd',value||'No registrado'));details.append(group);}
    dialog.showModal();
  }
  return {close:()=>dialog.close(),render(customers,canEdit){
    container.replaceChildren();
    if(!customers.length){container.append(el('p','Aún no hay clientes registrados para esta empresa.','empty'));return;}
    const rows=customers.map(c=>{const actions=node('div','','row-actions');
      if(canEdit)actions.append(action('Editar',()=>onEdit(c)));
      actions.append(action('Ver cliente',()=>open(c)));
      return [c.name,c.documentType+' '+c.identification,c.email,c.phone||'—',actions];});
    table(container,['Cliente','Identificación','Correo','Teléfono','Acciones'],rows,'Clientes');

  }};
}
