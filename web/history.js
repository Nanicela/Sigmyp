import { createInvoicePreview } from './invoice-preview.js';
import { query, getDocsFromServer } from 'firebase/firestore';
import { normalizeFilters, documentConstraints } from './document-query.js';
import { renderDocumentTable } from './document-table.js';
export function setupHistory({getCollection, unpack, onEdit, onNote, canEdit}) {
  const form=document.querySelector('#document-filters'), results=document.querySelector('#history'), status=document.querySelector('#history-status'), more=document.querySelector('#history-more');
  const preview=createInvoicePreview();
  let company='', version=0, filters=normalizeFilters({}), cursor=null, rows=[], busy=false, hasMore=false;
  function controls() { form.querySelector('[type=submit]').disabled=busy||!company; more.disabled=busy; more.hidden=!hasMore; }
  function render() {
    document.querySelector('#count').textContent=String(rows.length);
    renderDocumentTable(results, rows, {
      emptyMessage: company ? 'No hay documentos que coincidan con estos filtros.' : 'Selecciona una empresa para consultar sus documentos.',
      onNote: canEdit() ? onNote : null,
      onEdit: canEdit() ? onEdit : null,
      onOpen: d => preview.open(d, {id:company,name:document.querySelector('#company').selectedOptions[0]?.textContent||''})
    });
  }

  async function fetchPage(append=false) {
    const current=++version;busy=true;
    if(!append) {rows=[];cursor=null;hasMore=false;render();}
    controls();status.textContent='Consultando documentos…';
    if(!company) {busy=false;status.textContent='';controls();return;}
    try {
      const snapshot=await getDocsFromServer(query(getCollection(company),...documentConstraints(filters,append?cursor:null)));
      if(current!==version) return;
      const page=snapshot.docs.slice(0,25);hasMore=snapshot.docs.length>25;
      rows=append?[...rows,...page.map(unpack)]:page.map(unpack);cursor=page.at(-1)||cursor;
      render();status.textContent=`${rows.length} documentos mostrados${hasMore?' · Hay más resultados.': ' · Fin de los resultados.'}`;
    } catch(e) {if(current===version) status.textContent='No pudimos consultar los documentos. '+(e.code==='failed-precondition'?'Los índices se están preparando; vuelve a aplicar los filtros en unos minutos.':e.message);}
    finally {if(current===version) {busy=false;controls();}}
  }
  form.onsubmit=e=>{e.preventDefault();try{filters=normalizeFilters(Object.fromEntries(new FormData(form)));fetchPage();}catch(e){status.textContent=e.message;}};
  document.querySelector('#history-clear').onclick=()=>{form.reset();filters=normalizeFilters({});fetchPage();};
  more.onclick=()=>fetchPage(true);
  return {load(id) {preview.close();if(id!==company){form.reset();filters=normalizeFilters({});}company=id;return fetchPage();}};
}
