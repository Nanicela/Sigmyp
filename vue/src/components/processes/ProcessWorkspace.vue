<script setup>
import { computed } from 'vue';
import { modulesForProcess } from '../../domain/module-catalog.js';
import { processById } from '../../domain/process-catalog.js';

const props = defineProps({ processId: { type: String, required: true } });
const process = computed(() => processById(props.processId));
const modules = computed(() => modulesForProcess(props.processId));
</script>

<template>
  <p class="section-caption">OPERACIÓN DEL PROCESO</p>
  <h2>Herramientas de {{ process?.name || 'este proceso' }}</h2>
  <p class="process-workspace-intro">Accede a las funciones disponibles para la compañía seleccionada.</p>
  <div class="process-workspace-grid">
    <article v-for="module in modules" :key="module.id" class="process-workspace-card">
      <div>
        <span class="card-category">SIGMYP</span>
        <h3>{{ module.label }}</h3>
      </div>
      <a class="process-workspace-link" :href="`/app.html#${module.route}`" target="_top">Abrir</a>
    </article>
  </div>
</template>
