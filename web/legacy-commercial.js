import {loadQuotationRevisions} from './quotation-revisions.js';
import {quotationText,quotationDuration} from './quotation-presentation.js';
import {quotationToday,quotationDisplay} from './commercial-quotation.js';
import {collection,getDocs,query,where} from 'firebase/firestore';
export function commercialView(tables) {
 const rows=name=>tables[name]||[];
 const key=id=>id==null?'':String(id);
 const accounts=new Set(rows('accounts').map(a=>key(a.id)));
 const contacts=new Map(rows('contacts').map(c=>[key(c.id),c]));
 const cities=new Map(rows('cities').map(c=>[key(c.id),c]));
 const states=new Map(rows('states').map(s=>[key(s.id),s]));
 const account=id=>accounts.has(key(id))?'legacy-account-'+id:'';
 return {
  customers:rows('accounts').map(a=>({id:account(a.id),name:a.name,identification:a.nit||'',documentType:'',email:a.email,phone:a.phone1||a.phone2||'',phone1:a.phone1||'',phone2:a.phone2||'',website:a.webpage||'',address:a.address||'',municipality:a.city||'',department:a.state||'',status:a.status||'',billingEmail:a.email_factura_electronica||'',vatResponsible:a.responsable_de_iva,personType:a.tipo_de_persona||'',sourceId:a.id,sourceDocumentId:a._migrationId})),
  contacts:rows('contacts').map(c=>({id:'legacy-contact-'+c.id,customerId:account(c.account_id),name:c.name,jobTitle:c.position,email:c.email,phone:c.cellphone||c.phone1||c.phone2||'',phone1:c.phone1||'',phone2:c.phone2||'',mobile:c.cellphone||'',comments:c.comments||'',sourceId:c.id,sourceDocumentId:c._migrationId})),
  sites:rows('offices').map(s=>{const city=cities.get(key(s.city));return {id:'legacy-office-'+s.id,customerId:account(contacts.get(key(s.contact_id))?.account_id),name:s.name,type:s.type||'',address:s.address,phone:s.phone1||s.phone2||'',phone1:s.phone1||'',phone2:s.phone2||'',contactName:contacts.get(key(s.contact_id))?.name||'',email:s.email||'',technicianName:s.tech_name||'',technicianPhone:s.tech_phone||'',technicianEmail:s.tech_email||'',comments:s.comments||'',municipality:city?.name||'',department:states.get(key(city?.state_id))?.name||'',sourceId:s.id,sourceDocumentId:s._migrationId,contactId:'legacy-contact-'+s.contact_id};}),
  quotations:rows('quotations').map(q=>({id:'legacy-quotation-'+q.id,number:q.number_code||q.number||q.id,customerId:account(contacts.get(key(q.contact_id))?.account_id),date:q.date_created,total:q.total,status:q.status,sourceId:q.id,sourceDocumentId:q._migrationId,contactId:'legacy-contact-'+q.contact_id,approverContactId:q.approver_contact_id?'legacy-contact-'+q.approver_contact_id:'',deliveryDays:q.delivery_time?.durationSeconds!=null?q.delivery_time.durationSeconds/86400:Number(q.delivery_time)||0,deliveryUnit:q.delivery_time_unit||'CALENDAR_DAYS',validityDays:q.applicability?.durationSeconds!=null?q.applicability.durationSeconds/86400:Number(q.applicability)||30,validityUnit:q.applicability_unit||'CALENDAR_DAYS',contactName:contacts.get(key(q.contact_id))?.name||'',subtotal:q.subtotal,tax:q.tax,accountName:rows('accounts').find(a=>key(a.id)===key(contacts.get(key(q.contact_id))?.account_id))?.name||'',approverName:contacts.get(key(q.approver_contact_id))?.name||'',paymentMethod:quotationText(q.payment_method),warranty:quotationText(q.warranty),deliveryTime:quotationDuration(q.delivery_time,q.delivery_time_unit),comments:quotationText(q.comments),purchaseOrder:q.purchase_order||'',letter:quotationText(q.letter),applicability:quotationDuration(q.applicability,q.applicability_unit)}))
 };
}
export async function loadLegacyCommercial(db,company) {
 const tables=['accounts','contacts','offices','cities','states','quotations'];
 const data=await Promise.all(tables.map(async table=>{
  const snapshot=await getDocs(collection(db,'organizations',company,'legacyData',table,'records'));
  return [table,snapshot.docs.map(doc=>({...doc.data().data,_migrationId:doc.id}))];
 }));
 const tablesData=Object.fromEntries(data);
 const view=commercialView(tablesData);
 view.locations=(tablesData.cities||[]).map(city=>({city:city.name,department:(tablesData.states||[]).find(s=>s.id===city.state_id)?.name||''}));
 try {
   const edits=await getDocs(collection(db,'organizations',company,'commercialAccounts'));
   const bySource=new Map(edits.docs.map(d=>[d.id,d.data()]));
   view.customers=view.customers.map(a=>{const edit=bySource.get(a.sourceDocumentId);return edit?{...a,...edit,phone:edit.phone1||edit.phone2||''}:a;});
   for(const [id,edit] of bySource)if(edit.sourceId===null && /^new_[a-f0-9-]{36}$/.test(id))
     view.customers.push({...edit,id,phone:edit.phone1||edit.phone2||''});
   view.editsEnabled=true;
 } catch(error) {if(error.code!=='permission-denied')throw error;view.editsEnabled=false;}
 for(const [target,list,flag] of [['commercialContacts','contacts','contactEditsEnabled'],['commercialOffices','sites','officeEditsEnabled']]){
  try{const edits=await getDocs(collection(db,'organizations',company,target));const bySource=new Map(edits.docs.map(d=>[d.id,d.data()]));
   view[list]=view[list].map(item=>{const edit=bySource.get(item.sourceDocumentId);return edit?{...item,...edit,phone:edit.mobile||edit.phone1||edit.phone2||''}:item;});for(const [id,edit] of bySource)if(edit.sourceId===null && /^new_[a-f0-9-]{36}$/.test(id))view[list].push({...edit,id,phone:edit.mobile||edit.phone1||edit.phone2||''});view[flag]=true;
  }catch(error){if(error.code!=='permission-denied')throw error;view[flag]=false;}
 }
 const names=new Map(view.contacts.map(c=>[c.id,c.name]));view.sites=view.sites.map(s=>({...s,contactName:names.get(s.contactId)||s.contactName}));
 try{const quotations=await getDocs(query(collection(db,'organizations',company,'commercialQuotations'),where('businessYear','==',Number(quotationToday().slice(0,4)))));view.quotations.push(...quotations.docs.map(d=>({...d.data(),id:d.id,total:d.data().totalCents/100})));view.quotationCreatesEnabled=true;}catch(error){if(error.code!=='permission-denied')throw error;view.quotationCreatesEnabled=false;}
 try{const edits=await getDocs(collection(db,'organizations',company,'commercialQuotationEdits'));const map=new Map(edits.docs.map(d=>[d.id,d.data()]));view.quotations=view.quotations.map(q=>({...q,...(map.get(q.sourceDocumentId)||{})}));}catch(error){if(error.code!=='permission-denied')throw error;}
 try{const details=await getDocs(collection(db,'organizations',company,'commercialQuotationDetails'));const map=new Map(details.docs.map(d=>[d.id,d.data()]));view.quotations=view.quotations.map(q=>q.sourceDocumentId?{...q,productDetails:map.get(q.sourceDocumentId)?.lines||[],detailsAvailable:map.has(q.sourceDocumentId)}:q);}catch(error){if(error.code!=='permission-denied')throw error;}
 view.quotationProducts=Array.from(new Map(view.quotations.flatMap(q=>q.productDetails||[]).map(l=>[l.productId,{id:l.productId,name:l.name,code:l.code,price:l.catalogPrice,rate:l.catalogTaxRate}])).values()).sort((a,b)=>a.name.localeCompare(b.name,'es'));
 try{const catalog=await getDocs(collection(db,'organizations',company,'products'));view.quotationProducts.push(...catalog.docs.filter(d=>d.data().active).map(d=>{const p=d.data();return {id:'catalog-'+d.id,name:p.name,code:p.code,price:p.priceCents/100,rate:p.rate};}));}catch(error){if(error.code!=='permission-denied')throw error;}
 view.quotations=view.quotations.map(quotationDisplay);
 try{view.quotations=await loadQuotationRevisions(db,company,view.quotations,{details:false});view.quotationRevisionEnabled=true;}catch(error){if(error.code!=='permission-denied')throw error;view.quotationRevisionEnabled=false;}
 return view;
}
