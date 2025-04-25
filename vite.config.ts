import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true
    // headers: {
    //   'Content-Security-Policy': [
    //     "default-src 'self'",
    //     // Explicitly allow scripts from Google APIs and gstatic
    //     "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.google.com https://*.gstatic.com",
    //     // Add script-src-elem as suggested by the error
    //     "script-src-elem 'self' 'unsafe-inline' https://apis.google.com https://*.google.com https://*.gstatic.com",
    //     "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    //     "font-src 'self' https://fonts.gstatic.com",
    //     "img-src 'self' data: https:",
    //     // Ensure connect-src allows necessary domains
    //     "connect-src 'self' https://*.google.com https://*.googleapis.com https://sheets.googleapis.com",
    //     // Ensure frame-src allows the Google accounts iframe
    //     "frame-src 'self' https://accounts.google.com"
    //   ].join('; ')
    // }
  }
})
