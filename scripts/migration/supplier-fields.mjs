// Prepare/apply a read-only commercial projection; original records are never changed.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {purchaseProjection,purchaseGroups} from '../../web/purchase-migration.js';
const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth');
const output=resolve('.local/supplier-fields');await mkdir(output,{recursive:true});
const config=JSON.parse(await readFile(resolve('../../work/firebase-config/configstore/firebase-tools.json'),'utf8'));
const token=await auth.getAccessToken(config.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
const root='projects/facturacion-electronica-a73e3/databases/(default)/documents',company=root+'/organizations/500123568';
const decode=v=>'mapValue'in v?Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,v])=>[k,decode(v)])):'arrayValue'in v?(v.arrayValue.values||[]).map(decode):'integerValue'in v?Number(v.integerValue):'doubleValue'in v?v.doubleValue:'nullValue'in v?null:'booleanValue'in v?v.booleanValue:v.stringValue??v.timestampValue;
const encode=v=>v===null?{nullValue:null}:typeof v==='number'?(Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v}):typeof v==='string'?{stringValue:v}:Array.isArray(v)?{arrayValue:{values:v.map(encode)}}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,encode(v)]))}};
async function request(path,options={}){const r=await fetch('https://firestore.googleapis.com/v1/'+path,{...options,headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'}});if(!r.ok)throw Error('Firestore HTTP '+r.status);return r.json();}
async function list(path){let page='',rows=[];do{const r=await request(path+'?pageSize=1000'+(page?'&pageToken='+encodeURIComponent(page):''));rows.push(...(r.documents||[]).map(d=>({id:d.name.split('/').at(-1),data:decode({mapValue:{fields:d.fields}})})));page=r.nextPageToken;}while(page);return rows;}

const originals=await list(company+'/legacyData/providers/records');
const current=await list(company+'/purchaseImports/suppliers/records');
const expected=new Map(originals.map(r=>['provider-'+r.data.data.id,{certified:String(r.data.data.certified??''),creditType:String(r.data.data.credit_type??''),creditAmount:String(r.data.data.credit_amount??''),evaluation:String(r.data.data.evaluation??'')}]));
if(current.length!==expected.size)throw Error('Conteos no coinciden');
const additions=[];for(const record of current){const values=expected.get(record.id);if(!values)throw Error('Proveedor sin original');for(const [key,value] of Object.entries(values))if(key in record.data && record.data[key]!==value)throw Error('Campo existente diferente: no se sobrescribirá');if(Object.keys(values).some(key=>!(key in record.data)))additions.push({id:record.id,values});}
await writeFile(output+'/enrichment-plan.json',JSON.stringify(additions,null,2));
if(process.argv.includes('--apply')){
 for(const entry of additions){const path=company+'/purchaseImports/suppliers/records/'+entry.id;const before=await request(path);await request(root+':commit',{method:'POST',body:JSON.stringify({writes:[{update:{name:path,fields:encode(entry.values).mapValue.fields},updateMask:{fieldPaths:Object.keys(entry.values)},currentDocument:{updateTime:before.updateTime}}]})});}
 const reread=await list(company+'/purchaseImports/suppliers/records');for(const r of reread){const old=current.find(p=>p.id===r.id).data;for(const [key,value] of Object.entries({...old,...expected.get(r.id)}))if(JSON.stringify(r.data[key])!==JSON.stringify(value))throw Error('Verificación no coincide');}
 if(reread.length!==current.length)throw Error('Cambió el conteo');
}
console.log(JSON.stringify({mode:process.argv.includes('--apply')?'applied-and-verified':'prepared',providers:current.length,additions:additions.length}));
