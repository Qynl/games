import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CREATOR — Vite configuration.
// The dev server proxies /ollama -> the local Ollama API so the web app never
// hits CORS issues when talking to Ollama from a browser origin.
// You can also point CREATOR at a direct Ollama endpoint (Settings panel).
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    proxy: {
      '/ollama': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
  },
})
