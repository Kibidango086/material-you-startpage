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
 * 设置面板（Sprint 6）— mdui-dialog + mdui-tabs 六 Tab 全联动。
 *
 * Tab 一览：
 *   - 外观：主题（浅色/深色/跟随系统 → setTheme）、配色种子（≥5 预设 + 自定义
 *     取色 → setColorScheme）、显示时钟/日期/一言/链接/页脚开关、从壁纸提取主题色；
 *   - 背景：整合 S5 全部背景模式控件（纯色 / 上传 / URL / 视频 / 必应 + 蒙版滑块）；
 *   - 搜索：引擎列表（mdui-list）+ mdui-dialog 增删改，URL 必须含 {q}，
 *     删除默认引擎自动回退必应，改动即时同步 omnibox；
 *   - 链接：链接增删改 + 分组管理（新建 / 重命名 / 删除 / 归属），与主页卡片区实时同步；
 *   - 一言：来源切换（随机一言 / 今日诗词 / 自定义 / AI 生成）、自定义文本编辑、
 *     AI 配置（endpoint / key / model / prompt）、立即刷新；
 *   - 关于：fork 声明、原项目链接、技术栈与致谢。
 *
 * 所有控件修改立即写 localStorage（经类型化 store）并即时生效；
 * 关闭重开面板 / 刷新页面后状态保持（syncFromStore）。
 */
import '@mdui/icons/add.js';
import '@mdui/icons/close.js';
import '@mdui/icons/delete.js';
import '@mdui/icons/edit.js';
import '@mdui/icons/manage-accounts.js';
import '@mdui/icons/refresh.js';
import '@mdui/icons/check.js';
import '@mdui/icons/palette--rounded.js';
import '@mdui/icons/wallpaper--rounded.js';
import '@mdui/icons/search--rounded.js';
import '@mdui/icons/link--rounded.js';
import '@mdui/icons/format-quote--rounded.js';
import '@mdui/icons/info--rounded.js';
import '@mdui/icons/schedule--rounded.js';
import '@mdui/icons/av-timer--rounded.js';
import '@mdui/icons/light-mode--rounded.js';
import '@mdui/icons/dark-mode--rounded.js';
import '@mdui/icons/brightness-auto--rounded.js';

import { getColorFromImage } from 'mdui/functions/getColorFromImage.js';
import { setColorScheme } from 'mdui/functions/setColorScheme.js';
import { setTheme } from 'mdui/functions/setTheme.js';
import { snackbar } from 'mdui/functions/snackbar.js';

import { t } from '../i18n';
import type {
  Dialog,
  SegmentedButtonGroup,
  Select,
  Switch,
  Tabs,
  TextField,
} from 'mdui';

import {
  createCustomEngine,
  DEFAULT_ENGINE_ID,
  validateEngineUrl,
} from '../services/searchEngines';
import { get, set, subscribe } from '../storage/store';
import { loadImageForPixels } from '../services/extractColor';
import { resolveImageSource } from '../services/imageStore';
import type { LinkGroup, LinkItem, SearchEngine } from '../storage/types';
import { validateLinkUrl } from './links';
import type { BackgroundManager } from './background';
import { BackgroundPanel, PRESET_COLORS } from './background-panel';
import type { Says } from './says';

