/**
 * Copyright (C) 2026 Kibidango086
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * My Startpage —— 个人 Material You 风格起始页（by Kibidango086）。
 * 设计灵感来自 QUIK 2（https://github.com/quik-page/quik2，GPL-3.0），
 * 代码为 TypeScript + mdui v2 原创实现，未直接复制原项目代码。
 * 本项目以 GNU General Public License v3.0 发布，完整文本见根目录 LICENSE。
 */
import 'mdui/mdui.css';
// 按需注册 mdui 组件（替代 import 'mdui' 全量导入，避免注册 50+ 无用 Web Components）
import 'mdui/components/button.js';
import 'mdui/components/button-icon.js';
import 'mdui/components/card.js';
import 'mdui/components/chip.js';
import 'mdui/components/dialog.js';
import 'mdui/components/dropdown.js';
import 'mdui/components/list.js';
import 'mdui/components/list-item.js';
import 'mdui/components/list-subheader.js';
import 'mdui/components/menu.js';
import 'mdui/components/menu-item.js';
import 'mdui/components/segmented-button.js';
import 'mdui/components/segmented-button-group.js';
import 'mdui/components/select.js';
import 'mdui/components/slider.js';
import 'mdui/components/snackbar.js';
import 'mdui/components/switch.js';
import 'mdui/components/tab.js';
import 'mdui/components/tab-panel.js';
import 'mdui/components/tabs.js';
import 'mdui/components/text-field.js';
import 'mdui/components/tooltip.js';
import '@mdui/icons/settings--rounded.js';
import '@mdui/icons/close--rounded.js';
import './style.css';

import type { Dialog } from 'mdui';
import { getColorFromImage } from 'mdui/functions/getColorFromImage.js';
import { loadLocale } from 'mdui/functions/loadLocale.js';
import { setLocale } from 'mdui/functions/setLocale.js';
import { setColorScheme } from 'mdui/functions/setColorScheme.js';
import { setTheme } from 'mdui/functions/setTheme.js';

import { BackgroundManager } from './components/background';
import { Clock } from './components/clock';
import { Links } from './components/links';
import type { LinksApi } from './components/links';
import { Omnibox } from './components/omnibox';
import { Says } from './components/says';
import type { SaysApi } from './components/says';
import { SettingsDialog } from './components/settings-dialog';
import type { SettingsApi } from './components/settings-dialog';
import { getGreeting } from './core/greeting';
import { setLang, t } from './i18n';
import { formatResult, evaluate } from './core/calculator';
import {
  buildBingMirrors,
  extractBingImageUrl,
  fetchBingWallpaper,
  verifyImageLoadable,
} from './services/bingWallpaper';
import {
  BUILT_IN_ENGINES,
  buildSearchUrl,
  createCustomEngine,
} from './services/searchEngines';
import {
  extractChatContent,
  fetchHitokoto,
  fetchPoem,
  generateAiQuote,
} from './services/hitokoto';
import { fetchSuggest } from './services/suggest';
import type { TranslationResult } from './services/translate';
import { translateText } from './services/translate';
import { get, initDefaults, set, subscribe } from './storage/store';
import {
  dataUrlToBlob,
  resolveImageSource,
  saveBackgroundImage,
} from './services/imageStore';
import { loadImageForPixels } from './services/extractColor';
import type { SearchEngine, Settings } from './storage/types';
import { normalizeUrl } from './utils/url';

