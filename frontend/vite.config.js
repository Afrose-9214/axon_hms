import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // 🌟 Replaced __dirname with import.meta.dirname to clear the Vite warning
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
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