import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const plugins = [
    react(),
    eslint({
      lintOnStart: true,
      failOnError: mode === "production"
    })
  ];

  // ✅ FIXED: Only add the VitePWA plugin for production builds.
  // This prevents it from conflicting with other service workers like MSW during development.
  if (mode === 'production') {
    plugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        srcDir: 'src',
        filename: 'sw.js',
        manifest: {
          name: 'Collabash',
          short_name: 'Collabash',
          description: 'Collaborative Pot Management Application',
          theme_color: '#1abc9c',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    );
  }

  return {
    plugins: plugins, // Use the conditionally built plugins array
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true
        }
      }
    }
  };
});
