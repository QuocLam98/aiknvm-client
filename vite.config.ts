import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none'
    }
  },
  plugins: [
    vue(),
    // Only enable Vue DevTools in development to avoid heavy injections in prod builds
    ...(mode === 'development' ? [vueDevTools()] : []),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    // Avoid extra CPU time calculating gzip/brotli sizes in CI/build servers
    reportCompressedSize: false,
    chunkSizeWarningLimit: 2000,
    // Let Vite/Rollup decide chunking to avoid potential init order issues
  }
}))
