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
 * URL 识别与规范化（Sprint 3 omnibox）。
 *
 * normalizeUrl() 返回规范化后的完整 URL（无协议时默认补 https://），
 * 输入不像 URL（普通搜索词）时返回 null。
 */

/** IPv4 地址：127.0.0.1、192.168.1.1:8080、10.0.0.5/path */
const IPV4_RE =
  /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?::\d{1,5})?(?:[/?#]\S*)?$/;

/** 本地主机：localhost、localhost:5173、localhost:5173/path */
const LOCALHOST_RE = /^localhost(?::\d{1,5})?(?:[/?#]\S*)?$/i;

/**
 * 域名（至少一个点 + 2–63 位字母 TLD），可选端口 / 路径 / 查询 / 锚点：
 *   example.com、www.example.com、v2.example.co.uk:8080/path?q=1#top
 */
const DOMAIN_RE =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}(?::\d{1,5})?(?:[/?#]\S*)?$/;

/** 显式协议（http/https 等）：https://example.com */
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/\S*$/;

/**
 * 规范化用户输入：
 *   - 已带协议 → 原样返回；
 *   - 域名 / IP / localhost → 默认补 https://；
 *   - 其他 → null（视为普通搜索词）。
 */
export function normalizeUrl(input: string): string | null {
  const value = input.trim();
  if (value === '') return null;
  // 含空白（如带空格的句子）不可能是 URL
  if (/\s/.test(value)) return null;

  if (SCHEME_RE.test(value)) return value;
  if (IPV4_RE.test(value)) return `https://${value}`;
  if (LOCALHOST_RE.test(value)) return `https://${value}`;
  if (DOMAIN_RE.test(value)) return `https://${value}`;
  return null;
}
