const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
export function businessDate(value) {
  if(!value)return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(p=>[p.type,p.value]));
  return parts.year+'-'+parts.month+'-'+parts.day;
}
export function filterCommercial(rows, {search='',account='',status='',city='',quality='',from='',to=''}={}, accountNames={}) {
  const terms=normalize(search).split(/\s+/).filter(Boolean);
  return rows.filter(row=>{
    if(account && (account==='__missing__' ? !!accountNames[row.customerId] : row.customerId!==account))return false;
    if(status && String(row.status||'')!==status)return false;
    if(city && row.municipality!==city)return false;
    if(quality==='missing-email' && String(row.email||'').trim())return false;
    if(quality==='missing-identification' && String(row.identification||'').trim())return false;
    if(from || to) {
      const date=businessDate(row.date);
      if(!date || (from && date<from) || (to && date>to))return false;
    }
    const text=normalize([row.name,row.identification,row.number,row.email,row.phone,row.phone1,row.phone2,row.website,row.jobTitle,row.address,row.municipality,row.department,row.status,({NEW:'Nuevo',ACTIVE:'Activo',QUOTED:'Cotizado',INACTIVE:'Inactivo'})[row.status],accountNames[row.customerId]].filter(v=>v!=null).join(' '));
    return terms.every(term=>text.includes(term));
  });
}
export function paginate(rows,page,size) {
  size=[10,25,50,100].includes(Number(size))?Number(size):25;
  const pages=Math.max(1,Math.ceil(rows.length/size));
  page=Math.max(1,Math.min(pages,Math.floor(Number(page)||1)));
  const offset=(page-1)*size;
  return {rows:rows.slice(offset,offset+size),page,pages,total:rows.length,start:rows.length?offset+1:0,end:Math.min(offset+size,rows.length)};
}

const nameCollator=new Intl.Collator('es',{sensitivity:'base',numeric:true});
export function sortCommercialByName(rows,direction){
 if(!['asc','desc'].includes(direction))return rows.slice();
 return rows.slice().sort((a,b)=>{
  const left=String(a.name??'').trim(),right=String(b.name??'').trim();
  if(!left||!right)return !left&&!right?0:!left?1:-1;
  return nameCollator.compare(left,right)*(direction==='desc'?-1:1);
 });
}
