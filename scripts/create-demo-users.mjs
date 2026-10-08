// Aprovisionamiento autorizado, limitado a la compañía DEMO.
import {createRequire} from 'node:module';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {initializeApp as clientApp,deleteApp} from 'firebase/app';
import {getAuth,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {getFirestore,collection,query,where,FieldPath,getDocs,getDoc,doc} from 'firebase/firestore';
const require=createRequire(import.meta.url),sdk=createRequire(new URL('../functions/package.json',import.meta.url));
const cli=require('../node_modules/firebase-tools/lib/auth.js');
const account=cli.getGlobalDefaultAccount();
if(account?.user.email!=='danielao@grupodyd.com')throw Error('Cuenta administrativa inesperada.');
const {access_token}=await cli.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
const projectId='facturacion-electronica-a73e3';
const admin=sdk('firebase-admin/app').initializeApp({projectId,credential:{getAccessToken:async()=>({access_token,expires_in:3600})}});
const auth=sdk('firebase-admin/auth').getAuth(admin);
const root=`projects/${projectId}/databases/(default)/documents`,base='https://firestore.googleapis.com/v1/';
async function rest(path,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${access_token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(r.status===404&&!body)return null;const result=await r.json();if(!r.ok)throw Error(`${r.status}: ${result.error?.message}`);return result;}
function value(v){if(v===null)return {nullValue:null};if(v instanceof Date)return {timestampValue:v.toISOString()};if(typeof v==='object')return {mapValue:{fields:fields(v)}};if(typeof v==='number')return {integerValue:String(v)};return {stringValue:String(v)};}
function fields(v){return Object.fromEntries(Object.entries(v).map(([k,v])=>[k,value(v)]));}
const companyPath=root+'/organizations/999000001';
if((await rest(companyPath))?.fields?.name?.stringValue!=='DEMO · Comercial de Pruebas')throw Error('No se encontró DEMO.');
const owner=await auth.getUserByEmail('danielao@grupodyd.com');
if(!owner.customClaims?.platformAdmin)throw Error('No se confirmó el rol existente de superadministradora.');
const store='../../work/demo-user-access.json';
await mkdir('../../work',{recursive:true});
let accounts;
try{accounts=JSON.parse(await readFile(store,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;
 accounts=[['admin','Administrador'],['billing','Facturador'],['viewer','Consulta']].map(([role,label],i)=>({role,label,uid:'demo-access-'+role,email:'demo-'+role+'@example.test',password:randomBytes(24).toString('base64url')+'aA1!',identification:'DEMO000'+(i+1)}));
 await writeFile(store,JSON.stringify(accounts),{mode:0o600,flag:'wx'});
}
for(const a of accounts){
 let existing;try{existing=await auth.getUser(a.uid);}catch(e){if(e.code!=='auth/user-not-found')throw e;}
 if(existing){if(existing.email!==a.email||existing.customClaims?.platformAdmin)throw Error('Cuenta de prueba existente incompatible.');}
 else await auth.createUser({uid:a.uid,email:a.email,password:a.password,emailVerified:true,displayName:'DEMO · '+a.label});
 const userPath=root+'/registeredUsers/'+a.uid;
 const existingProfile=await rest(userPath);
 if(existingProfile){if(existingProfile.fields.email.stringValue!==a.email)throw Error('Ficha incompatible.');}
 else await rest(root+':commit',{writes:[{update:{name:userPath,fields:fields({uid:a.uid,email:a.email,firstName:'DEMO',lastName:a.label,documentType:'PASAPORTE',identification:a.identification,phone:'0000000000',jobTitle:'Usuario ficticio · '+a.label,createdAt:new Date()})},currentDocument:{exists:false}}]});
}
const current=await rest(companyPath),before=current.fields;
if(before.name.stringValue!=='DEMO · Comercial de Pruebas')throw Error('La compañía cambió.');
const members={...before.members.mapValue.fields};let changed=false;
for(const a of accounts){if(members[a.email]?.stringValue!==a.role)changed=true;members[a.email]=value(a.role);}
if(changed){
 const auditId=randomUUID(),at=value(new Date());
 const after={...before,members:{mapValue:{fields:members}},version:{integerValue:String(Number(before.version?.integerValue||0)+1)},auditId:value(auditId),updatedBy:value('system-demo-users'),updatedAt:at};
 await rest(root+':commit',{writes:[{update:{name:companyPath,fields:after},currentDocument:{updateTime:current.updateTime}},{update:{name:companyPath+'/audit/'+auditId,fields:{...fields({target:'company',targetId:'999000001',actorUid:'system-demo-users',actorEmail:'Creación de cuentas DEMO autorizada por danielao@grupodyd.com'}),at,before:{mapValue:{fields:before}},after:{mapValue:{fields:after}}}},currentDocument:{exists:false}}]});
}
const config=JSON.parse(await readFile('web/firebase-config.json','utf8'));
const allCompanies=await rest(root+'/organizations?pageSize=100');
const other=(allCompanies.documents||[]).map(d=>({id:d.name.split('/').at(-1)})).find(d=>d.id!=='999000001');
for(const a of accounts){
 const app=clientApp(config.firebase,'verify-'+a.role),client=getAuth(app),fire=getFirestore(app);
 try{
  const result=await signInWithEmailAndPassword(client,a.email,a.password);
  if(!result.user.emailVerified)throw Error('Cuenta DEMO sin verificación administrativa.');
  const companies=await getDocs(query(collection(fire,'organizations'),where(new FieldPath('members',a.email),'in',['admin','billing','viewer'])));
  if(companies.size!==1||companies.docs[0].id!=='999000001')throw Error('Acceso inesperado a compañías.');
  if(!(await getDoc(doc(fire,'registeredUsers',a.uid))).exists())throw Error('Falta ficha de usuario.');
  if(other){let denied=false;try{await getDoc(doc(fire,'organizations',other.id));}catch(e){if(e.code==='permission-denied')denied=true;else throw e;}if(!denied)throw Error('No se confirmó aislamiento.');}
  console.log(JSON.stringify({role:a.label,email:a.email,loginVerified:true,company:'DEMO',otherCompanyAccess:'denied'}));
 }finally{await signOut(client);await deleteApp(app);}
}
const lines=['CUENTAS DE PRUEBA · SOLO COMPAÑÍA DEMO','Aplicación: https://sigmyp.web.app/','Datos ficticios. Los correos example.test no reciben mensajes. Guarda estas contraseñas en un lugar privado.',''];
for(const a of accounts)lines.push(a.label,'Correo: '+a.email,'Contraseña: '+a.password,'');
lines.push('Superadministradora: danielao@grupodyd.com (tu contraseña actual, sin cambios).');
await writeFile('../credenciales-usuarios-demo.txt',lines.join('\n'),{mode:0o600});
console.log('Credenciales guardadas fuera de Hosting en outputs/credenciales-usuarios-demo.txt');
await sdk('firebase-admin/app').deleteApp(admin);
