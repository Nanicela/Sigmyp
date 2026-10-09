<script setup>
import { onMounted, reactive, ref } from 'vue';
import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence, connectAuthEmulator, createUserWithEmailAndPassword,
  getAuth, getIdTokenResult, getRedirectResult, GoogleAuthProvider,
  onAuthStateChanged, reload, sendEmailVerification, sendPasswordResetEmail,
  setPersistence, signInWithEmailAndPassword, signInWithRedirect, signOut
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { allowedSignInProvider } from '../../../../web/auth-provider.js';
import { canonicalHostingUrl } from '../../../../web/canonical-host.js';
import { normalizeUser, registerUserRecord, userRecord } from '../../../../web/user-record.js';

const routes = ['nuevo','documentos','registrar','empresa','clientes','usuarios','productos','procesos'];
const requested = new URLSearchParams(location.search).get('section') || location.hash.slice(1);
const destination = '/app.html#' + (routes.includes(requested) ? requested : 'procesos');

const activePanel = ref('');
const status = ref('Recuperando tu sesión…');
const hasError = ref(false);
const busy = ref('');
const useEmulators = ref(false);
const verifyEmail = ref('');
const existingEmail = ref('');
const login = reactive({ email: '', password: '' });
const recoveryEmail = ref('');
const registration = reactive({ firstName:'', lastName:'', documentType:'CC', identification:'', phone:'', jobTitle:'', email:'', password:'', confirmPassword:'' });
const profile = reactive({ firstName:'', lastName:'', documentType:'CC', identification:'', phone:'', jobTitle:'' });
let auth;
let db;
let registering = false;

const errorText = error => ({
  'auth/invalid-credential':'Revisa el correo y la contraseña.',
  'auth/wrong-password':'Revisa el correo y la contraseña.',
  'auth/user-not-found':'Revisa el correo y la contraseña.',
  'auth/email-already-in-use':'Este correo ya está registrado. Inicia sesión o utiliza Recuperar / crear contraseña.',
  'auth/account-exists-with-different-credential':'Este correo ya usa otro método de acceso. Inicia sesión con tu contraseña para conservar la misma cuenta.',
  'auth/popup-closed-by-user':'El acceso con Google se canceló antes de terminar.',
  'auth/popup-blocked':'El navegador bloqueó la ventana de Google. Permite ventanas emergentes para este sitio e inténtalo de nuevo.',
  'auth/cancelled-popup-request':'Ya hay una ventana de acceso con Google abierta. Complétala o ciérrala.',
  'auth/unauthorized-domain':'Esta dirección no está autorizada para iniciar sesión con Google.',
  'auth/weak-password':'Elige una contraseña de al menos 12 caracteres.',
  'auth/too-many-requests':'Demasiados intentos. Espera un momento antes de volver a intentar.',
  'auth/network-request-failed':'No pudimos conectar. Comprueba tu conexión.'
})[error?.code] || error?.message || 'No fue posible completar la operación.';

