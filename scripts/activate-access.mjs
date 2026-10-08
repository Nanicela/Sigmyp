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
const configUrl=`https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/config`;
const config=await request(configUrl);
const companies=await list('organizations'), documents=[];
for(const company of companies)documents.push(...await walk(company));
const notes=documents.filter(d=>d.name.includes('/drafts/') && ['CREDIT_NOTE','DEBIT_NOTE'].includes(d.fields?.kind?.stringValue));
const locks=new Map();
for(const note of notes){const ref=note.fields.reference_id?.stringValue;if(!ref)continue;const name=note.name.slice(0,note.name.lastIndexOf('/')+1)+ref;const original=documents.find(d=>d.name===name);if(!original)throw Error('Una nota no tiene factura original: requiere revisión.');if(original.fields.referenceLocked?.booleanValue!==true)locks.set(name,original);}
console.log(JSON.stringify({emailEnabled:config.signIn?.email?.enabled||false,companies:companies.length,documents:documents.length,notes:notes.length,referenceLocksRequired:locks.size}));
if(process.argv[2]!=='apply')process.exit(0);
const dir='../../work/activation-'+Date.now();await mkdir(dir,{recursive:true,mode:0o700});
await writeFile(dir+'/backup.json',JSON.stringify({project,documents,email:config.signIn?.email,passwordPolicyConfig:config.passwordPolicyConfig}),{mode:0o600});
if(locks.size){
 const writes=[];
 for(const original of locks.values()){
  const company=original.name.split('/organizations/')[1].split('/')[0],auditId=crypto.randomUUID(),at={timestampValue:new Date().toISOString()};
  const after={...original.fields,referenceLocked:{booleanValue:true},version:{integerValue:String(Number(original.fields.version?.integerValue||0)+1)},auditId:{stringValue:auditId},updatedAt:at,updatedBy:{stringValue:'system-activation'}};
  writes.push({update:{name:original.name,fields:after},currentDocument:{updateTime:original.updateTime}});
  writes.push({update:{name:root+'/organizations/'+company+'/audit/'+auditId,fields:{target:{stringValue:'drafts'},targetId:{stringValue:original.name.split('/').at(-1)},actorUid:{stringValue:'system-activation'},actorEmail:{stringValue:'Activación del historial'},at,before:{mapValue:{fields:original.fields}},after:{mapValue:{fields:after}}}},currentDocument:{exists:false}});
 }
 if(writes.length>450)throw Error('Preparar migración por lotes antes de activar.');
 await request(api+root+':commit',{writes});
}
const oldStrength=config.passwordPolicyConfig?.passwordPolicyVersions?.[0]?.customStrengthOptions||{};
await request(configUrl+'?updateMask=signIn.email.enabled,signIn.email.passwordRequired,passwordPolicyConfig',{
 signIn:{email:{enabled:true,passwordRequired:true}},
 passwordPolicyConfig:{passwordPolicyEnforcementState:'ENFORCE',forceUpgradeOnSignin:config.passwordPolicyConfig?.forceUpgradeOnSignin||false,passwordPolicyVersions:[{customStrengthOptions:{...oldStrength,minPasswordLength:Math.max(12,oldStrength.minPasswordLength||0)}}]}
},'PATCH');
const checked=await request(configUrl);
if(!checked.signIn.email.enabled||!checked.signIn.email.passwordRequired||checked.passwordPolicyConfig.passwordPolicyEnforcementState!=='ENFORCE')throw Error('No se confirmó la configuración.');
console.log(JSON.stringify({emailPasswordEnabled:true,minPasswordLength:checked.passwordPolicyConfig.passwordPolicyVersions[0].customStrengthOptions.minPasswordLength,referenceLocksApplied:locks.size,backup:dir+'/backup.json'}));
