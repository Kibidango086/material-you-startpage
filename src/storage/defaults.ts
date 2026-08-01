/**
 * Copyright (C) 2026 Kibidango086
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * My Startpage —— 个人 Material You 风格起始页（by Kibidango086）。
 * 设计灵感来自 QUIK 2（https://github.com/quik-page/quik2，GPL-3.0），
 * 代码为 TypeScript + mdui v2 原创实现，未直接复制原项目代码。
 * 本项目以 GNU General Public License v3.0 发布，完整文本见根目录 LICENSE。
 */
import { BUILT_IN_ENGINES, DEFAULT_ENGINE_ID } from '../services/searchEngines';
import type { Settings } from './types';

/**
 * 存储 schema 版本号。
 * 每次结构发生不兼容变更时递增；store 加载时会把旧版本数据与默认值深合并补齐。
 */
export const SCHEMA_VERSION = 3;

/** localStorage 存储 key（带版本前缀，避免与旧数据冲突） */
export const STORAGE_KEY = 'material-you-startpage';

/**
 * 完整默认设置结构。
 * 覆盖 appearance / background / searchEngines / links / says / omnibox 六大模块，
 * 后续 Sprint 的功能默认值均以此为唯一事实源。
 */
export const DEFAULT_SETTINGS: Settings = {
  appearance: {
    theme: 'auto',
    seedColor: '#6750a4',
    showFooter: true,
    lang: 'zh-CN',
    /** 分组开关：默认关闭，开启后顶部显示 mdui-chip 分组切换 */
    showGroups: false,
    /** S6 设置面板：显示时钟 / 一言 / 链接区开关 */
    showClock: true,
    clockStyle: 'analog',
    showDate: true,
    showLogo: true,
    showSays: true,
    showLinks: true,
  },
  background: {
    mode: 'color',
    color: '#141218',
    image: '',
    url: '',
    video: '',
    bingMirror: 'https://api.dujin.org/bing/1920.php',
    bingUrl: '',
    bingDate: '',
    overlayOpacity: 0,
    blur: 0,
    extractSeedFromWallpaper: false,
  },
  searchEngines: {
    defaultEngine: DEFAULT_ENGINE_ID,
    openInNewTab: true,
    engines: [...BUILT_IN_ENGINES],
  },
  links: {
    groups: [],
    links: [
      {
        id: 'link-google',
        title: 'Google',
        url: 'https://www.google.com',
        group: '',
      },
      {
        id: 'link-youtube',
        title: 'YouTube',
        url: 'https://www.youtube.com',
        group: '',
      },
      {
        id: 'link-github',
        title: 'GitHub',
        url: 'https://github.com',
        group: '',
      },
      {
        id: 'link-wikipedia',
        title: 'Wikipedia',
        url: 'https://zh.wikipedia.org',
        group: '',
      },
      {
        id: 'link-reddit',
        title: 'Reddit',
        url: 'https://www.reddit.com',
        group: '',
      },
      {
        id: 'link-x',
        title: 'X (Twitter)',
        url: 'https://x.com',
        group: '',
      },
    ],
    defaultGroup: '',
    openInNewTab: true,
  },
  says: {
    mode: 'hitokoto',
    customText: '愿所有美好如期而至。',
    customAuthor: '',
    customApiUrl: '',
  },
  omnibox: {
    historyEnabled: true,
    historyMax: 15,
    history: [],
    suggestEnabled: true,
    translateEnabled: true,
    translateTargetLang: 'zh-CN',
    autoHttps: true,
  },
};