function show(message = '', error = false) {
  status.value = message;
  hasError.value = error;
}
function showPanel(panel) {
  activePanel.value = panel;
}
async function run(name, action) {
  busy.value = name;
  show();
  try { await action(); }
  catch (error) { show(errorText(error), true); }
  finally { busy.value = ''; }
}
async function route(user) {
  if (registering) return;
  if (!user) { showPanel('login'); return; }
  const token = await getIdTokenResult(user, true);
  if (!allowedSignInProvider(token.signInProvider)) {
    await signOut(auth);
    throw new Error('Este método de acceso no está habilitado.');
  }
  if (!user.emailVerified) {
    verifyEmail.value = user.email || '';
    showPanel('verify');
    return;
  }
  const record = await userRecord(db, user);
  if (!record.exists()) { showPanel('profile'); return; }
  location.replace(destination);
}
async function submitLogin() {
  await run('login', async () => {
    await signInWithEmailAndPassword(auth, login.email.trim(), login.password);
    login.password = '';
  });
}
async function googleLogin() {
  await run('google', async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt:'select_account' });
    show('Te llevaremos a Google y volverás aquí al completar el acceso.');
    await signInWithRedirect(auth, provider);
  });
}
async function submitRegistration() {
  await run('register', async () => {
    if (registration.password !== registration.confirmPassword) throw new Error('Las contraseñas no coinciden.');
    normalizeUser(registration);
    registering = true;
    try {
      const result = await createUserWithEmailAndPassword(auth, registration.email.trim(), registration.password);
      await registerUserRecord(db, result.user, registration);
      await sendEmailVerification(result.user);
      Object.assign(registration, { firstName:'',lastName:'',documentType:'CC',identification:'',phone:'',jobTitle:'',email:'',password:'',confirmPassword:'' });
      show('Registro creado. Revisa tu correo para verificar la cuenta.');
    } finally {
      registering = false;
      await route(auth.currentUser);
    }
  });
}
async function submitProfile() {
  await run('profile', async () => {
    await registerUserRecord(db, auth.currentUser, profile);
    await route(auth.currentUser);
  });
}
async function requestRecovery(email) {
  try { await sendPasswordResetEmail(auth, email); }
  catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
  show(useEmulators.value
    ? 'Solicitud de prueba procesada. No se enviará ningún correo real y las cuentas reales no están disponibles aquí.'
    : 'Si la cuenta existe, recibirás un enlace para crear o recuperar tu contraseña. Revisa también la carpeta de correo no deseado.');
}
async function submitRecovery() {
  await run('recovery', () => requestRecovery(recoveryEmail.value.trim()));
}
async function checkVerification() {
  await run('verify-check', async () => {
    await reload(auth.currentUser);
    if (!auth.currentUser.emailVerified) throw new Error('Todavía no se ha confirmado el correo. Abre el enlace recibido y vuelve aquí.');
    await route(auth.currentUser);
  });
}
async function resendVerification() {
  await run('verify-resend', async () => {
    await sendEmailVerification(auth.currentUser);
    show('Enviamos el enlace de verificación.');
  });
}
async function logout() {
  await run('signout', () => signOut(auth));
}
function openRecovery() {
  recoveryEmail.value = login.email.trim();
  show();
  showPanel('recovery');
}

onMounted(async () => {
  const canonicalUrl = canonicalHostingUrl(location.href);
  if (canonicalUrl) { location.replace(canonicalUrl); return; }
  try {
    const response = await fetch('/firebase-config.json', { cache:'no-store' });
    if (!response.ok) throw new Error('No pudimos cargar la configuración de la aplicación.');
    const config = await response.json();
    if (!config.useEmulators && location.hostname === '127.0.0.1') {
      const url = new URL(location.href); url.hostname = 'localhost'; location.replace(url); return;
    }
    useEmulators.value = config.useEmulators === true;
    const firebaseApp = initializeApp(config.firebase);
    auth = getAuth(firebaseApp); auth.languageCode = 'es'; db = getFirestore(firebaseApp);
    if (useEmulators.value) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings:true });
      connectFirestoreEmulator(db, '127.0.0.1', 8181);
    }
    await setPersistence(auth, browserLocalPersistence);
    let redirectFailure = null;
    try { await getRedirectResult(auth); } catch (error) { redirectFailure = error; }
    await auth.authStateReady();
    onAuthStateChanged(auth, user => {
      if (redirectFailure) { show(errorText(redirectFailure), true); redirectFailure = null; }
      else show();
      route(user).catch(error => show(errorText(error), true));
    });
  } catch (error) {
    show(errorText(error), true);
    showPanel('login');
  }
});
</script>

