import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, getIdTokenResult, onAuthStateChanged } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getFirestore } from 'firebase/firestore';
import { isDydCompany } from './process-access.js';

async function guardProcessMap() {
  try {
    const embeddedInApp = window.self !== window.top
      && window.parent.location.origin === window.location.origin
      && window.parent.document.documentElement.dataset.authenticated === 'true'
      && window.parent.document.documentElement.dataset.processesAllowed === 'true';
    if (embeddedInApp) {
      document.body.classList.add('process-embedded');
      document.body.classList.remove('process-auth-pending');
      return;
    }
  } catch {
    // Si la página contenedora no se puede consultar, validamos con Firebase.
  }

  const response = await fetch('/firebase-config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo cargar la configuración de acceso.');
  const config = await response.json();
  const app = initializeApp(config.firebase);
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (config.useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8181);
  }
  onAuthStateChanged(auth, async user => {
    if (!user) {
      window.top.location.replace('/');
      return;
    }
    try {
      const token = await getIdTokenResult(user);
      if (token.claims.platformAdmin === true) {
        document.body.classList.remove('process-auth-pending');
        return;
      }
      const assignment = await getDoc(doc(db, 'companyAssignments', user.email));
      if (!assignment.exists()) throw new Error('Sin compañía asignada.');
      if (!isDydCompany(assignment.data().companyId)) throw new Error('Sin acceso al mapa.');
      document.body.classList.remove('process-auth-pending');
    } catch {
      window.top.location.replace('/');
    }
  });
}

guardProcessMap().catch(() => window.top.location.replace('/'));
