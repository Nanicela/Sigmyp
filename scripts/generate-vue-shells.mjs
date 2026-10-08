import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const logoHash = createHash('sha256').update(await readFile('web/logo-sigmyp.png')).digest('hex').slice(0, 16);

const pages = [
  ['web/index.html', 'vue/src/generated/LandingShell.vue'],
  ['web/app.html', 'vue/src/generated/AppShell.vue']
];

await mkdir('vue/src/generated', { recursive: true });

for (const [source, destination] of pages) {
  const html = await readFile(source, 'utf8');
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (!body) throw new Error(`No se encontró el cuerpo de ${source}.`);
  const template = body[1].trim().replaceAll('/logo-sigmyp.png', `/logo-sigmyp.png?v=${logoHash}`);
  await writeFile(destination, `<template>\n${template}\n</template>\n`);
}

const processSource = 'web/process-map';
const processVuePages = 'vue/procesos';
const processVueShells = 'vue/src/generated/process';
await mkdir(processVuePages, { recursive: true });
await mkdir(processVueShells, { recursive: true });

const processPages = (await readdir(processSource)).filter(file => file.endsWith('.html')).sort();
const processConfiguration = {};

for (const file of processPages) {
  const html = await readFile(`${processSource}/${file}`, 'utf8');
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  const body = html.match(/<body\b([^>]*)>([\s\S]*?)<\/body>/i);
  if (!head || !body) throw new Error(`No se pudo convertir ${file} a una vista Vue.`);

  const scripts = [...head[1].matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/gi)]
    .map(match => match[1].split('?')[0])
    .filter(source => !source.startsWith('/process-auth'));
  const bodyClass = body[1].match(/\bclass="([^"]*)"/i)?.[1] || '';
  processConfiguration[file] = { scripts, bodyClass };

  await writeFile(`${processVueShells}/${file.replace(/\.html$/, '')}.vue`, `<template>\n${body[2].trim()}\n</template>\n`);
  const safeHead = head[1].replace(/<script\b[\s\S]*?<\/script>/gi, '');
  await writeFile(`${processVuePages}/${file}`, `<!doctype html>\n<html lang="es">\n<head>${safeHead}<script type="module" src="/src/process-main.js"></script></head>\n<body class="${bodyClass}"><div id="process-app"></div></body>\n</html>\n`);
}

await writeFile('vue/src/generated/process-pages.js', `export default ${JSON.stringify(processConfiguration, null, 2)};\n`);

console.log('Plantillas Vue generadas desde las vistas vigentes.');
