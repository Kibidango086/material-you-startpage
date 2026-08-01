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
 * 一言组件（Sprint 6）。
 *
 * 能力：
 *   - 四种来源：随机一言（v1.hitokoto.cn）/ 今日诗词（v2.jinrishici.com）/
 *     自定义文本（面板可编辑）/ AI 生成（OpenAI 兼容 endpoint + key + prompt）；
 *   - 显示于页面底部，点击文本即可刷新；
 *   - 订阅 store：来源 / 自定义文本 / AI 配置变更后自动重新渲染；
 *   - 来源切换持久化（localStorage）。
 *
 * 对外暴露 SaysApi（调试 / 自动化验证钩子）：refresh / getText / getSource / getState。
 */
import '@mdui/icons/format-quote--rounded.js';

import { snackbar } from 'mdui/functions/snackbar.js';

import {
  FALLBACK_TEXT,
  fetchHitokoto,
  fetchPoem,
  fetchCustomQuote,
  type SaysResult,
} from '../services/hitokoto';
import { get, subscribe } from '../storage/store';
import { t } from '../i18n';
import type { SaysSettings } from '../storage/types';

/** 加载中的占位文案 */
/** 对外暴露的编程式 API */
export interface SaysApi {
  /** 按当前模式重新获取一言（成功 resolve，失败不抛错） */
  refresh: () => Promise<void>;
  /** 当前展示的正文 */
  getText: () => string;
  /** 当前展示的出处 */
  getSource: () => string;
  /** 最近一次请求状态：idle / loading / ok / error */
  getState: () => 'idle' | 'loading' | 'ok' | 'error';
  /** 一言设置 */
  getSettings: () => SaysSettings;
}

export class Says {
  readonly root: HTMLElement;

  private readonly quoteEl: HTMLElement;
  private readonly sourceEl: HTMLElement;

  private text: string = '';
  private source: string = '';
  private state: 'idle' | 'loading' | 'ok' | 'error' = 'idle';
  private requestSeq = 0;
  /** 最近一次已消费的一言设置快照（用于订阅对比，避免重复请求） */
  private lastSays: SaysSettings;
  private readonly unsub: () => void;

  constructor(root: HTMLElement) {
    this.root = root;
    root.classList.add('says');
    root.innerHTML = `
      <div class="says__row">
        <button type="button" class="says__quote-btn" data-says-quote aria-label="${t('says.copyHint')}">
          <mdui-icon-format-quote--rounded class="says__quote-icon" aria-hidden="true"></mdui-icon-format-quote--rounded>
          <span class="says__text-wrap">
            <span class="says__quote" data-says-text>${t('common.loading')}</span>
            <span class="says__source" data-says-source hidden></span>
          </span>
        </button>
        <mdui-button-icon
          icon="refresh--rounded"
          variant="standard"
          class="says__refresh-btn"
          data-says-refresh
          aria-label="${t('says.refresh')}"
        ></mdui-button-icon>
      </div>
    `;

    const quoteEl = root.querySelector<HTMLElement>('[data-says-quote]');
    const textEl = root.querySelector<HTMLElement>('[data-says-text]');
    const sourceEl = root.querySelector<HTMLElement>('[data-says-source]');
    const refreshBtn = root.querySelector<HTMLElement>('[data-says-refresh]');
    if (quoteEl === null || textEl === null || sourceEl === null || refreshBtn === null) {
      throw new Error('[says] 初始化失败：缺少必需元素');
    }
    this.quoteEl = quoteEl;
    this.sourceEl = sourceEl;

    // 点击正文 → 复制；点击刷新按钮 → 刷新
    this.quoteEl.addEventListener('click', () => void this.copyQuote());
    refreshBtn.addEventListener('click', () => void this.refresh());

    this.lastSays = structuredClone(get().says);
    this.renderPlaceholder();
    void this.refresh();

    this.unsub = subscribe((settings) => {
      if (this.needsRerender(settings.says)) {
        this.lastSays = structuredClone(settings.says);
        this.renderPlaceholder();
        void this.refresh();
      }
    });
  }

