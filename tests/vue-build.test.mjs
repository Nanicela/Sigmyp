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

  const currentApp = await readFile(join(project, 'web/app.html'), 'utf8');
  const generatedApp = await readFile(join(project, 'vue/src/generated/AppShell.vue'), 'utf8');
  assert.deepEqual(ids(generatedApp), ids(currentApp), 'la plantilla Vue debe conservar todos los controles identificados');

  const sourcePages = (await readdir(join(project, 'web/process-map'))).filter(file => file.endsWith('.html')).sort();
  const builtPages = (await readdir(join(output, 'procesos'))).filter(file => file.endsWith('.html')).sort();
  assert.deepEqual(builtPages, sourcePages);
  for (const file of builtPages) {
    const html = await readFile(join(output, 'procesos', file), 'utf8');
    assert.match(html, /id="process-app"/);
    assert.match(html, /assets\/process-main-[^".]+\.js/);
    const source = await readFile(join(project, 'web/process-map', file), 'utf8');
    const shell = await readFile(join(project, 'vue/src/generated/process', file.replace(/\.html$/, '.vue')), 'utf8');
    assert.deepEqual(ids(shell), ids(source), `${file} debe conservar sus controles`);
  }

  assert.equal(JSON.parse(await readFile(join(output, 'firebase-config.json'), 'utf8')).firebase.projectId, 'demo-facturacion');
});
