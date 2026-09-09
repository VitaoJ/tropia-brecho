import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  // O alias existe para o shadcn: os componentes dele importam por "@/..."
  // e sem isto o build quebra. O jsconfig.json espelha o mesmo caminho, que
  // é o que faz o editor entender o import.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    // fsevents trava o dev server no macOS 26 — polling evita o bug
    watch: { usePolling: true, interval: 300 },
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
