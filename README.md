# My Startpage 浏览器扩展

替换浏览器新标签页为 [mystartup.kibidango.top](https://mystartup.kibidango.top/)（Chrome / Edge / Firefox）。

基于 [WXT](https://wxt.dev)：一份代码，Chrome MV3 / Firefox MV2 双构建，Firefox 版可经 web-ext 签名产出 `.xpi`。

## 开发

```bash
bun install
bun run dev          # Chrome 热重载
bun run dev:firefox  # Firefox 热重载
```

## 构建 / 打包

```bash
bun run zip:chrome   # .output/*-chrome.zip
bun run zip:firefox  # .output/*-firefox.zip
```

## 发布

推送本分支自动触发 GitHub Actions：构建 → 打包 →（配置密钥后签名 Firefox .xpi）→ 发布到 [Releases](https://github.com/Kibidango086/material-you-startpage/releases/tag/extension-v1.0.0)。

Firefox 正式签名需要 AMO API 密钥（仓库 Secrets `AMO_JWT_ISSUER` / `AMO_JWT_SECRET`）：
https://addons.mozilla.org/developers/addon/api/key/

Chrome Web Store 自动上架需 `CWS_CLIENT_ID` / `CWS_CLIENT_SECRET` / `CWS_REFRESH_TOKEN`（可选）。