declare global {
  interface Window {
    /** 调试 / 自动化验证钩子 */
    __mysp?: {
      store: {
        get: () => Settings;
        set: (patch: unknown) => Settings;
      };
      omnibox: {
        setValue: (value: string) => void;
        submit: () => void;
        getEngine: () => SearchEngine | undefined;
      };
      links: LinksApi;
      says: SaysApi;
      settings: SettingsApi;
      background: ReturnType<BackgroundManager['expose']>;
      services: {
        normalizeUrl: (input: string) => string | null;
        evaluate: (expression: string) => number;
        formatResult: (value: number) => string;
        buildSearchUrl: (engine: { url: string }, query: string) => string;
        BUILT_IN_ENGINES: readonly SearchEngine[];
        createCustomEngine: (input: {
          name: string;
          url: string;
          icon?: string;
        }) => SearchEngine;
        fetchSuggest: (engineId: string, query: string, timeoutMs?: number) => Promise<string[]>;
        translateText: (text: string, targetLang?: string, timeoutMs?: number) => Promise<TranslationResult>;
        fetchBingWallpaper: (
          options?: Parameters<typeof fetchBingWallpaper>[0],
        ) => Promise<string>;
        buildBingMirrors: (bingMirror?: string) => ReturnType<typeof buildBingMirrors>;
        extractBingImageUrl: (
          data: unknown,
          origin?: string,
        ) => string | null;
        verifyImageLoadable: (url: string, timeoutMs?: number) => Promise<boolean>;
        fetchHitokoto: (timeoutMs?: number) => Promise<{
          text: string;
          source?: string;
        }>;
        fetchPoem: (timeoutMs?: number) => Promise<{
          text: string;
          source?: string;
        }>;
        generateAiQuote: (
          options: Parameters<typeof generateAiQuote>[0],
        ) => Promise<{ text: string; source?: string }>;
        extractChatContent: (data: unknown) => string | null;
      };
    };
  }
}

/** 显示开关（LOGO / 时钟 / 一言 / 链接）→ 根元素 data 属性，CSS 控制显隐 */
function applyVisibility(settings: Settings): void {
  document.documentElement.dataset.hideLogo = settings.appearance.showLogo
    ? 'false'
    : 'true';
  document.documentElement.dataset.hideClock = settings.appearance.showClock
    ? 'false'
    : 'true';
  document.documentElement.dataset.hideDate = settings.appearance.showDate
    ? 'false'
    : 'true';
  document.documentElement.dataset.hideSays = settings.appearance.showSays
    ? 'false'
    : 'true';
  document.documentElement.dataset.hideLinks = settings.appearance.showLinks
    ? 'false'
    : 'true';
  document.documentElement.dataset.hideFooter = settings.appearance.showFooter
    ? 'false'
    : 'true';
}

/** 时钟样式（数字 / 拟物）→ 同步到 Clock 组件 */
function applyClockStyle(clock: Clock): void {
  clock.applyStyle();
}

/**
 * 主题 + 配色种子 → mdui setTheme / setColorScheme（即时生效）。
 * 额外在 <html> 上写入 theme / color-scheme 属性：
 *  - mdui 本身通过 class（mdui-theme-* / mdui-custom-color-scheme-*）驱动样式；
 *  - 属性便于 CSS 选择器 / 调试 / 自动化验证直接读取当前值。
 */
function applyThemeAndColorScheme(settings: Settings): void {
  setTheme(settings.appearance.theme);
  document.documentElement.setAttribute('theme', settings.appearance.theme);
  setColorScheme(settings.appearance.seedColor);
  document.documentElement.setAttribute(
    'color-scheme',
    settings.appearance.seedColor,
  );
  updateFavicon(settings.appearance.seedColor);
}

/**
 * 生成动态 favicon（SVG data URI，Material You 山 + 太阳徽标）。
 * 颜色直接读 mdui 的 CSS 变量（primary-container 背景 / primary 图案），
 * 因此深浅色模式、跟随系统模式下都会自动跟随主题。
 * seedColor 仅作为 CSS 变量读取失败时的兜底色。
 */
