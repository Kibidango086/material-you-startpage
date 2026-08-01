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
 * 翻译服务（Sprint 3）。
 *
 * "非中文输入自动提示翻译"这一交互灵感来自 QUIK 2
 * （https://github.com/quik-page/quik2，GPL-3.0）；实现使用 MyMemory
 * 免费翻译 API（无需 API Key）：
 *   https://api.mymemory.translated.net/get?q=...&langpair=xx|zh-CN
 *
 * 语言对：目标语言固定 zh-CN；源语言轻量自动检测（日文假名 → ja，
 * 韩文 → ko，其余默认 en）。网络失败时抛出异常，由调用方优雅降级。
 */

/** 翻译结果 */
export interface TranslationResult {
  /** 翻译后的文本 */
  translatedText: string;
  /** 检测到的源语言代码 */
  sourceLang: string;
  /** 目标语言代码 */
  targetLang: string;
}

/** MyMemory API 端点 */
const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get';

/** 支持的语言代码（ISO 639-1 / zh-CN） */
const LANG_ALIASES: Record<string, string> = {
  zh: 'zh-CN',
  chs: 'zh-CN',
  'zh-cn': 'zh-CN',
  'zh-tw': 'zh-TW',
  cht: 'zh-TW',
  en: 'en',
  ja: 'ja',
  jp: 'ja',
  ko: 'ko',
  fr: 'fr',
  de: 'de',
  es: 'es',
  ru: 'ru',
  it: 'it',
  pt: 'pt',
  ar: 'ar',
};

/** 规范化语言代码（别名 → 标准代码）；未知返回 null */
export function normalizeLang(code: string): string | null {
  const key = code.trim().toLowerCase();
  return LANG_ALIASES[key] ?? null;
}

/** 支持的语言显示名（用于 UI 提示） */
export const SUPPORTED_LANGS: Array<{ code: string; name: string }> = [
  { code: 'zh-CN', name: '中文（简体）' },
  { code: 'zh-TW', name: '中文（繁體）' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'ru', name: 'Русский' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
];

/**
 * 解析 translate-shell 风格前缀语法：
 *   - ":ja 文本"        → 目标 ja，源自动检测
 *   - "en:ja 文本"      → 源 en，目标 ja
 *   - "文本"            → 无前缀，源自动检测，目标用默认
 * 返回 { query, sourceLang (null=自动), targetLang (null=默认) }
 */
export function parseTranslateSyntax(
  text: string,
): { query: string; sourceLang: string | null; targetLang: string | null } {
  const trimmed = text.trim();
  // 匹配 [:源]:[目标] 或 :目标 前缀（translate-shell 风格）
  const m = trimmed.match(/^([a-zA-Z]{2,7}):([a-zA-Z]{2,7})\s+(.+)$/s);
  if (m !== null) {
    const source = normalizeLang(m[1]);
    const target = normalizeLang(m[2]);
    if (source !== null && target !== null) {
      return { query: m[3], sourceLang: source, targetLang: target };
    }
  }
  const m2 = trimmed.match(/^:([a-zA-Z]{2,7})\s+(.+)$/s);
  if (m2 !== null) {
    const target = normalizeLang(m2[1]);
    if (target !== null) {
      return { query: m2[2], sourceLang: null, targetLang: target };
    }
  }
  return { query: trimmed, sourceLang: null, targetLang: null };
}

/**
 * 轻量源语言检测（足够用于 MyMemory langpair 选择）：
 *   - 含中文 → zh-CN
 *   - 含日文假名 → ja
 *   - 含韩文 → ko
 *   - 其余（英文/拉丁等）→ en
 */
export function detectSourceLang(text: string): string {
  if (/[\u4e00-\u9fff]/u.test(text)) {
    return 'zh-CN';
  }
  if (/[\u3040-\u30ff\u31f0-\u31ff]/u.test(text)) {
    return 'ja';
  }
  if (/[\uac00-\ud7af]/u.test(text)) {
    return 'ko';
  }
  return 'en';
}

/**
 * 调用 MyMemory 翻译。
 * - targetLang 默认 zh-CN；支持 translate-shell 风格前缀（":xx" / "xx:yy"）指定语言对；
 * - 网络失败 / 超时 / 响应异常时抛出 Error，调用方负责优雅降级；
 * - 内置 AbortController 超时，避免请求悬挂。
 */
export async function translateText(
  text: string,
  targetLang = 'zh-CN',
  timeoutMs = 8000,
): Promise<TranslationResult> {
  // 解析 translate-shell 前缀语法
  const parsed = parseTranslateSyntax(text);
  const query = parsed.query.trim();
  if (query === '') {
    throw new Error('翻译内容为空');
  }
  const resolvedTarget = parsed.targetLang ?? normalizeLang(targetLang) ?? 'zh-CN';
  const sourceLang = parsed.sourceLang ?? detectSourceLang(query);
  const params = new URLSearchParams({
    q: query,
    langpair: `${sourceLang}|${resolvedTarget}`,
  });
  const url = `${MYMEMORY_ENDPOINT}?${params.toString()}`;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`MyMemory HTTP ${response.status}`);
    }
    const data = (await response.json()) as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
    };
    if (
      typeof data?.responseData?.translatedText !== 'string' ||
      data.responseData.translatedText.trim() === ''
    ) {
      throw new Error('MyMemory 返回为空');
    }
    return {
      translatedText: data.responseData.translatedText,
      sourceLang,
      targetLang: resolvedTarget,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('翻译请求超时');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}
