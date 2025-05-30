import path from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

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
  plugins: [
    dts({
      insertTypesEntry: true, // 自动在 package.json 中添加 types 字段
      tsconfigPath: './tsconfig.json',
      outDir: 'dist/types', // 声明文件输出目录
      strictOutput: true,
      rollupTypes: true
    })
  ],
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'ShardingDownloader',
      fileName: (format) => `sharding-downloader.${format}.js`,
      // 支持的模块格式
      formats: ['es', 'umd', 'cjs']
    },
    minify: true
  }
})
