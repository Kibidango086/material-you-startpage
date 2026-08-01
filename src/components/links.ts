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
 * 常用链接组件（Sprint 4）。
 *
 * 能力：
 *   - 默认 5 个链接卡片（百度翻译/哔哩哔哩/知乎/网易云音乐/GitHub）以 CSS grid 自适应展示；
 *   - 点击卡片新标签页打开对应站点；
 *   - favicon 使用 google s2 favicons 服务，加载失败回退为「首字母彩色头像」；
 *   - mdui-dialog 表单支持添加 / 编辑 / 删除链接（标题 + URL + 图标 + 所属分组）；
 *   - 分组模型：创建 / 重命名 / 删除分组、链接归属分组；
 *     「分组开关」默认关闭，开启后顶部显示 mdui-chip 分组切换（全部 / 各分组）；
 *   - 表单校验：URL 为空或非 URL 时拦截并 snackbar 提示；无协议自动补 https://；
 *   - 数据全部落 localStorage（经类型化 store），刷新后恢复。
 */
import '@mdui/icons/add.js';
import '@mdui/icons/edit.js';
import '@mdui/icons/delete.js';
import '@mdui/icons/create-new-folder.js';
import '@mdui/icons/manage-accounts.js';

import { prompt } from 'mdui/functions/prompt.js';
import { snackbar } from 'mdui/functions/snackbar.js';
import { t } from '../i18n';
import type { Dialog, Select, Switch, TextField } from 'mdui';

import { get, set, subscribe } from '../storage/store';
import type { LinkGroup, LinkItem, LinksSettings } from '../storage/types';
import { normalizeUrl } from '../utils/url';

/* ───────────────────────── 工具 ───────────────────────── */

/** 回退头像配色板（Material 3 参考色板） */
const AVATAR_COLORS = [
  '#6750a4',
  '#006a6a',
  '#006e0e',
  '#7d5260',
  '#00639b',
  '#9a4574',
  '#616200',
  '#8c4a1f',
  '#00696d',
  '#006d3b',
  '#4a5c92',
  '#a0376b',
  '#386a20',
] as const;

/** 文本 → 稳定颜色索引（同标题永远同色） */
function colorIndex(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % AVATAR_COLORS.length;
}

/** 生成唯一 id（优先 crypto.randomUUID，低版本浏览器回退） */
function uid(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${rand}`;
}

/**
 * 校验并规范化链接 URL：
 *   - 空 / 非 URL → null；
 *   - 无协议（example.com / localhost / IP）→ 自动补 https://；
 *   - 显式协议 → 原样返回。
 * 与 omnibox 共用 normalizeUrl，额外保证解析后存在真实主机名（拦截 https:// 之类空 host）。
 */
export function validateLinkUrl(input: string): string | null {
  const value = input.trim();
  if (value === '') return null;
  const normalized = normalizeUrl(value);
  if (normalized === null) return null;
  // 协议后必须紧跟主机名（拦截 https:// 或 https:///path 这类空 host 输入）
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/\s]/.test(normalized)) return null;
  try {
    const parsed = new URL(normalized);
    if (parsed.hostname === '') return null;
  } catch {
    return null;
  }
  return normalized;
}

/** google s2 favicons 服务地址（失败时由卡片回退为首字母头像） */
function faviconUrl(url: string): string {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
      host,
    )}&sz=64`;
  } catch {
    return '';
  }
}

/** 标题首字符（用于回退头像） */
function firstChar(title: string): string {
  const text = title.trim();
  if (text === '') return '?';
  const first = Array.from(text)[0];
  return first === undefined ? '?' : first.toUpperCase();
}

