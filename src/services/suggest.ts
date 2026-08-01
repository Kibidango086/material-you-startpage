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
 * 搜索联想建议服务（多引擎）。
 *
 * 跟随用户当前选择的搜索引擎，调用其官方联想 API：
 *   - 必应 Bing：https://api.bing.com/qsonhs.aspx?type=cb&q=<q>&cb=<cb>（JSONP）
 *   - 百度 Baidu：https://www.baidu.com/sugrec?prod=pc&wd=<q>&cb=<cb>（JSONP）
 *   - Google：https://suggestqueries.google.com/complete/search?client=firefox&q=<q>&callback=<cb>（JSONP）
 *   - 维基百科：https://zh.wikipedia.org/w/api.php?action=opensearch&search=<q>&format=json&callback=<cb>（JSONP）
 *
 * 注：osjson.aspx 返回裸 JSON（无回调包裹）、DuckDuckGo /ac 无 CORS 亦无 JSONP、
 * 搜狗 suggnew 已失效、哔哩哔哩 suggest 无 CORS 头，均不采用。自定义引擎无联想接口 → 返回 []；
 * 超时 / 跨域失败 / 解析异常一律降级为 []，不抛出、不影响主流程。
 */

/** JSONP 回调序号（保证全局回调名唯一） */
let sequence = 0;

/** 单次联想最多返回条数 */
const MAX_ITEMS = 8;

/** 引擎 id → 联想源（未列出的引擎 / 自定义引擎返回 null，不提供联想） */
export type SuggestEngineId = 'bing' | 'baidu' | 'google' | 'wikipedia';

/** 是否内置支持联想的引擎 */
export function isSuggestEngineId(id: string): id is SuggestEngineId {
  return (
    id === 'bing' ||
    id === 'baidu' ||
    id === 'google' ||
    id === 'wikipedia'
  );
}

/**
 * 通用 JSONP 请求：注入 <script>，等待回调。
 * 任何失败（网络 / 超时）都会触发 onerror 或超时清理，最终 resolve(undefined)。
 */
function jsonp(
  url: string,
  callbackName: string,
  timeoutMs: number,
): Promise<unknown> {
  return new Promise((resolve) => {
    const globalScope = window as unknown as Record<string, unknown>;
    const script = document.createElement('script');
    let finished = false;

    const cleanup = (): void => {
      delete globalScope[callbackName];
      script.remove();
    };

    const finish = (data: unknown): void => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      cleanup();
      resolve(data);
    };

    const timer = window.setTimeout(() => finish(undefined), timeoutMs);

    globalScope[callbackName] = (data: unknown): void => finish(data);
    script.src = url;
    script.async = true;
    script.onerror = () => finish(undefined);
    document.body.appendChild(script);
  });
}

/** 从各引擎原始响应中提取字符串数组 */
function extractItems(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const items: string[] = [];

  // 形如 ["query", ["联想1", "联想2", …]]（Bing / Google / Sogou / Wikipedia opensearch）
  const list = raw[1];
  if (Array.isArray(list)) {
    for (const item of list) {
      if (typeof item === 'string') items.push(item);
    }
  }

  return items.slice(0, MAX_ITEMS);
}

/** 联想源描述 */
interface SuggestSource {
  /** 构造 JSONP URL；返回 null 表示该引擎使用 JSON 直连（非 JSONP） */
  buildUrl: (query: string, callback: string) => string | null;
  /** JSONP 回调名；null 表示 JSON 直连 */
  callbackName: (query: string, seq: number) => string | null;
  /** 解析响应 */
  parse: (raw: unknown) => string[];
}

/** 引擎 → 联想源映射 */
const SOURCES: Record<SuggestEngineId, SuggestSource> = {
  bing: {
    // qsonhs 是必应真正的 JSONP 建议端点（osjson 返回裸 JSON 无回调包裹）
    buildUrl: (q, cb) =>
      `https://api.bing.com/qsonhs.aspx?type=cb&q=${encodeURIComponent(q)}&cb=${cb}`,
    callbackName: () => `__mysp_sug_bing_${sequence++}`,
    parse: (raw: unknown): string[] => {
      if (
        typeof raw !== 'object' ||
        raw === null ||
        !('AS' in raw) ||
        typeof (raw as { AS: unknown }).AS !== 'object' ||
        (raw as { AS: { Results?: unknown } }).AS.Results === undefined
      ) {
        return [];
      }
      const results = (raw as { AS: { Results: Array<{ Suggests?: Array<{ Txt?: unknown }> }> } })
        .AS.Results;
      const items: string[] = [];
      for (const r of results) {
        for (const sug of r.Suggests ?? []) {
          if (typeof sug.Txt === 'string') items.push(sug.Txt);
        }
      }
      return items.slice(0, MAX_ITEMS);
    },
  },
  baidu: {
    buildUrl: (q, cb) =>
      `https://www.baidu.com/sugrec?prod=pc&wd=${encodeURIComponent(q)}&cb=${cb}`,
    callbackName: () => `__mysp_sug_baidu_${sequence++}`,
    parse: (raw: unknown): string[] => {
      if (
        typeof raw !== 'object' ||
        raw === null ||
        !('g' in raw) ||
        !Array.isArray((raw as { g: unknown }).g)
      ) {
        return [];
      }
      return (raw as { g: Array<{ q?: unknown }> }).g
        .map((item) => item?.q)
        .filter((item): item is string => typeof item === 'string')
        .slice(0, MAX_ITEMS);
    },
  },
  google: {
    buildUrl: (q, cb) =>
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}&callback=${cb}`,
    callbackName: () => `__mysp_sug_google_${sequence++}`,
    parse: extractItems,
  },
  wikipedia: {
    buildUrl: (q, cb) =>
      `https://zh.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&format=json&callback=${cb}`,
    callbackName: () => `__mysp_sug_wiki_${sequence++}`,
    parse: extractItems,
  },
};

/**
 * 获取指定引擎的联想建议。
 * 任何失败（网络 / 超时 / 解析 / 引擎不支持）都 resolve([])，永不 reject。
 */
export function fetchSuggest(
  engineId: string,
  query: string,
  timeoutMs = 4000,
): Promise<string[]> {
  const q = query.trim();
  if (q === '' || !isSuggestEngineId(engineId)) {
    return Promise.resolve([]);
  }

  const source = SOURCES[engineId];

  // JSONP 路线
  const callbackName = source.callbackName(q, sequence);
  if (callbackName !== null) {
    const url = source.buildUrl(q, callbackName);
    if (url === null) return Promise.resolve([]);
    return jsonp(url, callbackName, timeoutMs).then((raw) =>
      source.parse(raw),
    );
  }

  // JSON 直连路线（bilibili，依赖 CORS）
  const url = source.buildUrl(q, '');
  if (url === null) return Promise.resolve([]);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal })
    .then((response) => (response.ok ? response.json() : undefined))
    .then((raw) => source.parse(raw))
    .catch(() => [])
    .finally(() => window.clearTimeout(timer));
}

/**
 * 兼容别名：获取百度联想建议（旧调用方 / 调试钩子）。
 * 等价于 fetchSuggest('baidu', query, timeoutMs)。
 */
export function fetchBaiduSuggest(
  query: string,
  timeoutMs = 4000,
): Promise<string[]> {
  return fetchSuggest('baidu', query, timeoutMs);
}
