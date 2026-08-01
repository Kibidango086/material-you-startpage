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
 * 全能搜索框 Omnibox（Sprint 3）。
 *
 * 能力：
 *   - URL 直达：输入域名 / IP / localhost 回车新标签页打开，无协议默认补 https://；
 *   - 多引擎搜索：内置引擎（必应/百度/Google/搜狗/哔哩哔哩…）mdui-menu 切换，选择持久化；
 *   - 实时计算：输入 = 表达式（如 =1+2*3、=sqrt(16)、支持 π/^）显示计算结果；
 *   - 翻译建议：非中文文本出现「翻译为中文」项（MyMemory 免 key，网络失败优雅降级）；
 *   - 建议列表：最近 15 条搜索历史（localStorage 持久化）+ 百度 sugrec JSONP 联想。
 */
import '@mdui/icons/calculate--rounded.js';
import '@mdui/icons/history--rounded.js';
import '@mdui/icons/search--rounded.js';
import '@mdui/icons/translate--rounded.js';
import '@mdui/icons/language--rounded.js';

import type { Dropdown, Menu, TextField } from 'mdui';

import { CalculationError, evaluate, formatResult } from '../core/calculator';
import { buildSearchUrl, getEngineById } from '../services/searchEngines';
import { fetchSuggest } from '../services/suggest';
import { SUPPORTED_LANGS, normalizeLang, translateText } from '../services/translate';
import { get, set, subscribe } from '../storage/store';
import { t } from '../i18n';
import type { SearchEngine } from '../storage/types';
import { normalizeUrl } from '../utils/url';

/** 建议项类别 */
type SuggestionKind = 'calc' | 'translate' | 'history' | 'suggest';

/** 建议列表项 */
interface Suggestion {
  kind: SuggestionKind;
  /** 主文本 */
  label: string;
  /** 副文本 */
  description?: string;
  /** 激活后使用的值（搜索结果 / 填入结果） */
  value: string;
  /** 图标自定义元素标签 */
  iconTag: string;
}

/** 图标自定义元素标签表 */
const ICON_TAGS = {
  calc: 'mdui-icon-calculate--rounded',
  translate: 'mdui-icon-translate--rounded',
  history: 'mdui-icon-history--rounded',
  suggest: 'mdui-icon-search--rounded',
} as const;

