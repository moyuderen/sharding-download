import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src')
    }
  },
  server: {
    port: 3201,
    open: '/examples/quick-start.html'
  },
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'downloader',
      fileName: 'downloader'
    },
    minify: true
  }
})
