import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const project = new URL('../', import.meta.url).pathname;
const nodeBin = process.execPath;

const ids = text => new Set([...text.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));

test('Vue compila las dos entradas y todas las vistas de procesos sin perder controles', async t => {
  const output = await mkdtemp(join(tmpdir(), 'sigmyp-vue-'));
  t.after(() => rm(output, { recursive: true, force: true }));
  const result = spawnSync(nodeBin, ['scripts/build.mjs'], {
    cwd: project,
    env: { ...process.env, BUILD_DIR: output, FIREBASE_WEB_CONFIG: 'web/firebase-config.example.json' },
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const [index, app] = await Promise.all([
    readFile(join(output, 'index.html'), 'utf8'),
    readFile(join(output, 'app.html'), 'utf8')
  ]);
  assert.match(index, /id="app"/);
  assert.match(app, /id="app"/);
  assert.match(index, /assets\/index-[^".]+\.js/);
  assert.match(app, /assets\/app-[^".]+\.js/);

  const currentLanding = await readFile(join(project, 'web/index.html'), 'utf8');
  const vueLanding = await readFile(join(project, 'vue/src/components/auth/AuthLanding.vue'), 'utf8');
  assert.deepEqual(ids(vueLanding), ids(currentLanding), 'el módulo Vue de acceso debe conservar todos los formularios y controles');
  assert.doesNotMatch(await readFile(join(project, 'vue/src/landing-main.js'), 'utf8'), /web\/landing\.js/);
  assert.match(vueLanding, /signInWithPopup\(auth, provider\)/, 'localhost debe iniciar Google en una ventana compatible con el servidor local');
  assert.match(vueLanding, /signInWithRedirect\(auth, provider\)/, 'Hosting debe conservar el retorno por redirección configurado');

  const currentApp = await readFile(join(project, 'web/app.html'), 'utf8');
  const generatedApp = await readFile(join(project, 'vue/src/generated/AppShell.vue'), 'utf8');
  assert.deepEqual(ids(generatedApp), ids(currentApp), 'la plantilla Vue debe conservar todos los controles identificados');
  const [appMain, appHeader, companyChooser, companyProfile, companyBridge, userAccess, accessBridge] = await Promise.all([
    readFile(join(project, 'vue/src/app-main.js'), 'utf8'),
    readFile(join(project, 'vue/src/components/app/AppHeader.vue'), 'utf8'),
    readFile(join(project, 'vue/src/components/app/CompanyChooser.vue'), 'utf8'),
    readFile(join(project, 'vue/src/components/company/CompanyProfile.vue'), 'utf8'),
    readFile(join(project, 'web/profiles.js'), 'utf8'),
    readFile(join(project, 'vue/src/components/users/UserAccess.vue'), 'utf8'),
    readFile(join(project, 'web/access.js'), 'utf8')
  ]);
  assert.match(appMain, /createApp\(AppHeader\)/);
  assert.match(appMain, /createApp\(CompanyChooser\)/);
  for (const id of ['account-actions','account-trigger','account-menu','account-profile','account-company','account-users','logout'])
    assert.match(appHeader, new RegExp(`id="${id}"`), `el encabezado Vue debe conservar ${id}`);
  for (const id of ['company','identity'])
    assert.match(companyChooser, new RegExp(`id="${id}"`), `el selector Vue debe conservar ${id}`);
  assert.match(appMain, /createApp\(CompanyProfile\)/);
  for (const id of ['profile-status','tax-form','company-profile-dialog-title','company-profile-status'])
    assert.match(companyProfile, new RegExp(`id="${id}"`), `los datos de empresa Vue deben conservar ${id}`);
  for (const action of ['view','edit'])
    assert.match(companyProfile, new RegExp(`data-company-profile-action="${action}"`), `la ficha Vue debe exponer la acción ${action}`);
  assert.match(companyBridge, /document\.addEventListener\('click'/, 'el puente debe conservar acciones tras un nuevo render de Vue');
  assert.match(companyBridge, /company-profile-status/, 'el guardado debe mostrar confirmación o error en el modal Vue');
  assert.match(appMain, /createApp\(UserAccess\)/);
  for (const id of ['registered-users','registered-users-list','access-list','access-form','user-access-dialog-title','user-access-status'])
    assert.match(userAccess, new RegExp(`id="${id}"`), `usuarios y permisos Vue debe conservar ${id}`);
  for (const action of ['assign','view','edit','remove','registered-view','close'])
    assert.match(userAccess, new RegExp(`data-user-access-action="${action}"`), `usuarios y permisos Vue debe exponer ${action}`);
  assert.match(accessBridge, /window\.__sigmypUserAccess/);
  assert.match(accessBridge, /renderRegistered/);

  const sourcePages = (await readdir(join(project, 'web/process-map'))).filter(file => file.endsWith('.html')).sort();
  const builtPages = (await readdir(join(output, 'procesos'))).filter(file => file.endsWith('.html')).sort();
  assert.deepEqual(builtPages, sourcePages);
  for (const file of builtPages) {
    const html = await readFile(join(output, 'procesos', file), 'utf8');
    assert.match(html, /id="process-app"/);
    assert.match(html, /assets\/process-main-[^".]+\.js/);
    if (file !== 'index.html') {
      const source = await readFile(join(project, 'web/process-map', file), 'utf8');
      const shell = await readFile(join(project, 'vue/src/generated/process', file.replace(/\.html$/, '.vue')), 'utf8');
      assert.deepEqual(ids(shell), ids(source), `${file} debe conservar sus controles`);
    }
  }

  const processMap = await readFile(join(project, 'vue/src/components/processes/ProcessMap.vue'), 'utf8');
  for (const page of ['planeacion','mejora-continua','comercial','desarrollo','compras','produccion','talento-humano','sg-sst','financiera'])
    assert.match(processMap, new RegExp(`href:'${page}\\.html'`), `el mapa Vue debe conservar ${page}`);
  assert.match(await readFile(join(project, 'vue/src/process-main.js'), 'utf8'), /file === 'index\.html' \? \[\] : page\.scripts/);

  assert.equal(JSON.parse(await readFile(join(output, 'firebase-config.json'), 'utf8')).firebase.projectId, 'demo-facturacion');
});