/** 从搜索引擎对象取图标 URL（优先 icon 字段，否则从 URL 推导域名 favicon） */
function engineIconUrl(engine: SearchEngine): string {
  const custom = (engine.icon ?? '').trim();
  if (custom !== '') return custom;
  try {
    const host = new URL(engine.url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  } catch {
    return '';
  }
}

/** 联想输入的最小长度 */
const SUGGEST_MIN_LENGTH = 2;

/** 建议列表最大条数 */
const SUGGEST_MAX_ITEMS = 10;

/** 主模板（引擎菜单项由 JS 动态填充）；函数形式：实例化时按当前语言求值 */
function template(): string {
  return `
  <mdui-text-field
    class="omnibox__field"
    variant="outlined"
    clearable
    placeholder="${t('search.placeholder')}"
    enterkeyhint="search"
    data-omnibox-input
  >
    <mdui-dropdown
      slot="icon"
      trigger="click"
      placement="bottom-start"
      class="omnibox__engine-dropdown"
      data-omnibox-engine-dropdown
    >
      <mdui-button
        slot="trigger"
        variant="text"
        class="omnibox__engine-btn"
        data-omnibox-engine-trigger
        aria-label="${t('search.switchEngine')}"
      >
        <mdui-icon-language--rounded data-omnibox-engine-default-icon></mdui-icon-language--rounded>
      </mdui-button>
      <mdui-menu
        selects="single"
        class="omnibox__engine-menu"
        data-omnibox-engine-menu
      ></mdui-menu>
    </mdui-dropdown>
  </mdui-text-field>
  <div class="omnibox__suggest" data-omnibox-suggest hidden>
    <mdui-list class="omnibox__suggest-list" data-omnibox-suggest-list></mdui-list>
  </div>
`;
}

/** 判断文本是否为非中文（英文/日文等，且不是 URL / 纯算式） */
function isNonChineseText(text: string): boolean {
  const value = text.trim();
  if (value.length < 2) return false;
  // 已含中文 → 无需「翻译为中文」
  if (/[\u4e00-\u9fff]/.test(value)) return false;
  // URL 或纯数字/运算符（计算类输入）不触发翻译建议
  if (normalizeUrl(value) !== null) return false;
  if (/^[\d+\-*/()^.%\s,，]+$/.test(value)) return false;
  return true;
}

/** 长文本截断（保留首尾） */
function truncateMiddle(text: string, max: number): string {
  if (text.length <= max) return text;
  const half = Math.floor((max - 1) / 2);
  return `${text.slice(0, half)}…${text.slice(-half)}`;
}

/** 合并建议项：按 label 去重，保持「动作项 → 联想 → 历史」顺序，上限 10 条 */
function mergeSuggestions(
  actionItems: readonly Suggestion[],
  suggestItems: readonly Suggestion[],
  historyItems: readonly Suggestion[],
): Suggestion[] {
  const seen = new Set<string>();
  const merged: Suggestion[] = [];
  for (const item of [...actionItems, ...suggestItems, ...historyItems]) {
    if (seen.has(item.label)) continue;
    seen.add(item.label);
    merged.push(item);
    if (merged.length >= SUGGEST_MAX_ITEMS) break;
  }
  return merged;
}

export class Omnibox {
  readonly root: HTMLElement;

  private readonly field: TextField;
  private readonly suggestPanel: HTMLElement;
  private readonly suggestList: HTMLElement;
  private readonly engineMenu: Menu;
  private readonly engineDropdown: Dropdown;

  /** 当前渲染的建议项 */
  private items: Suggestion[] = [];
  /** 键盘导航当前项索引（-1 = 无选中） */
  private activeIndex = -1;
  /** 输入防抖定时器 */
  private debounceTimer: number | null = null;
  /** 翻译请求取消控制器 */
  private translateAbort: AbortController | null = null;
  /** 引擎菜单当前 id 指纹（避免重复重建） */
  private engineMenuFingerprint = '';

  constructor(root: HTMLElement) {
    this.root = root;
    root.classList.add('omnibox');
    root.innerHTML = template();

    const field = root.querySelector<TextField>('[data-omnibox-input]');
    const suggestPanel = root.querySelector<HTMLElement>('[data-omnibox-suggest]');
    const suggestList = root.querySelector<HTMLElement>('[data-omnibox-suggest-list]');
    const engineMenu = root.querySelector<Menu>('[data-omnibox-engine-menu]');
    const engineDropdown = root.querySelector<Dropdown>(
      '[data-omnibox-engine-dropdown]',
    );
    if (
      field === null ||
      suggestPanel === null ||
      suggestList === null ||
      engineMenu === null ||
      engineDropdown === null
    ) {
      throw new Error('[omnibox] 初始化失败：缺少必需元素');
    }

    this.field = field;
    this.suggestPanel = suggestPanel;
    this.suggestList = suggestList;
    this.engineMenu = engineMenu;
    this.engineDropdown = engineDropdown;

    this.wireField();
    this.wireEngineMenu();
    this.wireSuggestPanel();
    this.syncFromStore();
    subscribe(() => this.syncFromStore());
  }

  // ─────────────── 公共 API（调试 / 自动化验证） ───────────────

  /** 设置输入值并刷新建议（调试 / 自动化钩子） */
  setValue(value: string): void {
    this.field.value = value;
    void this.updateSuggestions();
  }

  /** 提交当前输入（等价于回车） */
  submit(): void {
    this.submitCurrent();
  }

  /** 当前引擎（搜索用的引擎对象） */
  getEngine(): SearchEngine | undefined {
    const settings = get();
    return getEngineById(
      settings.searchEngines.engines,
      settings.searchEngines.defaultEngine,
    );
  }

  // ─────────────── 输入事件 ───────────────

  private wireField(): void {
    this.field.addEventListener('input', () => this.onInput());
    this.field.addEventListener('clear', () => this.onInput());
    this.field.addEventListener('focus', () => void this.updateSuggestions());
    this.field.addEventListener('blur', () => this.hideSuggestions());
    this.field.addEventListener('keydown', (event) => this.onKeyDown(event));
  }

  private onInput(): void {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    // 本地建议（历史/翻译/计算）立即渲染，不等防抖，保证输入即时反馈
    void this.renderLocalSuggestions();
    // 远程联想（搜索引擎 API）防抖 120ms，避免打字时频繁请求
    this.debounceTimer = window.setTimeout(() => {
      void this.fetchRemoteSuggestions();
    }, 120);
  }

  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key;

    if (key === 'Escape') {
      this.hideSuggestions();
      return;
    }

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      if (this.items.length === 0) return;
      event.preventDefault();
      this.moveActive(key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (key === 'Enter') {
      // 有键盘选中项 → 激活该项
      if (this.activeIndex >= 0 && this.items[this.activeIndex] !== undefined) {
        event.preventDefault();
        event.stopPropagation();
        this.activate(this.items[this.activeIndex]);
        return;
      }
      if (this.field.value.trim() === '') return;
      event.preventDefault();
      event.stopPropagation();
      this.submitCurrent();
    }
  }

  // ─────────────── 提交逻辑 ───────────────

  /** 回车提交：URL 直达 → = 计算 → 普通搜索 */
  private submitCurrent(): void {
    const raw = this.field.value.trim();
    if (raw === '') return;

    const settings = get();

    // c1：URL 直达（无协议默认补 https://）
    if (settings.omnibox.autoHttps) {
      const url = normalizeUrl(raw);
      if (url !== null) {
        this.openUrl(url);
        this.hideSuggestions();
        return;
      }
    } else if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/\S*$/.test(raw)) {
      // 关闭自动补全时仍识别显式协议 URL
      this.openUrl(raw);
      this.hideSuggestions();
      return;
    }

    // c3：= 表达式 → 结果用于搜索（同时填入输入框）
    if (raw.startsWith('=')) {
      const expression = raw.slice(1).trim();
      try {
        const result = formatResult(evaluate(expression));
        this.field.value = result;
        this.addHistory(result);
        this.submitSearch(result);
      } catch {
        // 表达式无效 → 按普通文本搜索
        this.addHistory(raw);
        this.submitSearch(raw);
      }
      return;
    }

    // c2：普通文本 → 当前引擎搜索
    this.addHistory(raw);
    this.submitSearch(raw);
  }

  /** 用给定查询词在当前引擎中搜索 */
  private submitSearch(query: string): void {
    const engine = this.getEngine();
    if (engine === undefined) return;
    const url = buildSearchUrl(engine, query);
    this.openUrl(url);
    this.hideSuggestions();
    this.addHistory(query);
  }

  /** 打开 URL：默认新标签页（openInNewTab），可配置为当前页 */
  private openUrl(url: string): void {
    if (get().searchEngines.openInNewTab) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.click();
    } else {
      window.location.assign(url);
    }
  }

  /** 记录搜索历史（去重、最近在前、上限 historyMax，默认 15） */
  private addHistory(query: string): void {
    const q = query.trim();
    if (q === '') return;
    const settings = get();
    if (!settings.omnibox.historyEnabled) return;
    const max = Math.max(1, settings.omnibox.historyMax);
    const history = [q, ...settings.omnibox.history.filter((h) => h !== q)].slice(
      0,
      max,
    );
    // 无变化不触发持久化 / 通知
    if (
      history.length === settings.omnibox.history.length &&
      history.every((item, index) => item === settings.omnibox.history[index])
    ) {
      return;
    }
    set({ omnibox: { history } });
  }

  // ─────────────── 建议列表 ───────────────

  /** 渲染本地建议：历史 / 计算 / 翻译（同步、即时） */
  private renderLocalSuggestions(): void {
    const value = this.field.value.trim();
    const settings = get();

    // 输入为空 → 显示搜索历史
    if (value === '') {
      const history = settings.omnibox.history;
      const items: Suggestion[] = history.map((item) => ({
        kind: 'history',
        label: item,
        value: item,
        iconTag: ICON_TAGS.history,
      }));
      this.renderSuggestions(items);
      return;
    }

    // = 表达式 → 实时计算
    if (value.startsWith('=')) {
      const expression = value.slice(1).trim();
      const items: Suggestion[] = [];
      if (expression !== '') {
        try {
          const result = formatResult(evaluate(expression));
          items.push({
            kind: 'calc',
            label: `= ${result}`,
            description: t('search.calcResult'),
            value: result,
            iconTag: ICON_TAGS.calc,
          });
        } catch (error) {
          const message =
            error instanceof CalculationError ? error.message : t('search.calcFailed');
          items.push({
            kind: 'calc',
            label: `${t('search.calcFailed')}：${message}`,
            description: t('search.calcHint'),
            value,
            iconTag: ICON_TAGS.calc,
          });
        }
      }
      this.renderSuggestions(items);
      return;
    }

    // 非中文 或 带 translate-shell 语法前缀 → 翻译建议 + 历史（前缀匹配）
    const actionItems: Suggestion[] = [];
    const hasSyntaxPrefix = /^:?[a-zA-Z]{2,7}:[a-zA-Z]{2,7}\s+/.test(value) || /^:[a-zA-Z]{2,7}\s+/.test(value);
    if (
      settings.omnibox.translateEnabled &&
      (isNonChineseText(value) || hasSyntaxPrefix)
    ) {
      // 语法前缀翻译：目标语言取前缀指定（:ja → ja；en:zh → zh-CN），否则用默认
      let display = value;
      let targetLang = settings.omnibox.translateTargetLang || 'zh-CN';
      const m1 = value.match(/^([a-zA-Z]{2,7}):([a-zA-Z]{2,7})\s+(.+)$/s);
      const m2 = value.match(/^:([a-zA-Z]{2,7})\s+(.+)$/s);
      if (m1 !== null) {
        const t = normalizeLang(m1[2]);
        if (t !== null) targetLang = t;
        display = m1[3];
      } else if (m2 !== null) {
        const t = normalizeLang(m2[1]);
        if (t !== null) targetLang = t;
        display = m2[2];
      }
      const targetName =
        SUPPORTED_LANGS.find((l) => l.code === targetLang)?.name ?? targetLang;
      actionItems.push({
        kind: 'translate',
        label: `${t('search.translateToLang', { lang: targetName })}：「${truncateMiddle(display, 24)}」`,
        description: t('search.translateDesc'),
        value,
        iconTag: ICON_TAGS.translate,
      });
    }
    const historyItems: Suggestion[] = settings.omnibox.history
      .filter((item) => item.toLowerCase().startsWith(value.toLowerCase()))
      .slice(0, 5)
      .map((item) => ({
        kind: 'history',
        label: item,
        value: item,
        iconTag: ICON_TAGS.history,
      }));
    this.renderSuggestions([...actionItems, ...historyItems]);
  }

  /** 拉取远程联想建议（防抖后调用），到达后与本地建议合并 */
  private async fetchRemoteSuggestions(): Promise<void> {
    const value = this.field.value.trim();
    if (value === '' || value.startsWith('=')) return;
    const settings = get();
    if (!settings.omnibox.suggestEnabled || value.length < SUGGEST_MIN_LENGTH) {
      return;
    }
    const engineId = settings.searchEngines.defaultEngine;
    const suggestions = await fetchSuggest(engineId, value);
    // 输入已变化 → 丢弃过期结果
    if (this.field.value.trim() !== value) return;
    // 重新取本地建议再合并（避免覆盖）
    this.renderLocalSuggestions();
    const suggestItems: Suggestion[] = suggestions.map((item) => ({
      kind: 'suggest',
      label: item,
      value: item,
      iconTag: ICON_TAGS.suggest,
    }));
    // 取当前本地项（action + history）合并
    const currentItems = this.items.filter(
      (item) => item.kind !== 'suggest',
    );
    this.renderSuggestions(
      mergeSuggestions(currentItems, suggestItems, []),
    );
  }

  /** 兼容旧调用（调试钩子 / 外部） */
  async updateSuggestions(): Promise<void> {
    this.renderLocalSuggestions();
    await this.fetchRemoteSuggestions();
  }

  private renderSuggestions(items: Suggestion[]): void {
    this.items = items;
    this.activeIndex = -1;
    const list = this.suggestList;
    const panel = this.suggestPanel;
    const prevHeight = panel.hidden ? 0 : panel.getBoundingClientRect().height;

    list.innerHTML = '';
    if (items.length === 0) {
      this.hideSuggestions();
      return;
    }
    for (const item of items) {
      list.appendChild(this.createItemElement(item));
    }
    this.showSuggestions();

    // 面板高度平滑过渡：先锁旧高度（0 或上次高度），下一帧动画到新内容高度
    const from = prevHeight;
    panel.style.height = `${from}px`;
    requestAnimationFrame(() => {
      const to = panel.scrollHeight;
      if (Math.abs(from - to) < 2) {
        panel.style.height = 'auto';
        return;
      }
      const anim = panel.animate(
        [{ height: `${from}px` }, { height: `${to}px` }],
        { duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
      );
      anim.onfinish = () => {
        panel.style.height = 'auto';
      };
    });
  }

  private createItemElement(item: Suggestion): HTMLElement {
    const element = document.createElement('mdui-list-item');
    // 主文本走 default slot（light DOM），保证 textContent/innerText 可见
    element.textContent = item.label;
    if (item.description !== undefined) {
      const description = document.createElement('span');
      description.setAttribute('slot', 'description');
      description.textContent = item.description;
      element.appendChild(description);
    }
    element.dataset.kind = item.kind;
    const icon = document.createElement(item.iconTag);
    icon.setAttribute('slot', 'icon');
    element.appendChild(icon);
    return element;
  }

  private showSuggestions(): void {
    this.suggestPanel.hidden = false;
  }

  private hideSuggestions(): void {
    this.suggestPanel.hidden = true;
    this.activeIndex = -1;
  }

  private moveActive(delta: number): void {
    const length = this.items.length;
    if (length === 0) return;
    let next: number;
    if (this.activeIndex === -1) {
      next = delta > 0 ? 0 : length - 1;
    } else {
      next = (this.activeIndex + delta + length) % length;
    }
    this.setActive(next);
  }

  private setActive(index: number): void {
    const children = this.suggestList.children;
    const previous = this.activeIndex;
    if (previous >= 0 && previous < children.length) {
      children[previous].classList.remove('omnibox__item-active');
    }
    this.activeIndex = index;
    const element = children[index];
    if (element !== undefined) {
      element.classList.add('omnibox__item-active');
      element.scrollIntoView({ block: 'nearest' });
    }
  }

  /** 激活建议项：计算→填入；翻译→打开翻译；历史/联想→搜索 */
  private activate(item: Suggestion): void {
    if (item.kind === 'calc') {
      this.field.value = item.value;
      this.hideSuggestions();
      return;
    }
    if (item.kind === 'translate') {
      void this.openTranslation(item.value);
      return;
    }
    this.submitSearch(item.value);
  }

  // ─────────────── 建议面板交互 ───────────────

  private wireSuggestPanel(): void {
    // 阻止 mousedown 默认行为：点击建议项时输入框保持焦点
    this.suggestPanel.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });
    this.suggestPanel.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      const itemElement = target?.closest<HTMLElement>('mdui-list-item');
      if (itemElement === null || itemElement === undefined) return;

      // 翻译结果视图的特殊动作（复制 / 搜索 / 关闭）
      const action = itemElement.dataset.action;
      if (action !== undefined) {
        this.handleTranslationAction(action, itemElement);
        return;
      }

      const index = Array.from(this.suggestList.children).indexOf(itemElement);
      if (index >= 0 && this.items[index] !== undefined) {
        this.activate(this.items[index]);
      }
    });
  }

  private handleTranslationAction(
    action: string,
    element: HTMLElement,
  ): void {
    const text = element.dataset.text ?? '';
    if (action === 'copy') {
      void this.copyText(text);
    } else if (action === 'search') {
      this.submitSearch(text);
    } else {
      this.hideSuggestions();
    }
  }

  private async copyText(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 非安全上下文 fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch {
        // 忽略复制失败
      }
      textarea.remove();
    }
    this.showSnackbar(`${t('common.copied')} · ${t('search.translateResult')}`);
  }

  private showSnackbar(message: string): void {
    const bar = document.createElement('mdui-snackbar');
    bar.textContent = message;
    bar.autoCloseDelay = 2500;
    document.body.appendChild(bar);
    bar.open = true;
  }

  // ─────────────── 翻译视图（c4） ───────────────

  private async openTranslation(text: string): Promise<void> {
    this.translateAbort?.abort();
    const controller = new AbortController();
    this.translateAbort = controller;

    const list = this.suggestList;
    list.innerHTML = '';
    list.appendChild(
      this.createItemElement({
        kind: 'translate',
        label: t('search.translating'),
        description: `「${truncateMiddle(text, 24)}」 → ${t('search.translateToZh')}`,
        value: text,
        iconTag: ICON_TAGS.translate,
      }),
    );
    this.showSuggestions();

    try {
      const targetLang = get().omnibox.translateTargetLang || 'zh-CN';
      const result = await translateText(text, targetLang);
      if (controller.signal.aborted) return;
      if (this.field.value.trim() !== text) return; // 输入已变化，丢弃结果
      this.translateAbort = null;

      list.innerHTML = '';
      const subheader = document.createElement('mdui-list-subheader');
      subheader.textContent = `${t('search.translateResult')}（${result.sourceLang} → ${result.targetLang}）`;
      list.appendChild(subheader);

      const translatedItem = this.createItemElement({
        kind: 'translate',
        label: result.translatedText,
        description: t('search.copyResult'),
        value: text,
        iconTag: ICON_TAGS.translate,
      });
      translatedItem.dataset.action = 'copy';
      translatedItem.dataset.text = result.translatedText;
      list.appendChild(translatedItem);

      const engineName = this.currentEngineName();
      const searchItem = this.createItemElement({
        kind: 'suggest',
        label: t('search.searchResult'),
        description: t('search.searchIn', { engine: engineName }),
        value: result.translatedText,
        iconTag: ICON_TAGS.suggest,
      });
      searchItem.dataset.action = 'search';
      searchItem.dataset.text = result.translatedText;
      list.appendChild(searchItem);
    } catch {
      // 网络失败 / 超时：优雅降级，不抛错
      if (controller.signal.aborted) return;
      this.translateAbort = null;
      list.innerHTML = '';
      const errorItem = this.createItemElement({
        kind: 'translate',
        label: t('search.translateUnavailable'),
        description: t('search.checkNetwork'),
        value: text,
        iconTag: ICON_TAGS.translate,
      });
      errorItem.dataset.action = 'dismiss';
      list.appendChild(errorItem);
      this.showSuggestions();
    }
  }

  // ─────────────── 引擎切换（c2） ───────────────

  private wireEngineMenu(): void {
    this.engineMenu.addEventListener('change', () => {
      const value = this.engineMenu.value;
      const id = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
      if (id === '') return;
      if (id !== get().searchEngines.defaultEngine) {
        // 持久化到 localStorage（经类型化 store）
        set({ searchEngines: { defaultEngine: id } });
      }
      this.engineDropdown.open = false;
    });
  }

  /** 重建引擎菜单（引擎列表变化时才执行） */
  private rebuildEngineMenu(): void {
    const engines = get().searchEngines.engines;
    const fingerprint = engines
      .map((engine) => `${engine.id}:${engine.name}:${engine.url}`)
      .join(',');
    if (fingerprint === this.engineMenuFingerprint) return;
    this.engineMenuFingerprint = fingerprint;

    const previousValue = this.engineMenu.value;
    this.engineMenu.innerHTML = '';
    for (const engine of engines) {
      const item = document.createElement('mdui-menu-item');
      item.value = engine.id;
      item.textContent = engine.name;
      const iconUrl = engineIconUrl(engine);
      if (iconUrl !== '') {
        const img = document.createElement('img');
        img.slot = 'icon';
        img.className = 'omnibox__engine-icon';
        img.src = iconUrl;
        img.alt = '';
        img.referrerPolicy = 'no-referrer';
        img.addEventListener('error', () => img.remove());
        item.appendChild(img);
      }
      this.engineMenu.appendChild(item);
    }
    // 恢复选中状态
    if (typeof previousValue === 'string' && previousValue !== '') {
      this.engineMenu.value = previousValue;
    }
  }

  /** 更新搜索框左侧引擎按钮图标：有 favicon 则替换默认 language 图标，失败回退默认图标 */
  private updateEngineTriggerIcon(engine: SearchEngine): void {
    const trigger = this.root.querySelector<HTMLElement>('[data-omnibox-engine-trigger]');
    if (trigger === null) return;
    const existing = trigger.querySelector('.omnibox__engine-favicon');
    existing?.remove();
    const iconUrl = engineIconUrl(engine);
    if (iconUrl === '') return;
    const img = document.createElement('img');
    img.className = 'omnibox__engine-favicon';
    img.src = iconUrl;
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => img.remove());
    const defaultIcon = trigger.querySelector('mdui-icon-language--rounded');
    if (defaultIcon !== null) {
      trigger.insertBefore(img, defaultIcon);
      defaultIcon.remove();
    } else {
      trigger.appendChild(img);
    }
  }

  private currentEngineName(): string {
    return this.getEngine()?.name ?? t('searchTab.title');
  }

  /** 以 store 为准同步引擎名 / 菜单选中 / 建议面板 */
  private syncFromStore(): void {
    this.rebuildEngineMenu();
    const settings = get();

    const engine = getEngineById(
      settings.searchEngines.engines,
      settings.searchEngines.defaultEngine,
    );
    if (engine !== undefined) {
      this.updateEngineTriggerIcon(engine);
    }

    const current = this.engineMenu.value;
    const currentId = Array.isArray(current) ? (current[0] ?? '') : (current ?? '');
    if (currentId !== settings.searchEngines.defaultEngine) {
      this.engineMenu.value = settings.searchEngines.defaultEngine;
    }

    // 空输入且面板打开 → 刷新历史建议
    if (!this.suggestPanel.hidden && this.field.value.trim() === '') {
      void this.updateSuggestions();
    }
  }
}
