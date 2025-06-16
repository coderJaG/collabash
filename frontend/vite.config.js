import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';


export default defineConfig(({ mode }) => {
  const plugins = [
    react(),
    eslint({
      lintOnStart: true,
      failOnError: mode === 'production',
    }),
  ];
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