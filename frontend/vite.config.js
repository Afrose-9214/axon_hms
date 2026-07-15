import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 🌟 This catches any request starting with /api and sends it to your backend
      '/api': {
        target: 'http://localhost:5000', 
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
