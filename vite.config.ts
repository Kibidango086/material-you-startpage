import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

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
  plugins: [
    // 起始页性能：Service Worker 预缓存全部构建资源 + 运行时缓存 Google
    // Fonts。第二次打开起，JS/CSS/字体全部本地读取，基本秒开。
    VitePWA({
      registerType: 'autoUpdate',
      // 不生成 PWA 安装清单（起始页不需要"安装到桌面"提示）
      manifest: false,
      includeAssets: ['favicon.ico', 'logo.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        // 导航请求（起始页无路由，就是 index.html）走预缓存，离线也能开
        navigateFallback: 'index.html',
        // 跨域字体：CacheFirst 缓存 Google Fonts 的 CSS 与 woff2，
        // 二次加载字体零网络请求
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 天
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});
