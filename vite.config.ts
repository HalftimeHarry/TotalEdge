import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api/npoint': {
        target: 'https://api.npoint.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/npoint/, ''),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
});
