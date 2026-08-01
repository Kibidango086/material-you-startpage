# My Startpage

个人自用 Material You 风格起始页，by Kibidango086。设计灵感来自 [QUIK 2](https://github.com/quik-page/quik2)（GPL-3.0），代码为 TypeScript + mdui v2 从零实现。

## 功能

- 搜索：多引擎（必应/百度/Google/搜狗/哔哩哔哩/维基百科 + 自定义），输入 URL 直达，`=` 即算，翻译建议（支持 `:ja` / `en:zh` 前缀语法与自定义目标语言），跟随引擎的联想建议
- 链接：卡片网格，支持分组
- 背景：纯色 / 图片上传 / URL / 视频 / 必应每日壁纸，蒙版与模糊可调
- 一言：hitokoto / 今日诗词 / 自定义（可填署名）/ AI 生成，点击复制，按钮刷新
- 外观：Material You 动态配色种子、深浅色 / 跟随系统、数字 / 表盘时钟、显示开关（LOGO / 时钟 / 日期 / 一言 / 链接 / 页脚）、从壁纸提取主题色
- 多语言：简体 / 繁體 / English / 日本語，可在设置中切换
- 数据存 localStorage，纯前端，无后端

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
