import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';

const outputDir = resolve(process.cwd(), process.env.BUILD_DIR || 'dist');
const processInputs = Object.fromEntries(
  readdirSync(resolve(process.cwd(), 'vue/procesos'))
    .filter(file => file.endsWith('.html'))
    .map(file => [`process-${file.replace(/\.html$/, '')}`, resolve(process.cwd(), 'vue/procesos', file)])
);

export default defineConfig({
  root: resolve(process.cwd(), 'vue'),
  publicDir: false,
  plugins: [vue({ template: { transformAssetUrls: false } })],
  build: {
    outDir: outputDir,
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        index: resolve(process.cwd(), 'vue/index.html'),
        app: resolve(process.cwd(), 'vue/app.html'),
        ...processInputs
      }
    }
  }
});