<template>
  <header class="landing-header"><a class="landing-brand" href="/" aria-label="SIGMYP, inicio"><span class="sigmyp-logo sigmyp-logo-landing"><img src="/logo-sigmyp.png" alt="SIGMYP by DyD · Sistema integrado de gestión para micro y pequeñas empresas"></span></a><a href="#access" class="landing-access">Iniciar sesión ↗</a></header>
  <main class="landing-main">
    <section class="landing-story"><span class="landing-kicker">CONECTA. ORGANIZA. MEJORA.</span><h1>Toda tu gestión,<br>en un solo lugar<span>.</span></h1><p>Integra la información de tus empresas, sus procesos y la gestión de facturación desde un mismo espacio.</p><div class="landing-features"><div><span aria-hidden="true">01</span><strong>Empresas</strong><p>Información, usuarios y responsabilidades organizadas.</p></div><div><span aria-hidden="true">02</span><strong>Procesos</strong><p>Mapas y caracterizaciones disponibles para el equipo.</p></div><div><span aria-hidden="true">03</span><strong>Facturación</strong><p>Clientes, productos y documentos en un flujo conectado.</p></div></div></section>
    <section class="landing-login card" id="access" aria-labelledby="access-title">
      <div class="eyebrow">BIENVENIDA A TU ESPACIO</div><h2 id="access-title">Inicia sesión</h2><p>Accede a tus empresas y continúa donde lo dejaste.</p>
      <p v-if="useEmulators" id="auth-environment" class="notice">Vista de prueba: utiliza únicamente cuentas ficticias y no envía correos reales.</p>
      <p id="landing-status" role="status" aria-live="polite" :class="{ error:hasError }">{{ status }}</p>
      <div v-show="activePanel==='login'" id="login-panel" data-auth-panel>
        <button id="google-login" type="button" class="google-login" :disabled="busy==='google'" @click="googleLogin"><span aria-hidden="true">G</span>Continuar con Google</button>
        <div class="auth-separator"><span>o usa tu contraseña</span></div>
        <form id="landing-email" @submit.prevent="submitLogin"><label>Usuario (correo electrónico)<input v-model="login.email" name="email" type="email" required autocomplete="username"></label><label>Contraseña<input v-model="login.password" name="password" type="password" required autocomplete="current-password"></label><button type="submit" :disabled="busy==='login'">Iniciar sesión</button></form>
        <button id="password-reset" type="button" class="quiet" @click="openRecovery">Recuperar / crear contraseña</button>
        <p class="hint">Usa el mismo correo que tiene asignada tu compañía. Tus permisos dependen del correo verificado, sin importar si entras con Google o contraseña.</p>
        <button id="show-register" type="button" class="quiet" @click="show();showPanel('register')">Crear mi usuario</button>
      </div>
      <div v-show="activePanel==='recovery'" id="recovery-panel" data-auth-panel><h3>Recuperar o crear contraseña</h3><p>Escribe el correo de tu cuenta. No necesitas recordar tu contraseña actual.</p><form id="recovery-form" @submit.prevent="submitRecovery"><label>Correo de tu cuenta<input v-model="recoveryEmail" name="email" type="email" required maxlength="254" autocomplete="username"></label><button type="submit" id="recovery-submit" :disabled="busy==='recovery'">{{ useEmulators?'Probar solicitud de recuperación':'Solicitar enlace' }}</button></form><button type="button" class="quiet" data-back-login @click="show();showPanel('login')">Volver a iniciar sesión</button></div>
      <div v-show="activePanel==='register'" id="register-panel" data-auth-panel><h3>Registro de usuario</h3><form id="register-form" @submit.prevent="submitRegistration"><div class="two"><label>Nombres<input v-model="registration.firstName" name="firstName" maxlength="80" required autocomplete="given-name"></label><label>Apellidos<input v-model="registration.lastName" name="lastName" maxlength="80" required autocomplete="family-name"></label><label>Tipo de identificación<select v-model="registration.documentType" name="documentType"><option value="CC">Cédula</option><option value="CE">Cédula de extranjería</option><option value="PASAPORTE">Pasaporte</option></select></label><label>Número de identificación<input v-model="registration.identification" name="identification" minlength="5" maxlength="30" required pattern="[A-Za-z0-9-]{5,30}"></label><label>Teléfono<input v-model="registration.phone" name="phone" type="tel" maxlength="30" required autocomplete="tel"></label><label>Cargo<input v-model="registration.jobTitle" name="jobTitle" maxlength="100" required></label></div><label>Usuario (correo electrónico)<input v-model="registration.email" name="email" type="email" maxlength="254" required autocomplete="username"></label><label>Contraseña (mínimo 12 caracteres)<input v-model="registration.password" name="password" type="password" minlength="12" required autocomplete="new-password"></label><label>Repetir contraseña<input v-model="registration.confirmPassword" name="confirmPassword" type="password" minlength="12" required autocomplete="new-password"></label><p class="hint">Estos datos identifican al responsable de las operaciones. El registro no concede acceso a empresas; una administradora debe asignarlo.</p><button type="submit" :disabled="busy==='register'">Crear usuario</button></form><button type="button" class="quiet" data-back-login @click="show();showPanel('login')">Ya tengo una cuenta</button></div>
      <div v-show="activePanel==='verify'" id="verify-panel" data-auth-panel><h3>Verifica tu correo</h3><p id="verify-email">{{ verifyEmail }}</p><p>Abre el enlace de verificación que enviamos a tu correo antes de acceder a las empresas.</p><button id="verify-check" :disabled="busy==='verify-check'" @click="checkVerification">Ya verifiqué mi correo</button><button id="verify-resend" class="quiet" :disabled="busy==='verify-resend'" @click="resendVerification">Reenviar enlace</button><button data-signout class="quiet" @click="logout">Salir</button></div>
      <div v-show="activePanel==='profile'" id="profile-panel" data-auth-panel><h3>Completa tu ficha de usuario</h3><p>Conservaremos tu cuenta y tus permisos actuales.</p><form id="profile-form" @submit.prevent="submitProfile"><div class="two"><label>Nombres<input v-model="profile.firstName" name="firstName" maxlength="80" required autocomplete="given-name"></label><label>Apellidos<input v-model="profile.lastName" name="lastName" maxlength="80" required autocomplete="family-name"></label><label>Tipo de identificación<select v-model="profile.documentType" name="documentType"><option value="CC">Cédula</option><option value="CE">Cédula de extranjería</option><option value="PASAPORTE">Pasaporte</option></select></label><label>Número de identificación<input v-model="profile.identification" name="identification" minlength="5" maxlength="30" required pattern="[A-Za-z0-9-]{5,30}"></label><label>Teléfono<input v-model="profile.phone" name="phone" type="tel" maxlength="30" required autocomplete="tel"></label><label>Cargo<input v-model="profile.jobTitle" name="jobTitle" maxlength="100" required></label></div><button type="submit" :disabled="busy==='profile'">Guardar mi ficha y continuar</button></form><button data-signout class="quiet" @click="logout">Salir</button></div>
      <div v-show="activePanel==='existing'" id="existing-panel" data-auth-panel><h3>Configura tu acceso con contraseña</h3><p id="existing-email">{{ existingEmail }}</p><p>Tu cuenta ya existe. Crea tu contraseña desde un enlace enviado a tu correo; conservarás tus empresas y permisos.</p><button id="existing-reset" @click="run('existing',()=>requestRecovery(auth.currentUser.email))">Enviar enlace para crear contraseña</button><button data-signout class="quiet" @click="logout">Volver al inicio de sesión</button></div>
      <p class="hint">Tu sesión se recuerda en este navegador. Puedes cerrarla desde tu espacio de trabajo.</p>
    </section>
  </main>
  <footer class="landing-footer"><span>Una gestión conectada, clara y trazable.</span><span>Sigmyp · Sistema Integrado de Gestión para Micro y Pequeñas Empresas</span></footer>
</template>
