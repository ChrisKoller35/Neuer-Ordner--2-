import { defineConfig } from 'vite';

export default defineConfig({
  root: './',
  base: './',
  server: {
    port: 3001,
    open: '/index.html'
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  publicDir: 'public'
});
