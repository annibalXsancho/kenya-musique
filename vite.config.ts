import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// PB_PROXY permet de viser un autre serveur PocketBase (tests).
const pbTarget = process.env.PB_PROXY ?? 'http://127.0.0.1:8090';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@core': fileURLToPath(new URL('./src/core', import.meta.url)) },
  },
  server: {
    port: 5173,
    // L'app parle à PocketBase sur sa propre origine (aussi depuis l'iPhone via l'IP du Mac).
    proxy: {
      '/api': pbTarget,
      '/_': pbTarget,
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
