import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Ministry/',  // GitHub repository 이름
  server: {
    port: 5175,
    strictPort: true
  },
  build: {
    outDir: 'dist',
  }
})
