// Prepare/apply a read-only commercial projection; original records are never changed.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {productionProjection,productionGroups} from '../../web/production-migration.js';
const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth');
const output=resolve('.local/production');await mkdir(output,{recursive:true});
const root='projects/facturacion-electronica-a73e3/databases/(default)/documents',company=root+'/organizations/500123568';
const decode=v=>'mapValue'in v?Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,v])=>[k,decode(v)])):'arrayValue'in v?(v.arrayValue.values||[]).map(decode):'integerValue'in v?Number(v.integerValue):'doubleValue'in v?v.doubleValue:'nullValue'in v?null:'booleanValue'in v?v.booleanValue:v.stringValue??v.timestampValue;
const encode=v=>v===null?{nullValue:null}:typeof v==='number'?(Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v}):typeof v==='string'?{stringValue:v}:Array.isArray(v)?{arrayValue:{values:v.map(encode)}}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,encode(v)]))}};
let token;
async function request(path,options={}){const r=await fetch('https://firestore.googleapis.com/v1/'+path,{...options,headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'}});if(!r.ok)throw Error('Firestore HTTP '+r.status);return r.json();}
async function list(path){let page='',rows=[];do{const r=await request(path+'?pageSize=1000'+(page?'&pageToken='+encodeURIComponent(page):''));rows.push(...(r.documents||[]).map(d=>({id:d.name.split('/').at(-1),data:decode({mapValue:{fields:d.fields}})})));page=r.nextPageToken;}while(page);return rows;}

const source=JSON.parse(await readFile(resolve('../../work/migration-2026/full-source.json'),'utf8'));
if(source.year!==2026||source.source!=='sigmyp2')throw Error('Origen incorrecto');
const tables=Object.fromEntries(Object.entries(source.tables).map(([k,v])=>[k,v.rows]));
const projection=productionProjection(tables);
const manifest={year:2026,companyId:'500123568',counts:Object.fromEntries(productionGroups.map(g=>[g,projection[g].length]))};
const documents=productionGroups.flatMap(g=>projection[g].map(r=>({path:company+'/productionImports/'+g+'/records/'+r.id,value:r})));
documents.push({path:company+'/productionImports/manifest',value:manifest});
await writeFile(output+'/plan.json',JSON.stringify({manifest,documents},null,2));console.log(JSON.stringify(manifest));
if(process.argv.includes('--apply')){
const config=JSON.parse(await readFile(resolve('../../work/firebase-config/configstore/firebase-tools.json'),'utf8'));
token=await auth.getAccessToken(config.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);

 const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
 const existing=new Map();for(const g of productionGroups)for(const r of await list(company+'/productionImports/'+g+'/records'))existing.set(company+'/productionImports/'+g+'/records/'+r.id,r.data);
 for(const r of await list(company+'/productionImports'))if(r.id==='manifest')existing.set(company+'/productionImports/manifest',r.data);
 const missing=documents.filter(d=>{if(!existing.has(d.path))return true;if(canonical(existing.get(d.path))!==canonical(d.value))throw Error('Conflicto, no sobrescribir: '+d.path);return false;});
 if(missing.length>500)throw Error('Requiere publicación por etapas');
 if(missing.length)await request(root+':commit',{method:'POST',body:JSON.stringify({writes:missing.map(d=>({update:{name:d.path,fields:encode(d.value).mapValue.fields},currentDocument:{exists:false}}))})});
 for(const g of productionGroups){const actual=await list(company+'/productionImports/'+g+'/records');if(actual.length!==projection[g].length||actual.some(r=>canonical(r.data)!==canonical(projection[g].find(p=>p.id===r.id))))throw Error('Verificación fallida: '+g);}
 await writeFile(output+'/verified.json',JSON.stringify({verified:true,...manifest}));console.log('Importación verificada.');
}