function updateFavicon(seedColor: string): void {
  const fallback = /^#[0-9a-fA-F]{6}$/.test(seedColor) ? seedColor : '#6750a4';
  const cs = getComputedStyle(document.documentElement);
  const read = (name: string, fb: string): string => {
    const v = cs.getPropertyValue(name).trim();
    return v !== '' ? `rgb(${v})` : fb;
  };
  const container = read('--mdui-color-primary-container', fallback);
  const primary = read('--mdui-color-primary', '#ffffff');
  const onContainer = read('--mdui-color-on-primary-container', '#ffffff');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<rect width="100" height="100" rx="22" fill="${container}"/>` +
    `<circle cx="66" cy="32" r="8" fill="${primary}"/>` +
    `<path d="M12 78 Q28 40 50 60 Q62 70 76 54 Q84 46 88 56 L88 78 Z" fill="${primary}" opacity="0.9"/>` +
    `<path d="M30 78 Q44 54 58 66 Q64 70 74 78 Z" fill="${onContainer}" opacity="0.85"/>` +
    `</svg>`;
  const href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link === null) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
}

/** 监听 <html> 上的主题属性变化（深浅色 / 配色方案），节流刷新 favicon */
let faviconTimer: number | null = null;
function watchFavicon(): void {
  const flush = (): void => {
    if (faviconTimer !== null) window.clearTimeout(faviconTimer);
    faviconTimer = window.setTimeout(() => {
      faviconTimer = null;
      updateFavicon('#6750a4');
    }, 120);
  };
  new MutationObserver(flush).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style', 'class'],
  });
  if (window.matchMedia !== undefined) {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', flush);
  }
}

/**
 * 迁移旧数据：早期版本把上传的背景图以 base64 存在 localStorage 里，
 * 大图会撑爆 ~5MB 配额。启动时若发现 data: 开头的旧数据，转存到
 * IndexedDB 并把标记改写成 idb://background。
 */
async function migrateLegacyBackgroundImage(settings: Settings): Promise<void> {
  const image = settings.background.image;
  if (!image.startsWith('data:')) return;
  try {
    const blob = await dataUrlToBlob(image);
    const marker = await saveBackgroundImage(blob);
    set({ background: { mode: 'image', image: marker } });
  } catch {
    // 迁移失败（如图片损坏）：保留原值，不影响启动
  }
}

/** 从壁纸提取主题色（防抖），开关开启时自动执行 */
let extractSeedTimer: number | null = null;
/** 取色防重入锁：上一轮未结束时跳过本轮，避免并发取色拖慢页面 */
let extractSeedBusy = false;
function applyExtractSeedFromWallpaper(settings: Settings): void {
  if (!settings.background.extractSeedFromWallpaper) return;
  const bg = settings.background;
  const src =
    bg.mode === 'image'
      ? bg.image
      : bg.mode === 'url'
        ? bg.url
        : bg.mode === 'bing'
          ? bg.bingUrl
          : '';
  if (src === '') return;
  if (extractSeedTimer !== null) window.clearTimeout(extractSeedTimer);
  extractSeedTimer = window.setTimeout(() => {
    extractSeedTimer = null;
    if (extractSeedBusy) return; // 上一轮未完成：跳过（下个设置变化会重试）
    extractSeedBusy = true;
    void (async () => {
      try {
        const resolved = await resolveImageSource(src);
        if (resolved === '') return;
        const img = await loadImageForPixels(resolved);
        if (img === null) return; // 不支持 CORS 的跨域图：静默降级
        const color = await getColorFromImage(img);
        // 提取结果与当前配色相同 → 不再 set（避免触发订阅循环）
        if (color.toLowerCase() !== get().appearance.seedColor.toLowerCase()) {
          setColorScheme(color);
          set({ appearance: { seedColor: color } });
        }
      } catch {
        // 解析失败时静默降级，保持当前配色
      } finally {
        extractSeedBusy = false;
      }
    })();
  }, 400);
}

/** 渲染主界面骨架（Hero 时钟 / 搜索 / 链接 / 一言 / 页脚 / 设置面板） */
function renderApp(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (app === null) return;

  app.innerHTML = `
    <!-- 背景层：固定定位（z-index: 0），位于内容层（.app, z-index: 1）之下 -->
    <div class="bg-layer" data-background-layer></div>

    <div class="app">
      <header class="app-topbar">
        <mdui-tooltip content="${t('settings.title')}" placement="bottom">
          <mdui-button-icon
            id="settings-button"
            class="app-topbar__settings"
            icon="settings--rounded"
            variant="standard"
            aria-label="设置"
          >
            <mdui-icon-settings--rounded></mdui-icon-settings--rounded>
          </mdui-button-icon>
        </mdui-tooltip>
      </header>

      <main class="app-main">
        <!-- Hero：LOGO + 实时时钟 + 中文日期 + 问候语 -->
        <section class="hero" data-section="hero" aria-label="时钟">
          <div class="hero__logo" role="img" aria-label="${t('settings.showLogoHint')}">
            <span class="hero__logo-badge" aria-hidden="true">M</span>
            <span class="hero__logo-name">My&nbsp;<em>Startpage</em></span>
          </div>
          <div class="clock" data-clock></div>
        </section>

        <!-- 搜索区：Omnibox 全能搜索框（URL 直达 / 多引擎 / 计算 / 翻译 / 联想） -->
        <section class="search-section" data-section="search" aria-label="搜索">
          <div data-omnibox></div>
        </section>

        <!-- 链接区：常用链接卡片网格 + 分组切换 + 增删改 -->
        <section class="links-section" data-section="links" aria-label="链接">
          <div data-links></div>
        </section>

        <!-- 一言区：hitokoto / 今日诗词 / 自定义 / AI 生成，点击刷新 -->
        <section class="says-section" data-section="says" aria-label="一言">
          <div data-says></div>
        </section>
      </main>

      <footer class="app-footer">
        <p class="app-footer__text">© 2026 Kibidango086 · My Startpage · <a href="https://www.mdui.org" target="_blank" rel="noopener noreferrer">mdui v2</a></p>
      </footer>

      <!-- 完整设置面板（S6）：mdui-dialog + mdui-tabs 六 Tab，内容由 SettingsDialog 注入 -->
      <mdui-dialog
        id="settings-dialog"
        class="settings-dialog"
        close-on-esc
        close-on-overlay-click
      ></mdui-dialog>
    </div>
  `;
}

/** 右上角齿轮 → 打开设置面板 */
function wireSettingsButton(settingsDialog: SettingsDialog): void {
  const button = document.getElementById('settings-button');
  button?.addEventListener('click', () => settingsDialog.open());
}


/** 问候 toast 限频 key（localStorage） */
const GREETING_KEY = 'mysp:greeting';

/** 页面加载后用 mdui-snackbar 弹出分时段问候（几小时内只出现一次） */
function showGreetingToast(): void {
  const now = Date.now();
  try {
    const last = Number(localStorage.getItem(GREETING_KEY) ?? '0');
    // 4 小时内不再重复弹
    if (now - last < 4 * 60 * 60 * 1000) return;
    localStorage.setItem(GREETING_KEY, String(now));
  } catch {
    // localStorage 不可用时每次照常弹
  }
  const greeting = getGreeting();
  const bar = document.createElement('mdui-snackbar');
  bar.textContent = greeting;
  bar.autoCloseDelay = 3000;
  document.body.appendChild(bar);
  bar.open = true;
}

function mountClock(): Clock {
  const root = document.querySelector<HTMLElement>('[data-clock]');
  if (root === null) throw new Error('[main] 缺少 [data-clock] 元素');
  const clock = new Clock(root);
  clock.start();
  showGreetingToast();
  return clock;
}

/** 装配 Omnibox 全能搜索框 */
function mountOmnibox(): Omnibox {
  const root = document.querySelector<HTMLElement>('[data-omnibox]');
  if (root === null) throw new Error('[main] 缺少 [data-omnibox] 元素');
  return new Omnibox(root);
}

/** 装配常用链接卡片网格 */
function mountLinks(): Links {
  const root = document.querySelector<HTMLElement>('[data-links]');
  if (root === null) throw new Error('[main] 缺少 [data-links] 元素');
  return new Links(root);
}

/** 装配一言组件 */
function mountSays(): Says {
  const root = document.querySelector<HTMLElement>('[data-says]');
  if (root === null) throw new Error('[main] 缺少 [data-says] 元素');
  return new Says(root);
}

/**
 * 装配设置面板（懒加载）。
 *
 * SettingsDialog 内部包含 6 个 Tab / 6 个子对话框、200+ mdui 组件，
 * 若在页面加载时立即实例化会一次性渲染全部 Shadow DOM，拖慢首屏。
 * 这里包装为「首次 open() 时才真正 new SettingsDialog」的代理：
 * 主界面始终只有 2 个图标按钮 + 轻量 DOM，设置面板按需渲染。
 */
function mountSettingsDialog(
  manager: BackgroundManager,
  says: Says,
): SettingsDialog {
  const dialog = document.getElementById('settings-dialog') as Dialog | null;
  if (dialog === null) throw new Error('[main] 缺少 #settings-dialog 元素');

  let instance: SettingsDialog | null = null;
  const ensure = (): SettingsDialog => {
    if (instance === null) {
      instance = new SettingsDialog(dialog, manager, says);
    }
    return instance;
  };

  const proxy = {
    open: (tab?: string): void => {
      ensure().open(tab);
    },
    openTab: (tab: string): void => {
      ensure().openTab(tab);
    },
    close: (): void => {
      instance?.close();
    },
    getTabs: (): string[] => ['appearance', 'background', 'search', 'links', 'says', 'about'],
    getActiveTab: (): string | undefined => instance?.getActiveTab(),
  } satisfies SettingsApi;

  return proxy as unknown as SettingsDialog;
}

/** 装配背景层管理器 */
function mountBackgroundManager(): BackgroundManager {
  const layer = document.querySelector<HTMLElement>('[data-background-layer]');
  if (layer === null) throw new Error('[main] 缺少背景层元素');
  return new BackgroundManager(layer);
}

/**
 * 应用引导：
 * 1. 加载 zh-CN 语言包（mdui 组件内置文案中文化）
 * 2. 存储层：初始化默认设置（含 schema 版本迁移）
 * 3. 主题 / 配色种子 / 显示开关 / 壁纸取色：初始应用 + 订阅实时同步
 * 4. 渲染主界面并启动交互
 */
async function bootstrap(): Promise<void> {
  loadLocale(() => import('mdui/locales/zh-cn.js'));
  try {
    await setLocale('zh-cn');
  } catch {
    // 语言包加载失败不阻塞启动
  }

  initDefaults();

  // 迁移旧版 localStorage base64 背景图 → IndexedDB
  await migrateLegacyBackgroundImage(get());

  // 外观类设置：初始应用 + 订阅实时同步
  const initial = get();
  setLang(initial.appearance.lang);
  applyVisibility(initial);
  applyThemeAndColorScheme(initial);
  applyExtractSeedFromWallpaper(initial);

  renderApp();
  const backgroundManager = mountBackgroundManager();
  const says = mountSays();
  const settingsDialog = mountSettingsDialog(backgroundManager, says);
  wireSettingsButton(settingsDialog);
  const clock = mountClock();
  applyClockStyle(clock);
  watchFavicon();
  const omnibox = mountOmnibox();
  const links = mountLinks();

  let lastLang = initial.appearance.lang;
  subscribe((settings) => {
    applyVisibility(settings);
    applyThemeAndColorScheme(settings);
    applyExtractSeedFromWallpaper(settings);
    applyClockStyle(clock);
    // 语言切换 → 重载页面（所有组件按新语言重新初始化）
    if (settings.appearance.lang !== lastLang) {
      lastLang = settings.appearance.lang;
      window.location.reload();
    }
  });

  // 调试 / 自动化验证钩子
  window.__mysp = {
    store: { get, set },
    omnibox: {
      setValue: (value: string) => omnibox.setValue(value),
      submit: () => omnibox.submit(),
      getEngine: () => omnibox.getEngine(),
    },
    links: links.expose(),
    says: says.expose(),
    settings: {
      open: () => settingsDialog.open(),
      openTab: (tab: string) => settingsDialog.openTab(tab),
      close: () => settingsDialog.close(),
      getTabs: () => [
        'appearance',
        'background',
        'search',
        'links',
        'says',
        'about',
      ],
      getActiveTab: () => settingsDialog.getActiveTab(),
    },
    background: backgroundManager.expose(),
    services: {
      normalizeUrl,
      evaluate,
      formatResult,
      buildSearchUrl,
      BUILT_IN_ENGINES: [...BUILT_IN_ENGINES],
      createCustomEngine,
      fetchSuggest,
      translateText,
      fetchBingWallpaper,
      buildBingMirrors,
      extractBingImageUrl,
      verifyImageLoadable,
      fetchHitokoto,
      fetchPoem,
      generateAiQuote,
      extractChatContent,
    },
  };
}

void bootstrap();
