/**
 * Vercel Serverless 函数：必应每日壁纸 JSON 代理。
 *
 * 背景：cn.bing.com 的 HPImageArchive 接口不返回 CORS 头，浏览器直连
 * 会被拦截，导致拿不到当天壁纸图片名（进而无法用壁纸取色——bing 图片
 * 端点本身带 `Access-Control-Allow-Origin: *`，只要拿到图片 URL 就
 * 能在浏览器读像素）。此函数在服务端转发，返回同源 JSON。
 *
 * 开发环境由 vite.config.ts 的 server.proxy 提供等价的 /api/bing 代理。
 *
 * 注意：使用 Vercel 传统 Node 签名 (req, res) —— req.headers 是普通
 * 对象（IncomingMessage 风格），没有 Headers.get 方法。
 *
 * 防盗用：函数只代理固定的上游 URL（不支持任意地址转发），并校验
 * Origin 白名单，非本站 / 非本地开发的跨域请求返回 403。配合 Vercel
 * CDN 缓存（cache-control: max-age=3600），滥用成本远高于收益。
 */

/** 允许的 Origin 白名单（hostname 匹配；空 Origin 放行——同源/服务端请求） */
const ALLOWED_ORIGINS = [
  'mystartup.kibidango.top',
  'material-you-startpage.vercel.app',
];

/** 允许本地开发（任意端口）与 Vercel 默认域名（任意子域） */
function isAllowedOrigin(origin) {
  const trimmed = origin.trim();
  if (trimmed === '') return true; // 同源导航、curl、服务端请求
  try {
    const host = new URL(trimmed).hostname;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host.endsWith('.vercel.app')) return true;
    return ALLOWED_ORIGINS.includes(host);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin ?? '';
  if (!isAllowedOrigin(origin)) {
    res.status(403).send('forbidden');
    return;
  }

  const upstream =
    'https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN';
  try {
    const response = await fetch(upstream, {
      headers: { 'user-agent': 'my-startpage/1.0' },
    });
    if (!response.ok) {
      res.status(502).send(`upstream HTTP ${response.status}`);
      return;
    }
    const data = await response.json();
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'public, max-age=3600');
    res.setHeader('access-control-allow-origin', '*');
    res.status(200).json(data);
  } catch (error) {
    res.status(502).send(error instanceof Error ? error.message : 'proxy error');
  }
}
