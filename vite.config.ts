import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // Tauri expects a fixed port, fail if that port is not available
  server: {
    proxy: { '/api/cloud': 'http://127.0.0.1:5175' },
    port: 5173,
    strictPort: true,
  },
  preview: { proxy: { '/api/cloud': 'http://127.0.0.1:5175' } },
  build: {
    outDir: 'dist',
    target: 'esnext',
  },
})

