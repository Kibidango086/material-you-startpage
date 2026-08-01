/**
 * Copyright (C) 2026 Kibidango086
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * My Startpage —— 个人 Material You 风格起始页（by Kibidango086）。
 * 设计灵感来自 QUIK 2（https://github.com/quik-page/quik2，GPL-3.0），
 * 代码为 TypeScript + mdui v2 原创实现，未直接复制原项目代码。
 * 本项目以 GNU General Public License v3.0 发布，完整文本见根目录 LICENSE。
 */
import { DEFAULT_SETTINGS, SCHEMA_VERSION, STORAGE_KEY } from './defaults';
import type {
  PersistedSettings,
  Settings,
  SettingsListener,
} from './types';

/**
 * 类型化 localStorage 存储层。
 *
 * 能力：
 * - 默认值深合并：读取时与 DEFAULT_SETTINGS 逐层深合并，缺字段自动补齐（含旧 schema 数据迁移）；
 * - schema 版本号：每次不兼容变更递增 SCHEMA_VERSION，版本不一致时以默认值合并兜底；
 * - 订阅发布：set() 后同步通知所有订阅者，组件据此重渲染。
 *
 * 导出：get / set / subscribe / initDefaults
 */

/** 持久化数据的包装 key */
const PERSIST_KEY = `${STORAGE_KEY}:v${SCHEMA_VERSION}`;

/** 内存中的当前设置快照 */
let current: Settings = structuredClone(DEFAULT_SETTINGS);

/** 订阅者集合 */
const listeners = new Set<SettingsListener>();

/** 是否为纯对象（用于深合并判定） */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * 深合并：把 source 合并进 target。
 * - 双方均为纯对象 → 递归合并；
 * - 数组 / 基本类型 / null → 直接以 source 覆盖；
 * - source 中为 undefined 的字段 → 保留 target 原值（支持局部更新）。
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: unknown,
): T {
  if (!isPlainObject(source)) {
    return (source === undefined ? target : (source as T));
  }

  const result: Record<string, unknown> = { ...target };

  for (const [key, value] of Object.entries(source)) {
    const targetValue = result[key];
    if (isPlainObject(value) && isPlainObject(targetValue)) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else if (value !== undefined) {
      result[key] = value;
    }
  }

  return result as T;
}

/** 递归值比较（纯对象 / 数组 / 基本类型） */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    return (
      keysA.length === keysB.length &&
      keysA.every((k) => deepEqual(a[k], b[k]))
    );
  }
  return false;
}

/** 从 localStorage 读取原始持久化数据（解析失败返回 null） */
function readRaw(): PersistedSettings | null {
  const raw = localStorage.getItem(PERSIST_KEY);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as PersistedSettings;
  } catch {
    // 数据损坏时丢弃，回到默认值
    localStorage.removeItem(PERSIST_KEY);
    return null;
  }
}

/** 持久化当前快照到 localStorage（配额超限时降级为仅内存，避免抛异常中断） */
function persist(): void {
  const payload: PersistedSettings = {
    schemaVersion: SCHEMA_VERSION,
    settings: current,
  };
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(payload));
  } catch (error) {
    // localStorage 配额（约 5MB）超限：本次修改只保留在内存中，
    // 刷新后回退到上次成功持久化的快照。
    console.warn('[store] localStorage 配额不足，设置未持久化:', error);
  }
}

/** 通知所有订阅者（快照隔离，避免外部修改污染内部状态） */
function emit(): void {
  const snapshot: Settings = structuredClone(current);
  for (const listener of listeners) {
    listener(snapshot);
  }
}

/** 把任意数据与默认值深合并，返回完整 Settings */
function mergeWithDefaults(data: unknown): Settings {
  const merged = deepMerge(
    structuredClone(DEFAULT_SETTINGS) as unknown as Record<string, unknown>,
    data,
  );
  return merged as unknown as Settings;
}

/**
 * 将默认设置写入 localStorage（已存在则补齐缺失字段并重写）。
 * 返回当前设置。
 */
export function initDefaults(): Settings {
  const raw = readRaw();
  if (raw === null) {
    persist();
  } else {
    // 旧数据 / 缺字段数据：与默认值深合并后回写，保证结构完整
    current = mergeWithDefaults(raw.settings);
    persist();
  }
  return get();
}

/** 读取完整设置（每次返回深拷贝，安全可变） */
export function get(): Settings {
  return structuredClone(current);
}

/**
 * 局部更新设置（与当前快照深合并，数组整体替换）。
 * 例：set({ appearance: { seedColor: '#006495' } })
 */
export function set(patch: unknown): Settings {
  if (!isPlainObject(patch)) return get();
  const merged = deepMerge(
    current as unknown as Record<string, unknown>,
    patch,
  ) as unknown as Settings;
  // 值比较：patch 未产生实际变化时不持久化、不通知订阅者。
  // 关键作用：取色回写 seedColor 若与当前一致，不会触发订阅 → 不会
  // 形成「取色 → set → 订阅 → 取色」的无限循环（页面卡顿根因）。
  if (deepEqual(merged, current)) return get();
  current = merged;
  persist();
  emit();
  return get();
}

/**
 * 订阅设置变更。返回取消订阅函数。
 */
export function subscribe(listener: SettingsListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
