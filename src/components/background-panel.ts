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
 * 背景控件面板（Sprint 5 控件，S6 收编进设置面板「背景」Tab）。
 *
 * 将原先独立背景对话框的全部控件（模式 / 纯色 / 上传 / URL / 视频 / 必应 /
 * 蒙版滑块）封装为可嵌入任意容器的类；设置面板的背景 Tab 复用同一套逻辑。
 *
 * 控件 id 与 S5 保持一致（bg-mode-group / bg-color-input / bg-overlay-slider …），
 * 便于自动化验证与迁移。
 */
import '@mdui/icons/cloud-done.js';
import '@mdui/icons/delete.js';
import '@mdui/icons/refresh.js';
import '@mdui/icons/upload.js';

import { snackbar } from 'mdui/functions/snackbar.js';
import { t } from '../i18n';
import type { SegmentedButtonGroup, Slider, TextField } from 'mdui';

import { get, set, subscribe } from '../storage/store';
import {
  deleteBackgroundImage,
  isIdbSource,
  resolveImageSource,
  saveBackgroundImage,
} from '../services/imageStore';
import { normalizeUrl } from '../utils/url';
import type { BackgroundManager, BackgroundMode } from './background';

/** 上传图片大小上限（4MB，localStorage 配额保护） */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const PRESET_COLORS = [
  '#141218',
  '#6750a4',
  '#006a6a',
  '#386a20',
  '#00639b',
  '#7d5260',
  '#b3261e',
  '#8c4a1f',
  '#004f4f',
  '#4a5c92',
] as const;

