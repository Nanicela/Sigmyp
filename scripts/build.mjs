import { build } from 'esbuild';
import { cp, mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const file = process.env.FIREBASE_WEB_CONFIG || 'web/firebase-config.example.json';
const config = JSON.parse(await readFile(file, 'utf8'));
if (config.useEmulators !== true && ((!config.appCheckSiteKey && config.mode !== 'spark') || config.firebase.projectId.startsWith('demo-')))
  throw new Error('Un build real requiere projectId real y App Check configurado.');
const outputDir = process.env.BUILD_DIR || 'dist';
await mkdir(outputDir, { recursive: true });
await build({ entryPoints: ['web/app.js', 'web/landing.js', 'web/process-auth.js'], bundle: true, minify: true, outdir: outputDir, target: ['es2022'] });
for (const file of ['index.html', 'app.html', 'style.css', 'logo-sigmyp.png']) await copyFile(`web/${file}`, `${outputDir}/${file}`);
await cp('web/process-map', `${outputDir}/procesos`, { recursive: true });
// Keep existing browser caches from mixing old scripts with a new page.
for (const page of ['index.html', 'app.html']) {
  let html = await readFile(`${outputDir}/${page}`, 'utf8');
  for (const asset of ['landing.js', 'app.js', 'style.css', 'logo-sigmyp.png']) {
    const hash = createHash('sha256').update(await readFile(`${outputDir}/${asset}`)).digest('hex').slice(0, 16);
    html = html.replaceAll(`"/${asset}"`, `"/${asset}?v=${hash}"`);
  }
  await writeFile(`${outputDir}/${page}`, html);
}
await writeFile(`${outputDir}/firebase-config.json`, JSON.stringify(config));
console.log(`Build terminado para ${config.firebase.projectId} (${config.useEmulators ? 'emuladores' : 'proyecto real'}).`);
