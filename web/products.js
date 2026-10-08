import {table,node,action,details} from './ui.js';
import {collection,doc,onSnapshot,runTransaction,serverTimestamp} from 'firebase/firestore';
import {auditedSet} from './audit.js';
export function normalizeProduct(input){
 const code=String(input.code||'').trim().toUpperCase(),name=String(input.name||'').trim(),description=String(input.description||'').trim(),price=String(input.price||'').trim();
 if(!/^[A-Z0-9_-]{1,30}$/.test(code))throw Error('Código: usa hasta 30 letras, números, guiones o guion bajo.');
 if(!name||name.length>150||description.length>500)throw Error('Ingresa un nombre de hasta 150 caracteres y una descripción de hasta 500.');
 if(!['PRODUCT','SERVICE'].includes(input.type))throw Error('Selecciona producto o servicio.');
 if(!/^[0-9]{1,9}(\.[0-9]{1,2})?$/.test(price))throw Error('Precio: usa punto decimal y hasta dos decimales.');
 const [whole,fraction='']=price.split('.'),priceCents=Number(BigInt(whole+fraction.padEnd(2,'0')));
 if(priceCents<1||priceCents>10000000000)throw Error('El precio debe estar entre $0,01 y $100.000.000.');
 if(!['5','19'].includes(String(input.rate)))throw Error('Selecciona IVA del 5 % o 19 %.');
 if(![true,false,'true','false'].includes(input.active))throw Error('Selecciona un estado válido.');
 return {code,name,description,type:input.type,priceCents,rate:Number(input.rate),active:input.active===true||input.active==='true'};
}
export async function saveProduct(db,company,input,editing=null){
 const value=normalizeProduct(input),ref=doc(db,'organizations',company,'products',value.code);
 if(editing&&editing.code!==value.code)throw Error('El código no se puede cambiar.');
 await runTransaction(db,async tx=>{
  const snap=await tx.get(ref),old=snap.exists()?snap.data():null;
  if(!editing&&old)throw Error('Ya existe ese código. Usa Editar.');
  if(editing&&(!old||old.version!==editing.version))throw Error('Otra persona cambió el registro. Vuelve a abrirlo antes de guardar.');
  auditedSet(tx,db,ref,old,{...value,createdAt:old?.createdAt||serverTimestamp()});
 });
}
const price=c=>(c/100).toFixed(2);
const money=c=>(c/100).toLocaleString('es-CO',{style:'currency',currency:'COP'});
const el=(tag,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
export function setupProducts({db,getRole,onChange}){
 const form=document.querySelector('#product-form'),list=document.querySelector('#product-list'),status=document.querySelector('#product-status'),search=document.querySelector('#product-search');
 const dialog=el('dialog','','product-dialog'),header=el('div','','section-head'),title=el('h2','Producto o servicio'),close=el('button','Cerrar','quiet'),feedback=el('p');
 title.id='product-dialog-title';dialog.setAttribute('aria-labelledby',title.id);close.type='button';close.setAttribute('aria-label','Cerrar producto o servicio');feedback.setAttribute('role','status');
 header.append(title,close);dialog.append(header,form,feedback);document.body.append(dialog);
 let company='',items=[],stop=null,editing=null,epoch=0,ready=false,saving=false;
 close.onclick=()=>{if(!saving)reset();};
 dialog.addEventListener('cancel',event=>{event.preventDefault();if(!saving)reset();});
 const canEdit=()=>['platform','admin'].includes(getRole());
 function reset(){if(dialog.open)dialog.close();editing=null;form.reset();form.hidden=true;form.elements.code.readOnly=false;feedback.textContent='';}
 function fillPicker(select){
  const previous=select.value;
  select.replaceChildren(new Option('Concepto libre / seleccionar del catálogo',''));
  for(const p of items.filter(p=>p.active))select.add(new Option(`${p.code} · ${p.name} · ${money(p.priceCents)}`,p.code));
  if(previous&&!items.some(p=>p.active&&p.code===previous))select.add(new Option(previous+' · valores conservados',previous));
  select.value=previous;select.disabled=!company||!ready;
 }
 function render(){
  list.replaceChildren();const term=search.value.trim().toLocaleLowerCase('es');
  const visible=items.filter(p=>(p.code+' '+p.name).toLocaleLowerCase('es').includes(term));
  const rows=visible.map(p=>{const actions=node('div','','row-actions');
   if(canEdit()){const edit=el('button','Editar','quiet');edit.type='button';edit.setAttribute('aria-label','Editar '+p.name);edit.onclick=()=>{if(saving||!canEdit())return;feedback.textContent='';title.textContent=p.type==='PRODUCT'?'Editar producto':'Editar servicio';editing={code:p.code,version:p.version};form.reset();for(const key of ['code','name','description','type','rate'])form.elements[key].value=p[key];form.elements.price.value=price(p.priceCents);form.elements.active.value=String(p.active);form.elements.code.readOnly=true;form.hidden=false;dialog.showModal();form.elements.name.focus();};actions.append(edit);}
   actions.append(action('Ver producto',()=>details(p.name,[['Código',p.code],['Tipo',p.type==='PRODUCT'?'Producto':'Servicio'],['Descripción',p.description],['Precio antes de IVA',money(p.priceCents)],['IVA',p.rate+' %'],['Estado',p.active?'Activo':'Inactivo']])));
   return [p.code,p.name,p.type==='PRODUCT'?'Producto':'Servicio',money(p.priceCents),p.rate+' %',p.active?'Activo':'Inactivo',actions];});
  table(list,['Código','Nombre','Tipo','Precio (COP)','IVA','Estado','Acciones'],rows,'Productos y servicios',ready?(items.length?'No hay coincidencias.':'Aún no hay productos ni servicios.'):'Cargando catálogo…');
  document.querySelector('#new-product').hidden=!canEdit();
  document.querySelectorAll('[data-product-picker]').forEach(fillPicker);
 }
 search.oninput=render;
 document.querySelector('#new-product').onclick=()=>{if(!company||!ready||!canEdit()||saving)return;reset();title.textContent='Crear producto o servicio';form.hidden=false;dialog.showModal();form.elements.code.focus();};
 document.querySelector('#cancel-product').onclick=()=>{if(!saving)reset();};
 form.onsubmit=async e=>{
  e.preventDefault();if(!company||!canEdit()||saving)return;
  const current=epoch,button=form.querySelector('[type=submit]'),cancel=document.querySelector('#cancel-product');
  saving=true;button.disabled=close.disabled=cancel.disabled=true;feedback.textContent='Guardando…';
  try{await saveProduct(db,company,Object.fromEntries(new FormData(form)),editing);if(current!==epoch)return;reset();status.textContent='Guardado. Los documentos anteriores conservan sus valores.';}
  catch(error){if(current===epoch)feedback.textContent=error.message;}
  finally{saving=false;button.disabled=close.disabled=cancel.disabled=false;}
 };
 return {
  load(id){stop?.();stop=null;company=id;epoch++;items=[];ready=false;reset();search.value='';status.textContent='';render();if(!id)return;const current=epoch;
   stop=onSnapshot(collection(db,'organizations',id,'products'),snap=>{if(current!==epoch)return;items=snap.docs.map(d=>d.data()).sort((a,b)=>a.name.localeCompare(b.name,'es'));ready=true;render();},()=>{if(current!==epoch)return;status.textContent='No se pudo cargar el catálogo. Comprueba tus permisos o recarga la página.';list.replaceChildren();});
  },
  attachLine(row){const label=el('label','Producto o servicio'),select=el('select');select.dataset.productPicker='';label.append(select);row.prepend(label);fillPicker(select);
   select.onchange=()=>{const p=items.find(p=>p.code===select.value&&p.active);if(!p)return;row.querySelector('[data-field="description"]').value=p.name;row.querySelector('[data-field="unit_price"]').value=price(p.priceCents);row.querySelector('[data-field="iva_rate"]').value=String(p.rate);onChange();};
  }
 };
}
