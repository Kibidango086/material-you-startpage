import { defineConfig } from 'vite';

// Vite 配置 — 静态起始页，相对路径 base（Vercel 任意路径可部署）
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: false,
  },
});
