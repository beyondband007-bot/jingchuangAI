import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/canvas-app/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@vue-flow')) return 'vue-flow'
          if (id.includes('naive-ui') || id.includes('@css-render')) return 'naive-ui'
          if (id.includes('@vicons')) return 'canvas-icons'
          if (id.includes('/vue/') || id.includes('vue-router') || id.includes('pinia')) return 'vue-runtime'
          return undefined
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:3006',
        changeOrigin: true
      }
    }
  }
})
