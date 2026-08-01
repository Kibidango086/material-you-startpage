import { defineConfig } from 'vite';

// Vite 配置 — 静态起始页，相对路径 base（Vercel 任意路径可部署）
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
    // 开发环境代理：/api/bing → cn.bing.com HPImageArchive。
    // 生产环境由 Vercel serverless 函数（api/bing.mjs）提供等价端点，
    // 目的都是绕过浏览器 CORS，让前端能拿到当天必应壁纸 JSON。
    proxy: {
      '/api/bing': {
        target: 'https://cn.bing.com',
        changeOrigin: true,
        rewrite: () => '/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN',
      },
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: false,
  },
});
