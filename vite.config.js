import { defineConfig } from 'vite';

export default defineConfig({
  root: './',
  base: './',
  server: {
    port: 3001,
    open: '/index.html',
    // tools/ Ordner nicht vom Dev-Server beobachten
    watch: {
      ignored: ['**/tools/**']
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    // tools/ nicht in den Build einschließen
    rollupOptions: {
      external: [/^\.\/tools\/.*/]
    }
  },
  publicDir: 'public'
});
