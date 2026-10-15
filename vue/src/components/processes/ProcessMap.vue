<script setup>
import { processGroups as groups } from '../../domain/process-catalog.js';

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
</script>

<template>
  <header class="site-header"><div class="brand" aria-label="DyD"><span class="brand-logo"><img src="logo-dyd-blanco.png" alt="Dinámica y Desarrollo — Ingeniamos soluciones" width="1597" height="985"></span><span class="brand-divider"></span><span class="brand-label">Gestión por procesos</span></div><div class="header-actions"><span class="header-label">MAPA DE PROCESOS</span><a class="app-return" href="/app.html#procesos">Volver a SIGMYP</a></div></header>
  <main>
    <div class="intro"><div class="map-title"><p class="eyebrow">SISTEMA DE GESTIÓN</p><h1>Mapa de <span>procesos</span></h1><p class="instruction"><span aria-hidden="true">↗</span> Selecciona un proceso para consultar su caracterización</p></div><div class="map-meta"><strong>03 <span>grupos</span></strong><span class="meta-divider"></span><strong>09 <span>procesos</span></strong></div></div>
    <div class="map" aria-label="Mapa de procesos de DyD">
      <aside class="value value-input"><span class="value-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2"/></svg></span><p>Necesidades y expectativas de los grupos de valor</p><span class="flow-line" aria-hidden="true"></span><span class="value-caption">PUNTO DE PARTIDA</span></aside>
      <div class="process-groups">
        <section v-for="group in groups" :key="group.number" class="process-group" :class="group.className" :aria-labelledby="`group-${group.number}`"><div class="group-heading"><span class="group-number">{{ group.number }}</span><h2 :id="`group-${group.number}`">{{ group.title }}</h2><span class="group-count">{{ group.processes.length }} procesos</span></div><div class="nodes" :class="group.nodesClass"><a v-for="process in group.processes" :key="process.href" class="node" :href="process.href" :aria-label="`${process.name}: ver caracterización`"><span class="node-icon-wrap"><svg class="node-icon" viewBox="0 0 24 24" aria-hidden="true" v-html="icons[process.icon]"></svg></span><span class="node-name">{{ process.name }}</span></a></div></section>
      </div>
      <aside class="value value-output"><span class="value-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg></span><p>Satisfacción de los grupos de valor</p><span class="flow-line" aria-hidden="true"></span><span class="value-caption">VALOR GENERADO</span></aside>
    </div>
    <div class="improvement" aria-hidden="true"><span></span><svg viewBox="0 0 24 24"><path d="M4 9a8 8 0 1 1 0 7M4 4v5h5"/></svg><p>Mejora continua</p><span></span></div>
    <footer><span>DyD <span class="footer-dot">/</span> Gestión por procesos</span><span>Conectamos procesos. Generamos valor.</span></footer>
  </main>
</template>
