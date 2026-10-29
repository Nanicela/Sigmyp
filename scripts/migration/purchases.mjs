// Prepare/apply a read-only commercial projection; original records are never changed.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {purchaseProjection,purchaseGroups} from '../../web/purchase-migration.js';
const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth');
const output=resolve('.local/purchases-migration');await mkdir(output,{recursive:true});
const config=JSON.parse(await readFile(resolve('../../work/firebase-config/configstore/firebase-tools.json'),'utf8'));
const token=await auth.getAccessToken(config.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
const root='projects/facturacion-electronica-a73e3/databases/(default)/documents',company=root+'/organizations/500123568';
const decode=v=>'mapValue'in v?Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,v])=>[k,decode(v)])):'arrayValue'in v?(v.arrayValue.values||[]).map(decode):'integerValue'in v?Number(v.integerValue):'doubleValue'in v?v.doubleValue:'nullValue'in v?null:'booleanValue'in v?v.booleanValue:v.stringValue??v.timestampValue;
const encode=v=>v===null?{nullValue:null}:typeof v==='number'?(Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v}):typeof v==='string'?{stringValue:v}:Array.isArray(v)?{arrayValue:{values:v.map(encode)}}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,encode(v)]))}};
async function request(path,options={}){const r=await fetch('https://firestore.googleapis.com/v1/'+path,{...options,headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'}});if(!r.ok)throw Error('Firestore HTTP '+r.status);return r.json();}
async function list(path){let page='',rows=[];do{const r=await request(path+'?pageSize=1000'+(page?'&pageToken='+encodeURIComponent(page):''));rows.push(...(r.documents||[]).map(d=>({id:d.name.split('/').at(-1),data:decode({mapValue:{fields:d.fields}})})));page=r.nextPageToken;}while(page);return rows;}

const names=['providers','provider_contacts','items','purchase_orders','kardex'];
const sources=await Promise.all(names.map(t=>list(company+'/legacyData/'+t+'/records')));
const tables=Object.fromEntries(names.map((name,i)=>[name,sources[i].map(r=>({...r.data.data,_migrationId:r.id}))]));
const projection=purchaseProjection(tables);
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const documents=[];
for(const group of purchaseGroups)for(const record of projection[group])documents.push({path:company+'/purchaseImports/'+group+'/records/'+record.id,value:record});
const manifest={schemaVersion:1,year:2026,companyId:'500123568',counts:Object.fromEntries(purchaseGroups.map(g=>[g,projection[g].length]))};
documents.push({path:company+'/purchaseImports/manifest',value:manifest});
const existing=new Map();for(const group of purchaseGroups)for(const record of await list(company+'/purchaseImports/'+group+'/records'))existing.set(company+'/purchaseImports/'+group+'/records/'+record.id,record.data);
for(const record of await list(company+'/purchaseImports'))if(record.id==='manifest')existing.set(company+'/purchaseImports/manifest',record.data);
const missing=documents.filter(d=>{if(!existing.has(d.path))return true;if(canonical(existing.get(d.path))!==canonical(d.value))throw Error('Conflicto: no se sobrescribirá '+d.path);return false;});
await writeFile(output+'/plan.json',JSON.stringify({manifest,documents},null,2));
if(process.argv.includes('--apply')){
 for(let i=0;i<missing.length;i+=100)await request(root+':commit',{method:'POST',body:JSON.stringify({writes:missing.slice(i,i+100).map(d=>({update:{name:d.path,fields:encode(d.value).mapValue.fields},currentDocument:{exists:false}}))})});
 for(const group of purchaseGroups){const actual=await list(company+'/purchaseImports/'+group+'/records');const expected=new Map(projection[group].map(d=>[d.id,d]));if(actual.length!==expected.size||actual.some(d=>canonical(d.data)!==canonical(expected.get(d.id))))throw Error('Verificación fallida: '+group);}
 const m=await request(company+'/purchaseImports/manifest');if(canonical(decode({mapValue:{fields:m.fields}}))!==canonical(manifest))throw Error('Manifest no coincide');
}
const report={mode:process.argv.includes('--apply')?'applied-and-verified':'prepared',...manifest,newDocuments:missing.length};await writeFile(output+'/summary.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
