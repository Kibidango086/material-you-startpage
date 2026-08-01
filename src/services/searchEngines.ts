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
 * 搜索引擎数据层（Sprint 3）。
 *
 * 职责：
 * - 内置引擎表（必应 / 百度 / Google / 搜狗 / 哔哩哔哩 等 ≥5 个）；
 * - 自定义引擎接口（name + url，url 必须含 {q} 占位符）；
 * - URL 模板构建：把 {q} 替换为 encodeURIComponent 后的查询词。
 *
 * S6 的引擎管理 UI（增删改自定义引擎）将以本模块为唯一事实源，
 * 通过 createCustomEngine() 生成引擎条目并写入 settings.searchEngines.engines。
 */
import type { SearchEngine } from '../storage/types';

/** 内置引擎 id 常量（便于代码中引用，避免魔法字符串） */
export const ENGINE_IDS = {
  bing: 'bing',
  baidu: 'baidu',
  google: 'google',
  sogou: 'sogou',
  bilibili: 'bilibili',
  wikipedia: 'wikipedia',
  duckduckgo: 'duckduckgo',
} as const;

/**
 * 内置搜索引擎表（≥5 个）。
 * 所有 URL 均使用 {q} 占位查询词，构建时替换为 encodeURIComponent(query)。
 * 默认引擎选择（必应/百度/Google）与 {q} 占位机制灵感来自 QUIK 2
 * （https://github.com/quik-page/quik2，GPL-3.0）。
 */
export const BUILT_IN_ENGINES: readonly SearchEngine[] = [
  {
    id: ENGINE_IDS.bing,
    name: '必应',
    url: 'https://www.bing.com/search?q={q}',
    icon: 'https://www.bing.com/favicon.ico',
  },
  {
    id: ENGINE_IDS.baidu,
    name: '百度',
    url: 'https://www.baidu.com/s?wd={q}',
    icon: 'https://www.baidu.com/favicon.ico',
  },
  {
    id: ENGINE_IDS.google,
    name: 'Google',
    url: 'https://www.google.com/search?q={q}',
    icon: 'https://www.google.com/favicon.ico',
  },
  {
    id: ENGINE_IDS.sogou,
    name: '搜狗',
    url: 'https://www.sogou.com/web?query={q}',
    icon: 'https://www.sogou.com/favicon.ico',
  },
  {
    id: ENGINE_IDS.bilibili,
    name: '哔哩哔哩',
    url: 'https://search.bilibili.com/all?keyword={q}',
    icon: 'https://www.bilibili.com/favicon.ico',
  },
  {
    id: ENGINE_IDS.wikipedia,
    name: '维基百科',
    url: 'https://zh.wikipedia.org/w/index.php?search={q}',
    icon: 'https://zh.wikipedia.org/favicon.ico',
  },
  {
    id: ENGINE_IDS.duckduckgo,
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q={q}',
    icon: 'https://duckduckgo.com/favicon.ico',
  },
];

/** 默认搜索引擎 id（必应） */
export const DEFAULT_ENGINE_ID: string = BUILT_IN_ENGINES[0].id;

/**
 * 校验搜索引擎 URL：
 * - 非空；
 * - 必须包含 {q} 占位符（查询词替换位置）。
 * S6 引擎管理 UI 新增 / 编辑时调用，非法则提示用户。
 */
export function validateEngineUrl(input: string): boolean {
  const value = input.trim();
  return value !== '' && value.includes('{q}');
}

/** 是否为内置引擎（必应 / 百度 / Google …） */
export function isBuiltInEngine(id: string): boolean {
  return BUILT_IN_ENGINES.some((engine) => engine.id === id);
}

/** 获取内置必应引擎（删除默认引擎时回退目标） */
export function getBingEngine(): SearchEngine | undefined {
  return getEngineById([...BUILT_IN_ENGINES], DEFAULT_ENGINE_ID);
}

/**
 * 自定义搜索引擎输入接口（S6 引擎管理 UI 使用）。
 * - name：显示名称；
 * - url：搜索 URL 模板，必须包含 {q} 占位符（查询词将替换到该位置）。
 */
export interface CustomEngineInput {
  name: string;
  url: string;
  icon?: string;
}

/**
 * 创建自定义搜索引擎条目。
 * - 校验 url 必须包含 {q} 占位符；
 * - 自动生成唯一 id（custom-<时间戳>-<随机串>）。
 */
export function createCustomEngine(input: CustomEngineInput): SearchEngine {
  const url = input.url.trim();
  const name = input.name.trim();
  if (url === '') {
    throw new Error('自定义搜索引擎的 URL 不能为空');
  }
  if (!url.includes('{q}')) {
    throw new Error('自定义搜索引擎的 URL 必须包含 {q} 占位符');
  }
  if (name === '') {
    throw new Error('自定义搜索引擎的名称不能为空');
  }
  const id = `custom-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  return { id, name, url, icon: input.icon };
}

/**
 * 构建搜索 URL：把模板中的 {q} 占位符替换为 encodeURIComponent 后的查询词。
 * 模板中不存在 {q} 时原样返回（防御性兜底）。
 */
export function buildSearchUrl(
  engine: Pick<SearchEngine, 'url'>,
  query: string,
): string {
  return engine.url.replace(/\{q\}/g, encodeURIComponent(query));
}

/** 按 id 查找引擎（找不到返回 undefined） */
export function getEngineById(
  engines: readonly SearchEngine[],
  id: string,
): SearchEngine | undefined {
  return engines.find((engine) => engine.id === id);
}
