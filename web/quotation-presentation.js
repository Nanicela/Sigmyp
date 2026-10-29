// Imported text is displayed as text, never injected as HTML.
export function quotationText(value){
 if(value==null)return '';
 return String(value).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/(p|div|li)>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').trim();
}
export function quotationDuration(value,unit){
 if(value==null||value==='')return '';
 const days=typeof value==='object'&&value.durationSeconds!==undefined?Number(value.durationSeconds)/86400:Number(value);
 if(!Number.isFinite(days))return '';
 return new Intl.NumberFormat('es-CO',{maximumFractionDigits:2}).format(days)+' '+({CALENDAR_DAYS:'días calendario',WORKING_DAYS:'días hábiles'}[unit]||'días');
}
export function quotationProductDetails(quotations,links,products){
 const byProduct=new Map(products.map(p=>[String(p.id),p]));
 const grouped=new Map();
 for(const link of links){const key=String(link.quotation_id);if(!grouped.has(key))grouped.set(key,[]);const p=byProduct.get(String(link.product_id));const number=v=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);
 grouped.get(key).push({productId:String(link.product_id),code:String(p?.code||''),name:String(p?.name||'Producto '+link.product_id),quantity:number(link.quantity),catalogPrice:number(p?.commercial_price),catalogTaxRate:number(p?.tax_percentage)});}
 return quotations.map(q=>({sourceId:q.id,sourceDocumentId:q._migrationId,priceBasis:'IMPORTED_CATALOG_REFERENCE',lines:grouped.get(String(q.id))||[]}));
}
