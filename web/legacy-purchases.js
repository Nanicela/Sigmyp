import {loadPurchaseOrders} from './purchase-orders.js';
import {collection,doc,getDoc,getDocs} from 'firebase/firestore';
import {purchaseGroups} from './purchase-migration.js';
export async function loadLegacyPurchases(db,company){
 if(company!=='500123568')return {unavailable:true};
 const root=['organizations',company,'purchaseImports'];
 const meta=await getDoc(doc(db,...root,'manifest'));
 if(!meta.exists())throw Error('La importación de Compras aún no está disponible.');
 const data=await Promise.all(purchaseGroups.map(async group=>{const docs=await getDocs(collection(db,...root,group,'records'));if(docs.size!==meta.data().counts[group])throw Error('La consulta de Compras está incompleta. Recarga para reintentar.');return [group,docs.docs.map(d=>({...d.data(),id:d.id}))];}));
 const result={...Object.fromEntries(data),year:meta.data().year,loading:false};
 try{const native=await getDocs(collection(db,'organizations',company,'purchaseRecords'));for(const doc of native.docs){const r=doc.data();if(purchaseGroups.includes(r.group))result[r.group].push({id:doc.id,...r.values,native:true,...(r.group==='purchaseOrders'?{number:'BOR-'+doc.id.slice(4,12).toUpperCase()}:{}),editVersion:0});}result.createsEnabled=true;}catch(e){if(e.code!=='permission-denied')throw e;result.createsEnabled=false;}
 try{const edits=await getDocs(collection(db,'organizations',company,'purchaseEdits'));const lookup=new Map(edits.docs.map(d=>[d.id,d.data()]));for(const group of purchaseGroups)result[group]=result[group].map(row=>{const edit=lookup.get(group+'_'+row.id);return edit?{...row,...edit.values,editVersion:edit.version}:row;});result.editsEnabled=true;}catch(e){if(e.code!=='permission-denied')throw e;result.editsEnabled=false;}
 try{result.purchaseOrders=await loadPurchaseOrders(db,company,result.purchaseOrders);result.orderDetailsEnabled=true;}catch(e){if(e.code!=='permission-denied')throw e;result.orderDetailsEnabled=false;}
 const names=new Map(result.suppliers.map(p=>[p.id,p.name]));for(const group of ['supplierContacts','items','purchaseOrders'])result[group]=result[group].map(r=>({...r,...(r.supplierId&&!r.orderData?{supplierName:names.get(r.supplierId)||r.supplierName}:{}),...(r.secondSupplierId?{secondSupplierName:names.get(r.secondSupplierId)||r.secondSupplierName}:{})}));
 const itemNames=new Map(result.items.map(i=>[i.id,i.name]));result.kardex=result.kardex.map(r=>({...r,itemName:itemNames.get(r.itemId)||r.itemName||''}));
 return result;
}
