import { defineConfig } from 'vite';

const basePath = process.env.VITE_BASE_PATH || '/';
const apiUrl = process.env.VITE_API_URL || 'http://localhost:3333';

export default defineConfig({
  base: basePath,
  server: {
    open: true,
    proxy: {
      '/api': {
        target: apiUrl,
        changeOrigin: true,
      },
      '/proxy/google': {
        target: 'https://maps.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/google/, ''),
      },
      '/proxy/foursquare': {
        target: 'https://api.foursquare.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/foursquare/, ''),
      },
      '/proxy/overpass': {
        target: 'https://overpass-api.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/overpass/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
