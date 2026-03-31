import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        proxyTimeout: 180000,  // 3 min — Playwright + Groq can take ~60s
        timeout: 180000,
      }
    }
  }
})
