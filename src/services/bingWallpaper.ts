/**
 * Copyright (C) 2026 Kibidango086
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * My Startpage —— 个人 Material You 风格起始页（by Kibidango086）。
 * 设计灵感来自 QUIK 2（https://github.com/quik-page/quik2，GPL-3.0），
 * 代码为 TypeScript + mdui v2 原创实现，未直接复制原项目代码。
 * 本项目以 GNU General Public License v3.0 发布，完整文本见根目录 LICENSE。
 */
/**
 * 必应每日壁纸服务（Sprint 5）。
 *
 * 能力：
 *   - 主端点：必应国际版每日壁纸 JSON API
 *       https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN
 *     返回 { images: [{ url: '/th?id=OHR.xxx_1920x1080.jpg&...' }] }，图片路径为相对路径，
 *     需要拼上 cn.bing.com origin 才是完整 URL；
 *   - 失败自动 fallback：cn.bing.com → www.bing.com → 用户配置镜像（默认
 *     api.dujin.org/bing，支持 JSON 或直接图片两种形态）→ 兜底随机壁纸镜像；
 *   - 全部失败抛出带原因的错误，由调用方提示并引导手动输入图片 URL。
 *
 * 镜像类型：
 *   - 'json' ：请求 JSON API，解析出图片 URL（相对路径按 origin 补全）；
 *   - 'auto' ：先尝试按 JSON 解析；若响应不是 JSON（或网络/CORS 失败），
 *              则把镜像地址本身当作直接图片 URL 使用；
 *   - 'image'：直接把地址当作图片 URL 使用（<img> 加载不受 CORS 限制）。
 */

/** 镜像类型 */
export type BingMirrorKind = 'json' | 'auto' | 'image';

/** 镜像定义 */
export interface BingMirror {
  kind: BingMirrorKind;
  /** API / 图片地址 */
  url: string;
  /** 解析相对图片路径（如 /th?id=...）时使用的前缀 origin */
  origin?: string;
}

/** 内置必应主端点 */
export const BING_CN_ENDPOINT =
  'https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN';

/** 兜底镜像（最后一环，直接返回图片地址） */
export const FALLBACK_IMAGE_MIRROR: BingMirror = {
  kind: 'image',
  url: 'https://www.dmoe.cc/random.php',
};

/** 获取必应壁纸的选项 */
export interface FetchBingOptions {
  /** 镜像链（默认 buildBingMirrors 构造） */
  mirrors?: BingMirror[];
  /** 注入 fetch（测试用） */
  fetchImpl?: typeof fetch;
  /** 单个请求超时（毫秒） */
  timeoutMs?: number;
  /** 可选：图片可访问性预校验，返回 false 时跳过该镜像 */
  verifyImage?: (url: string) => Promise<boolean>;
}

/**
 * 构造镜像链：cn.bing.com JSON → www.bing.com JSON → 用户配置镜像（auto）
 * → 兜底图片镜像。用户配置为空时跳过（默认值已内置 api.dujin.org/bing）。
 */
export function buildBingMirrors(bingMirror?: string): BingMirror[] {
  const mirrors: BingMirror[] = [
    { kind: 'json', url: BING_CN_ENDPOINT, origin: 'https://cn.bing.com' },
    {
      kind: 'json',
      url: 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN',
      origin: 'https://www.bing.com',
    },
  ];
  const custom = bingMirror?.trim();
  if (custom !== undefined && custom !== '') {
    mirrors.push({ kind: 'auto', url: custom });
  }
  mirrors.push(FALLBACK_IMAGE_MIRROR);
  return mirrors;
}

/** 判断是否为纯记录对象（JSON 对象） */
function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * 解析图片 URL：
 *   - 绝对 http(s) 地址原样返回；
 *   - 相对路径（/th?id=...）按 origin 拼成完整 URL；
 *   - 解析失败返回 null。
 */
