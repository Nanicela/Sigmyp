import {doc,getDoc,runTransaction,serverTimestamp} from 'firebase/firestore';
import {auditedSet} from './audit.js';
export const commercialRecordFields={
 contacts:{name:200,jobTitle:200,phone1:40,phone2:40,mobile:40,email:254,comments:4000},
 offices:{name:200,type:120,address:300,municipality:120,department:120,phone1:40,phone2:40,email:254,technicianName:200,technicianPhone:40,technicianEmail:254,comments:4000}
};
export const isPhone=key=>['phone1','phone2','mobile','technicianPhone'].includes(key);
export const isEmail=key=>['email','technicianEmail'].includes(key);
export function recordForm(kind,record){return Object.fromEntries(Object.keys(commercialRecordFields[kind]).map(key=>[key,String(record[key]??'')]));}
export function normalizeRecord(kind,input){
 const fields=commercialRecordFields[kind];if(!fields)throw Error('Tipo de registro inválido.');
 const result={};for(const [key,max] of Object.entries(fields)){
 const value=String(input[key]??'').trim();if(value.length>max)throw Error('El campo '+key+' excede la longitud permitida.');
 if(isPhone(key)&&value&&!/^[0-9]+$/.test(value))throw Error('Los teléfonos deben contener solo números.');
 if(isEmail(key)&&value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw Error('Revisa los correos electrónicos.');
 result[key]=value;
 }if(!result.name)throw Error('Escribe el nombre.');return result;
}
export async function saveCommercialRecord(db,company,kind,record,input){
 if(company!=='500123568'||!commercialRecordFields[kind]||!record?.sourceDocumentId)throw Error('El registro no corresponde a la compañía activa.');
 const native=record.sourceId===null && /^new_[a-f0-9-]{36}$/.test(record.sourceDocumentId);
 const links=native?{customerId:String(input.customerId||record.customerId||''),accountDocumentId:String(input.accountDocumentId||record.accountDocumentId||''),...(kind==='offices'?{contactId:String(input.contactId||record.contactId||''),contactDocumentId:String(input.contactDocumentId||record.contactDocumentId||'')}:{})}:{};
 if(native&&(!links.customerId||!links.accountDocumentId||(kind==='offices'&&(!links.contactId||!links.contactDocumentId))))throw Error('Selecciona la cuenta y el contacto correspondiente.');
 const values=normalizeRecord(kind,input),target=kind==='contacts'?'commercialContacts':'commercialOffices';
 const ref=doc(db,'organizations',company,target,record.sourceDocumentId);
 const source=doc(db,'organizations',company,'legacyData',kind,'records',record.sourceDocumentId);
 await runTransaction(db,async tx=>{
 const [original,snapshot]=await Promise.all([native?Promise.resolve(null):tx.get(source),tx.get(ref)]);
 if(!native&&(!original.exists()||original.data().data.id!==record.sourceId))throw Error('No se encontró el registro de origen.');
 const before=snapshot.exists()?snapshot.data():null;
 if((before?.version||0)!==(record.version||0))throw Error('Otra persona actualizó este registro. Cierra el modal y recarga antes de guardar.');
 auditedSet(tx,db,ref,before,{...values,...links,sourceId:record.sourceId,sourceDocumentId:record.sourceDocumentId,createdAt:before?.createdAt||serverTimestamp()});
 });
 const saved=(await getDoc(ref)).data();return {...record,...saved,phone:saved.mobile||saved.phone1||saved.phone2||''};
}
