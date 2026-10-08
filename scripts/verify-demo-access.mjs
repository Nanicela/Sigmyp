import {readFile} from 'node:fs/promises';
import {initializeApp as clientApp,deleteApp} from 'firebase/app';
import {getAuth,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {getFirestore,collection,query,where,FieldPath,getDocs,getDoc,doc} from 'firebase/firestore';
const accounts=JSON.parse(await readFile('../../work/demo-user-access.json','utf8'));
const config=JSON.parse(await readFile('web/firebase-config.json','utf8'));
const other={id:'999999999999999'};
for(const a of accounts){
 const app=clientApp(config.firebase,'verify-'+a.role),client=getAuth(app),fire=getFirestore(app);
 try{
  const result=await signInWithEmailAndPassword(client,a.email,a.password);
  if(!result.user.emailVerified)throw Error('Cuenta DEMO sin verificación administrativa.');
  const companies=await getDocs(query(collection(fire,'organizations'),where(new FieldPath('members',a.email),'in',['admin','billing','viewer'])));
  if(companies.size!==1||companies.docs[0].id!=='999000001')throw Error('Acceso inesperado a compañías.');
  if(!(await getDoc(doc(fire,'registeredUsers',a.uid))).exists())throw Error('Falta ficha de usuario.');
  const binding=await getDoc(doc(fire,'companyAssignments',a.email));
  if(binding.data()?.companyId!=='999000001')throw Error('Reserva incorrecta.');
  if(other){let denied=false;try{await getDoc(doc(fire,'organizations',other.id));}catch(e){if(e.code==='permission-denied')denied=true;else throw e;}if(!denied)throw Error('No se confirmó aislamiento.');}
  console.log(JSON.stringify({role:a.label,email:a.email,loginVerified:true,company:'DEMO',otherCompanyAccess:'denied'}));
 }finally{await signOut(client);await deleteApp(app);}
}
