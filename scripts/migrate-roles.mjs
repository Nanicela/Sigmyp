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
async function list(path) {
 let rows=[],page='';do {const d=await request(api+root+'/'+path+'?pageSize=1000&showMissing=true'+(page?'&pageToken='+encodeURIComponent(page):''));rows.push(...d.documents||[]);page=d.nextPageToken;}while(page);return rows;
}
async function walk(document) {
 const docs=document.fields?[document]:[];
 let page='';do {const groups=await request(api+document.name+':listCollectionIds',{pageSize:1000,...(page?{pageToken:page}:{})});
 for(const group of groups.collectionIds||[])for(const child of await list(document.name.slice(root.length+1)+'/'+group))docs.push(...await walk(child));page=groups.nextPageToken;}while(page);return docs;
}
const identity=await request(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:lookup`,{email:['danielao@grupodyd.com']});
const owner=identity.users?.[0];if(!owner?.emailVerified || owner.disabled)throw Error('La administradora debe existir, estar activa y tener correo verificado.');
const old=[];for(const workspace of await list('workspaces'))for(const company of await list(workspace.name.slice(root.length+1)+'/companies'))old.push({uid:workspace.name.split('/').at(-1),company,docs:await walk(company)});
const existing=await list('organizations');
const ids=new Set();for(const entry of old){const id=entry.company.name.split('/').at(-1);if(ids.has(id))throw Error('NIT duplicado entre espacios: requiere conciliación antes de migrar.');ids.add(id);if(entry.uid!==owner.localId)throw Error('Existe información de otro propietario: revisar asignación antes de migrar.');}
if((await list('companies')).length)throw Error('Existen empresas del modo Functions: requieren revisión antes de migrar.');
console.log(JSON.stringify({administratorFound:true,legacyCompanies:old.length,legacyDocuments:old.reduce((n,x)=>n+x.docs.length,0),existingOrganizations:existing.length}));
if(process.argv[2]==='verify') {
 for(const entry of old)for(const source of entry.docs){
  const id=entry.company.name.split('/').at(-1), suffix=source.name.slice(entry.company.name.length);
  const saved=await request(api+root+'/organizations/'+id+suffix);
  const relevant=Object.fromEntries(Object.keys(source.fields).map(key=>[key,saved.fields[key]]));
  if(JSON.stringify(canonical(relevant))!==JSON.stringify(canonical(source.fields)))throw Error('El origen cambió durante la publicación: se requiere reconciliar antes de finalizar.');
 }
 if(JSON.parse(owner.customAttributes||'{}').platformAdmin!==true)throw Error('Falta el rol global.');
 console.log('Verificación final: todas las entradas originales coinciden con la copia y el rol global sigue asignado.');
 process.exit(0);
}
if(process.argv[2]!=='apply')process.exit(0);
if(existing.length)throw Error('El destino ya contiene empresas. Se detiene para evitar sobrescribir datos.');
const dir='../../work/roles-migration-'+Date.now();await mkdir(dir,{recursive:true,mode:0o700});
await writeFile(dir+'/backup.json',JSON.stringify({project,owner:{uid:owner.localId,email:owner.email,customAttributes:owner.customAttributes},old}),{mode:0o600});
const writes=[];
for(const entry of old){const id=entry.company.name.split('/').at(-1);
 for(const source of entry.docs){const suffix=source.name.slice(entry.company.name.length);const fields={...source.fields};if(!suffix){fields.members={mapValue:{fields:{[owner.email]:{stringValue:'admin'}}}};fields.updatedAt={timestampValue:new Date().toISOString()};}
 writes.push({update:{name:root+'/organizations/'+id+suffix,fields},currentDocument:{exists:false}});
 }
}
// Commit único y atómico: no hay copia parcial si un documento de destino existe.
if(writes.length>450)throw Error('La copia supera el límite de esta migración atómica; preparar migración por lotes.');
if(writes.length)await request(api+root+':commit',{writes});
for(const write of writes){const saved=await request(api+write.update.name);if(JSON.stringify(canonical(saved.fields))!==JSON.stringify(canonical(write.update.fields)))throw Error('La verificación de la copia no coincide.');}
const claims={...JSON.parse(owner.customAttributes||'{}'),platformAdmin:true};
await request(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:update`,{localId:owner.localId,customAttributes:JSON.stringify(claims)});
const checked=await request(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:lookup`,{localId:[owner.localId]});
if(JSON.parse(checked.users[0].customAttributes).platformAdmin!==true)throw Error('No se confirmó el rol global.');
console.log(JSON.stringify({copiedAndVerified:writes.length,platformAdminConfirmed:true,backup:dir+'/backup.json',legacyDataDeleted:false}));
function canonical(value){if(value?.timestampValue)return {timestampValue:new Date(value.timestampValue).toISOString()};if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
