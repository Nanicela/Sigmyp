export const taxLabel=rate=>({EXEMPT:'Exento (0 %)',EXCLUDED:'Excluido de IVA',NOT_SUBJECT:'No gravado con IVA'}[rate]||'IVA '+rate+' %');
import domain from '../functions/domain.cjs';
export function summarizeDraftLines(lines) {
  const calculated=domain.calculate(lines);
  const taxes=new Map();
  for(const line of calculated.lines){
    const key=line.tax_treatment && line.tax_treatment!=='TAXED'?line.tax_treatment:line.iva_rate;
    const old=taxes.get(key)||0n;
    taxes.set(key,old+BigInt(line.tax.replace('.','')));
  }
  return {...calculated,taxes:[...taxes].sort(([a],[b])=>Number(a)-Number(b)).map(([rate,cents])=>({rate,amount:`${cents/100n}.${String(cents%100n).padStart(2,'0')}`}))};
}
const money=value=>{const [whole,decimal]=value.split('.');return '$ '+whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+decimal;};
export function refreshDraftTotals() {
  const root=document.querySelector('#draft-summary');if(!root)return;
  const rows=[...document.querySelectorAll('#lines .line')];
  const inputs=rows.map(row=>Object.fromEntries([...row.querySelectorAll('[data-field]')].map(input=>[input.dataset.field,input.value])));
  let allValid=true;
  rows.forEach((row,index)=>{
    let output=row.querySelector('.line-total');
    if(!output){output=document.createElement('p');output.className='line-total';row.append(output);}
    try {const line=domain.calculate([inputs[index]]).lines[0];output.textContent=`Descuento ${money(line.discount||'0.00')} · Base ${money(line.subtotal)} · IVA ${money(line.tax)} · Total ${money(line.total)}`;}
    catch{output.textContent='Completa el concepto para calcular su importe.';allValid=false;}
  });
  root.replaceChildren();
  const heading=document.createElement('h3');heading.textContent='Resumen del documento';root.append(heading);
  if(!allValid||!inputs.length){const p=document.createElement('p');p.className='hint';p.textContent='Revisa descripción, cantidad, precio y descuento de todos los conceptos para ver el total. Usa punto para los decimales y valores mayores que cero.';root.append(p);return;}
  const summary=summarizeDraftLines(inputs),list=document.createElement('dl');
  for(const [label,value] of [['Importe antes de descuentos',summary.gross],['Descuentos efectivos',summary.discount],['Base después de descuentos',summary.subtotal],...summary.taxes.map(t=>[taxLabel(t.rate),t.amount]),['Total del documento (COP)',summary.total]]){
    const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=money(value);row.append(dt,dd);list.append(row);
  }
  root.append(list);
}
