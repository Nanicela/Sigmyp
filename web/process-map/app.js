// El catálogo conserva el orden del mapa. Cada slug identifica su futura caracterización.
const groups = [
  { target: 'strategic-nodes', processes: [
    ['planeacion-y-direccionamiento', 'Gestión de planeación y direccionamiento', 'compass'],
    ['mejora-continua', 'Gestión de mejora continua', 'cycle']
  ]},
  { target: 'mission-nodes', processes: [
    ['comercial', 'Gestión comercial', 'handshake'],
    ['desarrollo', 'Gestión de Desarrollo', 'layers'],
    ['compras', 'Gestión de Compras', 'bag'],
    ['produccion', 'Gestión de Producción', 'factory']
  ]},
  { target: 'support-nodes', processes: [
    ['talento-humano', 'Gestión del Talento Humano', 'people'],
    ['sg-sst', 'SG-SST', 'shield'],
    ['financiera', 'Gestión Financiera', 'chart']
  ]}
];
const icons = {
  compass: '<circle class="icon-soft" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="8.25"/><path class="icon-accent" d="m15.9 8.1-2.25 5.55-5.55 2.25 2.25-5.55z"/><path d="m15.9 8.1-2.25 5.55-5.55 2.25 2.25-5.55z"/>',
  cycle: '<circle class="icon-soft" cx="12" cy="12" r="9"/><path d="M5 9a7.5 7.5 0 0 1 12.7-2.3L20 9M20 5v4h-4M19 15a7.5 7.5 0 0 1-12.7 2.3L4 15M4 19v-4h4"/><path class="icon-accent" d="M12 8.7 13 11l2.3 1-2.3 1-1 2.3-1-2.3-2.3-1 2.3-1z"/>',
  handshake: '<path class="icon-soft" d="M2.5 8.2 6.3 4.5l4.1 1 3.2-1 7.9 4.7-3.2 8.2-4 1.8-8.2-4.7z"/><path d="m2.5 8.2 3.8-3.7 4.1 1 3.2-1 7.9 4.7-3.2 8.2-4 1.8-8.2-4.7zM10.4 5.5l-3.1 4.1c-.7 1 .7 2.4 1.8 1.9l3.3-2 5.7 4.9M5.1 13.9l2.1-2.1m1 5.2 2.1-2.1m1.2 3.4 1.9-1.9"/>',
  layers: '<path class="icon-soft" d="m12 3 9 4.5-9 4.5-9-4.5z"/><path d="m12 3 9 4.5-9 4.5-9-4.5zM3 12l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5"/><path class="icon-accent" d="m12 6.2 2.6 1.3L12 8.8 9.4 7.5z"/>',
  bag: '<path class="icon-soft" d="M4 8h16l-1 13H5z"/><path d="M4 8h16l-1 13H5zM8.5 10V6.5a3.5 3.5 0 0 1 7 0V10"/><path d="m9 15 2 2 4-4"/>',
  factory: '<path class="icon-soft" d="M3 21V8h4v6l6-4v4l8-5v12z"/><path d="M3 21V8h4v6l6-4v4l8-5v12zM7 18h2m3 0h2m3 0h2M4.5 4h2v4"/><path class="icon-accent" d="M16.5 12.8 20 10.7V20h-3.5z"/>',
  people: '<circle class="icon-soft" cx="9" cy="7.5" r="3.5"/><circle cx="9" cy="7.5" r="3"/><path d="M2.5 21v-2.4a6.5 6.5 0 0 1 13 0V21M16.5 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3.5 4.8V21"/><path class="icon-accent" d="M5 19a4 4 0 0 1 8 0v1H5z"/>',
  shield: '<path class="icon-soft" d="m12 2.5 8 3.2v6.1c0 5.2-4.1 8.2-8 9.7-3.9-1.5-8-4.5-8-9.7V5.7z"/><path d="m12 2.5 8 3.2v6.1c0 5.2-4.1 8.2-8 9.7-3.9-1.5-8-4.5-8-9.7V5.7zM7.2 12h2.4l1.2-2.6 2.1 5.2 1.3-2.6h2.6"/>',
  chart: '<rect class="icon-soft" x="3" y="3" width="18" height="18" rx="4"/><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 17v-3m5 3V9m5 8v-6M6.5 10.5 10 7l3 2 4.5-4"/><circle class="icon-accent" cx="17.5" cy="5" r="1.5"/>'
};
const catalog = new Map();
for (const group of groups) {
  const container = document.getElementById(group.target);
  for (const [slug, name, icon] of group.processes) {
    catalog.set(slug, name);
    const link = document.createElement('a');
    link.className = 'node';
    link.href = slug === 'planeacion-y-direccionamiento' ? 'planeacion.html' : slug === 'mejora-continua' ? 'mejora-continua.html' : slug === 'comercial' ? 'comercial.html' : slug === 'desarrollo' ? 'desarrollo.html' : slug === 'compras' ? 'compras.html' : slug === 'produccion' ? 'produccion.html' : slug === 'talento-humano' ? 'talento-humano.html' : ['financiera','sg-sst'].includes(slug) ? slug + '.html' : '#/procesos/' + slug;
    link.setAttribute('aria-label', name + ': ver caracterización');
    if (!['planeacion-y-direccionamiento','mejora-continua','comercial','desarrollo','compras','produccion','talento-humano','financiera','sg-sst'].includes(slug)) link.setAttribute('aria-haspopup', 'dialog');
    link.innerHTML = '<span class="node-icon-wrap"><svg class="node-icon" viewBox="0 0 24 24" aria-hidden="true">' + icons[icon] + '</svg></span><span class="node-name"></span>';
    link.querySelector('.node-name').textContent = name;
    container.append(link);
  }
}
const dialog = document.getElementById('process-dialog');
let activeLink;
function syncRoute() {
  const slug = location.hash.replace('#/procesos/', '');
  if (slug === 'planeacion-y-direccionamiento') { location.replace('planeacion.html'); return; }
  if (slug === 'mejora-continua') { location.replace('mejora-continua.html'); return; }
  if (slug === 'comercial') { location.replace('comercial.html'); return; }
  if (slug === 'desarrollo') { location.replace('desarrollo.html'); return; }
  if (slug === 'compras') { location.replace('compras.html'); return; }
  if (slug === 'produccion') { location.replace('produccion.html'); return; }
  if (slug === 'talento-humano') { location.replace('talento-humano.html'); return; }
  if (['financiera','sg-sst'].includes(slug)) { location.replace(slug+'.html'); return; }
  if (slug === 'recursos-fisicos') { location.replace('sg-sst.html'); return; }
  if (catalog.has(slug)) {
    activeLink = document.querySelector('a[href="#/procesos/' + slug + '"]');
    document.getElementById('dialog-title').textContent = catalog.get(slug);
    if (!dialog.open) dialog.showModal();
  } else if (dialog.open) dialog.close();
}
document.getElementById('back-button').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r=dialog.getBoundingClientRect(); if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) dialog.close(); }});
dialog.addEventListener('close', () => {
  if (location.hash.startsWith('#/procesos/')) history.replaceState(null, '', location.pathname + location.search);
  activeLink?.focus({preventScroll:true});
});
window.addEventListener('hashchange', syncRoute);
syncRoute();
