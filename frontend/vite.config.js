import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const plugins = [
    react(),
    eslint({
      lintOnStart: true,
      failOnError: mode === 'production',
    }),
  ];

  // Only add the VitePWA plugin for production builds.
  if (mode === 'production') {
    plugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          // A list of all files to precache. `globPatterns` is a good default.
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          
          // ✅ FIXED: Define all runtime caching and background sync rules here.
          runtimeCaching: [
            {
              // Caching strategy for API GET requests
              urlPattern: ({ url }) => url.pathname.startsWith('/api/') && url.request.method === 'GET',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 24 * 60 * 60, // 1 Day
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Background Sync for non-GET requests to the API
              urlPattern: ({ url }) => url.pathname.startsWith('/api/') && url.request.method !== 'GET',
              handler: 'NetworkOnly', // Try network first
              options: {
                backgroundSync: {
                  name: 'api-mutation-queue',
                  options: {
                    maxRetentionTime: 24 * 60, // Retry for up to 24 hours
                  },
                },
              },
            },
          ],
        },
        manifest: {
          name: 'Collabash',
          short_name: 'Collabash',
          description: 'Collaborative Pot Management Application',
          theme_color: '#1abc9c',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      })
    );
  }

  return {
    plugins,
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  };
});