import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src')
    }
  },
  server: {
    port: 3200,
    open: '/examples/quick-start.html'
  },
  build: {
    lib: {
      entry: './src/index.js',
      name: 'FragementDownload',
      fileName: 'fragement-download'
    },
    minify: true
  }
})
