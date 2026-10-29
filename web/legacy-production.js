import {collection,doc,getDoc,getDocs} from 'firebase/firestore';
import {productionOrderView} from './production-edit.js';
import {productionGroups} from './production-migration.js';
export async function loadLegacyProduction(db,company){
 if(company!=='500123568')return {unavailable:true};
 const root=['organizations',company,'productionImports'];
 const meta=await getDoc(doc(db,...root,'manifest'));if(!meta.exists())return {pending:true};
 const result={};for(const group of productionGroups){const docs=await getDocs(collection(db,...root,group,'records'));if(docs.size!==meta.data().counts[group])throw Error('La consulta de Producción está incompleta. Vuelve a cargar la compañía.');result[group]=docs.docs.map(d=>({...d.data(),id:d.id}));}
 result.writeEnabled=false;
 try{const [products,orders]=await Promise.all(['productionProducts','productionOrders'].map(g=>getDocs(collection(db,'organizations',company,g))));
 const pm=new Map(result.products.map(r=>[r.id,r]));for(const d of products.docs)pm.set(d.id,{...pm.get(d.id),id:d.id,...d.data().values,compositionRevision:d.data().compositionRevision,compositionCount:d.data().compositionCount,editVersion:d.data().version,native:d.id.startsWith('new_')});result.products=[...pm.values()];
 const om=new Map(result.productionOrders.map(r=>[r.id,r]));for(const d of orders.docs)om.set(d.id,{...productionOrderView(d.id,d.data(),[]),detailsPending:true});result.productionOrders=[...om.values()];result.writeEnabled=true;
 }catch(e){if(e.code!=='permission-denied')throw e;}
 return result;
}
