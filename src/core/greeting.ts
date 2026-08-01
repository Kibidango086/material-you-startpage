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
 * 时钟 / 问候语核心逻辑（S2）。
 *
 * 纯函数设计：不依赖 DOM，便于单元测试与组件复用。
 * 时段划分：
 *   - 5–11 点   → 早上好
 *   - 11–13 点  → 中午好
 *   - 13–18 点  → 下午好
 *   - 18–5 点   → 晚上好（含 18–23 与 0–4）
 */

export type GreetingKey = 'morning' | 'noon' | 'afternoon' | 'evening';

/** 问候语文案映射 */
export const GREETING_TEXT: Record<GreetingKey, string> = {
  morning: '早上好',
  noon: '中午好',
  afternoon: '下午好',
  evening: '晚上好',
};

/** 根据小时返回问候语类别（hour: 0–23） */
export function getGreetingKey(hour: number): GreetingKey {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 13) return 'noon';
  if (hour >= 13 && hour < 18) return 'afternoon';
  return 'evening';
}

/** 返回当前时段的问候语文本 */
export function getGreeting(date: Date = new Date()): string {
  return GREETING_TEXT[getGreetingKey(date.getHours())];
}

/** 中文星期名 */
const WEEKDAY_NAMES = [
  '星期日',
  '星期一',
  '星期二',
  '星期三',
  '星期四',
  '星期五',
  '星期六',
] as const;

/**
 * 中文日期：如「2026年7月31日 星期五」。
 * 手动拼接（而非 toLocaleDateString），保证格式在任何环境下一致。
 */
export function formatChineseDate(date: Date = new Date()): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${
    WEEKDAY_NAMES[date.getDay()]
  }`;
}

/** 补零 */
function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/** 24 小时制时间：HH:MM:SS */
export function formatTime(date: Date = new Date()): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(
    date.getSeconds(),
  )}`;
}
