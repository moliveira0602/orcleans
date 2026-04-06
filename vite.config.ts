import { defineConfig } from 'vite';

// Base path for subdomain deployment
// Set via .env file VITE_BASE_PATH or default to '/'
const basePath = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  server: {
    proxy: {
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
    sourcemap: false, // Disable source maps in production for security
  },
});
