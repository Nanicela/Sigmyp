// Explicit, resumable import. Never overwrites existing documents or grants access.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function prepare(source) {
  if(source.year!==2026 || source.timezone!=='America/Bogota' || source.source!=='sigmyp2') throw Error('Exportación fuera del alcance autorizado');
  const tables=source.tables, ids={}, records=[], issues=[];
  for(const [table,{rows}] of Object.entries(tables)) {
    const keys=source.schema[table].primaryKey;
    if(!keys?.length)throw Error('Tabla sin clave: '+table);
    ids[table]=new Set(rows.map(row=>JSON.stringify(keys.map(k=>row[k]))));
    if(ids[table].size!==rows.length)throw Error('Claves duplicadas: '+table);
  }
  for(const [table,{rows,kind}] of Object.entries(tables)) for(const row of rows) {
    if(('hash' in row)||('salt' in row)||('password' in row))throw Error('Se detectó un campo de credenciales');
    const key=source.schema[table].primaryKey.map(k=>row[k]);
    if(key.some(k=>k===undefined||k===null))throw Error('Clave ausente');
    if(kind==='operation') {
      const ms=Date.parse(row[table==='kardex'?'date':'date_created']);
      if(!(ms>=Date.parse('2026-01-01T00:00:00-05:00')&&ms<Date.parse('2027-01-01T00:00:00-05:00')))throw Error('Operación fuera de 2026');
    }
    const unresolved=[];
    for(const fk of source.schema[table].foreignKeys||[]) {
      const values=fk.constrained_columns.map(k=>row[k]);
      if(values.every(v=>v===null||v===undefined))continue;
      const target=fk.referred_table;
      if(!ids[target]?.has(JSON.stringify(values)))unresolved.push({table:target,columns:fk.constrained_columns,values});
    }
    if(unresolved.length)issues.push({table,key,references:unresolved});
    records.push({table,id:digest(key),data:{source:'sigmyp2',sourceKey:key,kind,year:kind==='master'?null:2026,
      sourceHash:digest(row),data:row,unresolvedReferences:unresolved,status:'imported-for-reconciliation'}});
  }
  return {records,issues,counts:Object.fromEntries(Object.entries(tables).map(([t,v])=>[t,v.rows.length]))};
}
function value(v) {
 if(v===null)return {nullValue:null};
 if(typeof v==='string')return {stringValue:v};
 if(typeof v==='boolean')return {booleanValue:v};
 if(typeof v==='number') {if(!Number.isSafeInteger(v))throw Error('Número no entero o inseguro');return {integerValue:String(v)};}
 if(Array.isArray(v))return {arrayValue:{values:v.map(value)}};
 return {mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,value(v)]))}};
}
async function main() {
 const [mode,file,dir]=process.argv.slice(2);
 if(!['plan','apply','verify'].includes(mode)||!file||!dir)throw Error('Uso: plan|apply|verify export.json carpeta-privada');
 const raw=await readFile(file,'utf8'), source=JSON.parse(raw), plan=prepare(source);
 const exportHash=createHash('sha256').update(raw).digest('hex');
 await mkdir(dir,{recursive:true,mode:0o700});
 const save=(name,data)=>writeFile(dir+'/'+name,JSON.stringify(data,null,2),{mode:0o600});
 await save('plan.json',{exportHash,counts:plan.counts,total:plan.records.length,unresolved:plan.issues});
 console.log(JSON.stringify({mode,total:plan.records.length,counts:plan.counts,recordsWithUnresolvedReferences:plan.issues.length}));
 if(mode==='plan')return;
 const require=createRequire(import.meta.url);
 const auth=require('../../node_modules/firebase-tools/lib/auth.js');
 const account=auth.getGlobalDefaultAccount();
 if(account?.user.email!=='danielao@grupodyd.com')throw Error('Sesión no autorizada');
 const token=(await auth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform'])).access_token;
 const root='projects/facturacion-electronica-a73e3/databases/(default)/documents';
 const base=root+'/organizations/500123568';
 async function req(path,body) {
  const r=await fetch('https://firestore.googleapis.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const d=await r.json();if(!r.ok)throw Error('Firestore '+r.status+' '+(d.error?.status||''));return d;
 }
 const company=await req(base); if(!company.name)throw Error('Compañía no encontrada');
 const existing=new Map();
 for(const table of Object.keys(plan.counts)) {
  let page='';
  do {const d=await req(base+'/legacyData/'+table+'/records?pageSize=1000'+(page?'&pageToken='+encodeURIComponent(page):''));
   for(const doc of d.documents||[])existing.set(doc.name,doc);
   page=d.nextPageToken||'';
  }while(page);
 }
 await save('destination-before-'+Date.now()+'.json',[...existing.values()]);
 const missing=[];
 for(const row of plan.records) {
  const name=base+'/legacyData/'+row.table+'/records/'+row.id;
  const fields=value(row.data).mapValue.fields;
  const prior=existing.get(name);
  // Compare full document, including metadata, without trusting a hash field alone.
  if(prior && digest(canonical(decodeFields(prior.fields)))!==digest(canonical(decodeFields(fields))))throw Error('Conflicto con registro importado existente: '+row.table+'/'+row.id);
  if(!prior)missing.push({update:{name,fields},currentDocument:{exists:false}});
 }
 if(mode==='verify'&&missing.length)throw Error('Faltan '+missing.length+' documentos');
 if(mode==='apply') {
  for(let i=0;i<missing.length;i+=150) {
   await req(root+':commit',{writes:missing.slice(i,i+150)});
   console.log(JSON.stringify({created:Math.min(i+150,missing.length),of:missing.length}));
  }
 }
 const summary={exportHash,total:plan.records.length,alreadyPresent:existing.size,created:mode==='apply'?missing.length:0,counts:plan.counts,
  referencesPending:plan.issues.length,verified:mode==='verify',time:new Date().toISOString(),
  destination:'organizations/500123568/legacyData',note:'Protected source records, not active accounting data. No access roles granted.'};
 await save(mode+'-result.json',summary);
 console.log(JSON.stringify(summary));
}
function decodeFields(fields={}) {return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,decode(v)]));}
function decode(v) {
 if('nullValue' in v)return null;
 if('integerValue' in v)return Number(v.integerValue);
 if('booleanValue' in v)return v.booleanValue;
 if('stringValue' in v)return v.stringValue;
 if('arrayValue' in v)return (v.arrayValue.values||[]).map(decode);
 if('mapValue' in v)return decodeFields(v.mapValue.fields);
 throw Error('Tipo Firestore inesperado');
}
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v;}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)await main();
