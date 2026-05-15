import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => ({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
    },
  },
  build: {
    outDir: '../frontend_build',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        assetFileNames: 'static/[name]-[hash][extname]',
        chunkFileNames: 'static/[name]-[hash].js',
        entryFileNames: 'static/[name]-[hash].js',
      },
    },
  },
}))
