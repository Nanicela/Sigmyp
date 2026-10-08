// Migración explícita del proyecto existente. Nunca imprime credenciales ni contenido de documentos.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const auth=require('../node_modules/firebase-tools/lib/auth.js');
const account=auth.getGlobalDefaultAccount();
if(account?.user.email!=='danielao@grupodyd.com') throw Error('La cuenta CLI no coincide con la administradora autorizada.');
const token=(await auth.getAccessToken(account.tokens.refresh_token, ["https://www.googleapis.com/auth/cloud-platform"])).access_token;
const project='facturacion-electronica-a73e3';
const root=`projects/${project}/databases/(default)/documents`;
const api='https://firestore.googleapis.com/v1/';
async function request(url,body,method=body?'POST':'GET') {
 const r=await fetch(url,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json();if(!r.ok)throw Error(`${r.status}: ${data.error?.message || 'Solicitud fallida'}`);return data;
}

// Solo crea un conjunto DEMO aislado. No reemplaza documentos existentes.
import domain from '../functions/domain.cjs';
const company='999000001',name='DEMO · Comercial de Pruebas',base=root+'/organizations/'+company;
const at=new Date(),writes=[];
function encode(v){
 if(v===null)return {nullValue:null};
 if(v instanceof Date)return {timestampValue:v.toISOString()};
 if(Array.isArray(v))return {arrayValue:{values:v.map(encode)}};
 if(typeof v==='object')return {mapValue:{fields:fields(v)}};
 if(typeof v==='number')return {integerValue:String(v)};
 if(typeof v==='boolean')return {booleanValue:v};
 return {stringValue:v};
}
function fields(obj){return Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,encode(v)]));}
function add(path,data){writes.push({update:{name:path,fields:fields(data)},currentDocument:{exists:false}});}
function audited(target,id,data){
 const auditId='demo-inicial-'+target+'-'+id;
 const after={...data,version:1,auditId,updatedBy:'system-demo-seed',updatedAt:at};
 add(target==='company'?base:base+'/'+target+'/'+id,after);
 add(base+'/audit/'+auditId,{target,targetId:id,actorUid:'system-demo-seed',actorEmail:'Carga DEMO autorizada por danielao@grupodyd.com',at,before:null,after});
}
const check=await fetch(api+base,{headers:{Authorization:`Bearer ${token}`}});
if(check.ok){const old=await check.json();if(old.fields?.name?.stringValue!==name)throw Error('El identificador ya pertenece a otra compañía. No se modificó.');console.log('El conjunto DEMO ya existe; no se reemplazó.');process.exit(0);}
if(check.status!==404)throw Error('No se pudo verificar que el destino estuviera disponible.');
const customer=(name,id)=>({name,documentType:'CC',identification:id,dv:'',email:'cliente-'+id+'@example.test',phone:'',address:'Dirección ficticia de demostración',department:'Bogotá D.C.',municipality:'Bogotá D.C.',taxResponsibilities:'DATOS FICTICIOS · No usar para emisión',vatStatus:'por_confirmar',createdAt:at});
const c1=customer('DEMO · Cliente Comercial','99000001'),c2=customer('DEMO · Cliente Servicios','99000002');
audited('company',company,{name,nit:company,members:{'danielao@grupodyd.com':'admin'},createdAt:at});
audited('profiles','tax',{...customer(name,company),documentType:'NIT',dv:'0',email:'empresa-demo@example.test'});
for(const c of [c1,c2])audited('customers','CC_'+c.identification,c);
function draft(id,kind,c,price,quantity='1',reference_id='',reason='',referenceLocked=false){
 const d=domain.normalizeDraft({kind,buyer_name:c.name,buyer_id:c.identification,reference_id,reason,lines:[{description:'DEMO · '+(kind==='INVOICE'?'Servicio de prueba':'Ajuste de prueba'),quantity,unit_price:price,iva_rate:'19'}]});
 const cents=v=>Number(BigInt(v.replace('.','')));
 const packed={kind:d.kind,buyer:d.buyer,reference_id:d.reference_id,reason:d.reason,currency:'COP',lines:d.lines.map(l=>({description:l.description,quantityUnits:Number(BigInt(l.quantity.replace('.',''))),priceCents:cents(l.unit_price),rate:Number(l.iva_rate),subtotalCents:cents(l.subtotal),taxCents:cents(l.tax)})),subtotalCents:cents(d.subtotal),taxCents:cents(d.tax),totalCents:cents(d.total),status:'DRAFT',fiscal_validity:false};
 const requestHash=createHash('sha256').update(JSON.stringify(packed)).digest('hex');
 audited('drafts',id,{...packed,requestHash,createdAt:at,referenceLocked,lastOperation:id});
}
import {createHash} from 'node:crypto';
draft('demo-factura-editable','INVOICE',c2,'50000.00');
draft('demo-factura-con-notas','INVOICE',c1,'100000.00','2','','',true);
draft('demo-nota-credito','CREDIT_NOTE',c1,'20000.00','1','demo-factura-con-notas','DEMO · Devolución parcial de servicio');
draft('demo-nota-debito','DEBIT_NOTE',c1,'10000.00','1','demo-factura-con-notas','DEMO · Cargo adicional de servicio');
if(process.argv[2]!=='apply'){console.log(JSON.stringify({project,company,name,documents:8,auditEvents:8,mode:'preview'}));process.exit(0);}
await request(api+root+':commit',{writes});
for(const write of writes){const saved=await request(api+write.update.name);if(JSON.stringify(saved.fields)!==JSON.stringify(write.update.fields)) {
 // Firestore may reorder maps; compare recursively after sorting keys.
 const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
 if(JSON.stringify(canonical(saved.fields))!==JSON.stringify(canonical(write.update.fields)))throw Error('La verificación del documento no coincide.');
}}
console.log(JSON.stringify({created:true,verified:true,company,name,companies:1,customers:2,invoices:2,creditNotes:1,debitNotes:1,companyProfiles:1,auditEvents:8,role:'danielao@grupodyd.com: admin'}));

