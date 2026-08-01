import { defineConfig } from 'wxt';

// WXT — 跨浏览器扩展框架（Chrome / Firefox / Edge 同源构建）
export default defineConfig({
  manifest: {
    name: 'My Startpage',
    description: '替换新标签页为 My Startpage（mystartup.kibidango.top）',
    version: '1.0.0',
    // 仅覆盖新标签页，无需任何额外权限
    permissions: [],
  },
});
