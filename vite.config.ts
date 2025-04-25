import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Ministry/',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5175,
    strictPort: true,
  },
  define: {
    'process.env': {}
  }
})
