// Prepare/apply a read-only commercial projection; original records are never changed.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {quotationProductDetails} from '../../web/quotation-presentation.js';
const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth');
const output=resolve('../../work/quotation-details');await mkdir(output,{recursive:true});
const config=JSON.parse(await readFile(resolve('../../work/firebase-config/configstore/firebase-tools.json'),'utf8'));
const token=await auth.getAccessToken(config.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
const root='projects/facturacion-electronica-a73e3/databases/(default)/documents',company=root+'/organizations/500123568';
const decode=v=>'mapValue'in v?Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,v])=>[k,decode(v)])):'arrayValue'in v?(v.arrayValue.values||[]).map(decode):'integerValue'in v?Number(v.integerValue):'doubleValue'in v?v.doubleValue:'nullValue'in v?null:'booleanValue'in v?v.booleanValue:v.stringValue??v.timestampValue;
const encode=v=>v===null?{nullValue:null}:typeof v==='number'?(Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v}):typeof v==='string'?{stringValue:v}:Array.isArray(v)?{arrayValue:{values:v.map(encode)}}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,encode(v)]))}};
async function request(path,options={}){const r=await fetch('https://firestore.googleapis.com/v1/'+path,{...options,headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'}});if(!r.ok)throw Error('Firestore HTTP '+r.status);return r.json();}
async function list(path){let page='',rows=[];do{const r=await request(path+'?pageSize=1000'+(page?'&pageToken='+encodeURIComponent(page):''));rows.push(...(r.documents||[]).map(d=>({id:d.name.split('/').at(-1),data:decode({mapValue:{fields:d.fields}})})));page=r.nextPageToken;}while(page);return rows;}
const sources=await Promise.all(['quotations','quotations_products','products'].map(t=>list(company+'/legacyData/'+t+'/records')));
const rows=sources.map(records=>records.map(r=>({...r.data.data,_migrationId:r.id})));
const projection=quotationProductDetails(...rows);if(projection.some(p=>!p.sourceDocumentId))throw Error('Clave de origen ausente');
const existing=new Map((await list(company+'/commercialQuotationDetails')).map(d=>[d.id,d.data]));
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const missing=[];for(const record of projection){const previous=existing.get(record.sourceDocumentId);if(previous&&canonical(previous)!==canonical(record))throw Error('Existe una ficha diferente; revisar antes de reemplazar.');if(!previous)missing.push(record);}
await writeFile(output+'/plan.json',JSON.stringify(projection,null,2));
if(process.argv.includes('--apply')){for(let i=0;i<missing.length;i+=100)await request('projects/facturacion-electronica-a73e3/databases/(default)/documents:commit',{method:'POST',body:JSON.stringify({writes:missing.slice(i,i+100).map(d=>({update:{name:company+'/commercialQuotationDetails/'+d.sourceDocumentId,fields:encode(d).mapValue.fields},currentDocument:{exists:false}}))})});const saved=await list(company+'/commercialQuotationDetails');const verified=new Map(saved.map(d=>[d.id,d.data]));if(projection.some(d=>canonical(verified.get(d.sourceDocumentId))!==canonical(d)))throw Error('Revisar contenido final');}
const report={mode:process.argv.includes('--apply')?'applied':'prepared',quotations:projection.length,lines:projection.reduce((n,p)=>n+p.lines.length,0),newDocuments:missing.length};await writeFile(output+'/summary.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
