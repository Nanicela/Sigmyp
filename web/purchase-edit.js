import {doc,getDoc,runTransaction} from 'firebase/firestore';
import {auditedSet} from './audit.js';
export const purchaseEditFields={
 suppliers:{identification:40,name:200,phone1:40,phone2:40,email:254,website:500,address:300,city:120,certified:200,creditType:200,creditAmount:30},
 supplierContacts:{supplierId:100,name:200,position:200,phone1:40,phone2:40,mobile:40,email:254,comments:2000},
 items:{code:100,name:200,unit:120,category:200,location:300,description:4000},
 purchaseOrders:{paymentMethod:2000,deliveryAddress:300,comments:2000},
 kardex:{comments:2000}
};
export function normalizePurchaseEdit(group,input){
 const schema=purchaseEditFields[group];if(!schema)throw Error('Tipo de registro no permitido.');
 const values={};for(const [key,max] of Object.entries(schema)){const value=String(input[key]??'').trim();if(value.length>max)throw Error('El campo '+key+' es demasiado largo.');values[key]=value;}
 if(group==='supplierContacts'&&!values.supplierId)throw Error('Selecciona un proveedor.');
 if('name'in values&&!values.name)throw Error('Escribe el nombre.');
 for(const key of ['phone1','phone2','mobile'])if(group!=='suppliers'&&values[key]&&!/^[0-9]+$/.test(values[key]))throw Error('Los teléfonos deben contener solo números.');
 if(group==='suppliers'&&values.creditAmount!==''&&!/^[0-9]{1,15}(\.[0-9]{1,2})?$/.test(values.creditAmount))throw Error('El monto de crédito debe ser positivo o cero y tener hasta dos decimales.');
 if(values.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))throw Error('Revisa el correo electrónico.');
 return values;
}
export async function savePurchaseEdit(db,company,group,record,input){
 if(company!=='500123568'||!record?.id)throw Error('Abre el registro en la compañía DyD.');
 const values=normalizePurchaseEdit(group,input),root=['organizations',company];
 const ref=doc(db,...root,'purchaseEdits',group+'_'+record.id),source=record.native?doc(db,...root,'purchaseRecords',record.id):doc(db,...root,'purchaseImports',group,'records',record.id);
 await runTransaction(db,async tx=>{const [original,current]=await Promise.all([tx.get(source),tx.get(ref)]);if(!original.exists())throw Error('No se encontró el registro de origen.');const before=current.exists()?current.data():null;if((before?.version||0)!==(record.editVersion||0))throw Error('Otra persona actualizó este registro. Cierra y vuelve a cargar la compañía antes de guardar.');auditedSet(tx,db,ref,before,{group,recordId:record.id,values});});
 const saved=(await getDoc(ref)).data();return {...record,...saved.values,editVersion:saved.version};
}
export function normalizePurchaseCreate(group,input){
 const values=normalizePurchaseEdit(group,input);
 if(group==='suppliers')values.evaluation='1';
 const link=key=>String(input[key]||'');
 if(group==='items'){values.supplierId=link('supplierId');values.secondSupplierId=link('secondSupplierId');}
 if(group==='purchaseOrders'){values.supplierId=link('supplierId');values.date=link('date');values.reference=link('reference').slice(0,200);values.status='DRAFT';if(!values.supplierId)throw Error('Selecciona un proveedor.');}
 if(group==='kardex'){values.itemId=link('itemId');values.date=link('date');values.movement=link('movement');values.quantity=Number(input.quantity);values.status='PENDING';if(!values.itemId||!['ENTRY','EXIT'].includes(values.movement)||!Number.isFinite(values.quantity)||values.quantity<=0||values.quantity>1000000000)throw Error('Selecciona un ítem, el tipo y una cantidad positiva.');}
 if('date'in values&&(!/^2026-\d{2}-\d{2}$/.test(values.date)||!Number.isFinite(Date.parse(values.date))||new Date(values.date).toISOString().slice(0,10)!==values.date))throw Error('Selecciona una fecha válida de 2026.');
 return values;
}
export async function createPurchaseRecord(db,company,group,id,input){
 if(company!=='500123568'||!/^new_[a-f0-9-]{36}$/.test(id))throw Error('Registro o compañía no válidos.');
 const values=normalizePurchaseCreate(group,input),ref=doc(db,'organizations',company,'purchaseRecords',id);
 await runTransaction(db,async tx=>{const existing=await tx.get(ref);if(existing.exists()){if(existing.data().group!==group||Object.keys(values).some(key=>existing.data().values[key]!==values[key]))throw Error('Este registro ya se creó. Recarga la lista antes de crear otro.');return;}auditedSet(tx,db,ref,null,{group,values});});
 return {id,...values,...(group==='purchaseOrders'?{number:'BOR-'+id.slice(4,12).toUpperCase()}:{}),native:true,editVersion:0};
}
