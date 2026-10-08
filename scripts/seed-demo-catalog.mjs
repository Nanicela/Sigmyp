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

// Carga autorizada de ejemplos en DEMO. Nunca actualiza registros existentes.
import domain from '../functions/domain.cjs';
import {normalizeProduct} from '../web/products.js';
import {createHash} from 'node:crypto';
const company='999000001',base=root+'/organizations/'+company;
const existingCompany=await request(api+base);
if(existingCompany.fields?.name?.stringValue!=='DEMO · Comercial de Pruebas')throw Error('La compañía destino no coincide con DEMO.');
const customers=await Promise.all(['99000001','99000002'].map(async id=>{
 const d=await request(api+base+'/customers/CC_'+id);
 if(d.fields.identification.stringValue!==id||!d.fields.name.stringValue.startsWith('DEMO'))throw Error('Cliente no identificado como DEMO.');
 return {name:d.fields.name.stringValue,id};
}));
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
function fields(o){return Object.fromEntries(Object.entries(o).map(([k,v])=>[k,encode(v)]));}
function add(path,data){writes.push({update:{name:path,fields:fields(data)},currentDocument:{exists:false}});}
function audited(target,id,data){
 const auditId='demo-catalogo-20261005-'+target+'-'+id;
 const after={...data,version:1,auditId,updatedBy:'system-demo-seed',updatedAt:at};
 add(base+'/'+target+'/'+id,after);
 add(base+'/audit/'+auditId,{target,targetId:id,actorUid:'system-demo-seed',actorEmail:'Carga DEMO autorizada por danielao@grupodyd.com',at,before:null,after});
}
const examples=[
 ['DEMO-PROD-001','PRODUCT','DEMO · Teclado USB','85000'],
 ['DEMO-PROD-002','PRODUCT','DEMO · Mouse inalámbrico','55000'],
 ['DEMO-PROD-003','PRODUCT','DEMO · Base para portátil','120000'],
 ['DEMO-SERV-001','SERVICE','DEMO · Asesoría administrativa','150000'],
 ['DEMO-SERV-002','SERVICE','DEMO · Soporte técnico','90000'],
 ['DEMO-SERV-003','SERVICE','DEMO · Capacitación de usuarios','250000']
];
const products=examples.map(([code,type,name,price])=>normalizeProduct({code,type,name,price,rate:'19',active:true,description:'Ejemplo ficticio para probar el sistema. Precio e IVA ilustrativos; no usar para emisión real.'}));
for(const p of products)audited('products',p.code,{...p,createdAt:at});
const summaries=[];
for(const [id,c,items] of [
 ['demo-catalogo-20261005-productos',customers[0],[[0,'2'],[1,'2'],[2,'1']]],
 ['demo-catalogo-20261005-servicios',customers[1],[[3,'1'],[4,'2'],[5,'1']]],
 ['demo-catalogo-20261005-mixta',customers[0],[[0,'1'],[4,'1']]]
]){
 const d=domain.normalizeDraft({kind:'INVOICE',buyer_name:c.name,buyer_id:c.id,reference_id:'',reason:'',lines:items.map(([i,quantity])=>({description:products[i].name,quantity,unit_price:(products[i].priceCents/100).toFixed(2),iva_rate:String(products[i].rate)}))});
 const cents=v=>Number(BigInt(v.replace('.','')));
 const packed={kind:d.kind,buyer:d.buyer,reference_id:d.reference_id,reason:d.reason,currency:'COP',lines:d.lines.map(l=>({description:l.description,quantityUnits:Number(BigInt(l.quantity.replace('.',''))),priceCents:cents(l.unit_price),rate:Number(l.iva_rate),subtotalCents:cents(l.subtotal),taxCents:cents(l.tax)})),subtotalCents:cents(d.subtotal),taxCents:cents(d.tax),totalCents:cents(d.total),status:'DRAFT',fiscal_validity:false};
 const requestHash=createHash('sha256').update(JSON.stringify(packed)).digest('hex');
 audited('drafts',id,{...packed,requestHash,createdAt:at,referenceLocked:false,lastOperation:id});
 summaries.push({id,totalCOP:d.total});
}
const present=await Promise.all(writes.map(async w=>{
 const r=await fetch(api+w.update.name,{headers:{Authorization:`Bearer ${token}`}});
 if(r.status===404)return false;
 if(!r.ok)throw Error('No se pudo comprobar el destino: '+r.status);
 return true;
}));
if(present.some(Boolean)){
 if(!present.every(Boolean))throw Error('Conjunto parcial existente: no se sobrescribió ningún registro.');
 console.log(JSON.stringify({created:false,alreadyExists:true,company,documents:9}));process.exit(0);
}
if(process.argv[2]!=='apply'){console.log(JSON.stringify({mode:'preview',company,products:3,services:3,invoices:summaries,auditEvents:9}));process.exit(0);}
await request(api+root+':commit',{writes});
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
for(const w of writes){
 const saved=await request(api+w.update.name);
 if(JSON.stringify(canonical(saved.fields))!==JSON.stringify(canonical(w.update.fields)))throw Error('Verificación fallida: '+w.update.name);
}
console.log(JSON.stringify({created:true,verified:true,company,products:3,services:3,invoices:summaries,auditEvents:9}));