/** 链接对话框中的分组选中值（mdui-select 兼容字符串/数组两种形态） */
function readSelectValue(select: Select): string {
  const value = select.value;
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/** 对外暴露的编程式 API（调试 / 自动化验证钩子） */
export interface LinksApi {
  get: () => LinksSettings;
  /** 校验 + 添加链接；失败返回 null */
  add: (input: { title: string; url: string; icon?: string; group?: string }) => LinkItem | null;
  /** 校验 + 更新链接；失败返回 false */
  update: (
    id: string,
    patch: { title?: string; url?: string; icon?: string; group?: string },
  ) => boolean;
  /** 删除链接；不存在返回 false */
  remove: (id: string) => boolean;
  /** 创建分组；重名 / 空名返回 null */
  addGroup: (name: string) => LinkGroup | null;
  /** 重命名分组；失败返回 false */
  renameGroup: (id: string, name: string) => boolean;
  /** 删除分组（组内链接移回无分组）；不存在返回 false */
  removeGroup: (id: string) => boolean;
  /** 设置当前分组筛选（'' = 全部） */
  setActiveGroup: (id: string) => void;
  /** 分组开关（开启后顶部显示分组 chip） */
  setGroupsEnabled: (enabled: boolean) => void;
  /** URL 校验工具（供自动化验证） */
  validateUrl: (input: string) => string | null;
}

/* ───────────────────────── 模板 ───────────────────────── */

function template(): string {
  return `
  <section class="links" aria-label="${t('links.sectionLabel')}">
    <div class="links__header">
      <h2 class="links__title">${t('links.sectionLabel')}</h2>
      <div class="links__header-actions">
        <div class="links__group-toggle">
          <span class="links__group-toggle-label">${t('links.groupToggle')}</span>
          <mdui-switch data-links-group-switch aria-label="${t('links.groupToggle')}"></mdui-switch>
        </div>
        <mdui-button
          variant="tonal"
          class="links__add-btn"
          data-links-add
          aria-label="${t('links.addLink')}"
        >
          <mdui-icon-add slot="icon"></mdui-icon-add>
          ${t('links.add')}
        </mdui-button>
      </div>
    </div>

    <div class="links__chips" data-links-chips hidden></div>

    <div class="links-grid" data-links-grid></div>
  </section>

  <!-- 添加 / 编辑链接对话框（标题 + URL + 图标 + 分组） -->
  <mdui-dialog
    class="links-dialog"
    data-links-dialog
    headline="${t('links.addLink')}"
    close-on-esc
    close-on-overlay-click
  >
    <div class="links-dialog__body">
      <mdui-text-field
        data-links-field-title
        label="${t('links.titleField')}"
        required
        placeholder="${t('links.titlePlaceholder')}"
      ></mdui-text-field>
      <mdui-text-field
        data-links-field-url
        label="URL"
        required
        placeholder="${t('links.urlPlaceholder')}"
      ></mdui-text-field>
      <mdui-text-field
        data-links-field-icon
        label="${t('links.iconField')}"
        placeholder="${t('links.iconPlaceholder')}"
      ></mdui-text-field>
      <mdui-select data-links-field-group label="${t('links.groupField')}" placeholder="${t('links.noGroup')}">
        <mdui-menu-item value="">${t('links.noGroup')}</mdui-menu-item>
      </mdui-select>
    </div>
    <div slot="action" class="links-dialog__actions">
      <mdui-button
        data-links-dialog-delete
        class="links-dialog__delete"
        variant="text"
        hidden
        >${t('common.delete')}</mdui-button
      >
      <mdui-button data-links-dialog-cancel variant="text">${t('common.cancel')}</mdui-button>
      <mdui-button data-links-dialog-save variant="tonal">${t('common.save')}</mdui-button>
    </div>
  </mdui-dialog>

  <!-- 管理分组对话框（新建 / 重命名 / 删除） -->
  <mdui-dialog
    class="links-groups-dialog"
    data-links-groups-dialog
    headline="${t('links.manageGroups')}"
    close-on-esc
    close-on-overlay-click
  >
    <div class="links-groups-dialog__create">
      <mdui-text-field
        data-links-group-name
        label="${t('links.groupNameField')}"
        placeholder="${t('links.groupNamePlaceholder')}"
      ></mdui-text-field>
      <mdui-button variant="tonal" data-links-group-add>
        <mdui-icon-add slot="icon"></mdui-icon-add>
        添加
      </mdui-button>
    </div>
    <div class="links-groups-dialog__list" data-links-group-list></div>
    <div slot="action" class="links-groups-dialog__actions">
      <mdui-button data-links-groups-dialog-close variant="text">${t('common.close')}</mdui-button>
    </div>
  </mdui-dialog>
`;
}

/* ───────────────────────── 组件 ───────────────────────── */

export class Links {
  readonly root: HTMLElement;

  private readonly grid: HTMLElement;
  private readonly chipsEl: HTMLElement;
  private readonly groupSwitch: Switch;
  private readonly addButton: HTMLElement;

  private readonly dialog: Dialog;
  private readonly titleField: TextField;
  private readonly urlField: TextField;
  private readonly iconField: TextField;
  private readonly groupSelect: Select;
  private readonly dialogSave: HTMLElement;
  private readonly dialogCancel: HTMLElement;
  private readonly dialogDelete: HTMLElement;

  private readonly groupsDialog: Dialog;
  private readonly groupNameField: TextField;
  private readonly groupList: HTMLElement;
  private readonly groupsDialogAdd: HTMLElement;
  private readonly groupsDialogClose: HTMLElement;

  /** 当前编辑中的链接 id（null = 新增） */
  private editingId: string | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    root.classList.add('links');
    root.innerHTML = template();

    const q = <T extends Element>(selector: string): T => {
      const el = root.querySelector<T>(selector);
      if (el === null) throw new Error(`[links] 初始化失败：缺少 ${selector}`);
      return el;
    };

    this.grid = q<HTMLElement>('[data-links-grid]');
    this.chipsEl = q<HTMLElement>('[data-links-chips]');
    this.groupSwitch = q<Switch>('[data-links-group-switch]');
    this.addButton = q<HTMLElement>('[data-links-add]');

    this.dialog = q<Dialog>('[data-links-dialog]');
    this.titleField = q<TextField>('[data-links-field-title]');
    this.urlField = q<TextField>('[data-links-field-url]');
    this.iconField = q<TextField>('[data-links-field-icon]');
    this.groupSelect = q<Select>('[data-links-field-group]');
    this.dialogSave = q<HTMLElement>('[data-links-dialog-save]');
    this.dialogCancel = q<HTMLElement>('[data-links-dialog-cancel]');
    this.dialogDelete = q<HTMLElement>('[data-links-dialog-delete]');

    this.groupsDialog = q<Dialog>('[data-links-groups-dialog]');
    this.groupNameField = q<TextField>('[data-links-group-name]');
    this.groupList = q<HTMLElement>('[data-links-group-list]');
    this.groupsDialogAdd = q<HTMLElement>('[data-links-group-add]');
    this.groupsDialogClose = q<HTMLElement>('[data-links-groups-dialog-close]');

    this.wire();
    this.syncFromStore();
    subscribe(() => this.syncFromStore());
  }

  // ─────────────── 公共 API（调试 / 自动化验证） ───────────────

  expose(): LinksApi {
    return {
      get: () => get().links,
      add: (input) => this.addLink(input),
      update: (id, patch) => this.updateLink(id, patch),
      remove: (id) => this.removeLink(id),
      addGroup: (name) => this.addGroup(name),
      renameGroup: (id, name) => this.renameGroupTo(id, name),
      removeGroup: (id) => this.removeGroup(id),
      setActiveGroup: (id) => this.selectGroup(id),
      setGroupsEnabled: (enabled) => this.setGroupsEnabled(enabled),
      validateUrl: validateLinkUrl,
    };
  }

  // ─────────────── 事件装配 ───────────────

  private wire(): void {
    this.addButton.addEventListener('click', () => this.openAddDialog());

    // 分组开关：开启后顶部显示 mdui-chip 分组切换
    this.groupSwitch.addEventListener('change', () => {
      set({ appearance: { showGroups: this.groupSwitch.checked } });
    });

    this.dialogSave.addEventListener('click', () => this.onSave());
    this.dialogCancel.addEventListener('click', () => {
      this.dialog.open = false;
    });
    this.dialogDelete.addEventListener('click', () => {
      if (this.editingId !== null) {
        this.removeLink(this.editingId);
        this.dialog.open = false;
      }
    });

    this.groupsDialogAdd.addEventListener('click', () =>
      this.onAddGroupFromDialog(),
    );
    this.groupsDialogClose.addEventListener('click', () => {
      this.groupsDialog.open = false;
    });
    this.groupNameField.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.onAddGroupFromDialog();
      }
    });
  }

  // ─────────────── 渲染 ───────────────

  /** 以 store 为准同步所有 UI 区域 */
  private syncFromStore(): void {
    this.groupSwitch.checked = get().appearance.showGroups;
    this.renderChips();
    this.renderGrid();
    this.rebuildGroupSelect();
    this.renderGroupList();
  }

  /** 顶部分组 chip 行（分组开关关闭时隐藏） */
  private renderChips(): void {
    const container = this.chipsEl;
    container.innerHTML = '';
    if (!get().appearance.showGroups) {
      container.hidden = true;
      return;
    }
    container.hidden = false;

    const settings = get();
    const active = settings.links.defaultGroup;

    container.appendChild(
      this.createFilterChip('全部', '', active === ''),
    );
    for (const group of settings.links.groups) {
      container.appendChild(
        this.createFilterChip(group.name, group.id, active === group.id),
      );
    }
    container.appendChild(
      this.createActionChip(t('links.newGroup'), 'create-new-folder', () =>
        void this.promptCreateGroup(),
      ),
    );
    container.appendChild(
      this.createActionChip('管理', 'manage-accounts', () => {
        this.groupsDialog.open = true;
        this.renderGroupList();
      }),
    );
  }

  /** 分组筛选 chip（filter 变体，单选） */
  private createFilterChip(
    text: string,
    groupId: string,
    selected: boolean,
  ): HTMLElement {
    const chip = document.createElement('mdui-chip');
    chip.variant = 'filter';
    chip.selectable = true;
    chip.selected = selected;
    chip.dataset.group = groupId;
    chip.dataset.role = 'group-filter';
    chip.textContent = text;
    chip.addEventListener('change', () => this.selectGroup(groupId));
    return chip;
  }

  /** 动作 chip（assist 变体：新建分组 / 管理） */
  private createActionChip(
    text: string,
    iconName: string,
    onClick: () => void,
  ): HTMLElement {
    const chip = document.createElement('mdui-chip');
    chip.variant = 'assist';
    chip.dataset.role = 'group-action';
    chip.textContent = text;
    const icon = document.createElement(`mdui-icon-${iconName}`);
    icon.setAttribute('slot', 'icon');
    chip.appendChild(icon);
    chip.addEventListener('click', onClick);
    return chip;
  }

  /** 链接卡片网格（CSS grid auto-fill/minmax 自适应列数） */
  private renderGrid(): void {
    const settings = get();
    let links = [...settings.links.links];
    if (settings.appearance.showGroups) {
      const active = settings.links.defaultGroup;
      if (active !== '') {
        links = links.filter((link) => link.group === active);
      }
    }

    const grid = this.grid;
    grid.innerHTML = '';

    if (links.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'links-grid__empty';
      empty.textContent = `${t('links.noLinks')} — ${t('links.addHint')}`;
      grid.appendChild(empty);
      return;
    }

    for (const link of links) {
      grid.appendChild(this.createCard(link));
    }
  }

  /** 单个链接卡片：favicon（或回退首字母头像）+ 标题 + 悬停编辑/删除 */
  private createCard(link: LinkItem): HTMLElement {
    const card = document.createElement('mdui-card');
    card.variant = 'elevated';
    card.classList.add('link-card');
    card.dataset.linkId = link.id;
    card.dataset.linkCard = '';

    // 图标区：底层首字母彩色头像，上层 favicon（失败时移除露出回退头像）
    const iconBox = document.createElement('div');
    iconBox.className = 'link-card__icon';

    const fallback = document.createElement('span');
    fallback.className = 'link-card__fallback';
    fallback.textContent = firstChar(link.title);
    fallback.style.backgroundColor = AVATAR_COLORS[colorIndex(link.title)];
    iconBox.appendChild(fallback);

    const customIcon = (link.icon ?? '').trim();
    const source = customIcon !== '' ? customIcon : faviconUrl(link.url);
    if (source !== '') {
      const img = document.createElement('img');
      img.className = 'link-card__favicon';
      img.src = source;
      img.alt = '';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => img.remove());
      iconBox.appendChild(img);
    }

    const title = document.createElement('span');
    title.className = 'link-card__title';
    title.textContent = link.title;
    title.title = link.title;

    card.append(iconBox, title);

    // 分组归属徽标：卡片上直接显示所属分组名（面板分组管理与之实时同步）
    if (link.group !== '') {
      const groupName = get().links.groups.find(
        (g) => g.id === link.group,
      )?.name;
      if (groupName !== undefined && groupName !== '') {
        const badge = document.createElement('span');
        badge.className = 'link-card__group';
        badge.textContent = groupName;
        badge.title = `分组：${groupName}`;
        card.appendChild(badge);
      }
    }

    // 整卡点击 → 新标签页打开
    card.addEventListener('click', () => {
      this.openLink(link);
    });

    return card;
  }

  private createIconButton(
    iconName: string,
    label: string,
    onClick: () => void,
    action: 'edit' | 'delete',
  ): HTMLElement {
    const button = document.createElement('mdui-button-icon');
    button.variant = 'standard';
    button.classList.add('link-card__action-btn');
    button.dataset.action = action;
    button.setAttribute('aria-label', label);
    const icon = document.createElement(`mdui-icon-${iconName}`);
    button.appendChild(icon);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  // ─────────────── 打开链接 ───────────────

  /** 新标签页打开站点 */
  private openLink(link: LinkItem): void {
    if (get().links.openInNewTab) {
      const anchor = document.createElement('a');
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.click();
    } else {
      window.location.assign(link.url);
    }
  }

  // ─────────────── 添加 / 编辑对话框 ───────────────

  private openAddDialog(): void {
    this.editingId = null;
    this.dialog.headline = t('links.addLink');
    this.dialogDelete.hidden = true;
    this.titleField.value = '';
    this.urlField.value = '';
    this.iconField.value = '';
    this.rebuildGroupSelect();
    this.groupSelect.value = '';
    this.dialog.open = true;
    requestAnimationFrame(() => {
      try {
        this.titleField.focus();
      } catch {
        // 聚焦失败不阻塞
      }
    });
  }

  /** 重建分组下拉选项（保留「无分组」） */
  private rebuildGroupSelect(): void {
    const select = this.groupSelect;
    select.innerHTML = `<mdui-menu-item value="">${t('links.noGroup')}</mdui-menu-item>`;
    for (const group of get().links.groups) {
      const item = document.createElement('mdui-menu-item');
      item.value = group.id;
      item.textContent = group.name;
      select.appendChild(item);
    }
  }

  /** 保存：校验（标题必填 + URL 校验/自动补 https）+ 写 store */
  private onSave(): void {
    const title = this.titleField.value.trim();
    const urlRaw = this.urlField.value.trim();
    const icon = this.iconField.value.trim();

    if (title === '') {
      this.showSnackbar(t('links.enterTitle'));
      return;
    }
    const url = validateLinkUrl(urlRaw);
    if (url === null) {
      this.showSnackbar(urlRaw === '' ? t('links.enterUrl') : t('links.badUrl'));
      return;
    }

    const settings = get();
    const group = readSelectValue(this.groupSelect);
    const iconValue = icon !== '' ? icon : undefined;

    if (this.editingId !== null) {
      if (!settings.links.links.some((item) => item.id === this.editingId)) {
        this.showSnackbar(t('links.notFound'));
        return;
      }
      set({
        links: {
          links: settings.links.links.map((item) =>
            item.id === this.editingId
              ? { ...item, title, url, group, icon: iconValue }
              : item,
          ),
        },
      });
      this.showSnackbar(t('links.updated'));
    } else {
      const newLink: LinkItem = {
        id: uid('link'),
        title,
        url,
        group,
        icon: iconValue,
      };
      set({ links: { links: [...settings.links.links, newLink] } });
      this.showSnackbar(t('links.added'));
    }
    this.dialog.open = false;
  }

  // ─────────────── 链接增删改（含编程式 API） ───────────────

  private addLink(input: {
    title: string;
    url: string;
    icon?: string;
    group?: string;
  }): LinkItem | null {
    const title = input.title.trim();
    if (title === '') return null;
    const url = validateLinkUrl(input.url);
    if (url === null) return null;

    const settings = get();
    const group =
      input.group !== undefined &&
      settings.links.groups.some((g) => g.id === input.group)
        ? input.group
        : '';
    const iconValue = (input.icon ?? '').trim();
    const link: LinkItem = {
      id: uid('link'),
      title,
      url,
      group,
      icon: iconValue !== '' ? iconValue : undefined,
    };
    set({ links: { links: [...settings.links.links, link] } });
    return link;
  }

  private updateLink(
    id: string,
    patch: { title?: string; url?: string; icon?: string; group?: string },
  ): boolean {
    const settings = get();
    const target = settings.links.links.find((item) => item.id === id);
    if (target === undefined) return false;

    const nextTitle = patch.title !== undefined ? patch.title.trim() : target.title;
    if (nextTitle === '') return false;

    const nextUrl = patch.url !== undefined ? validateLinkUrl(patch.url) : target.url;
    if (nextUrl === null) return false;

    let nextGroup = target.group;
    if (patch.group !== undefined) {
      nextGroup =
        patch.group === '' || settings.links.groups.some((g) => g.id === patch.group)
          ? patch.group
          : target.group;
    }

    let nextIcon = target.icon;
    if (patch.icon !== undefined) {
      const iconValue = patch.icon.trim();
      nextIcon = iconValue !== '' ? iconValue : undefined;
    }

    set({
      links: {
        links: settings.links.links.map((item) =>
          item.id === id
            ? {
                ...item,
                title: nextTitle,
                url: nextUrl,
                group: nextGroup,
                icon: nextIcon,
              }
            : item,
        ),
      },
    });
    return true;
  }

  private removeLink(id: string): boolean {
    const settings = get();
    const next = settings.links.links.filter((item) => item.id !== id);
    if (next.length === settings.links.links.length) return false;
    set({ links: { links: next } });
    this.showSnackbar(t('links.deleted'));
    return true;
  }

  // ─────────────── 分组管理 ───────────────

  private async promptCreateGroup(): Promise<void> {
    try {
      const name = await prompt({
        headline: t('links.newGroup'),
        description: t('links.groupNamePlaceholder'),
        confirmText: t('links.create'),
        cancelText: t('common.cancel'),
        textFieldOptions: { label: t('links.groupNameField'), required: true },
        validator: (value) => value.trim() !== '' || t('links.enterGroupName'),
      });
      this.addGroup(name);
    } catch {
      // 用户取消
    }
  }

  private addGroup(nameInput: string): LinkGroup | null {
    const name = nameInput.trim();
    if (name === '') return null;
    const settings = get();
    if (settings.links.groups.some((g) => g.name === name)) {
      this.showSnackbar(t('links.groupExists', { name }));
      return null;
    }
    const group: LinkGroup = { id: uid('group'), name };
    set({ links: { groups: [...settings.links.groups, group] } });
    this.showSnackbar(t('links.groupCreated', { name }));
    return group;
  }

  private promptRenameGroup(id: string, currentName: string): void {
    void (async () => {
      try {
        const name = await prompt({
          headline: t('links.renameGroup'),
          description: `原名称：${currentName}`,
          confirmText: '保存',
          cancelText: t('common.cancel'),
          textFieldOptions: {
            label: t('links.groupNameField'),
            value: currentName,
            required: true,
          },
          validator: (value) => value.trim() !== '' || t('links.enterGroupName'),
        });
        this.renameGroupTo(id, name);
      } catch {
        // 用户取消
      }
    })();
  }

  private renameGroupTo(id: string, nameInput: string): boolean {
    const name = nameInput.trim();
    if (name === '') return false;
    const settings = get();
    if (settings.links.groups.some((g) => g.id !== id && g.name === name)) {
      this.showSnackbar(t('links.groupExists', { name }));
      return false;
    }
    let found = false;
    const groups = settings.links.groups.map((g) => {
      if (g.id === id) {
        found = true;
        return { ...g, name };
      }
      return g;
    });
    if (!found) return false;
    set({ links: { groups } });
    this.showSnackbar(t('links.groupRenamed'));
    return true;
  }

  private removeGroup(id: string): boolean {
    const settings = get();
    if (!settings.links.groups.some((g) => g.id === id)) return false;
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
    this.showSnackbar(t('links.groupDeleted'));
    return true;
  }

  /** 点击分组 chip：切换筛选（'' = 全部）并持久化 */
  private selectGroup(groupId: string): void {
    if (get().links.defaultGroup === groupId) return;
    set({ links: { defaultGroup: groupId } });
  }

  private setGroupsEnabled(enabled: boolean): void {
    set({ appearance: { showGroups: enabled } });
  }

  // ─────────────── 管理分组对话框 ───────────────

  private onAddGroupFromDialog(): void {
    const name = this.groupNameField.value;
    this.addGroup(name);
    this.groupNameField.value = '';
    try {
      this.groupNameField.focus();
    } catch {
      // 忽略
    }
  }

  /** 渲染分组管理列表（重命名 / 删除按钮） */
  private renderGroupList(): void {
    const list = this.groupList;
    list.innerHTML = '';
    const groups = get().links.groups;

    if (groups.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'links-groups-dialog__empty';
      empty.textContent = t('links.noGroupsPanel');
      list.appendChild(empty);
      return;
    }

    for (const group of groups) {
      const row = document.createElement('div');
      row.className = 'links-groups-dialog__row';
      row.dataset.groupId = group.id;

      const name = document.createElement('span');
      name.className = 'links-groups-dialog__row-name';
      name.textContent = group.name;
      name.title = group.name;

      const actions = document.createElement('div');
      actions.className = 'links-groups-dialog__row-actions';
      const renameBtn = this.createIconButton('edit', '重命名分组', () => {
        this.promptRenameGroup(group.id, group.name);
      }, 'edit');
      const deleteBtn = this.createIconButton('delete', t('links.deleteGroup'), () => {
        this.removeGroup(group.id);
      }, 'delete');
      actions.append(renameBtn, deleteBtn);

      row.append(name, actions);
      list.appendChild(row);
    }
  }

  // ─────────────── 提示 ───────────────

  private showSnackbar(message: string): void {
    snackbar({ message, autoCloseDelay: 2500 });
  }
}
