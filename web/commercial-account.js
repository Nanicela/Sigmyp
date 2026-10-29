import {doc,getDoc,runTransaction,serverTimestamp} from 'firebase/firestore';
import {auditedSet} from './audit.js';
export const accountTextFields={identification:40,name:200,phone1:40,phone2:40,email:254,billingEmail:254,website:500,address:300,municipality:120,department:120};
export function accountFieldInput(key,value) {
 return ['phone1','phone2'].includes(key)?String(value).replace(/[^0-9]/g,''):String(value);
}
export function accountForm(account) {
 const result=Object.fromEntries(Object.keys(accountTextFields).map(key=>[key,String(account[key]??'')]));
 return {...result,status:account.status==='Nuevo'?'NEW':account.status||'NEW',personType:account.personType||'',vatResponsible:typeof account.vatResponsible==='boolean'?String(account.vatResponsible):'unknown'};
}
export function normalizeAccount(input) {
 const result={};
 for(const [key,max] of Object.entries(accountTextFields)){
  const value=String(input[key]??'').trim();
  if(value.length>max)throw Error('El campo '+key+' excede la longitud permitida.');
  result[key]=value;
 }
 for(const key of ['phone1','phone2'])if(result[key]&&!/^[0-9]+$/.test(result[key]))throw Error('Los teléfonos deben contener solo números, sin espacios ni símbolos.');
 if(!result.name)throw Error('Escribe el nombre de la cuenta.');
 for(const key of ['email','billingEmail'])if(result[key]&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result[key]))throw Error('Revisa los correos electrónicos.');
 if(!['NEW','QUOTED','ACTIVE','INACTIVE'].includes(input.status))throw Error('Selecciona un estado válido.');
 if(!['NATURAL','JURIDICA'].includes(input.personType))throw Error('Selecciona el tipo de persona.');
 if(!['true','false','unknown'].includes(String(input.vatResponsible)))throw Error('Selecciona la condición de IVA.');
 return {...result,status:input.status,personType:input.personType,vatResponsible:input.vatResponsible==='unknown'?null:String(input.vatResponsible)==='true'};
}
export async function saveCommercialAccount(db,company,account,input){
 if(company!=='500123568'||!account?.sourceDocumentId)throw Error('La cuenta no corresponde a la compañía activa.');
 const values=normalizeAccount(input);
 const ref=doc(db,'organizations',company,'commercialAccounts',account.sourceDocumentId);
 const native=account.sourceId==null && /^new_[a-f0-9-]{36}$/.test(account.sourceDocumentId);
 const source=doc(db,'organizations',company,'legacyData','accounts','records',account.sourceDocumentId);
 await runTransaction(db,async tx=>{
  const [original,snapshot]=await Promise.all([native?Promise.resolve(null):tx.get(source),tx.get(ref)]);
  if(!native && (!original.exists()||original.data().data.id!==account.sourceId))throw Error('No se encontró la cuenta de origen.');
  const before=snapshot.exists()?snapshot.data():null;
  if((before?.version||0)!==(account.version||0))throw Error('Otra persona actualizó esta cuenta. Cierra el modal y recarga antes de guardar.');
  auditedSet(tx,db,ref,before,{...values,sourceId:account.sourceId,sourceDocumentId:account.sourceDocumentId,createdAt:before?.createdAt||serverTimestamp()});
 });
 const saved=(await getDoc(ref)).data();
 return {...account,...saved,phone:saved.phone1||saved.phone2||''};
}
