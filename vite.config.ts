import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'src/test/setup.ts',
    coverage: {
      reporter: ['text', 'html'],
      provider: 'v8'
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'audio-processing': ['essentia.js', 'meyda', 'tone'],
          'ui-components': ['react', 'react-dom', 'framer-motion'],
          'export': ['html2canvas', '@tonejs/midi', 'lamejs']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['essentia.js']
  }
})
