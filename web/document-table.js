import { formatCreated } from './document-query.js';

const labels = {INVOICE:'Factura electrónica',CREDIT_NOTE:'Nota crédito',DEBIT_NOTE:'Nota débito'};
const el = (tag, text = '', cls = '') => {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = cls;
  return node;
};
const money = value => {
  const [whole, decimals] = value.split('.');
  return '$ ' + whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + decimals;
};

export function renderDocumentTable(container, documents, {emptyMessage, onOpen, onEdit, onNote}) {
  container.replaceChildren();
  if (!documents.length) {
    container.append(el('p', emptyMessage, 'empty'));
    return;
  }
  const scroll = el('div', '', 'history-table-scroll');
  scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', 'Documentos. Desplaza horizontalmente para ver todas las columnas.');
  const table = el('table', '', 'history-table');
  table.append(el('caption', 'Documentos · Fechas de Colombia · Importes en COP', 'sr-only'));
  const head = el('thead'), header = el('tr'), body = el('tbody');
  for (const label of ['Fecha de creación', 'Documento', 'Comprador', 'Estado', 'Total (COP)', 'Acción']) {
    const th = el('th', label);
    th.scope = 'col';
    header.append(th);
  }
  head.append(header);
  for (const d of documents) {
    const row = el('tr');
    const buyer = el('td');
    buyer.append(el('strong', d.buyer.name), el('small', d.buyer.identification));
    const state = el('td');
    state.append(el('span', 'BORRADOR', 'status'), el('small', 'Sin validez fiscal'));
    const action = el('td');
    const button = el('button', 'Ver documento ↗', 'document-preview-button');
    button.type = 'button';
    button.setAttribute('aria-label', `Ver ${labels[d.kind]} de ${d.buyer.name}, ${formatCreated(d.createdAt)}`);
    button.onclick = () => onOpen(d);
    if(onEdit && d.status === 'DRAFT' && d.fiscal_validity === false && !d.referenceLocked) {
      const edit=el('button','Editar borrador','quiet');edit.type='button';edit.onclick=()=>onEdit(d);action.append(edit);
    }
    if(onNote && d.kind === 'INVOICE' && d.status === 'DRAFT' && d.fiscal_validity === false) {
      for(const [kind,label] of [['CREDIT_NOTE','Crear nota crédito'],['DEBIT_NOTE','Crear nota débito']]) {
        const note=el('button',label,'quiet');note.type='button';note.onclick=()=>onNote(d,kind);action.append(note);
      }
    }
    action.append(button);
    row.append(el('td', formatCreated(d.createdAt)), documentCell(d), buyer, state, el('td', money(d.total), 'history-total'), action);
    body.append(row);
  }
  table.append(head, body);
  scroll.append(table);
  container.append(scroll);
}

function documentCell(d) {
  const cell=el('td', labels[d.kind]);
  cell.append(el('small','ID · '+d.id));
  if(d.reference_id) cell.append(el('small','Factura origen · '+d.reference_id));
  return cell;
}