  /** 当前模式是否要求重新请求（来源 / 自定义文本 / AI 配置变化时） */
  private needsRerender(next: SaysSettings): boolean {
    return (
      next.mode !== this.lastSays.mode ||
      next.customText !== this.lastSays.customText ||
      next.customAuthor !== this.lastSays.customAuthor ||
      next.customApiUrl !== this.lastSays.customApiUrl
    );
  }

  /** 按当前设置来源渲染占位 */
  private renderPlaceholder(): void {
    const settings = get().says;
    if (settings.mode === 'custom') {
      this.text = settings.customText.trim() !== '' ? settings.customText.trim() : t('says.customHint');
      this.source =
        settings.customAuthor.trim() !== ''
          ? settings.customAuthor.trim()
          : t('saysTab.custom');
      this.state = 'ok';
      this.render();
      return;
    }
    this.text = t('common.loading');
    this.source = '';
    this.state = 'loading';
    this.render();
  }

  /** 刷新：按当前模式请求一言 */
  async refresh(): Promise<void> {
    const settings = get().says;

    if (settings.mode === 'custom') {
      this.renderPlaceholder();
      return;
    }

    // 自建一言未配置地址：展示引导文案而非报错
    if (settings.mode === 'customApi' && settings.customApiUrl.trim() === '') {
      this.text = t('customApi.notConfigured');
      this.source = '';
      this.state = 'ok';
      this.render();
      return;
    }

    const seq = ++this.requestSeq;
    this.text = t('common.loading');
    this.source = '';
    this.state = 'loading';
    this.render();

    try {
      let result: SaysResult;
      if (settings.mode === 'hitokoto') {
        result = await fetchHitokoto();
      } else if (settings.mode === 'poem') {
        result = await fetchPoem();
      } else {
        // 剩余模式即自建一言（mode: customApi）
        result = await fetchCustomQuote(settings.customApiUrl.trim());
      }
      if (seq !== this.requestSeq) return; // 过期请求丢弃
      this.text = result.text;
      this.source = result.source ?? '';
      this.state = 'ok';
      this.render();
    } catch (error) {
      if (seq !== this.requestSeq) return;
      const message =
        error instanceof Error ? error.message : t('says.fetchFailed');
      // 未配置自建一言 URL 时不弹错误（已展示引导文案）；其余失败提示一次
      if (settings.mode !== 'customApi' || settings.customApiUrl.trim() !== '') {
        snackbar({ message, autoCloseDelay: 3500 });
      }
      this.text = FALLBACK_TEXT;
      this.source = t('says.fetchFailed');
      this.state = 'error';
      this.render();
    }
  }

  /** 复制当前一言到剪贴板（带出处），成功提示 snackbar */
  private async copyQuote(): Promise<void> {
    const text = this.text.trim();
    if (text === '' || this.state === 'loading') return;
    const full = this.source !== '' ? `${text} —— ${this.source}` : text;
    try {
      await navigator.clipboard.writeText(full);
      snackbar({ message: `${t('common.copied')} · ${t('says.refresh')}`, autoCloseDelay: 2000 });
    } catch {
      // 非安全上下文 fallback
      const textarea = document.createElement('textarea');
      textarea.value = full;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        snackbar({ message: `${t('common.copied')} · ${t('says.refresh')}`, autoCloseDelay: 2000 });
      } catch {
        snackbar({ message: 'Copy failed', autoCloseDelay: 2000 });
      }
      textarea.remove();
    }
  }

  /** 渲染正文 + 出处 + 状态 */
  private render(): void {
    const textEl = this.root.querySelector<HTMLElement>('[data-says-text]');
    if (textEl !== null) {
      textEl.textContent = `「${this.text}」`;
    }
    if (this.source !== '') {
      this.sourceEl.hidden = false;
      this.sourceEl.textContent = `—— ${this.source}`;
    } else {
      this.sourceEl.hidden = true;
      this.sourceEl.textContent = '';
    }
    this.root.dataset.state = this.state;
  }

  /** 对外 API */
  expose(): SaysApi {
    return {
      refresh: () => this.refresh(),
      getText: () => this.text,
      getSource: () => this.source,
      getState: () => this.state,
      getSettings: () => get().says,
    };
  }

  /** 销毁：取消订阅 */
  destroy(): void {
    this.unsub();
  }
}
