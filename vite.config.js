import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    // 截图与临时浏览器 profile 会落在项目目录里，别让 Vite watch 它们：
    // 否则写一张截图就触发一次整页 reload，开发时页面会莫名变白、状态全丢。
    watch: { ignored: ['**/.qa/**', '**/_shots/**', '**/dist/**'] },
  },
  build: { outDir: 'dist', assetsDir: 'assets' },
})
