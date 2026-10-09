import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { transform } from 'lightningcss'
import { defineConfig } from 'vite'

function safariCompatibilityPlugin() {
  return {
    name: 'safari-css-compat',
    enforce: 'post' as const,
    transform(code: string, id: string) {
      if (id.includes('.css') || id.includes('?lang.css')) {
        try {
          const res = transform({
            filename: id,
            code: Buffer.from(code),
            targets: { safari: (15 << 16) },
            minify: false,
          })
          return { code: res.code.toString(), map: null }
        } catch {
          return null
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), safariCompatibilityPlugin()],
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
    target: ['safari15', 'es2021'],
  },
})


