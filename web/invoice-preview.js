import {taxLabel} from './draft-totals.js';
import {dateText,paymentMethods} from './payment-terms.js';
import { formatCreated } from './document-query.js';
const labels={INVOICE:'Factura de venta',CREDIT_NOTE:'Nota crédito',DEBIT_NOTE:'Nota débito'};
const el=(tag,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
const money=value=>{const [n,d]=value.split('.');return '$ '+n.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+d;};
export function createInvoicePreview() {
  const dialog=el('dialog','','invoice-dialog'); dialog.setAttribute('aria-labelledby','invoice-preview-title');
  const toolbar=el('div','','invoice-toolbar'),title=el('h2','Vista del documento');title.id='invoice-preview-title';
  const close=el('button','Cerrar ×','quiet');close.type='button';close.setAttribute('aria-label','Cerrar vista del documento');close.onclick=()=>dialog.close();
  toolbar.append(title,close);const stage=el('div','','invoice-stage');dialog.append(toolbar,stage);document.body.append(dialog);
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>document.body.classList.remove('invoice-open'));
  return {
    close:()=>dialog.close(),
    open(d,company) {
      stage.replaceChildren();const paper=el('article','','invoice-paper');
      const header=el('header','','invoice-header'),identity=el('div','','invoice-issuer');
      identity.append(el('div','DOCUMENTO DE TRABAJO','invoice-overline'),el('h3',d.context?.issuer.name||'Emisor histórico no registrado'),el('p',`NIT: ${d.context?.issuer.identification||company.id}`));
      const partyDetails=(node,p)=>{if(!p)return;for(const text of [p.documentType+' '+p.identification+(p.dv?' - '+p.dv:''),p.address,[p.municipality,p.department].join(', '),p.email,p.phone,'Responsabilidades: '+p.taxResponsibilities,'IVA: '+({responsable:'Responsable',no_responsable:'No responsable',por_confirmar:'Por confirmar'}[p.vatStatus]||p.vatStatus)])if(text)node.append(el('p',text));};
      partyDetails(identity,d.context?.issuer);
      const heading=el('div','','invoice-heading');heading.append(el('h3',labels[d.kind]||'Documento'),el('span','BORRADOR','invoice-status'),el('p','Sin numeración fiscal'));
      header.append(identity,heading);paper.append(header);
      const warning=el('p','Sin validez fiscal · No emitido ni validado por la DIAN.','invoice-warning');paper.append(warning);
      const info=el('div','','invoice-info'),buyer=el('section','','invoice-buyer'),dates=el('section','','invoice-dates');
      buyer.append(el('div','COMPRADOR','invoice-overline'),el('h4',d.buyer.name),el('p',`Identificación: ${d.buyer.identification}`));
      partyDetails(buyer,d.context?.buyer);
      dates.append(el('div','FECHA DE CREACIÓN','invoice-overline'),el('p',formatCreated(d.createdAt)),el('small','Hora de Colombia · Moneda COP'));
      if(d.payment){dates.append(el('p','Fecha del documento: '+dateText(d.payment.documentDate)),el('p','Forma: '+(d.payment.form==='CREDIT'?'Crédito':'Contado')),el('p','Plazo: '+d.payment.days+' días'),el('p','Vencimiento: '+dateText(d.payment.dueDate)),el('p','Medio esperado: '+paymentMethods[d.payment.method]),el('small','No acredita pago ni genera cartera exigible.'));}
      else if(d.kind==='INVOICE')dates.append(el('p','Condiciones de pago no registradas.'));
      info.append(buyer,dates);paper.append(info);
      const wrapper=el('div','','invoice-table-wrap'),table=el('table','','invoice-table');
      const caption=el('caption','Conceptos del documento','sr-only');table.append(caption);
      const head=el('thead'),tr=el('tr');for(const t of ['#','Descripción','Cantidad','Precio unitario','Descuento','IVA','Total']){const th=el('th',t);th.scope='col';tr.append(th);}head.append(tr);table.append(head);
      const body=el('tbody');d.lines.forEach((l,i)=>{const row=el('tr');for(const v of [String(i+1),l.description,l.quantity,money(l.unit_price),money(l.discount||'0.00')+' ('+(l.discount_rate||'0')+' %)',taxLabel(l.tax_treatment&&l.tax_treatment!=='TAXED'?l.tax_treatment:l.iva_rate),money(l.total)])row.append(el('td',v));body.append(row);});table.append(body);wrapper.append(table);paper.append(wrapper);
      const bottom=el('div','','invoice-bottom'),notes=el('section','','invoice-notes');
      notes.append(el('div',d.reference_id?'MOTIVO DE LA NOTA':'OBSERVACIONES','invoice-overline'),el('p',d.reason||'Documento preliminar para revisión.'));
      if(d.reference_id) notes.append(el('small',`Documento de referencia: ${d.reference_id}`));
      const totals=el('dl','','invoice-totals');for(const [label,value] of [['Importe antes de descuentos',d.gross||d.subtotal],['Descuentos efectivos',d.discount||'0.00'],['Base después de descuentos',d.subtotal],['IVA',d.tax],['Total del borrador',d.total]]){const row=el('div');row.append(el('dt',label),el('dd',money(value)));totals.append(row);}bottom.append(notes,totals);paper.append(bottom);
      const footer=el('footer','','invoice-footer');footer.append(el('p',`ID interno: ${d.id}`),el('p',d.context?'Datos de empresa y cliente conservados en este documento. Su captura no acredita validación tributaria.':'Documento antiguo sin copia histórica completa de empresa y cliente. No se sustituyen estos datos por las fichas actuales.'));paper.append(footer);
      stage.append(paper);document.body.classList.add('invoice-open');dialog.showModal();close.focus();
    }
  };
}
