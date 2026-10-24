import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

// PB_PROXY permet de viser un autre serveur PocketBase (tests).
const pbTarget = process.env.PB_PROXY ?? 'http://127.0.0.1:8090';

export default defineConfig({
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
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // L'API et l'admin PocketBase ne passent jamais par le cache de navigation.
        navigateFallbackDenylist: [/^\/api\//, /^\/_\//],
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
      },
    }),
  ],
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
