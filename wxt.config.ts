import { defineConfig } from 'wxt';

// WXT — 跨浏览器扩展框架（Chrome / Firefox / Edge 同源构建）
export default defineConfig({
  manifest: ({ browser }) => ({
    name: 'My Startpage',
    description: '替换新标签页为 My Startpage（mystartup.kibidango.top）',
    // 仅覆盖新标签页，无需任何额外权限
    permissions: [],
    // 扩展图标（与网站 logo 一致的山+太阳，主题色系）
    icons: {
      16: '/icons/icon-16.png',
      32: '/icons/icon-32.png',
      48: '/icons/icon-48.png',
      128: '/icons/icon-128.png',
    },
    // Firefox 签名必需：扩展 ID（Chrome 构建自动忽略该字段）
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'my-startpage@kibidango.top',
            },
          },
        }
      : {}),
  }),
});
