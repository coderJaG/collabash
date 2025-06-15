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
        // ✅ NEW: Let VitePWA generate the service worker, and we will inject our custom logic.
        workbox: {
          // A list of all files to precache. `globPatterns` is a good default.
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          // ✅ NEW: This line will import our custom logic into the generated service worker.
          importScripts: ['sw-custom.js'], 
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