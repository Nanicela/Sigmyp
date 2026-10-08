export const node=(tag,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
export function action(label,handler){const b=node('button',label,'quiet');b.type='button';b.onclick=handler;return b;}
export function table(container,headers,rows,caption,empty='No hay registros.'){container.replaceChildren();if(!rows.length){container.append(node('p',empty,'empty'));return;}
 const wrap=node('div','','history-table-scroll');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',caption);
 const t=node('table','','history-table'),head=node('thead'),tr=node('tr'),body=node('tbody');t.append(node('caption',caption,'sr-only'));
 for(const label of headers){const th=node('th',label);th.scope='col';tr.append(th);}head.append(tr);
 for(const cells of rows){const r=node('tr');for(const value of cells){const td=node('td');if(value instanceof Node)td.append(value);else td.textContent=String(value??'');r.append(td);}body.append(r);}t.append(head,body);wrap.append(t);container.append(wrap);
}
let modalId=0;
export function modal(title,content,{onClose=()=>{}}={}){const dialog=node('dialog','','record-dialog'),header=node('div','','section-head'),heading=node('h2',title),status=node('p','','modal-status');heading.id='record-modal-'+(++modalId);dialog.setAttribute('aria-labelledby',heading.id);status.setAttribute('role','status');
 const busy=()=>!!dialog.querySelector('button[type=submit]:disabled');
 const close=action('Cerrar',()=>{if(!busy())dialog.close();});close.setAttribute('aria-label','Cerrar '+title);
 header.append(heading,close);dialog.append(header,content,status);document.body.append(dialog);
 dialog.addEventListener('cancel',e=>{if(busy())e.preventDefault();});dialog.addEventListener('close',onClose);
 return {dialog,status,open(label=title){heading.textContent=label;status.textContent='';if(!dialog.open)dialog.showModal();},close(){dialog.close();}};
}
export function details(title,entries){const dl=node('dl','','customer-details');for(const [label,value]of entries){const group=node('div');group.append(node('dt',label),node('dd',String(value||'No registrado')));dl.append(group);}const m=modal(title,dl,{onClose:()=>m.dialog.remove()});m.open();return m;}
