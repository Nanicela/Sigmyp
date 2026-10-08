// Solo crea identidad ficticia en Firebase Emulator Suite.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const app = initializeApp({ projectId: 'demo-facturacion' });
const auth = getAuth(app), uid = 'demo-operator';
try { await auth.getUser(uid); }
catch (e) {
  if (e.code !== 'auth/user-not-found') throw e;
  await auth.createUser({ uid, email: 'demo@example.test', password: 'DemoFirebase123!', emailVerified: true });
}
await auth.setCustomUserClaims(uid, { platformAdmin: true });
console.log('Usuario ficticio preparado únicamente en el emulador.');