/** 唯一 id 生成（与 links.ts 同策略） */
function uid(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${rand}`;
}

/** 单选 mdui-select 取值 */
function readSelectValue(select: Select): string {
  const value = select.value;
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/** 取当前背景图片 URL（mode 为 image/url/bing 时），无则返回空串 */
function currentBackgroundImageUrl(): string {
  const bg = get().background;
  if (bg.mode === 'image') return bg.image;
  if (bg.mode === 'url') return bg.url;
  if (bg.mode === 'bing') return bg.bingUrl;
  return '';
}

/** 设置面板对外 API（调试 / 自动化验证） */
export interface SettingsApi {
  open: () => void;
  openTab: (tab: string) => void;
  close: () => void;
  getTabs: () => string[];
  getActiveTab: () => string | undefined;
}

export class SettingsDialog {
  readonly dialog: Dialog;

  private readonly tabs: Tabs;
  private readonly says: Says;
  private readonly unsub: () => void;
  /** 上次激活面板高度缓存（用于 Tab 切换高度动画） */
  private lastPanelHeight = 0;

  // 外观
  private readonly themeGroup: SegmentedButtonGroup;
  private readonly seedColorInput: HTMLInputElement;
  private readonly seedSwatches: HTMLElement[];
  private readonly showClockSwitch: Switch;
  private readonly showDateSwitch: Switch;
  private readonly clockStyleGroup: SegmentedButtonGroup;
  private readonly showLogoSwitch: Switch;
  private readonly showFooterSwitch: Switch;
  private readonly showSaysSwitch: Switch;
  private readonly showLinksSwitch: Switch;
  private readonly extractSeedSwitch: Switch;
  private readonly langSelect: Select;
  private readonly translateTargetField: TextField;
  private readonly searchNewTabSwitch: Switch;
  private readonly linksNewTabSwitch: Switch;

  // 搜索
  private readonly engineList: HTMLElement;
  private readonly engineAddBtn: HTMLElement;
  private readonly engineDialog: Dialog;
  private readonly engineNameField: TextField;
  private readonly engineUrlField: TextField;
  private readonly engineSaveBtn: HTMLElement;
  private readonly engineCancelBtn: HTMLElement;
  private readonly engineDeleteBtn: HTMLElement;
  private editingEngineId: string | null = null;

  // 链接
  private readonly linkList: HTMLElement;
  private readonly linkAddBtn: HTMLElement;
  private readonly linkDialog: Dialog;
  private readonly linkTitleField: TextField;
  private readonly linkUrlField: TextField;
  private readonly linkIconField: TextField;
  private readonly linkGroupSelect: Select;
  private readonly linkSaveBtn: HTMLElement;
  private readonly linkCancelBtn: HTMLElement;
  private readonly linkDeleteBtn: HTMLElement;
  private editingLinkId: string | null = null;

  // 分组
  private readonly groupBtn: HTMLElement;
  private readonly groupsDialog: Dialog;
  private readonly groupNameField: TextField;
  private readonly groupAddBtn: HTMLElement;
  private readonly groupList: HTMLElement;
  private readonly groupsDialogClose: HTMLElement;

  // 一言
  private readonly saysModeGroup: SegmentedButtonGroup;
  private readonly saysCustomField: TextField;
  private readonly saysCustomAuthorField: TextField;
  private readonly saysCustomApiUrlField: TextField;
  private readonly saysRefreshBtn: HTMLElement;

  constructor(
    dialog: Dialog,
    manager: BackgroundManager,
    says: Says,
  ) {
    this.dialog = dialog;
    this.says = says;
    dialog.headline = t('settings.title');
    dialog.innerHTML = template();

    // 关联编辑对话框：独立顶层 mdui-dialog（避免与设置面板嵌套）
    this.engineDialog = createSubDialog(
      'engine-dialog',
      t('searchTab.addEngine'),
      ENGINE_DIALOG_TEMPLATE(),
    );
    this.linkDialog = createSubDialog(
      'panel-link-dialog',
      t('links.addLink'),
      PANEL_LINK_DIALOG_TEMPLATE(),
    );
    this.groupsDialog = createSubDialog(
      'panel-groups-dialog',
      t('linksTab.groups'),
      PANEL_GROUPS_DIALOG_TEMPLATE(),
    );

    const q = <T extends Element>(selector: string): T => {
      const el = dialog.querySelector<T>(selector);
      if (el === null) throw new Error(`[settings-dialog] 缺少 ${selector}`);
      return el;
    };

    this.tabs = q<Tabs>('#settings-tabs');

    // 外观
    this.themeGroup = q<SegmentedButtonGroup>('#theme-segmented');
    this.seedColorInput = q<HTMLInputElement>('#seed-color-input');
    this.seedSwatches = Array.from(
      dialog.querySelectorAll<HTMLElement>('[data-seed-swatch]'),
    );
    this.showClockSwitch = q<Switch>('#show-clock-switch');
    this.showDateSwitch = q<Switch>('#show-date-switch');
    this.clockStyleGroup = q<SegmentedButtonGroup>('#clock-style-group');
    this.showLogoSwitch = q<Switch>('#show-logo-switch');
    this.showFooterSwitch = q<Switch>('#show-footer-switch');
    this.showSaysSwitch = q<Switch>('#show-says-switch');
    this.showLinksSwitch = q<Switch>('#show-links-switch');
    this.extractSeedSwitch = q<Switch>('#extract-seed-switch');
    this.langSelect = q<Select>('#language-select');
    this.translateTargetField = q<TextField>('#translate-target-field');
    this.searchNewTabSwitch = q<Switch>('#search-newtab-switch');
    this.linksNewTabSwitch = q<Switch>('#links-newtab-switch');

    // 搜索
    this.engineList = q<HTMLElement>('#engine-list');
    this.engineAddBtn = q<HTMLElement>('#engine-add-btn');
    this.engineNameField = this.engineDialog.querySelector<TextField>(
      '#engine-name-field',
    ) as TextField;
    this.engineUrlField = this.engineDialog.querySelector<TextField>(
      '#engine-url-field',
    ) as TextField;
    this.engineSaveBtn = this.engineDialog.querySelector<HTMLElement>(
      '#engine-save-btn',
    ) as HTMLElement;
    this.engineCancelBtn = this.engineDialog.querySelector<HTMLElement>(
      '#engine-cancel-btn',
    ) as HTMLElement;
    this.engineDeleteBtn = this.engineDialog.querySelector<HTMLElement>(
      '#engine-delete-btn',
    ) as HTMLElement;

    // 链接
    this.linkList = q<HTMLElement>('[data-panel-link-list]');
    this.linkAddBtn = q<HTMLElement>('#panel-link-add-btn');
    this.linkTitleField = this.linkDialog.querySelector<TextField>(
      '#panel-link-title-field',
    ) as TextField;
    this.linkUrlField = this.linkDialog.querySelector<TextField>(
      '#panel-link-url-field',
    ) as TextField;
    this.linkIconField = this.linkDialog.querySelector<TextField>(
      '#panel-link-icon-field',
    ) as TextField;
    this.linkGroupSelect = this.linkDialog.querySelector<Select>(
      '#panel-link-group-select',
    ) as Select;
    this.linkSaveBtn = this.linkDialog.querySelector<HTMLElement>(
      '#panel-link-save-btn',
    ) as HTMLElement;
    this.linkCancelBtn = this.linkDialog.querySelector<HTMLElement>(
      '#panel-link-cancel-btn',
    ) as HTMLElement;
    this.linkDeleteBtn = this.linkDialog.querySelector<HTMLElement>(
      '#panel-link-delete-btn',
    ) as HTMLElement;

    // 分组
    this.groupBtn = q<HTMLElement>('#panel-group-btn');
    this.groupNameField = this.groupsDialog.querySelector<TextField>(
      '#panel-group-name-field',
    ) as TextField;
    this.groupAddBtn = this.groupsDialog.querySelector<HTMLElement>(
      '#panel-group-add-btn',
    ) as HTMLElement;
    this.groupList = this.groupsDialog.querySelector<HTMLElement>(
      '[data-panel-group-list]',
    ) as HTMLElement;
    this.groupsDialogClose = this.groupsDialog.querySelector<HTMLElement>(
      '#panel-groups-close-btn',
    ) as HTMLElement;

    // 一言
    this.saysModeGroup = q<SegmentedButtonGroup>('#says-mode-group');
    this.saysCustomField = q<TextField>('#says-custom-field');
    this.saysCustomAuthorField = q<TextField>('#says-custom-author-field');
    this.saysCustomApiUrlField = q<TextField>('#says-custom-api-url');
    this.saysRefreshBtn = q<HTMLElement>('#says-refresh-btn');

    new BackgroundPanel(q<HTMLElement>('[data-bg-panel-root]'), manager);

    this.wire();
    this.syncFromStore();
    this.unsub = subscribe(() => this.syncFromStore());
  }

  /** 打开设置面板（可指定初始 Tab） */
  open(tab?: string): void {
    if (tab !== undefined && TAB_VALUES.includes(tab)) {
      this.tabs.value = tab;
    }
    this.syncFromStore();
    this.dialog.open = true;
  }

  /** 关闭设置面板 */
  close(): void {
    this.dialog.open = false;
  }

  /** 切换到指定 Tab（编程式 / 自动化验证） */
  openTab(tab: string): void {
    if (TAB_VALUES.includes(tab)) this.tabs.value = tab;
  }

  /** 当前激活 Tab */
  getActiveTab(): string | undefined {
    const value = this.tabs.value;
    if (Array.isArray(value)) return value[0];
    return value;
  }

  /** 销毁：取消订阅 */
  destroy(): void {
    this.unsub();
  }

  // ─────────────── 事件装配 ───────────────

  private wire(): void {
    // 打开动画完成后缓存初始面板高度（Tab 切换动画的起点）
    this.dialog.addEventListener('opened', () => {
      const panel = this.dialog.shadowRoot?.querySelector<HTMLElement>('[part="panel"]');
      this.lastPanelHeight = panel?.getBoundingClientRect().height ?? 0;
    });

    // Tab 切换 → 面板高度平滑过渡（对最外层 dialog panel 做 WAAPI 高度动画）
    // 关键：先把高度锁定为旧值 from（容器当前就是这个高度，不会跳变），
    // 下一帧再启动 from→to 动画，避免 element.animate() 异步启动导致的先跳目标值闪烁。
    this.tabs.addEventListener('change', () => {
      const from = this.lastPanelHeight;
      const hostPanel = this.dialog.shadowRoot?.querySelector<HTMLElement>('[part="panel"]');
      if (hostPanel === null || hostPanel === undefined) return;
      // change 触发时 mdui 已完成切换，量到的就是新内容自然高度
      const to = hostPanel.getBoundingClientRect().height;
      if (from <= 0 || to <= 0 || Math.abs(from - to) < 2) {
        this.lastPanelHeight = to;
        return;
      }
      // 锁定旧高度（内容已切换但容器高度保持，视觉无跳变）
      hostPanel.style.height = `${from}px`;
      // 下一帧启动动画：从 from 平滑过渡到 to
      requestAnimationFrame(() => {
        const anim = hostPanel.animate(
          [{ height: `${from}px` }, { height: `${to}px` }],
          { duration: 260, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
        );
        anim.onfinish = () => {
          hostPanel.style.height = 'auto';
          this.lastPanelHeight = hostPanel.getBoundingClientRect().height;
        };
      });
    });

    // 关闭按钮（右上角 X + 底部「关闭」）
    for (const selector of [
      '.settings-dialog__close',
      '#settings-dialog-close-action',
    ]) {
      this.dialog.querySelector(selector)?.addEventListener('click', () => {
        this.close();
      });
    }

    // ── 外观 ──
    this.themeGroup.addEventListener('change', () => {
      const theme = this.themeGroup.value as 'light' | 'dark' | 'auto';
      setTheme(theme);
      set({ appearance: { theme } });
    });

    this.seedColorInput.addEventListener('input', () => this.applySeedColor());
    this.seedColorInput.addEventListener('change', () => this.applySeedColor());
    for (const swatch of this.seedSwatches) {
      swatch.addEventListener('click', () => {
        const color = swatch.dataset.color;
        if (color !== undefined) {
          this.seedColorInput.value = color;
          this.applySeedColor(color);
        }
      });
    }

    this.showClockSwitch.addEventListener('change', () => {
      set({ appearance: { showClock: this.showClockSwitch.checked } });
    });
    this.showDateSwitch.addEventListener('change', () => {
      set({ appearance: { showDate: this.showDateSwitch.checked } });
    });
    this.clockStyleGroup.addEventListener('change', () => {
      const value = this.clockStyleGroup.value;
      const style = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
      if (style === 'digital' || style === 'analog') {
        set({ appearance: { clockStyle: style } });
      }
    });
    this.showLogoSwitch.addEventListener('change', () => {
      set({ appearance: { showLogo: this.showLogoSwitch.checked } });
    });
    this.showFooterSwitch.addEventListener('change', () => {
      set({ appearance: { showFooter: this.showFooterSwitch.checked } });
    });
    this.showSaysSwitch.addEventListener('change', () => {
      set({ appearance: { showSays: this.showSaysSwitch.checked } });
    });
    this.showLinksSwitch.addEventListener('change', () => {
      set({ appearance: { showLinks: this.showLinksSwitch.checked } });
    });
    this.extractSeedSwitch.addEventListener('change', () => {
      set({
        background: {
          extractSeedFromWallpaper: this.extractSeedSwitch.checked,
        },
      });
      if (this.extractSeedSwitch.checked) {
        void this.extractSeedFromWallpaper();
      }
    });
    // 语言切换：写入 store → main.ts 订阅检测到变化后 reload
    this.langSelect.addEventListener('change', () => {
      const value = readSelectValue(this.langSelect);
      if (value === 'zh-CN' || value === 'zh-TW' || value === 'en' || value === 'ja') {
        set({ appearance: { lang: value } });
      }
    });
    this.translateTargetField.addEventListener('change', () => {
      const value = this.translateTargetField.value.trim();
      if (value !== '') {
        set({ omnibox: { translateTargetLang: value } });
      }
    });
    this.translateTargetField.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const value = this.translateTargetField.value.trim();
        if (value !== '') {
          set({ omnibox: { translateTargetLang: value } });
        }
        this.translateTargetField.blur();
      }
    });
    this.searchNewTabSwitch.addEventListener('change', () => {
      set({ searchEngines: { openInNewTab: this.searchNewTabSwitch.checked } });
    });
    this.linksNewTabSwitch.addEventListener('change', () => {
      set({ links: { openInNewTab: this.linksNewTabSwitch.checked } });
    });

    // ── 搜索 ──
    this.engineAddBtn.addEventListener('click', () => this.openEngineDialog());
    this.engineSaveBtn.addEventListener('click', () => this.onSaveEngine());
    this.engineCancelBtn.addEventListener('click', () => {
      this.engineDialog.open = false;
    });
    this.engineDeleteBtn.addEventListener('click', () => {
      if (this.editingEngineId !== null) {
        this.deleteEngine(this.editingEngineId);
        this.engineDialog.open = false;
      }
    });
    this.engineNameField.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.onSaveEngine();
      }
    });
    this.engineUrlField.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.onSaveEngine();
      }
    });

    // ── 链接 ──
    this.linkAddBtn.addEventListener('click', () => this.openLinkDialog());
    this.linkSaveBtn.addEventListener('click', () => this.onSaveLink());
    this.linkCancelBtn.addEventListener('click', () => {
      this.linkDialog.open = false;
    });
    this.linkDeleteBtn.addEventListener('click', () => {
      if (this.editingLinkId !== null) {
        this.deleteLink(this.editingLinkId);
        this.linkDialog.open = false;
      }
    });

    // ── 分组 ──
    this.groupBtn.addEventListener('click', () => {
      this.renderGroupList();
      this.groupsDialog.open = true;
    });
    this.groupAddBtn.addEventListener('click', () => this.onAddGroupFromPanel());
    this.groupNameField.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.onAddGroupFromPanel();
      }
    });
    this.groupsDialogClose.addEventListener('click', () => {
      this.groupsDialog.open = false;
    });

    // ── 一言 ──
    this.saysModeGroup.addEventListener('change', () => {
      const mode = this.saysModeGroup.value as
        | 'hitokoto'
        | 'poem'
        | 'custom'
        | 'ai';
      set({ says: { mode } });
      this.syncSaysPanes();
    });

    // 文本字段：input 即时提交（含粘贴/自动填充），change 提交时去除首尾空白
    this.wireSaysTextField(this.saysCustomField, 'customText');
    this.wireSaysTextField(this.saysCustomAuthorField, 'customAuthor');
    this.wireSaysTextField(this.saysCustomApiUrlField, 'customApiUrl');

    // 自定义文本为 textarea：Enter 提交（不插入换行），与「立即刷新」行为一致
    this.saysCustomField.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.commitSaysField(this.saysCustomField, 'customText');
      }
    });
    this.saysRefreshBtn.addEventListener('click', () => {
      void this.says.expose().refresh();
    });
  }

  // ─────────────── 外观行为 ───────────────

  private applySeedColor(color?: string): void {
    const value = color ?? this.seedColorInput.value;
    if (value === '' || !/^#[0-9a-fA-F]{6}$/.test(value)) return;
    setColorScheme(value);
    set({ appearance: { seedColor: value } });
  }

  /** 从壁纸提取主题色：getColorFromImage → setColorScheme（真·Material You） */
  private async extractSeedFromWallpaper(): Promise<void> {
    const src = currentBackgroundImageUrl();
    if (src === '') {
      snackbar({
        message: t('seed.noWallpaper'),
        autoCloseDelay: 3000,
      });
      return;
    }
    try {
      // 与自动取色同路径：IndexedDB 标记 → objectURL；跨域 URL → CORS fetch → blob，
      // 确保 canvas 可读像素（直接 <img src> 跨域图会被污染）。
      const resolved = await resolveImageSource(src);
      if (resolved === '') {
        snackbar({ message: t('seed.extractFailed'), autoCloseDelay: 3500 });
        return;
      }
      const img = await loadImageForPixels(resolved);
      if (img === null) {
        snackbar({ message: t('seed.extractFailed'), autoCloseDelay: 3500 });
        return;
      }
      const color = await getColorFromImage(img);
      setColorScheme(color);
      set({ appearance: { seedColor: color } });
      snackbar({
        message: t('seed.extracted', { color }),
        autoCloseDelay: 2500,
      });
    } catch {
      snackbar({
        message: t('seed.extractFailed'),
        autoCloseDelay: 3500,
      });
    }
  }

  // ─────────────── 搜索引擎 CRUD ───────────────

  private openEngineDialog(engine?: SearchEngine): void {
    if (engine === undefined) {
      this.editingEngineId = null;
      this.engineDialog.headline = t('engine.addTitle');
      this.engineDeleteBtn.hidden = true;
      this.engineNameField.value = '';
      this.engineUrlField.value = '';
    } else {
      this.editingEngineId = engine.id;
      this.engineDialog.headline = t('engine.editTitle2');
      this.engineDeleteBtn.hidden = false;
      this.engineNameField.value = engine.name;
      this.engineUrlField.value = engine.url;
    }
    this.engineUrlField.setCustomValidity('');
    this.engineDialog.open = true;
    requestAnimationFrame(() => {
      try {
        this.engineNameField.focus();
      } catch {
        // 忽略聚焦失败
      }
    });
  }

  private onSaveEngine(): void {
    const name = this.engineNameField.value.trim();
    const url = this.engineUrlField.value.trim();

    if (name === '') {
      this.engineNameField.setCustomValidity(t('engine.needName'));
      snackbar({ message: t('engine.needName'), autoCloseDelay: 2500 });
      return;
    }
    this.engineNameField.setCustomValidity('');

    if (!validateEngineUrl(url)) {
      this.engineUrlField.setCustomValidity(t('engine.needQ'));
      snackbar({ message: t('engine.needQ'), autoCloseDelay: 3000 });
      return;
    }
    this.engineUrlField.setCustomValidity('');

    const settings = get();
    const engines = [...settings.searchEngines.engines];

    if (this.editingEngineId !== null) {
      const exists = engines.some((engine) => engine.id === this.editingEngineId);
      if (!exists) {
        snackbar({ message: t('engine.notFound'), autoCloseDelay: 2500 });
        return;
      }
      set({
        searchEngines: {
          engines: engines.map((engine) =>
            engine.id === this.editingEngineId
              ? { ...engine, name, url }
              : engine,
          ),
        },
      });
      snackbar({ message: t('engine.updated'), autoCloseDelay: 2000 });
    } else {
      const duplicateName = engines.some((engine) => engine.name === name);
      if (duplicateName) {
        snackbar({ message: t('engine.nameExists', { name }), autoCloseDelay: 2500 });
        return;
      }
      const engine = createCustomEngine({ name, url });
      set({ searchEngines: { engines: [...engines, engine] } });
      snackbar({ message: t('engine.added'), autoCloseDelay: 2000 });
    }
    this.engineDialog.open = false;
  }

  private deleteEngine(id: string): void {
    const settings = get();
    const engines = settings.searchEngines.engines;
    if (engines.length <= 1) {
      snackbar({ message: t('engine.needOne'), autoCloseDelay: 2500 });
      return;
    }
    const next = engines.filter((engine) => engine.id !== id);
    if (next.length === engines.length) {
      snackbar({ message: t('engine.notFound'), autoCloseDelay: 2500 });
      return;
    }

    const patch: { engines: SearchEngine[]; defaultEngine?: string } = {
      engines: next,
    };

    // 删除的是当前默认引擎 → 自动回退必应（必应已被删则取第一个）
    if (settings.searchEngines.defaultEngine === id) {
      const bingExists = next.some((engine) => engine.id === DEFAULT_ENGINE_ID);
      patch.defaultEngine = bingExists
        ? DEFAULT_ENGINE_ID
        : (next[0]?.id ?? DEFAULT_ENGINE_ID);
    }
    set({ searchEngines: patch });
    snackbar({
      message:
        patch.defaultEngine !== undefined
          ? t('engine.fallbackMsg')
          : t('engine.deleted'),
      autoCloseDelay: 2500,
    });
  }

  // ─────────────── 链接 CRUD ───────────────

  private openLinkDialog(link?: LinkItem): void {
    if (link === undefined) {
      this.editingLinkId = null;
      this.linkDialog.headline = t('links.addLink');
      this.linkDeleteBtn.hidden = true;
      this.linkTitleField.value = '';
      this.linkUrlField.value = '';
      this.linkIconField.value = '';
    } else {
      this.editingLinkId = link.id;
      this.linkDialog.headline = t('links.editLink');
      this.linkDeleteBtn.hidden = false;
      this.linkTitleField.value = link.title;
      this.linkUrlField.value = link.url;
      this.linkIconField.value = link.icon ?? '';
    }
    this.rebuildLinkGroupSelect();
    const initialGroup =
      link !== undefined ? link.group : get().links.defaultGroup;
    this.linkGroupSelect.value =
      link !== undefined && get().links.groups.some((g) => g.id === link.group)
        ? link.group
        : initialGroup;
    this.linkDialog.open = true;
    requestAnimationFrame(() => {
      try {
        this.linkTitleField.focus();
      } catch {
        // 忽略
      }
    });
  }

  private rebuildLinkGroupSelect(): void {
    const select = this.linkGroupSelect;
    select.innerHTML = `<mdui-menu-item value="">${t('links.noGroup')}</mdui-menu-item>`;
    for (const group of get().links.groups) {
      const item = document.createElement('mdui-menu-item');
      item.value = group.id;
      item.textContent = group.name;
      select.appendChild(item);
    }
  }

  private onSaveLink(): void {
    const title = this.linkTitleField.value.trim();
    const urlRaw = this.linkUrlField.value.trim();
    const icon = this.linkIconField.value.trim();

    if (title === '') {
      this.linkTitleField.setCustomValidity('请输入链接标题');
      snackbar({ message: t('links.enterTitle'), autoCloseDelay: 2500 });
      return;
    }
    this.linkTitleField.setCustomValidity('');

    const url = validateLinkUrl(urlRaw);
    if (url === null) {
      this.linkUrlField.setCustomValidity(
        urlRaw === '' ? t('links.enterUrl') : t('engine.badUrlShort'),
      );
      snackbar({
        message: urlRaw === '' ? t('links.enterUrl') : t('links.badUrl'),
        autoCloseDelay: 2500,
      });
      return;
    }
    this.linkUrlField.setCustomValidity('');

    const settings = get();
    const group = readSelectValue(this.linkGroupSelect);
    const iconValue = icon !== '' ? icon : undefined;

    if (this.editingLinkId !== null) {
      if (!settings.links.links.some((item) => item.id === this.editingLinkId)) {
        snackbar({ message: t('links.notFound'), autoCloseDelay: 2500 });
        return;
      }
      set({
        links: {
          links: settings.links.links.map((item) =>
            item.id === this.editingLinkId
              ? { ...item, title, url, group, icon: iconValue }
              : item,
          ),
        },
      });
      snackbar({ message: t('links.updated'), autoCloseDelay: 2000 });
    } else {
      const newLink: LinkItem = {
        id: uid('link'),
        title,
        url,
        group,
        icon: iconValue,
      };
      set({ links: { links: [...settings.links.links, newLink] } });
      snackbar({ message: t('links.added'), autoCloseDelay: 2000 });
    }
    this.linkDialog.open = false;
  }

  private deleteLink(id: string): void {
    const settings = get();
    const next = settings.links.links.filter((item) => item.id !== id);
    if (next.length === settings.links.links.length) {
      snackbar({ message: t('links.notFound'), autoCloseDelay: 2500 });
      return;
    }
    set({ links: { links: next } });
    snackbar({ message: t('links.deleted'), autoCloseDelay: 2000 });
  }

  // ─────────────── 分组管理 ───────────────

  private onAddGroupFromPanel(): void {
    const name = this.groupNameField.value.trim();
    if (name === '') {
      snackbar({ message: t('links.enterGroupName'), autoCloseDelay: 2500 });
      return;
    }
    const settings = get();
    if (settings.links.groups.some((g) => g.name === name)) {
      snackbar({ message: t('links.groupExists', { name }), autoCloseDelay: 2500 });
      return;
    }
    const group: LinkGroup = { id: uid('group'), name };
    set({ links: { groups: [...settings.links.groups, group] } });
    this.groupNameField.value = '';
    snackbar({ message: t('links.groupCreated', { name }), autoCloseDelay: 2000 });
    this.renderGroupList();
    try {
      this.groupNameField.focus();
    } catch {
      // 忽略
    }
  }

  private renameGroup(id: string, currentName: string): void {
    const name = window.prompt(t('links.renameGroup'), currentName);
    if (name === null) return; // 取消
    const trimmed = name.trim();
    if (trimmed === '') {
      snackbar({ message: t('links.groupNameRequired'), autoCloseDelay: 2500 });
      return;
    }
    const settings = get();
    if (settings.links.groups.some((g) => g.id !== id && g.name === trimmed)) {
      snackbar({ message: t('links.groupExists', { name: trimmed }), autoCloseDelay: 2500 });
      return;
    }
    let found = false;
    const groups = settings.links.groups.map((g) => {
      if (g.id === id) {
        found = true;
        return { ...g, name: trimmed };
      }
      return g;
    });
    if (!found) return;
    set({ links: { groups } });
    snackbar({ message: t('links.groupRenamed'), autoCloseDelay: 2000 });
    this.renderGroupList();
  }

  private deleteGroup(id: string): void {
    const settings = get();
    if (!settings.links.groups.some((g) => g.id === id)) return;
    set({
      links: {
        groups: settings.links.groups.filter((g) => g.id !== id),
        links: settings.links.links.map((link) =>
          link.group === id ? { ...link, group: '' } : link,
        ),
        defaultGroup:
          settings.links.defaultGroup === id ? '' : settings.links.defaultGroup,
      },
    });
    snackbar({ message: t('links.groupDeleted'), autoCloseDelay: 2000 });
    this.renderGroupList();
  }

  // ─────────────── store → UI 同步 ───────────────

  private syncFromStore(): void {
    const settings = get();
    const appearance = settings.appearance;

    // 外观
    this.themeGroup.value = appearance.theme;
    this.showClockSwitch.checked = appearance.showClock;
    this.showDateSwitch.checked = appearance.showDate;
    this.clockStyleGroup.value = appearance.clockStyle;
    this.showLogoSwitch.checked = appearance.showLogo;
    this.showFooterSwitch.checked = appearance.showFooter;
    this.showSaysSwitch.checked = appearance.showSays;
    this.showLinksSwitch.checked = appearance.showLinks;
    this.extractSeedSwitch.checked = settings.background.extractSeedFromWallpaper;
    this.langSelect.value = appearance.lang;
    this.translateTargetField.value = settings.omnibox.translateTargetLang || 'zh-CN';
    this.searchNewTabSwitch.checked = settings.searchEngines.openInNewTab;
    this.linksNewTabSwitch.checked = settings.links.openInNewTab;
    if (/^#[0-9a-fA-F]{6}$/.test(appearance.seedColor)) {
      this.seedColorInput.value = appearance.seedColor;
    }
    for (const swatch of this.seedSwatches) {
      swatch.classList.toggle(
        'is-active',
        swatch.dataset.color === appearance.seedColor.toLowerCase(),
      );
    }

    // 搜索
    this.renderEngineList();

    // 链接
    this.renderLinkList();
    this.renderGroupList();

    // 一言
    this.saysModeGroup.value = settings.says.mode;
    if (this.saysCustomField.value !== settings.says.customText) {
      this.saysCustomField.value = settings.says.customText;
    }
    if (this.saysCustomAuthorField.value !== settings.says.customAuthor) {
      this.saysCustomAuthorField.value = settings.says.customAuthor;
    }
    if (this.saysCustomApiUrlField.value !== settings.says.customApiUrl) {
      this.saysCustomApiUrlField.value = settings.says.customApiUrl;
    }
    this.syncSaysPanes();
  }

  private syncSaysPanes(): void {
    const mode = get().says.mode;
    const panes = this.dialog.querySelectorAll<HTMLElement>('[data-says-pane]');
    for (const pane of panes) {
      pane.classList.toggle('is-active', pane.dataset.saysPane === mode);
    }
  }

  /** 一言文本字段：input 即时提交（原样），change / Enter 提交时去除首尾空白 */
  private wireSaysTextField(
    field: TextField,
    key: 'customText' | 'customAuthor' | 'customApiUrl',
  ): void {
    field.addEventListener('input', () => {
      this.commitSaysField(field, key, false);
    });
    field.addEventListener('change', () => {
      this.commitSaysField(field, key, true);
    });
  }

  /** 提交一言文本字段到 store */
  private commitSaysField(
    field: TextField,
    key: 'customText' | 'customAuthor' | 'customApiUrl',
    trim = true,
  ): void {
    const value = trim ? field.value.trim() : field.value;
    if (get().says[key] === value) return;
    set({ says: { [key]: value } });
  }

  // ─────────────── 列表渲染 ───────────────

  private renderEngineList(): void {
    const settings = get();
    const list = this.engineList;
    list.innerHTML = '';

    if (settings.searchEngines.engines.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'panel-list__empty';
      empty.textContent = `${t('engine.empty')} — ${t('engine.addHint')}`;
      list.appendChild(empty);
      return;
    }

    for (const engine of settings.searchEngines.engines) {
      list.appendChild(this.createEngineRow(engine, settings.searchEngines.defaultEngine));
    }
  }

  private createEngineRow(engine: SearchEngine, defaultId: string): HTMLElement {
    const row = document.createElement('mdui-list-item');
    row.classList.add('panel-engine-row');
    row.dataset.engineRow = '';
    row.dataset.engineId = engine.id;

    const isDefault = engine.id === defaultId;

    const info = document.createElement('div');
    info.className = 'panel-engine-row__info';
    const name = document.createElement('div');
    name.className = 'panel-engine-row__name';
    name.textContent = isDefault ? t('engine.defaultSuffix', { name: engine.name }) : engine.name;
    const url = document.createElement('div');
    url.className = 'panel-engine-row__url';
    url.textContent = engine.url;
    url.title = engine.url;
    info.append(name, url);

    const defaultBtn = document.createElement('mdui-button');
    defaultBtn.variant = 'text';
    defaultBtn.className = 'panel-engine-row__default';
    defaultBtn.dataset.engineSetDefault = '';
    defaultBtn.textContent = isDefault ? t('engine.default') : t('engine.setDefault');
    defaultBtn.disabled = isDefault;
    defaultBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (engine.id !== get().searchEngines.defaultEngine) {
        set({ searchEngines: { defaultEngine: engine.id } });
        snackbar({ message: t('engine.setDefaultMsg', { name: engine.name }), autoCloseDelay: 2000 });
      }
    });

    const actions = document.createElement('div');
    actions.className = 'panel-engine-row__actions';
    actions.append(
      this.createIconButton('edit', t('engine.edit'), 'edit', (event) => {
        event.stopPropagation();
        this.openEngineDialog(engine);
      }),
      this.createIconButton('delete', t('engine.delete'), 'delete', (event) => {
        event.stopPropagation();
        this.deleteEngine(engine.id);
      }),
    );

    row.append(info, defaultBtn, actions);
    return row;
  }

  private renderLinkList(): void {
    const settings = get();
    const list = this.linkList;
    list.innerHTML = '';

    if (settings.links.links.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'panel-list__empty';
      empty.textContent = `${t('links.noLinks')} — ${t('links.addHint')}`;
      list.appendChild(empty);
      return;
    }

    const groupNames = new Map(settings.links.groups.map((g) => [g.id, g.name]));
    for (const link of settings.links.links) {
      list.appendChild(this.createLinkRow(link, groupNames));
    }
  }

  private createLinkRow(link: LinkItem, groupNames: Map<string, string>): HTMLElement {
    const row = document.createElement('mdui-list-item');
    row.classList.add('panel-link-row');
    row.dataset.panelLinkRow = '';
    row.dataset.linkId = link.id;

    const info = document.createElement('div');
    info.className = 'panel-link-row__info';
    const title = document.createElement('div');
    title.className = 'panel-link-row__title';
    title.textContent = link.title;
    const url = document.createElement('div');
    url.className = 'panel-link-row__url';
    url.textContent = link.url;
    url.title = link.url;
    info.append(title, url);

    const groupTag = document.createElement('span');
    groupTag.className = 'panel-link-row__group';
    const groupName = link.group !== '' ? groupNames.get(link.group) : '';
    groupTag.textContent = groupName !== undefined && groupName !== '' ? groupName : t('links.noGroup');
    if (link.group === '') groupTag.classList.add('is-none');

    const actions = document.createElement('div');
    actions.className = 'panel-link-row__actions';
    actions.append(
      this.createIconButton('edit', t('links.editLink'), 'edit', (event) => {
        event.stopPropagation();
        this.openLinkDialog(link);
      }),
      this.createIconButton('delete', t('links.delete'), 'delete', (event) => {
        event.stopPropagation();
        this.deleteLink(link.id);
      }),
    );

    row.append(info, groupTag, actions);
    return row;
  }

  private createIconButton(
    iconName: string,
    label: string,
    action: 'edit' | 'delete',
    onClick: (event: Event) => void,
  ): HTMLElement {
    const button = document.createElement('mdui-button-icon');
    button.variant = 'standard';
    button.classList.add('panel-row__action-btn');
    button.dataset.action = action;
    button.setAttribute('aria-label', label);
    const icon = document.createElement(`mdui-icon-${iconName}`);
    button.appendChild(icon);
    button.addEventListener('click', onClick);
    return button;
  }

  private renderGroupList(): void {
    const list = this.groupList;
    list.innerHTML = '';
    const groups = get().links.groups;

    if (groups.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'panel-list__empty';
      empty.textContent = t('links.noGroupsPanel');
      list.appendChild(empty);
      return;
    }

    for (const group of groups) {
      const row = document.createElement('div');
      row.className = 'panel-groups-row';
      row.dataset.panelGroupRow = '';
      row.dataset.groupId = group.id;

      const name = document.createElement('span');
      name.className = 'panel-groups-row__name';
      name.textContent = group.name;
      name.title = group.name;

      const actions = document.createElement('div');
      actions.className = 'panel-groups-row__actions';
      actions.append(
        this.createIconButton('edit', t('links.renameGroup'), 'edit', () => {
          this.renameGroup(group.id, group.name);
        }),
        this.createIconButton('delete', t('links.deleteGroup'), 'delete', () => {
          this.deleteGroup(group.id);
        }),
      );

      row.append(name, actions);
      list.appendChild(row);
    }
  }
}

/** 六 Tab 值 */
const TAB_VALUES: readonly string[] = [
  'appearance',
  'background',
  'search',
  'links',
  'says',
  'about',
];

/** 预设色板按钮 HTML（背景 Tab 与外观 Tab 共用） */
function bgSwatchMarkup(): string {
  return PRESET_COLORS.map(
    (color) => `
      <button
        type="button"
        class="bg-swatch"
        data-bg-swatch
        data-color="${color}"
        style="--swatch:${color}"
        aria-label="${t('seed.swatchAria')} ${color}"
        title="${color}"
      ></button>`,
  ).join('\n');
}

/** 配色种子色板按钮 HTML（外观 Tab） */
function seedSwatchMarkup(): string {
  return PRESET_COLORS.map(
    (color) => `
      <button
        type="button"
        class="seed-swatch"
        data-seed-swatch
        data-color="${color}"
        style="--swatch:${color}"
        aria-label="配色种子 ${color}"
        title="${color}"
      ></button>`,
  ).join('\n');
}

/** 设置面板完整模板（mdui-tabs 六 Tab + 关联编辑对话框） */
function template(): string {
  return `
  <mdui-button-icon
    id="settings-dialog-close"
    class="settings-dialog__close"
    icon="close--rounded"
    variant="standard"
    aria-label="关闭"
  >
    <mdui-icon-close--rounded></mdui-icon-close--rounded>
  </mdui-button-icon>

  <mdui-tabs id="settings-tabs" value="appearance" class="settings-dialog__tabs" full-width>
    <mdui-tab value="appearance"><mdui-icon-palette--rounded slot="icon"></mdui-icon-palette--rounded>${t('settings.tabs.appearance')}</mdui-tab>
    <mdui-tab value="background"><mdui-icon-wallpaper--rounded slot="icon"></mdui-icon-wallpaper--rounded>${t('settings.tabs.background')}</mdui-tab>
    <mdui-tab value="search"><mdui-icon-search--rounded slot="icon"></mdui-icon-search--rounded>${t('settings.tabs.search')}</mdui-tab>
    <mdui-tab value="links"><mdui-icon-link--rounded slot="icon"></mdui-icon-link--rounded>${t('settings.tabs.links')}</mdui-tab>
    <mdui-tab value="says"><mdui-icon-format-quote--rounded slot="icon"></mdui-icon-format-quote--rounded>${t('settings.tabs.says')}</mdui-tab>
    <mdui-tab value="about"><mdui-icon-info--rounded slot="icon"></mdui-icon-info--rounded>${t('settings.tabs.about')}</mdui-tab>

    <!-- ═══════════ 外观 ═══════════ -->
    <mdui-tab-panel slot="panel" value="appearance" class="settings-dialog__panel">
      <section class="settings-section">
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">${t('settings.theme')}</span>
            <span class="settings-row__hint">${t('settings.themeHint')}</span>
          </div>
          <mdui-segmented-button-group id="theme-segmented" selects="single">
            <mdui-segmented-button value="light"><mdui-icon-light-mode--rounded slot="icon"></mdui-icon-light-mode--rounded>${t('settings.themeLight')}</mdui-segmented-button>
            <mdui-segmented-button value="dark"><mdui-icon-dark-mode--rounded slot="icon"></mdui-icon-dark-mode--rounded>${t('settings.themeDark')}</mdui-segmented-button>
            <mdui-segmented-button value="auto"><mdui-icon-brightness-auto--rounded slot="icon"></mdui-icon-brightness-auto--rounded>${t('settings.themeAuto')}</mdui-segmented-button>
          </mdui-segmented-button-group>
        </div>

        <div class="settings-row settings-row--column">
          <div class="settings-row__label">
            <span class="settings-row__title">${t('settings.seedColor')}</span>
            <span class="settings-row__hint">${t('settings.seedColorHint')}</span>
          </div>
          <div class="seed-swatches" role="group" aria-label="${t('seed.swatchAria')}">
            ${seedSwatchMarkup()}
            <label class="seed-custom" title="${t('seed.customTitle')}">
              <span class="seed-custom__hint">${t('settings.custom')}</span>
              <input type="color" id="seed-color-input" aria-label="${t('seed.customAria')}" />
            </label>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">${t('settings.showClock')}</span>
            
          </div>
          <mdui-switch id="show-clock-switch" aria-label="显示时钟"></mdui-switch>
        </div>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">${t('settings.showDate')}</span>
            <span class="settings-row__hint">${t('settings.showDateHint')}</span>
          </div>
          <mdui-switch id="show-date-switch" aria-label="显示日期"></mdui-switch>
        </div>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">${t('settings.clockStyle')}</span>
            <span class="settings-row__hint">${t('settings.clockStyleHint')}</span>
          </div>
          <mdui-segmented-button-group id="clock-style-group" selects="single">
            <mdui-segmented-button value="digital"><mdui-icon-schedule--rounded slot="icon"></mdui-icon-schedule--rounded>${t('settings.clockDigital')}</mdui-segmented-button>
            <mdui-segmented-button value="analog"><mdui-icon-av-timer--rounded slot="icon"></mdui-icon-av-timer--rounded>${t('settings.clockAnalog')}</mdui-segmented-button>
          </mdui-segmented-button-group>
        </div>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">${t('settings.showLogo')}</span>
            <span class="settings-row__hint">${t('settings.showLogoHint')}</span>
          </div>
          <mdui-switch id="show-logo-switch" aria-label="显示 LOGO"></mdui-switch>
        </div>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">${t('settings.showFooter')}</span>
            <span class="settings-row__hint">${t('settings.showFooterHint')}</span>
          </div>
          <mdui-switch id="show-footer-switch" aria-label="显示页脚"></mdui-switch>
        </div>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">${t('settings.showSays')}</span>
            <span class="settings-row__hint">${t('settings.saysHint')}</span>
          </div>
          <mdui-switch id="show-says-switch" aria-label="显示一言"></mdui-switch>
        </div>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">${t('settings.showLinks')}</span>
            <span class="settings-row__hint">${t('settings.showLinksHint')}</span>
          </div>
          <mdui-switch id="show-links-switch" aria-label="显示链接"></mdui-switch>
        </div>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">${t('settings.extractSeed')}</span>
            <span class="settings-row__hint">${t('settings.extractSeedHint')}</span>
          </div>
          <mdui-switch id="extract-seed-switch" aria-label="${t('settings.extractSeed')}"></mdui-switch>
        </div>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">${t('settings.language')}</span>
            <span class="settings-row__hint">简体 / 繁體 / English / 日本語</span>
          </div>
          <mdui-select id="language-select" class="settings-lang-select">
            <mdui-menu-item value="zh-CN">${t('settings.langZhCN')}</mdui-menu-item>
            <mdui-menu-item value="zh-TW">${t('settings.langZhTW')}</mdui-menu-item>
            <mdui-menu-item value="en">${t('settings.langEn')}</mdui-menu-item>
            <mdui-menu-item value="ja">${t('settings.langJa')}</mdui-menu-item>
          </mdui-select>
        </div>
      </section>
    </mdui-tab-panel>

    <!-- ═══════════ 背景 ═══════════ -->
    <mdui-tab-panel slot="panel" value="background" class="settings-dialog__panel">
      <div data-bg-panel-root class="settings-section">
        <section class="settings-section__block">
          <h3 class="settings-section__title">${t('bg.mode')}</h3>
          <mdui-segmented-button-group id="bg-mode-group" selects="single" full-width>
            <mdui-segmented-button value="color" icon="palette--rounded">${t('bg.solid')}</mdui-segmented-button>
            <mdui-segmented-button value="image" icon="upload--rounded">${t('bg.image')}</mdui-segmented-button>
            <mdui-segmented-button value="url" icon="link--rounded">URL</mdui-segmented-button>
            <mdui-segmented-button value="video" icon="videocam--rounded">${t('bg.video')}</mdui-segmented-button>
            <mdui-segmented-button value="bing" icon="wallpaper--rounded">${t('bg.bing')}</mdui-segmented-button>
          </mdui-segmented-button-group>
        </section>

        <section class="settings-section__block background-dialog__pane" data-bg-pane="color">
          <h3 class="settings-section__title">${t('bg.solidHint')}</h3>
          <div class="bg-color-row">
            <label class="bg-color-label" for="bg-color-input">
              <span>${t('bg.customColor')}</span>
              <input type="color" id="bg-color-input" value="#141218" aria-label="${t('bg.customColor')}" />
            </label>
          </div>
          <div class="bg-swatches" role="group" aria-label="${t('seed.bgSwatchesAria')}">
            ${bgSwatchMarkup()}
          </div>
        </section>

        <section class="settings-section__block background-dialog__pane" data-bg-pane="image">
          <h3 class="settings-section__title">${t('bg.uploadImage')}</h3>
          <div class="bg-upload-row">
            <mdui-button id="bg-upload-btn" variant="tonal">
              <mdui-icon-upload slot="icon"></mdui-icon-upload>
              ${t('bg.chooseLocal')}
            </mdui-button>
            <input type="file" id="bg-file-input" accept="image/*" hidden />
          </div>
          <div class="bg-upload-preview" data-bg-upload-preview hidden>
            <img class="bg-upload-preview__img" data-bg-preview-img alt="${t('bg.appliedUpload')}" />
            <mdui-button-icon
              id="bg-upload-clear"
              class="bg-upload-preview__clear"
              icon="delete--rounded"
              variant="standard"
              aria-label="移除图片"
            >
              <mdui-icon-delete--rounded></mdui-icon-delete--rounded>
            </mdui-button-icon>
          </div>
          <p class="settings-section__hint">
            ${t('bg.uploadHint')}
          </p>
        </section>

        <section class="settings-section__block background-dialog__pane" data-bg-pane="url">
          <h3 class="settings-section__title">图片 URL</h3>
          <div class="bg-field-row">
            <mdui-text-field
              id="bg-url-field"
              type="url"
              label="远程图片地址"
              placeholder="https://example.com/bg.jpg"
              clearable
            ></mdui-text-field>
            <mdui-button id="bg-url-apply" variant="tonal">${t('bg.apply')}</mdui-button>
          </div>
          <p class="settings-section__hint">输入图片 URL 后背景立即切换（cover 居中）并持久化保存。</p>
        </section>

        <section class="settings-section__block background-dialog__pane" data-bg-pane="video">
          <h3 class="settings-section__title">视频背景</h3>
          <div class="bg-field-row">
            <mdui-text-field
              id="bg-video-field"
              type="url"
              label="视频地址（mp4 / webm）"
              placeholder="https://example.com/bg.mp4"
              clearable
            ></mdui-text-field>
            <mdui-button id="bg-video-apply" variant="tonal">${t('bg.apply')}</mdui-button>
          </div>
          <p class="settings-section__hint">以 muted / loop / autoplay / playsinline 静音循环播放，不干扰浏览。</p>
        </section>

        <section class="settings-section__block background-dialog__pane" data-bg-pane="bing">
          <h3 class="settings-section__title">必应每日壁纸</h3>
          <div class="bg-bing-row">
            <mdui-button id="bg-bing-fetch" variant="tonal">
              <mdui-icon-cloud-done slot="icon"></mdui-icon-cloud-done>
              获取今日壁纸
            </mdui-button>
          </div>
          <p class="background-dialog__status" data-bg-bing-status></p>
          <div class="bg-field-row">
            <mdui-text-field
              id="bg-bing-mirror"
              label="${t('bg.bingMirrorLabel')}"
              placeholder="${t('bg.bingMirrorPlaceholder')}"
              clearable
            ></mdui-text-field>
          </div>
          <div class="bg-field-row">
            <mdui-text-field
              id="bg-bing-manual"
              label="${t('bg.bingManualLabel')}"
              placeholder="https://example.com/wallpaper.jpg"
              clearable
            ></mdui-text-field>
            <mdui-button id="bg-bing-manual-apply" variant="tonal">${t('bg.apply')}</mdui-button>
          </div>
          <p class="settings-section__hint">${t('bg.bingHint')}</p>
        </section>

        <section class="settings-section__block">
          <h3 class="settings-section__title">${t('bg.mask')}</h3>
          <div class="bg-slider-row">
            <span class="bg-slider-row__label">${t('bg.overlayOpacity')}</span>
            <mdui-slider id="bg-overlay-slider" min="0" max="100" step="1" value="0"></mdui-slider>
          </div>
          <div class="bg-slider-row">
            <span class="bg-slider-row__label">${t('bg.overlayBlur')}</span>
            <mdui-slider id="bg-blur-slider" min="0" max="30" step="1" value="0"></mdui-slider>
          </div>
          <p class="settings-section__hint">${t('bg.maskHint')}</p>
        </section>
      </div>
    </mdui-tab-panel>

    <!-- ═══════════ 搜索 ═══════════ -->
    <mdui-tab-panel slot="panel" value="search" class="settings-dialog__panel">
      <section class="settings-section">
        <div class="settings-toolbar">
          <span class="settings-row__title">${t('searchTab.title')}</span>
          <mdui-button id="engine-add-btn" variant="tonal">
            <mdui-icon-add slot="icon"></mdui-icon-add>
            ${t('searchTab.addEngine')}
          </mdui-button>
        </div>
        <p class="settings-section__hint">
          ${t('searchTab.hint')}
        </p>
        <mdui-list id="engine-list" class="panel-list"></mdui-list>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">${t('searchTab.newTab')}</span>
            <span class="settings-row__hint">${t('searchTab.newTabHint')}</span>
          </div>
          <mdui-switch id="search-newtab-switch" aria-label="${t('searchTab.newTab')}"></mdui-switch>
        </div>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">${t('search.translateTarget')}</span>
            <span class="settings-row__hint">${t('search.translateSyntaxHint')}</span>
          </div>
          <mdui-text-field
            id="translate-target-field"
            class="settings-lang-select"
            label="${t('search.translateTarget')}"
            placeholder="zh-CN / en / ja"
          >
            <mdui-icon-translate--rounded slot="icon"></mdui-icon-translate--rounded>
          </mdui-text-field>
        </div>
      </section>
    </mdui-tab-panel>

    <!-- ═══════════ 链接 ═══════════ -->
    <mdui-tab-panel slot="panel" value="links" class="settings-dialog__panel">
      <section class="settings-section">
        <div class="settings-toolbar">
          <span class="settings-row__title">${t('linksTab.manage')}</span>
          <div class="settings-toolbar__actions">
            <mdui-button id="panel-group-btn" variant="text">
              <mdui-icon-manage-accounts slot="icon"></mdui-icon-manage-accounts>
              ${t('linksTab.groups')}
            </mdui-button>
            <mdui-button id="panel-link-add-btn" variant="tonal">
              <mdui-icon-add slot="icon"></mdui-icon-add>
              ${t('links.addLink')}
            </mdui-button>
          </div>
        </div>
        <p class="settings-section__hint">
          ${t('linksTab.hint')}
        </p>
        <mdui-list class="panel-link-list" data-panel-link-list></mdui-list>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">${t('linksTab.newTab')}</span>
            <span class="settings-row__hint">${t('linksTab.newTabHint')}</span>
          </div>
          <mdui-switch id="links-newtab-switch" aria-label="${t('linksTab.newTab')}"></mdui-switch>
        </div>
      </section>
    </mdui-tab-panel>

    <!-- ═══════════ 一言 ═══════════ -->
    <mdui-tab-panel slot="panel" value="says" class="settings-dialog__panel">
      <section class="settings-section">
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">${t('saysTab.source')}</span>
            <span class="settings-row__hint">${t('saysTab.modeHint')}</span>
          </div>
          <mdui-segmented-button-group id="says-mode-group" selects="single" full-width>
            <mdui-segmented-button value="hitokoto">${t('saysTab.random')}</mdui-segmented-button>
            <mdui-segmented-button value="poem">${t('saysTab.poem')}</mdui-segmented-button>
            <mdui-segmented-button value="custom">${t('saysTab.custom')}</mdui-segmented-button>
            <mdui-segmented-button value="customApi">${t('saysTab.customApi')}</mdui-segmented-button>
          </mdui-segmented-button-group>
        </div>

        <div class="says-pane" data-says-pane="custom">
          <div class="settings-section__block">
            <h3 class="settings-section__title">${t('saysTab.customText')}</h3>
            <mdui-text-field
              id="says-custom-field"
              label="${t('saysTab.customContent')}"
              placeholder="${t('saysTab.customContentPlaceholder')}"
              textarea
              maxlength="200"
            ></mdui-text-field>
            <mdui-text-field
              id="says-custom-author-field"
              label="${t('saysTab.customAuthor')}"
              placeholder="${t('saysTab.customAuthorPlaceholder')}"
              maxlength="50"
            ></mdui-text-field>
          </div>
        </div>

        <div class="says-pane" data-says-pane="customApi">
          <div class="settings-section__block">
            <h3 class="settings-section__title">${t('saysTab.customApiConfig')}</h3>
            <div class="settings-fields">
              <mdui-text-field
                id="says-custom-api-url"
                label="${t('saysTab.customApiUrlLabel')}"
                placeholder="https://example.com/api/quote"
                clearable
              ></mdui-text-field>
            </div>
            <p class="settings-section__hint">
              ${t('saysTab.customApiHint')}
            </p>
          </div>
        </div>

        <div class="settings-toolbar">
          <mdui-button id="says-refresh-btn" variant="tonal">
            <mdui-icon-refresh slot="icon"></mdui-icon-refresh>
            ${t('saysTab.refreshNow')}
          </mdui-button>
          <span class="settings-section__hint">${t('saysTab.refreshHint')}</span>
        </div>
      </section>
    </mdui-tab-panel>

    <!-- ═══════════ 关于 ═══════════ -->
    <mdui-tab-panel slot="panel" value="about" class="settings-dialog__panel">
      <section class="settings-section about">
        <p class="about__declaration"><strong>My Startpage</strong> — ${t('about.tagline')} <strong>Kibidango086</strong></p>
        <p class="about__link">
          ${t('about.githubRepo')} <a href="https://github.com/Kibidango086/material-you-startpage" target="_blank" rel="noopener noreferrer">Kibidango086/material-you-startpage</a>
        </p>
        <p class="about__link">
          ${t('about.extension')}
          <a href="https://github.com/Kibidango086/material-you-startpage/releases/latest" target="_blank" rel="noopener noreferrer">${t('about.extensionDownload')}</a>
          <span class="about__hint-inline">${t('about.extensionHint')}</span>
        </p>
        <p class="about__link">
          ${t('about.inspiredBy')} <a href="https://github.com/quik-page/quik2" target="_blank" rel="noopener noreferrer">QUIK 2</a>（GPL-3.0）
        </p>
        <h3 class="about__title">${t('about.techStack')}</h3>
        <ul class="about__list">
          <li><a href="https://www.mdui.org" target="_blank" rel="noopener noreferrer">mdui v2</a> — Material Design 3 / Material You Web 组件库</li>
          <li>Vite + TypeScript（strict）</li>
          <li>bun — 包管理与构建</li>
          <li>Google Fonts — Roboto / Noto Sans SC</li>
        </ul>
        <h3 class="about__title">${t('about.thanks')}</h3>
        <p class="about__thanks">
          感谢 mdui 团队提供的优秀组件库；
          一言数据来自 hitokoto.cn 与今日诗词（v2.jinrishici.com）。
        </p>
      </section>
    </mdui-tab-panel>
  </mdui-tabs>

  <div slot="action" class="settings-dialog__actions">
    <mdui-button id="settings-dialog-close-action" variant="text">${t('common.close')}</mdui-button>
  </div>
`;
}export function ENGINE_DIALOG_TEMPLATE(): string {
  return `
  <div class="settings-fields">
    <mdui-text-field
      id="engine-name-field"
      label="${t('engine.nameField')}"
      required
      placeholder="${t('engine.namePlaceholder')}"
    ></mdui-text-field>
    <mdui-text-field
      id="engine-url-field"
      label="${t('engine.urlField')}"
      required
      placeholder="https://github.com/search?q={q}"
    ></mdui-text-field>
  </div>
  <div slot="action" class="engine-dialog__actions">
    <mdui-button id="engine-delete-btn" class="engine-dialog__delete" variant="text" hidden>${t('common.delete')}</mdui-button>
    <mdui-button id="engine-cancel-btn" variant="text">${t('common.cancel')}</mdui-button>
    <mdui-button id="engine-save-btn" variant="tonal">${t('common.save')}</mdui-button>
  </div>
`;
}

/** 创建独立顶层 mdui-dialog 并挂到 body（与设置面板平级，避免嵌套叠加问题） */
function createSubDialog(
  id: string,
  headline: string,
  template: string,
): Dialog {
  const existing = document.getElementById(id) as Dialog | null;
  if (existing !== null) return existing;
  const dialog = document.createElement('mdui-dialog');
  dialog.id = id;
  dialog.headline = headline;
  dialog.classList.add('sub-dialog');
  dialog.setAttribute('close-on-esc', '');
  dialog.setAttribute('close-on-overlay-click', '');
  dialog.innerHTML = template;
  document.body.appendChild(dialog);
  return dialog;
}
/** 链接编辑对话框（面板内，独立顶层对话框） */
export function PANEL_LINK_DIALOG_TEMPLATE(): string {
  return `
  <div class="settings-fields">
    <mdui-text-field
      id="panel-link-title-field"
      label="${t('links.titleField')}"
      required
      placeholder="${t('links.titlePlaceholder')}"
    ></mdui-text-field>
    <mdui-text-field
      id="panel-link-url-field"
      label="URL"
      required
      placeholder="${t('links.urlPlaceholderShort')}"
    ></mdui-text-field>
    <mdui-text-field
      id="panel-link-icon-field"
      label="${t('links.iconField')}"
      placeholder="${t('links.iconPlaceholder')}"
    ></mdui-text-field>
    <mdui-select id="panel-link-group-select" label="${t('links.groupField')}" placeholder="${t('links.noGroup')}">
      <mdui-menu-item value="">${t('links.noGroup')}</mdui-menu-item>
    </mdui-select>
  </div>
  <div slot="action" class="engine-dialog__actions">
    <mdui-button id="panel-link-delete-btn" class="engine-dialog__delete" variant="text" hidden>${t('common.delete')}</mdui-button>
    <mdui-button id="panel-link-cancel-btn" variant="text">${t('common.cancel')}</mdui-button>
    <mdui-button id="panel-link-save-btn" variant="tonal">${t('common.save')}</mdui-button>
  </div>
`;
}

/** 分组管理对话框（面板内，独立顶层对话框） */
export function PANEL_GROUPS_DIALOG_TEMPLATE(): string {
  return `
  <div class="links-groups-dialog__create">
    <mdui-text-field
      id="panel-group-name-field"
      label="${t('links.groupNameField')}"
      placeholder="${t('links.groupNamePlaceholder')}"
    ></mdui-text-field>
    <mdui-button id="panel-group-add-btn" variant="tonal">
      <mdui-icon-add slot="icon"></mdui-icon-add>
      添加
    </mdui-button>
  </div>
  <div class="links-groups-dialog__list" data-panel-group-list></div>
  <div slot="action" class="links-groups-dialog__actions">
    <mdui-button id="panel-groups-close-btn" variant="text">${t('common.close')}</mdui-button>
  </div>
`;
}
