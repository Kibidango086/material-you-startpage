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
 * 背景管理器（Sprint 5）。
 *
 * 负责「背景层」的 DOM 与渲染：
 *   - 固定定位的背景层（z-index: 0）与内容层（z-index: 1）分离；
 *   - 五种模式：纯色（body 背景色）/ 上传图片（base64）/ 图片 URL /
 *     视频（<video muted loop autoplay playsinline>）/ 必应每日壁纸；
 *   - 蒙版：透明度（0-1）+ 模糊（0-30px），以 CSS 变量驱动即时生效；
 *   - 订阅 store，任何背景设置变更立即重渲染并持久化。
 */
import { t } from '../i18n';
import {
  buildBingMirrors,
  fetchBingWallpaper,
  verifyImageLoadable,
} from '../services/bingWallpaper';
import { get, set, subscribe } from '../storage/store';
import type { BackgroundSettings } from '../storage/types';

/** 背景模式 */
export type BackgroundMode = BackgroundSettings['mode'];

/** 对外暴露的编程式 API（调试 / 自动化验证钩子） */
export interface BackgroundApi {
  get: () => BackgroundSettings;
  set: (patch: Partial<BackgroundSettings>) => void;
  setMode: (mode: BackgroundMode) => void;
  setColor: (color: string) => void;
  setImage: (dataUrl: string) => void;
  setUrl: (url: string) => void;
  setVideo: (url: string) => void;
  setBingUrl: (url: string) => void;
  /** 直接调用必应壁纸服务（返回图片 URL，不落地） */
  fetchBing: (options?: Parameters<typeof fetchBingWallpaper>[0]) => Promise<string>;
  /** 获取并应用必应壁纸（成功返回 true） */
  applyBing: () => Promise<boolean>;
  /** 背景层 DOM */
  layer: () => HTMLElement;
  /** 蒙版层 DOM */
  overlay: () => HTMLElement;
  /** 背景 <img> DOM */
  image: () => HTMLImageElement;
  /** 背景 <video> DOM */
  video: () => HTMLVideoElement;
}

export class BackgroundManager {
  readonly layer: HTMLElement;

  /** 必应壁纸获取失败 / 图片加载失败时的回调（用于 UI 提示） */
  onError: ((message: string) => void) | null = null;

  private readonly imageEl: HTMLImageElement;
  private readonly videoEl: HTMLVideoElement;
  private readonly overlayEl: HTMLElement;
  private readonly unsub: () => void;
  private bingPromise: Promise<boolean> | null = null;

  constructor(layer: HTMLElement) {
    this.layer = layer;
    layer.classList.add('bg-layer');
    layer.innerHTML = `
      <img class="bg-layer__image" data-bg-image alt="" hidden />
      <video class="bg-layer__video" data-bg-video muted loop autoplay playsinline preload="auto" hidden></video>
      <div class="bg-layer__overlay" data-bg-overlay></div>
    `;

    const imageEl = layer.querySelector<HTMLImageElement>('[data-bg-image]');
    const videoEl = layer.querySelector<HTMLVideoElement>('[data-bg-video]');
    const overlayEl = layer.querySelector<HTMLElement>('[data-bg-overlay]');
    if (imageEl === null || videoEl === null || overlayEl === null) {
      throw new Error('[background] 缺少背景层元素');
    }
    this.imageEl = imageEl;
    this.videoEl = videoEl;
    this.overlayEl = overlayEl;

    // 背景图片加载失败（如必应镜像失效）：通知 UI
    this.imageEl.addEventListener('error', () => {
      if (get().background.mode === 'bing') {
        this.onError?.(t('bg.imageLoadFailed'));
      }
    });

    this.apply(get().background);
    this.unsub = subscribe((settings) => this.apply(settings.background));
  }

  /** 应用背景设置（订阅 store 自动调用；切模式即时生效） */
  apply(bg: BackgroundSettings): void {
    this.layer.dataset.mode = bg.mode;
    this.applyBodyColor(bg);
    this.applyMedia(bg);
    this.applyOverlay(bg);
  }

  /** 纯色模式：设置 body 背景色（其余模式清空，由背景层展示媒体） */
  private applyBodyColor(bg: BackgroundSettings): void {
    if (bg.mode === 'color') {
      document.body.style.background = bg.color;
    } else {
      document.body.style.background = '';
    }
  }

