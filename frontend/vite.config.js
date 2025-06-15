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

  // Only add the VitePWA plugin for production builds.
  if (mode === 'production') {
    plugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        // ✅ FIXED: Let the plugin handle registration automatically in production.
        // This will inject the necessary script into your index.html during build.
        injectRegister: 'auto',
        
        srcDir: 'src',
        filename: 'sw.js',
        manifest: {
          name: 'Collabash',
          short_name: 'Collabash',
          description: 'Collaborative Pot Management Application',
          theme_color: '#1abc9c',
          icons: [
            {
              src: 'images/pwa-192x192.png', // Assuming icons are in public/images
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'images/pwa-512x512.png', // Assuming icons are in public/images
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    );
  }

  return {
    plugins: plugins,
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
