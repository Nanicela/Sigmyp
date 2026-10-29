// Explicit public projection. Source records and inventory balances remain unchanged.
export const purchaseGroups=['suppliers','supplierContacts','purchaseOrders','items','kardex'];
export function purchaseProjection(tables){
 const rows=n=>tables[n]||[],text=v=>v==null?'':String(v),key=(type,id)=>id==null?'':type+'-'+id;
 if(rows('purchase_orders').length||rows('kardex').length)throw Error('Hay operaciones que requieren conciliación antes de habilitar Compras.');
 const providers=new Map(rows('providers').map(p=>[String(p.id),p]));
 const identity=(type,r)=>({id:key(type,r.id),sourceId:r.id,sourceDocumentId:r._migrationId});
 return {
  suppliers:rows('providers').map(p=>({...identity('provider',p),identification:text(p.nit),name:text(p.name),phone1:text(p.phone1),phone2:text(p.phone2),email:text(p.email),website:text(p.webpage),address:text(p.address),city:text(p.city),certified:text(p.certified),creditType:text(p.credit_type),creditAmount:text(p.credit_amount),evaluation:text(p.evaluation)})),
  supplierContacts:rows('provider_contacts').map(c=>({...identity('provider-contact',c),supplierId:key('provider',c.provider_id),supplierName:text(providers.get(String(c.provider_id))?.name),name:text(c.name),position:text(c.position),phone1:text(c.phone1),phone2:text(c.phone2),mobile:text(c.cellphone),email:text(c.email),comments:text(c.comments)})),
  items:rows('items').map(i=>({...identity('item',i),code:text(i.code),name:text(i.name),description:text(i.description),unit:text(i.measurement_unit),category:text(i.category),location:text(i.location),supplierId:key('provider',i.main_provider_id),supplierName:text(providers.get(String(i.main_provider_id))?.name),secondSupplierId:key('provider',i.second_provider_id),secondSupplierName:text(providers.get(String(i.second_provider_id))?.name)})),
  purchaseOrders:[],kardex:[]
 };
}
