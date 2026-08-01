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
 * 一言 / 今日诗词 / AI 生成服务（Sprint 6）。
 *
 * 能力：
 *   - 随机一言：GET https://v1.hitokoto.cn/（CORS 全开，返回 { hitokoto, from, from_who }）；
 *   - 今日诗词：GET https://v2.jinrishici.com/one.json（直接 GET 即可，响应自带 token，
 *     返回 { data: { content, origin: { title, dynasty, author } } }）；
 *   - AI 生成：OpenAI 兼容 chat/completions（用户自填 endpoint + key + prompt，
 *     未配置 key 时返回引导文案而非抛错）。
 *
 * 全部函数返回结构统一的 SaysResult { text, source }，供 says 组件渲染。
 */

import { t } from '../i18n';

/** 一言结果（text 为正文，source 为可选出处/作者） */
export interface SaysResult {
  text: string;
  source?: string;
}

/** 获取失败时使用的兜底文案 */
export const FALLBACK_TEXT = '生活明朗，万物可爱。点击此处重新获取。'; // 非 UI 文案，保留中文

/** 从任意响应中提取文本（防御性解析，失败返回 null） */
function pickText(data: unknown): string | null {
  if (typeof data === 'string') return data.trim() !== '' ? data.trim() : null;
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;
  for (const key of ['text', 'content', 'hitokoto', 'message', 'sentence']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return null;
}

/** 带超时的 fetch */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * 随机一言：GET https://v1.hitokoto.cn/
 * 成功返回 { text, source: from(from_who) }；网络失败时抛出 Error。
 * 每次请求追加时间戳参数并禁用 HTTP 缓存，保证「点击刷新」拿到新内容。
 */
export async function fetchHitokoto(timeoutMs = 8000): Promise<SaysResult> {
  const response = await fetchWithTimeout(
    `https://v1.hitokoto.cn/?_=${Date.now()}`,
    {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    },
    timeoutMs,
  );
  if (!response.ok) {
    throw new Error(`一言接口返回 HTTP ${response.status}`);
  }
  const data: unknown = await response.json();
  const text = pickText(data);
  if (text === null) {
    throw new Error('一言接口响应缺少正文');
  }
  const record = (typeof data === 'object' && data !== null
    ? (data as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const from = typeof record.from === 'string' ? record.from : '';
  const who = typeof record.from_who === 'string' ? record.from_who : '';
  const source = [from, who].filter((part) => part !== '').join(' · ');
  return { text, source: source !== '' ? source : undefined };
}

/**
 * 今日诗词：GET https://v2.jinrishici.com/one.json
 * 直接请求即可（无需手动换取 token），成功返回诗句与出处。
 */
export async function fetchPoem(timeoutMs = 8000): Promise<SaysResult> {
  const response = await fetchWithTimeout(
    `https://v2.jinrishici.com/one.json?_=${Date.now()}`,
    {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    },
    timeoutMs,
  );
  if (!response.ok) {
    throw new Error(`今日诗词接口返回 HTTP ${response.status}`);
  }
  const data: unknown = await response.json();
  if (typeof data !== 'object' || data === null) {
    throw new Error('今日诗词接口响应格式异常');
  }
  const record = data as Record<string, unknown>;
  const text = pickText(record.data);
  if (text === null) {
    throw new Error('今日诗词接口响应缺少正文');
  }

  // 出处：data.origin.{title, dynasty, author}
  let source: string | undefined;
  const origin = pickOrigin(record.data);
  if (origin !== undefined) source = origin;
  return { text, source };
}

/** 从诗词响应中提取出处字符串（《title》· 朝代 · 作者），失败返回 undefined */
function pickOrigin(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const record = data as Record<string, unknown>;
  const origin = record.origin;
  if (typeof origin !== 'object' || origin === null) return undefined;
  const originRecord = origin as Record<string, unknown>;
  const title =
    typeof originRecord.title === 'string' && originRecord.title.trim() !== ''
      ? originRecord.title.trim()
      : '';
  const dynasty =
    typeof originRecord.dynasty === 'string' && originRecord.dynasty.trim() !== ''
      ? originRecord.dynasty.trim()
      : '';
  const author =
    typeof originRecord.author === 'string' && originRecord.author.trim() !== ''
      ? originRecord.author.trim()
      : '';
  const parts = [
    title !== '' ? `《${title}》` : '',
    dynasty,
    author,
  ].filter((part) => part !== '');
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

/** AI 生成选项 */
export interface AiQuoteOptions {
  endpoint: string;
  apiKey: string;
  model: string;
  prompt: string;
  timeoutMs?: number;
}

/**
 * AI 生成一言（OpenAI 兼容 chat/completions）。
 * 未配置 key / endpoint 时返回 { text: 引导提示 }（不抛错）；
 * 接口调用失败（网络 / 非 2xx）时抛出 Error，由调用方提示。
 */
export async function generateAiQuote(
  options: AiQuoteOptions,
): Promise<SaysResult> {
  const endpoint = options.endpoint.trim();
  const apiKey = options.apiKey.trim();

  if (apiKey === '') {
    return {
      text: t('ai.notConfigured'),
      source: undefined,
    };
  }
  if (endpoint === '') {
    return {
      text: t('ai.notConfiguredEndpoint'),
      source: undefined,
    };
  }

  const model = options.model.trim() !== '' ? options.model.trim() : 'gpt-4o-mini';
  const prompt =
    options.prompt.trim() !== ''
      ? options.prompt.trim()
      : '请生成一句富有哲理的中文短句，不超过 40 字，直接输出。';

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: '请生成一句今日一言。' },
        ],
        max_tokens: 120,
        temperature: 0.9,
      }),
    },
    options.timeoutMs ?? 15000,
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `AI 接口返回 HTTP ${response.status}${detail !== '' ? `：${detail.slice(0, 120)}` : ''}`,
    );
  }

  const data: unknown = await response.json();
  const text = extractChatContent(data);
  if (text === null) {
    throw new Error('AI 接口响应缺少生成内容（choices[0].message.content）');
  }
  return { text };
}

/** 从 OpenAI 兼容 chat/completions 响应中提取 choices[0].message.content */
export function extractChatContent(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;
  const choices = record.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0];
  if (typeof first !== 'object' || first === null) return null;
  const message = (first as Record<string, unknown>).message;
  if (typeof message !== 'object' || message === null) return null;
  const content = (message as Record<string, unknown>).content;
  if (typeof content !== 'string') return null;
  const trimmed = content.trim();
  return trimmed !== '' ? trimmed : null;
}
