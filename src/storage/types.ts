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
 * 设置数据结构类型定义（与 defaults.ts 一一对应）。
 * 后续 Sprint 的组件与服务均基于此类型体系开发。
 */

/** 外观设置（S2/S6 使用） */
export interface AppearanceSettings {
  /** 主题模式：跟随系统 / 浅色 / 深色 */
  theme: 'auto' | 'light' | 'dark';
  /** Material You 种子色（十六进制） */
  seedColor: string;
  /** 是否显示页脚 fork 声明 */
  showFooter: boolean;
  /** 界面语言：zh-CN / zh-TW / en / ja */
  lang: 'zh-CN' | 'zh-TW' | 'en' | 'ja';
  /** 是否显示分组开关 */
  showGroups: boolean;
  /** 是否显示时钟区（S6 设置面板开关） */
  showClock: boolean;
  /** 时钟样式：数字 / 表盘（Material 风格） */
  clockStyle: 'digital' | 'analog';
  /** 是否显示日期 */
  showDate: boolean;
  /** 是否显示 LOGO */
  showLogo: boolean;
  /** 是否显示一言区（S6 设置面板开关） */
  showSays: boolean;
  /** 是否显示链接区（S6 设置面板开关） */
  showLinks: boolean;
}

/** 背景设置（S5 使用） */
export interface BackgroundSettings {
  /** 背景模式：纯色 / 上传图片 / 图片 URL / 视频 / 必应每日壁纸 */
  mode: 'color' | 'image' | 'url' | 'video' | 'bing';
  /** 纯色背景值 */
  color: string;
  /** 上传图片：idb:// 标记（原图存 IndexedDB，见 services/imageStore） */
  image: string;
  /** 图片 URL */
  url: string;
  /** 视频 URL */
  video: string;
  /** 必应每日壁纸镜像地址（fallback） */
  bingMirror: string;
  /** 最近一次成功获取的必应壁纸图片 URL（缓存，刷新后无需重新请求） */
  bingUrl: string;
  /** 最近一次成功获取必应壁纸的本地日期（YYYY-MM-DD，每日首次打开自动更新判断依据） */
  bingDate: string;
  /** 蒙版不透明度 0-1 */
  overlayOpacity: number;
  /** 背景模糊 0-30px */
  blur: number;
  /** 是否启用从壁纸提取主题色（真·Material You） */
  extractSeedFromWallpaper: boolean;
}

/** 搜索引擎定义 */
export interface SearchEngine {
  id: string;
  name: string;
  /** 搜索 URL，使用 {q} 占位查询词 */
  url: string;
  /** 图标（可选） */
  icon?: string;
}

/** 搜索设置（S3 使用） */
export interface SearchEnginesSettings {
  /** 当前默认搜索引擎 id */
  defaultEngine: string;
  /** 搜索引擎列表 */
  engines: SearchEngine[];
  /** 是否新标签页打开搜索结果 */
  openInNewTab: boolean;
}

/** 链接分组定义 */
export interface LinkGroup {
  id: string;
  name: string;
}

/** 链接卡片定义（S4 使用） */
export interface LinkItem {
  id: string;
  title: string;
  url: string;
  /** 所属分组 id */
  group: string;
  /** 自定义图标（可选） */
  icon?: string;
}

/** 链接设置（S4 使用） */
export interface LinksSettings {
  /** 分组列表 */
  groups: LinkGroup[];
  /** 链接卡片列表 */
  links: LinkItem[];
  /** 默认分组（'' 表示全部） */
  defaultGroup: string;
  /** 点击链接：新标签页打开（false 为当前页） */
  openInNewTab: boolean;
}

/** 一言 / 诗词设置（S6 使用） */
export interface SaysSettings {
  /** 模式：一言 / 今日诗词 / 自定义文本 / 自建一言 */
  mode: 'hitokoto' | 'poem' | 'custom' | 'customApi';
  /** 自定义文本 */
  customText: string;
  /** 自定义文本署名（出处） */
  customAuthor: string;
  /** 自建一言：自定义 API URL（返回与一言相同格式 {hitokoto, from, from_who}） */
  customApiUrl: string;
}

/** Omnibox 全能搜索框设置（S3 使用） */
export interface OmniboxSettings {
  /** 是否记录搜索历史 */
  historyEnabled: boolean;
  /** 历史记录最大条数（默认 15） */
  historyMax: number;
  /** 搜索历史（最近在前，由 Omnibox 维护，持久化到 localStorage） */
  history: string[];
  /** 是否启用百度联想建议 */
  suggestEnabled: boolean;
  /** 是否启用非中文翻译建议（MyMemory） */
  translateEnabled: boolean;
  /** 翻译默认目标语言（ISO 639-1，如 zh-CN / en / ja） */
  translateTargetLang: string;
  /** URL 直达是否默认补全 https:// */
  autoHttps: boolean;
}

/** 顶层设置结构 */
export interface Settings {
  appearance: AppearanceSettings;
  background: BackgroundSettings;
  searchEngines: SearchEnginesSettings;
  links: LinksSettings;
  says: SaysSettings;
  omnibox: OmniboxSettings;
}

/** localStorage 中存储的带版本号的设置结构 */
export interface PersistedSettings {
  schemaVersion: number;
  settings: Settings;
}

/** 订阅回调：settings 变化后触发 */
export type SettingsListener = (settings: Settings) => void;
