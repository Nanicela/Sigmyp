import {initializeApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,setPersistence,browserLocalPersistence,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,signOut,reload,getIdTokenResult,GoogleAuthProvider,signInWithRedirect,getRedirectResult} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator} from 'firebase/firestore';
import {userRecord,registerUserRecord,normalizeUser} from './user-record.js';
import {allowedSignInProvider} from './auth-provider.js';
import {canonicalHostingUrl} from './canonical-host.js';
const $=s=>document.querySelector(s),status=$('#landing-status');
const routes=['nuevo','documentos','registrar','empresa','clientes','usuarios','productos','procesos'];
const requested=new URLSearchParams(location.search).get('section')||location.hash.slice(1);
const destination='/app.html#'+(routes.includes(requested)?requested:'procesos');
let auth,db,registering=false, useEmulators=false;
function show(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
function panel(id){for(const el of document.querySelectorAll('[data-auth-panel]'))el.hidden=el.id!==id;}
function errorText(e){return ({'auth/invalid-credential':'Revisa el correo y la contraseña.','auth/wrong-password':'Revisa el correo y la contraseña.','auth/user-not-found':'Revisa el correo y la contraseña.','auth/email-already-in-use':'Este correo ya está registrado. Inicia sesión o utiliza Recuperar / crear contraseña.','auth/account-exists-with-different-credential':'Este correo ya usa otro método de acceso. Inicia sesión con tu contraseña para conservar la misma cuenta.','auth/popup-closed-by-user':'El acceso con Google se canceló antes de terminar.','auth/popup-blocked':'El navegador bloqueó la ventana de Google. Permite ventanas emergentes para este sitio e inténtalo de nuevo.','auth/cancelled-popup-request':'Ya hay una ventana de acceso con Google abierta. Complétala o ciérrala.','auth/unauthorized-domain':'Esta dirección no está autorizada para iniciar sesión con Google.','auth/weak-password':'Elige una contraseña de al menos 12 caracteres.','auth/too-many-requests':'Demasiados intentos. Espera un momento antes de volver a intentar.','auth/network-request-failed':'No pudimos conectar. Comprueba tu conexión.'})[e.code]||e.message;}
async function run(button,action){button.disabled=true;show('');try{await action();}catch(e){show(errorText(e),true);}finally{button.disabled=false;}}
async function route(user){
  if(registering)return;
  if(!user){panel('login-panel');return;}
  const token=await getIdTokenResult(user,true);
  if(!allowedSignInProvider(token.signInProvider)){await signOut(auth);throw Error('Este método de acceso no está habilitado.');}
  if(!user.emailVerified){panel('verify-panel');$('#verify-email').textContent=user.email;return;}
  const record=await userRecord(db,user);
  if(!record.exists()){panel('profile-panel');return;}
  location.replace(destination);
}
async function start(){
 const config=await (await fetch('/firebase-config.json')).json();
 if(!config.useEmulators&&location.hostname==='127.0.0.1'){const url=new URL(location.href);url.hostname='localhost';location.replace(url);return;}
 useEmulators=config.useEmulators===true;
 if(useEmulators){$('#auth-environment').hidden=false;$('#auth-environment').textContent='Vista de prueba: utiliza únicamente cuentas ficticias y no envía correos reales.';$('#recovery-submit').textContent='Probar solicitud de recuperación';}
 const app=initializeApp(config.firebase);auth=getAuth(app);auth.languageCode='es';db=getFirestore(app);
 if(config.useEmulators){connectAuthEmulator(auth,'http://127.0.0.1:9099');connectFirestoreEmulator(db,'127.0.0.1',8181);}
 await setPersistence(auth,browserLocalPersistence);
 let redirectFailure=null;
 try{await getRedirectResult(auth);}catch(e){redirectFailure=e;}
 await auth.authStateReady();
  onAuthStateChanged(auth,u=>{if(redirectFailure){show(errorText(redirectFailure),true);redirectFailure=null;}else show('');route(u).catch(e=>show(errorText(e),true));});
  $('#landing-email').onsubmit=e=>{e.preventDefault();run(e.submitter,async()=>{const f=e.target;await signInWithEmailAndPassword(auth,f.email.value.trim(),f.password.value);f.password.value='';});};
  $('#google-login').onclick=e=>run(e.currentTarget,async()=>{
    const provider=new GoogleAuthProvider();
    provider.setCustomParameters({prompt:'select_account'});
    show('Te llevaremos a Google y volverás aquí al completar el acceso.');
    await signInWithRedirect(auth,provider);
  });
 $('#show-register').onclick=()=>{show('');panel('register-panel');};
 for(const button of document.querySelectorAll('[data-back-login]'))button.onclick=()=>{show('');panel('login-panel');};
 $('#register-form').onsubmit=e=>{e.preventDefault();run(e.submitter,async()=>{
   const f=e.target;if(f.password.value!==f.confirmPassword.value)throw Error('Las contraseñas no coinciden.');
   normalizeUser(Object.fromEntries(new FormData(f)));registering=true;
   try{const result=await createUserWithEmailAndPassword(auth,f.email.value.trim(),f.password.value);await registerUserRecord(db,result.user,Object.fromEntries(new FormData(f)));await sendEmailVerification(result.user);f.reset();show('Registro creado. Revisa tu correo para verificar la cuenta.');}
   finally{registering=false;await route(auth.currentUser);}
 });};
 $('#profile-form').onsubmit=e=>{e.preventDefault();run(e.submitter,async()=>{await registerUserRecord(db,auth.currentUser,Object.fromEntries(new FormData(e.target)));await route(auth.currentUser);});};
 $('#verify-check').onclick=e=>run(e.target,async()=>{await reload(auth.currentUser);if(!auth.currentUser.emailVerified)throw Error('Todavía no se ha confirmado el correo. Abre el enlace recibido y vuelve aquí.');await route(auth.currentUser);});
 $('#verify-resend').onclick=e=>run(e.target,async()=>{await sendEmailVerification(auth.currentUser);show('Enviamos el enlace de verificación.');});
 async function requestRecovery(email) {
   try {await sendPasswordResetEmail(auth,email);}
   catch(e){if(e.code!=='auth/user-not-found')throw e;}
   show(useEmulators
     ? 'Solicitud de prueba procesada. No se enviará ningún correo real y las cuentas reales no están disponibles aquí.'
     : 'Si la cuenta existe, recibirás un enlace para crear o recuperar tu contraseña. Revisa también la carpeta de correo no deseado.');
 }
 $('#password-reset').onclick=()=>{show('');$('#recovery-form').elements.email.value=$('#landing-email').elements.email.value.trim();panel('recovery-panel');$('#recovery-form').elements.email.focus();};
 $('#recovery-form').onsubmit=e=>{e.preventDefault();run(e.submitter,()=>requestRecovery(e.target.elements.email.value.trim()));};
 $('#existing-reset').onclick=e=>run(e.currentTarget,()=>requestRecovery(auth.currentUser.email));
 for(const button of document.querySelectorAll('[data-signout]'))button.onclick=()=>signOut(auth).catch(e=>show(errorText(e),true));
}
const canonicalUrl=canonicalHostingUrl(location.href);
if(canonicalUrl)location.replace(canonicalUrl);
else start().catch(e=>show(errorText(e),true));
