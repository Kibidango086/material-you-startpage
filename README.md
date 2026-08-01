<p align="center">
  <a href="https://mystartup.kibidango.top/">
    <img src="./public/logo.svg" width="96" height="96" alt="My Startpage logo" />
  </a>
</p>

<h1 align="center">My Startpage</h1>

<p align="center">
  <em>个人自用 Material You 风格起始页 · 纯前端 · 无后端</em>
</p>

<p align="center">
  <a href="https://mystartup.kibidango.top/">
    <img src="https://img.shields.io/badge/Demo-mystartup.kibidango.top-6750A4?style=for-the-badge&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI2NiIgY3k9IjMyIiByPSI5IiBmaWxsPSIlMjNmZmYiLz48cGF0aCBkPSJNMTIgNzggUTI4IDQwIDUwIDYwIFE2MiA3MCA3NiA1NCBRODQgNDYgODggNTYgTDg4IDc4IFoiIGZpbGw9IiUyM2ZmZiIgb3BhY2l0eT0iMC45Ii8+PHBhdGggZD0iTTMwIDc4IFE0NCA1NCA1OCA2NiBRNjQgNzAgNzQgNzggWiIgZmlsbD0iJTIzZmZmIiBvcGFjaXR5PSIwLjg1Ii8+PC9zdmc+" alt="Demo" />
  </a>
  <a href="https://github.com/Kibidango086/material-you-startpage/releases/latest">
    <img src="https://img.shields.io/badge/Browser%20Extension-Download-6750A4?style=for-the-badge&logo=firefoxbrowser&logoColor=white" alt="Browser Extension" />
  </a>
  <a href="https://github.com/Kibidango086/material-you-startpage">
    <img src="https://img.shields.io/badge/GitHub-Kibidango086%2Fmaterial--you--startpage-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
  </a>
  <a href="https://github.com/Kibidango086/material-you-startpage/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-GPL--3.0-A42E2B?style=for-the-badge&logo=gnu&logoColor=white" alt="License" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/mdui%20v2-7B1FA2?style=for-the-badge" alt="mdui v2" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Bun-14151A?style=for-the-badge&logo=bun&logoColor=white" alt="Bun" />
  <img src="https://img.shields.io/badge/100%25%20Frontend-2E7D32?style=for-the-badge" alt="100% Frontend" />
</p>

个人自用 Material You 风格起始页。设计灵感来自 [QUIK 2](https://github.com/quik-page/quik2)（GPL-3.0），代码为 TypeScript + mdui v2 从零实现。

## 在线体验

👉 **[mystartup.kibidango.top](https://mystartup.kibidango.top/)**

## 浏览器扩展

新标签页直接打开本页（Chrome / Edge / Firefox）：

- **[下载扩展（latest）](https://github.com/Kibidango086/material-you-startpage/releases/latest)**
- Firefox 用 `*.xpi`（已签名），Chrome/Edge 用 `*-chrome.zip` 解压后加载
- 源码在 `extension` 分支，设置面板「关于」页也有下载入口

## 功能

- 搜索：多引擎（必应/百度/Google/搜狗/哔哩哔哩/维基百科 + 自定义），输入 URL 直达，`=` 即算，翻译建议（支持 `:ja` / `en:zh` 前缀语法与自定义目标语言），跟随引擎的联想建议
- 链接：卡片网格，支持分组
- 背景：纯色 / 图片上传 / URL / 视频 / 必应每日壁纸（Vercel 部署时经自带同源代理获取，壁纸取色可用），蒙版与模糊可调
- 一言：hitokoto / 今日诗词 / 自定义（可填署名）/ 自建一言（自定义 API，返回与一言相同格式），点击复制，按钮刷新
- 外观：Material You 动态配色种子、深浅色 / 跟随系统、数字 / 表盘时钟、显示开关（LOGO / 时钟 / 日期 / 一言 / 链接 / 页脚）、从壁纸提取主题色
- 多语言：简体 / 繁體 / English / 日本語，可在设置中切换
- 设置存 localStorage，纯前端；仅 Vercel 部署时的必应壁纸获取会用到平台自带的 serverless 代理（api/bing.mjs，可自行禁用）

## 本地运行

```bash
bun install
bun run dev
```

构建：`bun run build`，产物在 `dist/`。

## 技术栈

mdui v2 · Vite · TypeScript · bun · Google Fonts

## 许可

[GPL-3.0](LICENSE)，© 2026 Kibidango086。灵感来源：[QUIK 2](https://github.com/quik-page/quik2)。