  /** 应用媒体（图片 / 视频） */
  private applyMedia(bg: BackgroundSettings): void {
    const isImageMode =
      bg.mode === 'image' || bg.mode === 'url' || bg.mode === 'bing';

    if (isImageMode) {
      const src =
        bg.mode === 'image'
          ? bg.image
          : bg.mode === 'url'
            ? bg.url
            : bg.bingUrl;
      if (src !== '') {
        this.imageEl.src = src;
        this.imageEl.hidden = false;
      } else {
        this.imageEl.removeAttribute('src');
        this.imageEl.hidden = true;
      }
      this.stopVideo();
    } else if (bg.mode === 'video') {
      this.imageEl.removeAttribute('src');
      this.imageEl.hidden = true;
      if (bg.video !== '') {
        this.videoEl.src = bg.video;
        this.videoEl.hidden = false;
        // 静音自动播放；浏览器自动播放策略失败时静默降级
        void this.videoEl.play().catch(() => {
          /* autoplay 被策略拦截时忽略 */
        });
      } else {
        this.stopVideo();
      }
    } else {
      // 纯色模式：隐藏媒体
      this.imageEl.removeAttribute('src');
      this.imageEl.hidden = true;
      this.stopVideo();
    }

    // 必应模式且无缓存 URL：自动拉取当日壁纸
    if (bg.mode === 'bing' && bg.bingUrl === '') {
      void this.refreshBing();
    }
  }

  /** 蒙版：透明度 + 模糊（CSS 变量即时驱动） */
  private applyOverlay(bg: BackgroundSettings): void {
    this.layer.style.setProperty(
      '--bg-overlay-alpha',
      String(clamp(bg.overlayOpacity, 0, 1)),
    );
    const blur = clamp(bg.blur, 0, 30);
    this.layer.style.setProperty('--bg-overlay-blur', `${blur}px`);
    // blur=0 时不设置 backdrop-filter（避免常驻 backdrop root 合成层拖慢整页渲染）
    if (blur > 0) {
      this.layer.style.setProperty('--bg-overlay-blur-enabled', '1');
    } else {
      this.layer.style.removeProperty('--bg-overlay-blur-enabled');
    }
  }

  private stopVideo(): void {
    this.videoEl.pause();
    this.videoEl.removeAttribute('src');
    this.videoEl.hidden = true;
  }

  /**
   * 获取并应用必应每日壁纸：
   *   - 依次请求镜像链（cn.bing.com → www.bing.com → 用户镜像 → 兜底镜像）；
   *   - 成功后写入 store（mode='bing' + bingUrl 缓存），刷新后无需重新请求；
   *   - 全部失败时回调 onError 并返回 false。
   */
  refreshBing(): Promise<boolean> {
    // 并发保护：进行中时复用同一请求，避免重复触发
    if (this.bingPromise !== null) return this.bingPromise;
    this.bingPromise = this.doRefreshBing().finally(() => {
      this.bingPromise = null;
    });
    return this.bingPromise;
  }

  private async doRefreshBing(): Promise<boolean> {
    try {
      const mirrors = buildBingMirrors(get().background.bingMirror);
      const url = await fetchBingWallpaper({
        mirrors,
        verifyImage: verifyImageLoadable,
      });
      set({ background: { mode: 'bing', bingUrl: url } });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('bg.bingFailed');
      this.onError?.(message);
      return false;
    }
  }

  /** 销毁：取消订阅 */
  destroy(): void {
    this.unsub();
  }

  /** 对外 API（调试 / 自动化验证） */
  expose(): BackgroundApi {
    return {
      get: () => get().background,
      set: (patch) => set({ background: patch }),
      setMode: (mode) => set({ background: { mode } }),
      setColor: (color) => set({ background: { mode: 'color', color } }),
      setImage: (dataUrl) => set({ background: { mode: 'image', image: dataUrl } }),
      setUrl: (url) => set({ background: { mode: 'url', url } }),
      setVideo: (url) => set({ background: { mode: 'video', video: url } }),
      setBingUrl: (url) => set({ background: { mode: 'bing', bingUrl: url } }),
      fetchBing: (options) => fetchBingWallpaper(options),
      applyBing: () => this.refreshBing(),
      layer: () => this.layer,
      overlay: () => this.overlayEl,
      image: () => this.imageEl,
      video: () => this.videoEl,
    };
  }
}

/** 数值夹取 */
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
