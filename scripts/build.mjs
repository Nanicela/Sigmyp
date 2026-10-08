import { build as viteBuild } from 'vite';
import { cp, mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import './generate-vue-shells.mjs';
const file = process.env.FIREBASE_WEB_CONFIG || 'web/firebase-config.example.json';
const config = JSON.parse(await readFile(file, 'utf8'));
if (config.useEmulators !== true && ((!config.appCheckSiteKey && config.mode !== 'spark') || config.firebase.projectId.startsWith('demo-')))
  throw new Error('Un build real requiere projectId real y App Check configurado.');
const outputDir = process.env.BUILD_DIR || 'dist';
await mkdir(outputDir, { recursive: true });
await viteBuild({ configFile: 'vite.config.js' });
for (const file of ['style.css', 'logo-sigmyp.png']) await copyFile(`web/${file}`, `${outputDir}/${file}`);
await cp('web/process-map', `${outputDir}/procesos`, { recursive: true, filter: source => !source.endsWith('.html') });
await writeFile(`${outputDir}/firebase-config.json`, JSON.stringify(config));
console.log(`Build Vue terminado para ${config.firebase.projectId} (${config.useEmulators ? 'emuladores' : 'proyecto real'}).`);
