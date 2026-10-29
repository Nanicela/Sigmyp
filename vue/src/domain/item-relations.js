export function itemRelations(id,data={}){
 if(!id)return {orders:[],movements:[]};
 const orders=(data.purchaseOrders||[]).flatMap(order=>{
  const lines=(order.lines||[]).filter(line=>line.productId===id);
  if(!lines.length)return [];
  return [{id:order.id,number:order.number,supplierName:order.supplierName,date:order.date,status:order.status,quantity:lines.reduce((n,l)=>n+l.quantityUnits,0)/1000,totalCents:lines.reduce((n,l)=>n+l.totalCents,0)}];
 });
 const movements=(data.kardex||[]).filter(m=>m.itemId===id&&m.status==='PENDING');
 return {orders,movements};
}