export function resolveImageUrl(raw: unknown, origin?: string): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (value === '') return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (origin !== undefined && origin !== '') {
    try {
      return new URL(value, origin).toString();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 从必应（或镜像）JSON 响应中提取图片 URL。
 * 兼容多种结构：{ images:[{url}] }、{ images:[{urlbase}] }、
 * { data:{ ... } }、{ url | img | image | src }。
 */
export function extractBingImageUrl(
  data: unknown,
  origin?: string,
): string | null {
  if (!isRecord(data)) return null;

  // 标准必应结构：images[0].url（相对路径）或 images[0].urlbase（需补尺寸后缀）
  const images = data.images;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (isRecord(first)) {
      const resolved = resolveImageUrl(first.url, origin);
      if (resolved !== null) return resolved;
      const urlbase = first.urlbase;
      if (typeof urlbase === 'string' && urlbase.trim() !== '') {
        const resolvedBase = resolveImageUrl(
          `${urlbase.trim()}_1920x1080.jpg`,
          origin,
        );
        if (resolvedBase !== null) return resolvedBase;
      }
    }
  }

  // 嵌套 data 包裹（部分镜像）
  if (isRecord(data.data)) {
    const nested = extractBingImageUrl(data.data, origin);
    if (nested !== null) return nested;
  }

  // 顶层字符串字段
  for (const key of ['url', 'img', 'image', 'src'] as const) {
    const resolved = resolveImageUrl(data[key], origin);
    if (resolved !== null) return resolved;
  }

  return null;
}

/**
 * 带超时的 fetch（AbortController 实现，超时自动中止）。
 */
async function fetchWithTimeout(
  input: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(input, { signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * 用浏览器 Image 预加载校验图片是否可访问（不受 CORS 影响）。
 * 成功返回 true，失败 / 超时返回 false。
 */
export function verifyImageLoadable(
  url: string,
  timeoutMs = 8000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const timer = window.setTimeout(() => done(false), timeoutMs);
    const done = (ok: boolean): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      img.src = '';
      resolve(ok);
    };
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = url;
  });
}

/**
 * 获取必应每日壁纸图片 URL。
 *
 * 依次尝试镜像链：任一成功即返回完整图片 URL；
 * 全部失败时抛出 Error（message 汇总各镜像失败原因）。
 */
export async function fetchBingWallpaper(
  options: FetchBingOptions = {},
): Promise<string> {
  const {
    mirrors = buildBingMirrors(),
    fetchImpl = fetch,
    timeoutMs = 8000,
    verifyImage,
  } = options;

  const errors: string[] = [];

  for (const mirror of mirrors) {
    try {
      let candidate: string | null = null;

      if (mirror.kind === 'json') {
        const response = await fetchWithTimeout(mirror.url, fetchImpl, timeoutMs);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data: unknown = await response.json();
        candidate = extractBingImageUrl(data, mirror.origin ?? mirror.url);
        if (candidate === null) {
          throw new Error('响应中未找到图片 URL');
        }
      } else if (mirror.kind === 'auto') {
        // 先尝试按 JSON API 请求；失败（网络 / CORS / 非 JSON）则把地址当作图片直接使用
        try {
          const response = await fetchWithTimeout(
            mirror.url,
            fetchImpl,
            timeoutMs,
          );
          if (response.ok) {
            const contentType = response.headers.get('content-type') ?? '';
            if (contentType.includes('json')) {
              const data: unknown = await response.json();
              candidate = extractBingImageUrl(data, mirror.origin ?? mirror.url);
            } else {
              // 图片端点：跟随重定向后的最终地址
              candidate = response.url !== '' ? response.url : mirror.url;
            }
          } else {
            candidate = mirror.url;
          }
        } catch {
          // fetch 失败（超时 / CORS / 网络）：把镜像地址当作直接图片 URL
          candidate = mirror.url;
        }
      } else {
        // 'image'：直接使用地址
        candidate = mirror.url;
      }

      if (candidate === null || candidate === '') continue;

      // 可选预校验：仅对镜像类（auto / image）候选校验图片可加载，
      // 失败则跳过该镜像继续 fallback。JSON API 解析出的 URL 直接信任（
      // 接口来源可靠，且避免对构造的测试地址产生误判）。
      if (verifyImage !== undefined && mirror.kind !== 'json') {
        const loadable = await verifyImage(candidate);
        if (!loadable) {
          errors.push(`镜像 ${mirror.url} 的图片无法加载`);
          continue;
        }
      }

      return candidate;
    } catch (error) {
      errors.push(
        error instanceof Error ? `${mirror.url}: ${error.message}` : String(error),
      );
    }
  }

  throw new Error(
    `必应壁纸获取失败：${errors.length > 0 ? errors.join('；') : '所有镜像均不可用'}`,
  );
}
