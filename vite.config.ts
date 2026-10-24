import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Chemins relatifs : l'app fonctionne sous https://<pseudo>.github.io/<dépôt>/ comme à la racine.
  base: './',
  plugins: [
    react(),
    // PWA : app installable et utilisable sans réseau (le shell est mis en cache ; les données sont dans Dexie).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Outil',
        short_name: 'Outil',
        description: 'Pilotage du programme de travail musical',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: { '@core': fileURLToPath(new URL('./src/core', import.meta.url)) },
  },
  server: { port: 5173, host: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
