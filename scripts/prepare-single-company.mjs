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

const sdk=createRequire(new URL('../functions/package.json',import.meta.url));
const admin=sdk('firebase-admin/app').initializeApp({projectId:project,credential:{getAccessToken:async()=>({access_token:token,expires_in:3600})}});
const users=sdk('firebase-admin/auth').getAuth(admin);
const companies=await list('organizations'),assignments=new Map(),conflicts=[];
for(const c of companies)for(const email of Object.keys(c.fields?.members?.mapValue?.fields||{})){
 let global=false;
 try{global=(await users.getUserByEmail(email)).customClaims?.platformAdmin===true;}catch(e){if(e.code!=='auth/user-not-found')throw e;}
 if(global)continue;
 const id=c.name.split('/').at(-1);
 if(assignments.has(email)&&assignments.get(email)!==id)conflicts.push({email,companies:[assignments.get(email),id]});
 assignments.set(email,id);
}
const existing=await list('companyAssignments');
for(const d of existing){const email=d.name.split('/').at(-1);if(assignments.get(email)!==d.fields.companyId?.stringValue)conflicts.push({email,error:'Reserva existente incompatible'});}
const missing=[...assignments].filter(([email])=>!existing.some(d=>d.name===root+'/companyAssignments/'+email));
console.log(JSON.stringify({companies:companies.length,normalUsers:assignments.size,reservations:existing.length,missingReservations:missing.length,conflicts}));
if(process.argv[2]==='verify'&&missing.length)throw Error('Faltan reservas; revisar cambios concurrentes.');
if(conflicts.length)throw Error('Resolver conflictos antes de activar; no se hicieron cambios.');
if(process.argv[2]==='apply'){
 const writes=[];
 // Preconditions protect every inspected company from concurrent membership edits during this commit.
 for(const c of companies)writes.push({update:{name:c.name,fields:c.fields},currentDocument:{updateTime:c.updateTime}});
 for(const [email,id] of assignments){const name=root+'/companyAssignments/'+email;if(existing.some(d=>d.name===name))continue;writes.push({update:{name,fields:{companyId:{stringValue:id}}},currentDocument:{exists:false}});}
 if(writes.length>450)throw Error('Se requiere una migración por lotes.');
 await mkdir('../../work/single-company',{recursive:true,mode:0o700});
 await writeFile('../../work/single-company/before-'+Date.now()+'.json',JSON.stringify({companies,existing}),{mode:0o600});
 if(writes.length)await request(api+root+':commit',{writes});
 console.log('Reservas creadas; desplegar reglas y frontend juntos y volver a inspeccionar para detectar cambios concurrentes.');
}
await sdk('firebase-admin/app').deleteApp(admin);
