import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    // fsevents trava o dev server no macOS 26 — polling evita o bug
    watch: { usePolling: true, interval: 300 },
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