/** 图片文件大小格式化 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export class BackgroundPanel {
  /** 注入的必应错误回调（由外部 UI 挂载提示） */
  onError: ((message: string) => void) | null = null;

  private readonly root: HTMLElement;
  private readonly manager: BackgroundManager;

  constructor(root: HTMLElement, manager: BackgroundManager) {
    this.root = root;
    this.manager = manager;

    const q = <T extends Element>(selector: string): T => {
      const el = root.querySelector<T>(selector);
      if (el === null) throw new Error(`[background-panel] 缺少 ${selector}`);
      return el;
    };

    const modeGroup = q<SegmentedButtonGroup>('#bg-mode-group');
    const colorInput = q<HTMLInputElement>('#bg-color-input');
    const swatchButtons = Array.from(
      root.querySelectorAll<HTMLElement>('[data-bg-swatch]'),
    );
    const fileInput = q<HTMLInputElement>('#bg-file-input');
    const uploadButton = q<HTMLElement>('#bg-upload-btn');
    const uploadClear = q<HTMLElement>('#bg-upload-clear');
    const urlField = q<TextField>('#bg-url-field');
    const urlApply = q<HTMLElement>('#bg-url-apply');
    const videoField = q<TextField>('#bg-video-field');
    const videoApply = q<HTMLElement>('#bg-video-apply');
    const bingFetch = q<HTMLElement>('#bg-bing-fetch');
    const bingStatus = q<HTMLElement>('[data-bg-bing-status]');
    const bingMirrorField = q<TextField>('#bg-bing-mirror');
    const bingManualField = q<TextField>('#bg-bing-manual');
    const bingManualApply = q<HTMLElement>('#bg-bing-manual-apply');
    const overlaySlider = q<Slider>('#bg-overlay-slider');
    const blurSlider = q<Slider>('#bg-blur-slider');

    // 必应失败提示：snackbar + 状态行
    this.manager.onError = (message) => {
      this.setBingStatus(bingStatus, message, 'error');
      snackbar({ message, autoCloseDelay: 4500 });
    };

    this.wire({
      modeGroup,
      colorInput,
      swatchButtons,
      fileInput,
      uploadButton,
      uploadClear,
      urlField,
      urlApply,
      videoField,
      videoApply,
      bingFetch,
      bingStatus,
      bingMirrorField,
      bingManualField,
      bingManualApply,
      overlaySlider,
      blurSlider,
    });
    this.syncFromStore();
    subscribe(() => this.syncFromStore());
  }

  // ─────────────── 事件装配 ───────────────

  private wire(els: {
    modeGroup: SegmentedButtonGroup;
    colorInput: HTMLInputElement;
    swatchButtons: HTMLElement[];
    fileInput: HTMLInputElement;
    uploadButton: HTMLElement;
    uploadClear: HTMLElement;
    urlField: TextField;
    urlApply: HTMLElement;
    videoField: TextField;
    videoApply: HTMLElement;
    bingFetch: HTMLElement;
    bingStatus: HTMLElement;
    bingMirrorField: TextField;
    bingManualField: TextField;
    bingManualApply: HTMLElement;
    overlaySlider: Slider;
    blurSlider: Slider;
  }): void {
    const {
      modeGroup,
      colorInput,
      swatchButtons,
      fileInput,
      uploadButton,
      uploadClear,
      urlField,
      urlApply,
      videoField,
      videoApply,
      bingFetch,
      bingStatus,
      bingMirrorField,
      bingManualField,
      bingManualApply,
      overlaySlider,
      blurSlider,
    } = els;

    // 模式切换：立即生效并持久化
    modeGroup.addEventListener('change', () => {
      const mode = modeGroup.value as BackgroundMode;
      set({ background: { mode } });
    });

    // 纯色：原生取色器（input + change 双事件，兼容即时与确认）
    colorInput.addEventListener('input', () => this.applyColor(colorInput));
    colorInput.addEventListener('change', () => this.applyColor(colorInput));

    // 预设色板
    for (const swatch of swatchButtons) {
      swatch.addEventListener('click', () => {
        const color = swatch.dataset.color;
        if (color !== undefined) {
          this.applyColorFromSwatch(colorInput, color);
        }
      });
    }

    // 图片上传
    uploadButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file !== undefined) this.readImageFile(file);
      // 允许重复选择同一文件
      fileInput.value = '';
    });
    uploadClear.addEventListener('click', () => {
      void deleteBackgroundImage().finally(() => {
        set({ background: { image: '' } });
        snackbar({ message: t('bg.removedImage'), autoCloseDelay: 2000 });
      });
    });

    // 图片 URL
    urlApply.addEventListener('click', () => this.applyUrl(urlField));
    urlField.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.applyUrl(urlField);
      }
    });

    // 视频 URL
    videoApply.addEventListener('click', () => this.applyVideo(videoField));
    videoField.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.applyVideo(videoField);
      }
    });

    // 必应壁纸
    bingFetch.addEventListener('click', () => void this.fetchBing(bingStatus));
    bingMirrorField.addEventListener('change', () => {
      set({ background: { bingMirror: bingMirrorField.value.trim() } });
    });
    bingManualApply.addEventListener('click', () =>
      this.applyBingManual(bingManualField, bingStatus),
    );
    bingManualField.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.applyBingManual(bingManualField, bingStatus);
      }
    });

    // 蒙版滑块：input 即时生效 + change 兜底
    overlaySlider.addEventListener('input', () => {
      set({ background: { overlayOpacity: overlaySlider.value / 100 } });
    });
    overlaySlider.addEventListener('change', () => {
      set({ background: { overlayOpacity: overlaySlider.value / 100 } });
    });
    blurSlider.addEventListener('input', () => {
      set({ background: { blur: blurSlider.value } });
    });
    blurSlider.addEventListener('change', () => {
      set({ background: { blur: blurSlider.value } });
    });
  }

  // ─────────────── 行为 ───────────────

  private applyColor(colorInput: HTMLInputElement, color?: string): void {
    const value = color ?? colorInput.value;
    if (value === '' || !/^#[0-9a-fA-F]{6}$/.test(value)) return;
    set({ background: { mode: 'color', color: value } });
  }

  private applyColorFromSwatch(
    colorInput: HTMLInputElement,
    color: string,
  ): void {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;
    colorInput.value = color;
    set({ background: { mode: 'color', color } });
  }

  private readImageFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      snackbar({
        message: t('bg.pickImage'),
        autoCloseDelay: 2500,
      });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      snackbar({
        message: t('bg.imageTooLarge', { size: formatBytes(file.size) }),
        autoCloseDelay: 3500,
      });
      return;
    }
    void (async () => {
      try {
        // 原图 Blob 直接进 IndexedDB（不压缩、不转 base64），
        // 设置里只存一个 idb:// 标记，彻底绕开 localStorage 配额。
        const marker = await saveBackgroundImage(file);
        set({ background: { mode: 'image', image: marker } });
        snackbar({ message: t('bg.appliedUpload'), autoCloseDelay: 2000 });
      } catch {
        snackbar({ message: t('bg.readFailed'), autoCloseDelay: 2500 });
      }
    })();
  }

  private applyUrl(urlField: TextField): void {
    const raw = urlField.value.trim();
    if (raw === '') {
      snackbar({ message: t('bg.enterImageUrl'), autoCloseDelay: 2500 });
      return;
    }
    const normalized = normalizeUrl(raw) ?? raw;
    urlField.value = normalized;
    set({ background: { mode: 'url', url: normalized } });
    snackbar({ message: t('bg.appliedUrl'), autoCloseDelay: 2000 });
  }

  private applyVideo(videoField: TextField): void {
    const raw = videoField.value.trim();
    if (raw === '') {
      snackbar({ message: t('bg.enterVideoUrl'), autoCloseDelay: 2500 });
      return;
    }
    const normalized = normalizeUrl(raw) ?? raw;
    videoField.value = normalized;
    set({ background: { mode: 'video', video: normalized } });
    snackbar({ message: t('bg.appliedVideo'), autoCloseDelay: 2000 });
  }

  private async fetchBing(bingStatus: HTMLElement): Promise<void> {
    this.setBingStatus(bingStatus, t('bg.fetchingBing'), 'pending');
    const ok = await this.manager.refreshBing();
    if (ok) {
      this.setBingStatus(bingStatus, t('bg.appliedBing'), 'ok');
      snackbar({ message: t('bg.appliedBing'), autoCloseDelay: 2000 });
    }
    // 失败时 manager.onError 已负责提示
  }

  private applyBingManual(
    bingManualField: TextField,
    bingStatus: HTMLElement,
  ): void {
    const raw = bingManualField.value.trim();
    if (raw === '') {
      snackbar({ message: t('bg.enterImageUrl'), autoCloseDelay: 2500 });
      return;
    }
    const normalized = normalizeUrl(raw) ?? raw;
    bingManualField.value = normalized;
    set({ background: { mode: 'bing', bingUrl: normalized } });
    this.setBingStatus(bingStatus, t('bg.appliedWallpaper'), 'ok');
    snackbar({ message: t('bg.appliedWallpaper'), autoCloseDelay: 2000 });
  }

  // ─────────────── store 同步 ───────────────

  private syncFromStore(): void {
    const bg = get().background;

    const modeGroup = this.root.querySelector<SegmentedButtonGroup>(
      '#bg-mode-group',
    );
    const colorInput = this.root.querySelector<HTMLInputElement>(
      '#bg-color-input',
    );
    const swatchButtons = Array.from(
      this.root.querySelectorAll<HTMLElement>('[data-bg-swatch]'),
    );
    const urlField = this.root.querySelector<TextField>('#bg-url-field');
    const videoField = this.root.querySelector<TextField>('#bg-video-field');
    const bingMirrorField = this.root.querySelector<TextField>(
      '#bg-bing-mirror',
    );
    const overlaySlider = this.root.querySelector<Slider>('#bg-overlay-slider');
    const blurSlider = this.root.querySelector<Slider>('#bg-blur-slider');

    if (modeGroup !== null) {
      modeGroup.value = bg.mode;
      this.setActivePane(bg.mode);
    }

    if (colorInput !== null && /^#[0-9a-fA-F]{6}$/.test(bg.color)) {
      colorInput.value = bg.color;
    }
    for (const swatch of swatchButtons) {
      swatch.classList.toggle(
        'is-active',
        swatch.dataset.color === bg.color.toLowerCase(),
      );
    }

    this.syncUploadPreview(bg.image);

    if (urlField !== null && urlField.value !== bg.url) urlField.value = bg.url;
    if (videoField !== null && videoField.value !== bg.video) {
      videoField.value = bg.video;
    }
    if (bingMirrorField !== null && bingMirrorField.value !== bg.bingMirror) {
      bingMirrorField.value = bg.bingMirror;
    }

    if (overlaySlider !== null) {
      overlaySlider.value = Math.round(bg.overlayOpacity * 100);
    }
    if (blurSlider !== null) {
      blurSlider.value = Math.round(bg.blur);
    }
  }

  /** 仅显示当前模式对应的设置区块 */
  private setActivePane(mode: BackgroundMode): void {
    const panes = this.root.querySelectorAll<HTMLElement>('[data-bg-pane]');
    for (const pane of panes) {
      pane.classList.toggle('is-active', pane.dataset.bgPane === mode);
    }
  }

  private syncUploadPreview(image: string): void {
    const previewImg = this.root.querySelector<HTMLImageElement>(
      '[data-bg-preview-img]',
    );
    const uploadPreview = this.root.querySelector<HTMLElement>(
      '[data-bg-upload-preview]',
    );
    if (previewImg === null || uploadPreview === null) return;
    if (image !== '') {
      uploadPreview.hidden = false;
      if (isIdbSource(image)) {
        void resolveImageSource(image).then((resolved) => {
          if (resolved === '') {
            previewImg.removeAttribute('src');
            uploadPreview.hidden = true;
            return;
          }
          previewImg.src = resolved;
        });
      } else {
        previewImg.src = image;
      }
    } else {
      previewImg.removeAttribute('src');
      uploadPreview.hidden = true;
    }
  }

  private setBingStatus(
    el: HTMLElement,
    text: string,
    state: 'ok' | 'error' | 'pending',
  ): void {
    el.textContent = text;
    el.dataset.state = state;
  }
}
