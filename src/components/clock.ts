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
 * 时钟组件。
 *
 * 支持两种样式（外观设置里切换）：
 *   - digital：大号数字时钟 + 中文日期；
 *   - analog：Material 风格的拟物表盘（SVG 圆盘 + 12 刻度 + 时分秒针）。
 *
 * 每秒刷新一次。样式切换通过根节点 data-style 属性驱动（CSS 控制显隐）。
 */
import { formatChineseDate, formatTime } from '../core/greeting';
import { get } from '../storage/store';

/** 每秒刷新间隔（毫秒） */
const TICK_MS = 1000;

/** 拟物表盘 SVG 模板（指针由 CSS 变量驱动旋转，避免整帧重建 DOM） */
const ANALOG_SVG = `
  <svg class="clock__analog-svg" viewBox="0 0 100 100" role="img" aria-label="时钟">
    <!-- 表盘：太阳光芒轮廓（填充表面色） -->
    <path class="clock__analog-face" d="M46.6 0.8 L39.2 4.2 L36.6 5 L28.2 5.8 C26.1 5.8 24 6.9 22.4 8.9 L17.6 15.8 C17.1 16.6 16.5 17.1 15.7 17.6 L8.9 22.4 C6.9 23.9 5.8 26 5.8 28.2 L5 36.6 L4.2 39.2 L0.8 46.6 C-0.3 48.7 -0.3 51.3 0.8 53.4 L4.2 60.8 L5 63.4 L5.8 71.8 C5.8 73.9 6.9 76 8.9 77.6 L15.8 82.4 C16.6 82.9 17.1 83.5 17.6 84.3 L22.4 91.1 C23.9 93.1 26 94.2 28.2 94.2 L36.6 95 L39.2 95.8 L46.6 99.2 C48.7 100.3 51.3 100.3 53.4 99.2 L60.8 95.8 L63.4 95 L71.8 94.2 C73.9 94.2 76 93.1 77.6 91.1 L82.4 84.3 C82.9 83.5 83.5 82.9 84.3 82.4 L91.1 77.6 C93.1 76.1 94.2 74 94.2 71.8 L95 63.4 L95.8 60.8 L99.2 53.4 C100.3 51.3 100.3 48.7 99.2 46.6 L95.8 39.2 L95 36.6 L94.2 28.2 C94.2 26 93.1 23.9 91.1 22.4 L84.3 17.6 C83.5 17.1 82.9 16.6 82.4 15.8 L77.6 8.9 C76 6.9 73.9 5.8 71.8 5.8 L63.4 5 L60.8 4.2 L53.4 0.8 C51.3 -0.3 48.7 -0.3 46.6 0.8 Z"></path>
    <!-- 时针：圆角胶囊（secondary） -->
    <g class="clock__hand clock__hand--hour" style="--hand-angle: 0deg">
      <rect x="45.8" y="25.3" width="8.4" height="28.9" rx="4.2" ry="4.2"></rect>
    </g>
    <!-- 分针：圆角胶囊（primary） -->
    <g class="clock__hand clock__hand--minute" style="--hand-angle: 0deg">
      <rect x="45.8" y="15.8" width="8.4" height="38.4" rx="4.2" ry="4.2"></rect>
    </g>
    <!-- 秒针：圆点（tertiary），位于 12 点方向 -->
    <g class="clock__hand clock__hand--second" style="--hand-angle: 0deg">
      <circle cx="50" cy="10.3" r="4.7"></circle>
    </g>
  </svg>
`;

export class Clock {
  private readonly root: HTMLElement;
  private readonly timeEl: HTMLElement;
  private readonly dateEl: HTMLElement;
  private readonly hourHand: HTMLElement;
  private readonly minuteHand: HTMLElement;
  private readonly secondHand: HTMLElement;
  private timerId: number | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    root.classList.add('clock');
    root.innerHTML = `
      <div class="clock__time" data-clock-time role="timer" aria-label="当前时间">--:--:--</div>
      <div class="clock__analog" data-clock-analog>${ANALOG_SVG}</div>
      <div class="clock__date" data-clock-date></div>
    `;

    const timeEl = root.querySelector<HTMLElement>('[data-clock-time]');
    const dateEl = root.querySelector<HTMLElement>('[data-clock-date]');
    const analog = root.querySelector<HTMLElement>('[data-clock-analog]');
    const hourHand = root.querySelector<HTMLElement>('.clock__hand--hour');
    const minuteHand = root.querySelector<HTMLElement>('.clock__hand--minute');
    const secondHand = root.querySelector<HTMLElement>('.clock__hand--second');
    if (
      timeEl === null ||
      dateEl === null ||
      analog === null ||
      hourHand === null ||
      minuteHand === null ||
      secondHand === null
    ) {
      throw new Error('[clock] 缺少渲染目标元素');
    }
    this.timeEl = timeEl;
    this.dateEl = dateEl;
    this.hourHand = hourHand;
    this.minuteHand = minuteHand;
    this.secondHand = secondHand;
    this.applyStyle();
  }

  /** 按当前设置应用时钟样式（digital / analog） */
  applyStyle(): void {
    const style = get().appearance.clockStyle;
    this.root.dataset.style = style;
  }

  /** 用给定时间渲染一次（默认当前时间） */
  render(now: Date = new Date()): void {
    this.timeEl.textContent = formatTime(now);
    this.dateEl.textContent = formatChineseDate(now);

    const h = now.getHours() % 12;
    const m = now.getMinutes();
    const sec = now.getSeconds();
    // 时针含分针偏移，秒针含毫秒级平滑（可感知的连续转动）
    const hourDeg = (h + m / 60) * 30;
    const minuteDeg = (m + sec / 60) * 6;
    const secondDeg = sec * 6;
    this.hourHand.style.setProperty('--hand-angle', `${hourDeg}deg`);
    this.minuteHand.style.setProperty('--hand-angle', `${minuteDeg}deg`);
    this.secondHand.style.setProperty('--hand-angle', `${secondDeg}deg`);
  }

  /** 立即渲染并开始每秒刷新 */
  start(): void {
    this.render();
    this.stop();
    this.timerId = window.setInterval(() => this.render(), TICK_MS);
  }

  /** 停止刷新 */
  stop(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
