import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // API: upcoming launch list
      '/launches/upcoming': { target: 'http://localhost:8000', changeOrigin: true },
      // API: direction endpoint  (e.g. /launches/{id}/direction?lat=&lon=)
      '^/launches/[^/]+/direction': { target: 'http://localhost:8000', changeOrigin: true },
      // Launch detail path: forward to backend for API calls (Accept: application/json),
      // but serve index.html locally for browser navigation so React Router handles it.
      '^/launches/[^/]+$': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass(req: { headers: Record<string, string | string[] | undefined> }) {
          if (!String(req.headers['accept'] ?? '').includes('application/json')) {
            return '/index.html'
          }
        },
      },
    },
  },
})
