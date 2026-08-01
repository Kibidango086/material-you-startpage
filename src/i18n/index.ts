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
 * 轻量 i18n 模块。
 *
 * 支持 简体中文 / 繁體中文 / English / 日本語 四种语言。
 * 用法：
 *   import { t, setLang, getLang } from '../i18n';
 *   t('search.placeholder')  // 取当前语言文案
 *
 * 语言切换时通过订阅 store 触发各组件重渲染。
 */

/** 支持的语言 */
export type Lang = 'zh-CN' | 'zh-TW' | 'en' | 'ja';

/** 文案 key → 各语言文本 */
type Dict = Record<string, Record<Lang, string>>;

const dict: Dict = {
  // ── 通用 ──
  'common.close': {
    'zh-CN': '关闭',
    'zh-TW': '關閉',
    en: 'Close',
    ja: '閉じる',
  },
  'common.cancel': {
    'zh-CN': '取消',
    'zh-TW': '取消',
    en: 'Cancel',
    ja: 'キャンセル',
  },
  'common.save': {
    'zh-CN': '保存',
    'zh-TW': '儲存',
    en: 'Save',
    ja: '保存',
  },
  'common.delete': {
    'zh-CN': '删除',
    'zh-TW': '刪除',
    en: 'Delete',
    ja: '削除',
  },
  'common.add': {
    'zh-CN': '添加',
    'zh-TW': '新增',
    en: 'Add',
    ja: '追加',
  },
  'common.edit': {
    'zh-CN': '编辑',
    'zh-TW': '編輯',
    en: 'Edit',
    ja: '編集',
  },
  'common.rename': {
    'zh-CN': '重命名',
    'zh-TW': '重新命名',
    en: 'Rename',
    ja: '名前を変更',
  },
  'common.loading': {
    'zh-CN': '正在加载…',
    'zh-TW': '正在載入…',
    en: 'Loading…',
    ja: '読み込み中…',
  },
  'common.clickToRefresh': {
    'zh-CN': '点击刷新',
    'zh-TW': '點擊重新整理',
    en: 'Click to refresh',
    ja: 'クリックで更新',
  },
  'common.copied': {
    'zh-CN': '已复制',
    'zh-TW': '已複製',
    en: 'Copied',
    ja: 'コピーしました',
  },

  // ── 问候 ──
  'greeting.morning': {
    'zh-CN': '早上好',
    'zh-TW': '早安',
    en: 'Good morning',
    ja: 'おはようございます',
  },
  'greeting.noon': {
    'zh-CN': '中午好',
    'zh-TW': '午安',
    en: 'Good noon',
    ja: 'こんにちは',
  },
  'greeting.afternoon': {
    'zh-CN': '下午好',
    'zh-TW': '午安',
    en: 'Good afternoon',
    ja: 'こんにちは',
  },
  'greeting.evening': {
    'zh-CN': '晚上好',
    'zh-TW': '晚安',
    en: 'Good evening',
    ja: 'こんばんは',
  },

  // ── 搜索框 ──
  'search.placeholder': {
    'zh-CN': '搜索或输入网址',
    'zh-TW': '搜尋或輸入網址',
    en: 'Search or enter address',
    ja: '検索またはURLを入力',
  },
  'search.switchEngine': {
    'zh-CN': '切换搜索引擎',
    'zh-TW': '切換搜尋引擎',
    en: 'Switch search engine',
    ja: '検索エンジンを切替',
  },
  'search.calcResult': {
    'zh-CN': '计算结果 · 回车/点击填入',
    'zh-TW': '計算結果 · Enter/點擊填入',
    en: 'Result · Enter/click to fill',
    ja: '計算結果 · Enter/クリックで入力',
  },
  'search.calcHint': {
    'zh-CN': '支持 + - * / ^、sqrt()、π 等',
    'zh-TW': '支援 + - * / ^、sqrt()、π 等',
    en: 'Supports + - * / ^, sqrt(), π…',
    ja: '+ - * / ^、sqrt()、π など対応',
  },
  'search.calcFailed': {
    'zh-CN': '无法计算',
    'zh-TW': '無法計算',
    en: 'Cannot calculate',
    ja: '計算できません',
  },
  'search.translateToZh': {
    'zh-CN': '翻译为中文',
    'zh-TW': '翻譯為中文',
    en: 'Translate to English',
    ja: '日本語に翻訳',
  },
  'search.translateToLang': {
    'zh-CN': '翻译为{lang}',
    'zh-TW': '翻譯為{lang}',
    en: 'Translate to {lang}',
    ja: '{lang}に翻訳',
  },
  'search.translateTarget': {
    'zh-CN': '翻译目标语言',
    'zh-TW': '翻譯目標語言',
    en: 'Translation target',
    ja: '翻訳先言語',
  },
  'search.translateSyntaxHint': {
    'zh-CN': '支持 :ja 或 en:zh 前缀指定语言对',
    'zh-TW': '支援 :ja 或 en:zh 前綴指定語言對',
    en: 'Use :ja or en:zh prefix to set language pair',
    ja: ':ja や en:zh の接頭辞で言語ペアを指定できます',
  },
  'search.translateDesc': {
    'zh-CN': 'MyMemory 免费翻译 · 点击查看结果',
    'zh-TW': 'MyMemory 免費翻譯 · 點擊查看結果',
    en: 'MyMemory translation · Click to view',
    ja: 'MyMemory 翻訳 · クリックで表示',
  },
  'search.translating': {
    'zh-CN': '正在翻译…',
    'zh-TW': '正在翻譯…',
    en: 'Translating…',
    ja: '翻訳中…',
  },
  'search.translateResult': {
    'zh-CN': '翻译结果',
    'zh-TW': '翻譯結果',
    en: 'Translation',
    ja: '翻訳結果',
  },
  'search.copyResult': {
    'zh-CN': '点击复制翻译结果',
    'zh-TW': '點擊複製翻譯結果',
    en: 'Click to copy translation',
    ja: 'クリックで翻訳をコピー',
  },
  'search.searchResult': {
    'zh-CN': '用翻译结果搜索',
    'zh-TW': '用翻譯結果搜尋',
    en: 'Search with result',
    ja: '翻訳結果で検索',
  },
  'search.searchIn': {
    'zh-CN': '在「{engine}」中搜索',
    'zh-TW': '在「{engine}」中搜尋',
    en: 'Search in {engine}',
    ja: '「{engine}」で検索',
  },
  'search.translateUnavailable': {
    'zh-CN': '翻译服务暂不可用',
    'zh-TW': '翻譯服務暫時無法使用',
    en: 'Translation service unavailable',
    ja: '翻訳サービスを利用できません',
  },
  'search.checkNetwork': {
    'zh-CN': '请检查网络连接后重试',
    'zh-TW': '請檢查網路連線後重試',
    en: 'Check your connection and retry',
    ja: 'ネットワーク接続を確認してください',
  },

  // ── 链接 ──
  'links.title': {
    'zh-CN': '常用链接',
    'zh-TW': '常用連結',
    en: 'Links',
    ja: 'リンク',
  },
  'links.addLink': {
    'zh-CN': '添加链接',
    'zh-TW': '新增連結',
    en: 'Add link',
    ja: 'リンクを追加',
  },
  'links.editLink': {
    'zh-CN': '编辑链接',
    'zh-TW': '編輯連結',
    en: 'Edit link',
    ja: 'リンクを編集',
  },
  'links.noGroup': {
    'zh-CN': '无分组',
    'zh-TW': '無群組',
    en: 'No group',
    ja: 'グループなし',
  },
  'links.all': {
    'zh-CN': '全部',
    'zh-TW': '全部',
    en: 'All',
    ja: 'すべて',
  },
  'links.groupOf': {
    'zh-CN': '分组：{name}',
    'zh-TW': '群組：{name}',
    en: 'Group: {name}',
    ja: 'グループ：{name}',
  },
  'links.newGroup': {
    'zh-CN': '新分组名称',
    'zh-TW': '新群組名稱',
    en: 'New group name',
    ja: '新しいグループ名',
  },

  // ── 一言 ──
  'says.copyHint': {
    'zh-CN': '点击复制一言',
    'zh-TW': '點擊複製一言',
    en: 'Click to copy quote',
    ja: 'クリックで引用をコピー',
  },
  'says.refresh': {
    'zh-CN': '刷新一言',
    'zh-TW': '重新整理一言',
    en: 'Refresh quote',
    ja: '引用を更新',
  },
  'says.customHint': {
    'zh-CN': '点击在设置中填写自定义文本',
    'zh-TW': '點擊在設定中填寫自訂文字',
    en: 'Click to set custom text in settings',
    ja: '設定でカスタムテキストを入力',
  },
  'says.fetchFailed': {
    'zh-CN': '获取失败',
    'zh-TW': '取得失敗',
    en: 'Failed to fetch',
    ja: '取得に失敗',
  },

  // ── 设置面板 ──
  'settings.tabs.appearance': {
    'zh-CN': '外观',
    'zh-TW': '外觀',
    en: 'Appearance',
    ja: '外観',
  },
  'settings.tabs.background': {
    'zh-CN': '背景',
    'zh-TW': '背景',
    en: 'Background',
    ja: '背景',
  },
  'settings.tabs.search': {
    'zh-CN': '搜索',
    'zh-TW': '搜尋',
    en: 'Search',
    ja: '検索',
  },
  'settings.tabs.links': {
    'zh-CN': '链接',
    'zh-TW': '連結',
    en: 'Links',
    ja: 'リンク',
  },
  'settings.tabs.says': {
    'zh-CN': '一言',
    'zh-TW': '一言',
    en: 'Quote',
    ja: '一言',
  },
  'settings.tabs.about': {
    'zh-CN': '关于',
    'zh-TW': '關於',
    en: 'About',
    ja: 'このアプリについて',
  },
  'settings.theme': {
    'zh-CN': '主题',
    'zh-TW': '主題',
    en: 'Theme',
    ja: 'テーマ',
  },
  'settings.themeHint': {
    'zh-CN': '浅色 / 深色 / 跟随系统',
    'zh-TW': '淺色 / 深色 / 跟隨系統',
    en: 'Light / Dark / System',
    ja: 'ライト / ダーク / システム',
  },
  'settings.themeLight': {
    'zh-CN': '浅色',
    'zh-TW': '淺色',
    en: 'Light',
    ja: 'ライト',
  },
  'settings.themeDark': {
    'zh-CN': '深色',
    'zh-TW': '深色',
    en: 'Dark',
    ja: 'ダーク',
  },
  'settings.themeAuto': {
    'zh-CN': '跟随系统',
    'zh-TW': '跟隨系統',
    en: 'System',
    ja: 'システム',
  },
  'settings.seedColor': {
    'zh-CN': '配色种子',
    'zh-TW': '配色種子',
    en: 'Seed color',
    ja: 'シードカラー',
  },
  'settings.seedColorHint': {
    'zh-CN': 'Material You 动态配色',
    'zh-TW': 'Material You 動態配色',
    en: 'Material You dynamic color',
    ja: 'Material You ダイナミックカラー',
  },
  'settings.custom': {
    'zh-CN': '自定义',
    'zh-TW': '自訂',
    en: 'Custom',
    ja: 'カスタム',
  },
  'settings.showClock': {
    'zh-CN': '显示时钟',
    'zh-TW': '顯示時鐘',
    en: 'Show clock',
    ja: '時計を表示',
  },
  'settings.showDate': {
    'zh-CN': '显示日期',
    'zh-TW': '顯示日期',
    en: 'Show date',
    ja: '日付を表示',
  },
  'settings.showDateHint': {
    'zh-CN': '时钟下方的日期',
    'zh-TW': '時鐘下方的日期',
    en: 'Date below the clock',
    ja: '時計の下の日付',
  },
  'settings.clockStyle': {
    'zh-CN': '时钟样式',
    'zh-TW': '時鐘樣式',
    en: 'Clock style',
    ja: '時計スタイル',
  },
  'settings.clockStyleHint': {
    'zh-CN': '数字 / 表盘',
    'zh-TW': '數字 / 錶盤',
    en: 'Digital / Dial',
    ja: 'デジタル / 文字盤',
  },
  'settings.clockDigital': {
    'zh-CN': '数字',
    'zh-TW': '數字',
    en: 'Digital',
    ja: 'デジタル',
  },
  'settings.clockAnalog': {
    'zh-CN': '表盘',
    'zh-TW': '錶盤',
    en: 'Dial',
    ja: '文字盤',
  },
  'settings.showLogo': {
    'zh-CN': '显示 LOGO',
    'zh-TW': '顯示 LOGO',
    en: 'Show logo',
    ja: 'ロゴを表示',
  },
  'settings.showLogoHint': {
    'zh-CN': 'My Startpage 标志',
    'zh-TW': 'My Startpage 標誌',
    en: 'My Startpage logo',
    ja: 'My Startpage ロゴ',
  },
  'settings.showFooter': {
    'zh-CN': '显示页脚',
    'zh-TW': '顯示頁腳',
    en: 'Show footer',
    ja: 'フッターを表示',
  },
  'settings.showFooterHint': {
    'zh-CN': '底部版权提示',
    'zh-TW': '底部版權提示',
    en: 'Copyright notice',
    ja: '著作権表示',
  },
  'settings.showSays': {
    'zh-CN': '显示一言',
    'zh-TW': '顯示一言',
    en: 'Show quote',
    ja: '一言を表示',
  },
  'settings.showLinks': {
    'zh-CN': '显示链接',
    'zh-TW': '顯示連結',
    en: 'Show links',
    ja: 'リンクを表示',
  },
  'settings.showLinksHint': {
    'zh-CN': '常用链接卡片区',
    'zh-TW': '常用連結卡片區',
    en: 'Link cards section',
    ja: 'リンクカード欄',
  },
  'settings.extractSeed': {
    'zh-CN': '从壁纸提取主题色',
    'zh-TW': '從桌布提取主題色',
    en: 'Extract color from wallpaper',
    ja: '壁紙から色を抽出',
  },
  'settings.language': {
    'zh-CN': '语言',
    'zh-TW': '語言',
    en: 'Language',
    ja: '言語',
  },
  'settings.langZhCN': {
    'zh-CN': '简体中文',
    'zh-TW': '简体中文',
    en: '简体中文',
    ja: '簡体中文',
  },
  'settings.langZhTW': {
    'zh-CN': '繁體中文',
    'zh-TW': '繁體中文',
    en: '繁體中文',
    ja: '繁體中文',
  },
  'settings.langEn': {
    'zh-CN': 'English',
    'zh-TW': 'English',
    en: 'English',
    ja: 'English',
  },
  'settings.langJa': {
    'zh-CN': '日本語',
    'zh-TW': '日本語',
    en: '日本語',
    ja: '日本語',
  },
  'settings.saysHint': {
    'zh-CN': '页面底部一言 / 诗词',
    'zh-TW': '頁面底部一言 / 詩詞',
    en: 'Quote at the bottom',
    ja: '下部の一言',
  },
  'settings.extractSeedHint': {
    'zh-CN': 'getColorFromImage 取主色后 setColorScheme',
    'zh-TW': 'getColorFromImage 取主色後 setColorScheme',
    en: 'Extract dominant color then apply',
    ja: '画像から色を抽出して適用',
  },

  // 背景 Tab
  'bg.mode': {
    'zh-CN': '背景模式',
    'zh-TW': '背景模式',
    en: 'Background mode',
    ja: '背景モード',
  },
  'bg.solid': {
    'zh-CN': '纯色',
    'zh-TW': '純色',
    en: 'Solid',
    ja: '単色',
  },
  'bg.image': {
    'zh-CN': '图片',
    'zh-TW': '圖片',
    en: 'Image',
    ja: '画像',
  },
  'bg.video': {
    'zh-CN': '视频',
    'zh-TW': '影片',
    en: 'Video',
    ja: '動画',
  },
  'bg.bing': {
    'zh-CN': '必应',
    'zh-TW': 'Bing',
    en: 'Bing',
    ja: 'Bing',
  },
  'bg.solidHint': {
    'zh-CN': '纯色背景',
    'zh-TW': '純色背景',
    en: 'Solid color background',
    ja: '単色背景',
  },
  'bg.customColor': {
    'zh-CN': '自定义颜色',
    'zh-TW': '自訂顏色',
    en: 'Custom color',
    ja: 'カスタムカラー',
  },
  'bg.uploadImage': {
    'zh-CN': '上传图片',
    'zh-TW': '上傳圖片',
    en: 'Upload image',
    ja: '画像をアップロード',
  },
  'bg.chooseLocal': {
    'zh-CN': '选择本地图片',
    'zh-TW': '選擇本機圖片',
    en: 'Choose local image',
    ja: 'ローカル画像を選択',
  },
  'bg.imageUrl': {
    'zh-CN': '图片 URL',
    'zh-TW': '圖片 URL',
    en: 'Image URL',
    ja: '画像URL',
  },
  'bg.apply': {
    'zh-CN': '应用',
    'zh-TW': '套用',
    en: 'Apply',
    ja: '適用',
  },
  'bg.imageUrlHint': {
    'zh-CN': '输入图片 URL 后背景立即切换（cover 居中）并持久化保存。',
    'zh-TW': '輸入圖片 URL 後背景立即切換（cover 置中）並持久化儲存。',
    en: 'Background updates instantly (cover) and persists.',
    ja: 'URL 入力後すぐに背景が切り替わり（cover）保存されます。',
  },
  'bg.videoHint': {
    'zh-CN': '以 muted / loop / autoplay / playsinline 静音循环播放，不干扰浏览。',
    'zh-TW': '以 muted / loop / autoplay / playsinline 靜音循環播放，不干擾瀏覽。',
    en: 'Plays muted & looping (muted/loop/autoplay/playsinline).',
    ja: 'ミュートでループ再生（muted/loop/autoplay/playsinline）。',
  },
  'bg.bingDaily': {
    'zh-CN': '必应每日壁纸',
    'zh-TW': 'Bing 每日桌布',
    en: 'Bing daily wallpaper',
    ja: 'Bing 日替わり壁紙',
  },
  'bg.fetchToday': {
    'zh-CN': '获取今日壁纸',
    'zh-TW': '取得今日桌布',
    en: 'Fetch today wallpaper',
    ja: '今日の壁紙を取得',
  },
  'bg.bingMirrorLabel': {
    'zh-CN': '自定义镜像地址（可选）',
    'zh-TW': '自訂鏡像位址（選填）',
    en: 'Custom mirror URL (optional)',
    ja: 'カスタムミラーURL（任意）',
  },
  'bg.bingMirrorPlaceholder': {
    'zh-CN': '留空使用内置代理，如 https://example.com/bing',
    'zh-TW': '留空使用內建代理，如 https://example.com/bing',
    en: 'Empty = built-in proxy, e.g. https://example.com/bing',
    ja: '空欄で内蔵プロキシ、例 https://example.com/bing',
  },
  'bg.bingManualLabel': {
    'zh-CN': '接口不可用时手动输入图片 URL',
    'zh-TW': '介面不可用時手動輸入圖片 URL',
    en: 'Manually set image URL when APIs fail',
    ja: 'API が使えない場合に画像 URL を手動指定',
  },
  'bg.bingHint': {
    'zh-CN': '默认经内置同源代理（Vercel 部署自动启用）获取 cn.bing.com 当日壁纸，失败时依次回退备选镜像，仍失败可手动指定图片 URL。',
    'zh-TW': '預設經內建同源代理（Vercel 部署自動啟用）取得 cn.bing.com 當日桌布，失敗時依序回退備選鏡像，仍失敗可手動指定圖片 URL。',
    en: 'Uses the built-in same-origin proxy (auto-enabled on Vercel) for cn.bing.com wallpaper, then falls back to mirrors, then manual URL.',
    ja: '内蔵プロキシ（Vercel で自動有効）で cn.bing.com の当日壁紙を取得し、失敗時はミラーにフォールバック、最後に手動 URL を指定できます。',
  },
  'bg.mask': {
    'zh-CN': '蒙版',
    'zh-TW': '遮罩',
    en: 'Overlay',
    ja: 'オーバーレイ',
  },
  'bg.overlayOpacity': {
    'zh-CN': '遮罩透明度',
    'zh-TW': '遮罩透明度',
    en: 'Overlay opacity',
    ja: 'オーバーレイ不透明度',
  },
  'bg.overlayBlur': {
    'zh-CN': '背景模糊',
    'zh-TW': '背景模糊',
    en: 'Background blur',
    ja: '背景ぼかし',
  },
  'bg.maskHint': {
    'zh-CN': '调整背景蒙版以提升前景文字可读性，即时生效并持久化。',
    'zh-TW': '調整背景遮罩以提升前景文字可讀性，即時生效並持久化。',
    en: 'Adjust overlay for better readability. Instant & persistent.',
    ja: '前景文字の可読性を高めるため調整します。即時反映・保存。',
  },

  // 搜索 Tab
  'searchTab.title': {
    'zh-CN': '搜索引擎',
    'zh-TW': '搜尋引擎',
    en: 'Search engines',
    ja: '検索エンジン',
  },
  'searchTab.addEngine': {
    'zh-CN': '新增引擎',
    'zh-TW': '新增引擎',
    en: 'Add engine',
    ja: 'エンジンを追加',
  },
  'searchTab.hint': {
    'zh-CN': '点击「设为默认」切换默认引擎；URL 必须包含 {q} 占位符；删除默认引擎时自动回退必应。',
    'zh-TW': '點擊「設為預設」切換預設引擎；URL 必須包含 {q} 佔位符；刪除預設引擎時自動回退 Bing。',
    en: 'Set default via star; URL must contain {q}; deleting default falls back to Bing.',
    ja: '星でデフォルト設定。URL に {q} が必要。削除時は Bing に戻ります。',
  },

  // 链接 Tab
  'linksTab.manage': {
    'zh-CN': '链接管理',
    'zh-TW': '連結管理',
    en: 'Link management',
    ja: 'リンク管理',
  },
  'linksTab.groups': {
    'zh-CN': '分组',
    'zh-TW': '群組',
    en: 'Groups',
    ja: 'グループ',
  },
  'linksTab.hint': {
    'zh-CN': '增删改与主页卡片区实时同步；可指定链接归属分组。',
    'zh-TW': '增刪改與首頁卡片區即時同步；可指定連結歸屬群組。',
    en: 'Changes sync with home cards; links can belong to groups.',
    ja: 'ホームのカードと同期。グループ指定も可能。',
  },

  // 一言 Tab
  'saysTab.source': {
    'zh-CN': '一言来源',
    'zh-TW': '一言來源',
    en: 'Quote source',
    ja: '一言のソース',
  },
  'saysTab.modeHint': {
    'zh-CN': '随机一言 / 今日诗词 / 自定义文本 / AI 生成',
    'zh-TW': '隨機一言 / 今日詩詞 / 自訂文字 / AI 生成',
    en: 'Hitokoto / Poem / Custom / AI',
    ja: '一言 / 今日の詩 / カスタム / AI',
  },
  'saysTab.random': {
    'zh-CN': '随机一言',
    'zh-TW': '隨機一言',
    en: 'Random',
    ja: 'ランダム',
  },
  'saysTab.poem': {
    'zh-CN': '今日诗词',
    'zh-TW': '今日詩詞',
    en: 'Poem',
    ja: '今日の詩',
  },
  'saysTab.custom': {
    'zh-CN': '自定义',
    'zh-TW': '自訂',
    en: 'Custom',
    ja: 'カスタム',
  },
  'saysTab.customApi': {
    'zh-CN': '自建一言',
    'zh-TW': '自建一言',
    en: 'Custom API',
    ja: 'カスタム一言',
  },
  'saysTab.customApiConfig': {
    'zh-CN': '自建一言配置',
    'zh-TW': '自建一言設定',
    en: 'Custom quote API',
    ja: 'カスタム一言設定',
  },
  'saysTab.customApiUrlLabel': {
    'zh-CN': 'API 地址',
    'zh-TW': 'API 位址',
    en: 'API URL',
    ja: 'API URL',
  },
  'saysTab.customApiHint': {
    'zh-CN': '填一个返回与一言相同格式的接口：{ hitokoto, from, from_who }。未填地址时点击刷新显示引导提示而非报错。',
    'zh-TW': '填一個回傳與一言相同格式的介面：{ hitokoto, from, from_who }。未填位址時點擊重新整理會顯示引導提示而非報錯。',
    en: 'Provide an API returning the same format as hitokoto: { hitokoto, from, from_who }. Empty URL shows a hint, not an error.',
    ja: '一言と同じ形式（{ hitokoto, from, from_who }）を返す API を指定。未入力時はエラーでなく案内を表示。',
  },
  'customApi.notConfigured': {
    'zh-CN': '自建一言尚未配置 — 请在「设置 → 一言」中填写 API 地址后点击刷新',
    'zh-TW': '自建一言尚未設定 — 請在「設定 → 一言」中填寫 API 位址後點擊重新整理',
    en: 'Custom quote not configured — fill in the API URL in Settings → Quote, then refresh',
    ja: 'カスタム一言が未設定です — 設定 → 一言 で API URL を入力し、更新してください',
  },
  'saysTab.refreshHint': {
    'zh-CN': '页面底部一言点击亦可刷新',
    'zh-TW': '頁面底部一言點擊亦可重新整理',
    en: 'Click the bottom quote to refresh too',
    ja: '下部の一言をクリックでも更新',
  },

  // 背景操作提示
  'bg.removedImage': {
    'zh-CN': '已移除上传的图片',
    'zh-TW': '已移除上傳的圖片',
    en: 'Uploaded image removed',
    ja: 'アップロード画像を削除しました',
  },
  'bg.imageTooLarge': {
    'zh-CN': '图片过大（{size}，上限 4MB），请压缩后重试',
    'zh-TW': '圖片過大（{size}，上限 4MB），請壓縮後重試',
    en: 'Image too large ({size}, max 4MB). Compress and retry.',
    ja: '画像が大きすぎます（{size}、上限4MB）。圧縮して再試行してください。',
  },
  'bg.appliedUpload': {
    'zh-CN': '已应用上传的图片背景',
    'zh-TW': '已套用上傳的圖片背景',
    en: 'Uploaded image applied',
    ja: 'アップロード画像を適用しました',
  },
  'bg.readFailed': {
    'zh-CN': '图片读取失败，请重试',
    'zh-TW': '圖片讀取失敗，請重試',
    en: 'Failed to read image. Retry.',
    ja: '画像の読み込みに失敗。再試行してください。',
  },
  'bg.enterImageUrl': {
    'zh-CN': '请输入图片 URL',
    'zh-TW': '請輸入圖片 URL',
    en: 'Enter an image URL',
    ja: '画像URLを入力してください',
  },
  'bg.appliedUrl': {
    'zh-CN': '已应用图片 URL 背景',
    'zh-TW': '已套用圖片 URL 背景',
    en: 'Image URL applied',
    ja: '画像URLを適用しました',
  },
  'bg.enterVideoUrl': {
    'zh-CN': '请输入视频 URL',
    'zh-TW': '請輸入影片 URL',
    en: 'Enter a video URL',
    ja: '動画URLを入力してください',
  },
  'bg.appliedVideo': {
    'zh-CN': '已应用视频背景',
    'zh-TW': '已套用影片背景',
    en: 'Video applied',
    ja: '動画を適用しました',
  },
  'bg.appliedBing': {
    'zh-CN': '已应用今日必应壁纸',
    'zh-TW': '已套用今日 Bing 桌布',
    en: 'Bing wallpaper applied',
    ja: 'Bing 壁紙を適用しました',
  },
  'bg.appliedWallpaper': {
    'zh-CN': '已应用手动指定的壁纸图片',
    'zh-TW': '已套用手動指定的桌布圖片',
    en: 'Wallpaper applied',
    ja: '壁紙を適用しました',
  },
  'settings.title': {
    'zh-CN': '设置',
    'zh-TW': '設定',
    en: 'Settings',
    ja: '設定',
  },
  'about.techStack': {
    'zh-CN': '技术栈',
    'zh-TW': '技術棧',
    en: 'Tech stack',
    ja: '技術スタック',
  },
  'about.thanks': {
    'zh-CN': '致谢',
    'zh-TW': '致謝',
    en: 'Thanks',
    ja: '謝辞',
  },
  'about.tagline': {
    'zh-CN': '个人 Material You 风格起始页，由',
    'zh-TW': '個人 Material You 風格起始頁，由',
    en: 'A personal Material You startpage by',
    ja: '個人向け Material You スタートページ、作者',
  },
  'about.githubRepo': {
    'zh-CN': '项目主页',
    'zh-TW': '專案首頁',
    en: 'Repository',
    ja: 'リポジトリ',
  },
  'about.extension': {
    'zh-CN': '浏览器扩展（替换新标签页）',
    'zh-TW': '瀏覽器擴充套件（替換新分頁）',
    en: 'Browser extension (replace new tab)',
    ja: 'ブラウザ拡張機能（新規タブ置き換え）',
  },
  'about.extensionHint': {
    'zh-CN': '支持 Chrome / Edge / Firefox，新标签页直接打开本页。',
    'zh-TW': '支援 Chrome / Edge / Firefox，新分頁直接開啟本頁。',
    en: 'Supports Chrome / Edge / Firefox — opens this page on new tabs.',
    ja: 'Chrome / Edge / Firefox 対応、新規タブでこのページを開きます。',
  },
  'about.extensionDownload': {
    'zh-CN': '下载',
    'zh-TW': '下載',
    en: 'Download',
    ja: 'ダウンロード',
  },
  'about.inspiredBy': {
    'zh-CN': '设计灵感来自',
    'zh-TW': '設計靈感來自',
    en: 'Inspired by',
    ja: 'デザインの着想を得た',
  },
  'searchTab.newTab': {
    'zh-CN': '新标签页打开搜索结果',
    'zh-TW': '在新分頁開啟搜尋結果',
    en: 'Open results in new tab',
    ja: '結果を新しいタブで開く',
  },
  'searchTab.newTabHint': {
    'zh-CN': '关闭后在当前页跳转',
    'zh-TW': '關閉後在目前頁面跳轉',
    en: 'Off: navigate in current tab',
    ja: 'オフ: 現在のタブで移動',
  },
  'linksTab.newTab': {
    'zh-CN': '新标签页打开链接',
    'zh-TW': '在新分頁開啟連結',
    en: 'Open links in new tab',
    ja: 'リンクを新しいタブで開く',
  },
  'linksTab.newTabHint': {
    'zh-CN': '关闭后在当前页跳转',
    'zh-TW': '關閉後在目前頁面跳轉',
    en: 'Off: navigate in current tab',
    ja: 'オフ: 現在のタブで移動',
  },

  // 链接卡片区
  'links.sectionLabel': {
    'zh-CN': '常用链接',
    'zh-TW': '常用連結',
    en: 'Links',
    ja: 'リンク',
  },
  'links.groupToggle': {
    'zh-CN': '分组',
    'zh-TW': '群組',
    en: 'Groups',
    ja: 'グループ',
  },
  'links.add': {
    'zh-CN': '添加',
    'zh-TW': '新增',
    en: 'Add',
    ja: '追加',
  },
  'links.noLinks': {
    'zh-CN': '暂无链接',
    'zh-TW': '暫無連結',
    en: 'No links yet',
    ja: 'リンクがありません',
  },
  'links.noGroups': {
    'zh-CN': '暂无分组',
    'zh-TW': '暫無群組',
    en: 'No groups yet',
    ja: 'グループがありません',
  },
  'links.titleField': {
    'zh-CN': '标题',
    'zh-TW': '標題',
    en: 'Title',
    ja: 'タイトル',
  },
  'links.urlField': {
    'zh-CN': '网址',
    'zh-TW': '網址',
    en: 'URL',
    ja: 'URL',
  },
  'links.urlPlaceholder': {
    'zh-CN': 'https://…',
    'zh-TW': 'https://…',
    en: 'https://…',
    ja: 'https://…',
  },
  'links.iconField': {
    'zh-CN': '图标 URL（可选）',
    'zh-TW': '圖示 URL（選填）',
    en: 'Icon URL (optional)',
    ja: 'アイコンURL（任意）',
  },
  'links.iconPlaceholder': {
    'zh-CN': '自定义 favicon 地址',
    'zh-TW': '自訂 favicon 位址',
    en: 'Custom favicon URL',
    ja: 'カスタム favicon URL',
  },
  'links.groupField': {
    'zh-CN': '分组（可选）',
    'zh-TW': '群組（選填）',
    en: 'Group (optional)',
    ja: 'グループ（任意）',
  },
  'links.addDialogTitle': {
    'zh-CN': '添加链接',
    'zh-TW': '新增連結',
    en: 'Add link',
    ja: 'リンクを追加',
  },
  'links.addHint': {
    'zh-CN': '点击「添加」创建',
    'zh-TW': '點擊「新增」建立',
    en: 'Click Add to create',
    ja: '「追加」で作成',
  },
  'links.enterTitle': {
    'zh-CN': '请输入链接标题',
    'zh-TW': '請輸入連結標題',
    en: 'Enter a link title',
    ja: 'リンクのタイトルを入力',
  },
  'links.enterUrl': {
    'zh-CN': '请输入 URL',
    'zh-TW': '請輸入 URL',
    en: 'Enter a URL',
    ja: 'URLを入力してください',
  },
  'links.badUrl': {
    'zh-CN': 'URL 格式不正确，请检查后重试',
    'zh-TW': 'URL 格式不正確，請檢查後重試',
    en: 'Invalid URL. Check and retry.',
    ja: 'URLの形式が不正です。確認して再試行してください。',
  },
  'links.added': {
    'zh-CN': '链接已添加',
    'zh-TW': '連結已新增',
    en: 'Link added',
    ja: 'リンクを追加しました',
  },
  'links.updated': {
    'zh-CN': '链接已更新',
    'zh-TW': '連結已更新',
    en: 'Link updated',
    ja: 'リンクを更新しました',
  },
  'links.deleted': {
    'zh-CN': '链接已删除',
    'zh-TW': '連結已刪除',
    en: 'Link deleted',
    ja: 'リンクを削除しました',
  },
  'links.notFound': {
    'zh-CN': '链接不存在或已被删除',
    'zh-TW': '連結不存在或已被刪除',
    en: 'Link not found',
    ja: 'リンクが見つかりません',
  },
  'links.create': {
    'zh-CN': '创建',
    'zh-TW': '建立',
    en: 'Create',
    ja: '作成',
  },
  'links.groupNameField': {
    'zh-CN': '分组名称',
    'zh-TW': '群組名稱',
    en: 'Group name',
    ja: 'グループ名',
  },
  'links.enterGroupName': {
    'zh-CN': '请输入分组名称',
    'zh-TW': '請輸入群組名稱',
    en: 'Enter a group name',
    ja: 'グループ名を入力してください',
  },
  'links.groupExists': {
    'zh-CN': '分组「{name}」已存在',
    'zh-TW': '群組「{name}」已存在',
    en: 'Group "{name}" already exists',
    ja: 'グループ「{name}」は既に存在します',
  },
  'links.groupCreated': {
    'zh-CN': '已创建分组「{name}」',
    'zh-TW': '已建立群組「{name}」',
    en: 'Group "{name}" created',
    ja: 'グループ「{name}」を作成しました',
  },
  'links.renameGroup': {
    'zh-CN': '重命名分组',
    'zh-TW': '重新命名群組',
    en: 'Rename group',
    ja: 'グループ名を変更',
  },
  'links.oldName': {
    'zh-CN': '原名称：',
    'zh-TW': '原名稱：',
    en: 'Current name: ',
    ja: '現在の名前：',
  },
  'links.groupRenamed': {
    'zh-CN': '分组已重命名',
    'zh-TW': '群組已重新命名',
    en: 'Group renamed',
    ja: 'グループ名を変更しました',
  },
  'links.deleteGroup': {
    'zh-CN': '删除分组',
    'zh-TW': '刪除群組',
    en: 'Delete group',
    ja: 'グループを削除',
  },
  'links.groupDeleted': {
    'zh-CN': '分组已删除，组内链接已移回「无分组」',
    'zh-TW': '群組已刪除，群組內連結已移回「無群組」',
    en: 'Group deleted; links moved to "No group"',
    ja: 'グループを削除し、リンクを「グループなし」に移動しました',
  },
  'links.manageGroups': {
    'zh-CN': '管理分组',
    'zh-TW': '管理群組',
    en: 'Manage groups',
    ja: 'グループを管理',
  },
  'links.titlePlaceholder': {
    'zh-CN': '如：哔哩哔哩',
    'zh-TW': '如：Bilibili',
    en: 'e.g. GitHub',
    ja: '例：GitHub',
  },
  // 背景提示补充
  'bg.fetchingBing': {
    'zh-CN': '正在获取必应每日壁纸…',
    'zh-TW': '正在取得 Bing 每日桌布…',
    en: 'Fetching Bing wallpaper…',
    ja: 'Bing 壁紙を取得中…',
  },
  'bg.pickImage': {
    'zh-CN': '请选择图片文件（JPG / PNG / WebP / GIF）',
    'zh-TW': '請選擇圖片檔案（JPG / PNG / WebP / GIF）',
    en: 'Choose an image file (JPG / PNG / WebP / GIF)',
    ja: '画像ファイルを選択してください（JPG / PNG / WebP / GIF）',
  },
  'bg.uploadHint': {
    'zh-CN': '支持 JPG / PNG / WebP / GIF（≤ 4MB）。图片将转为 base64 保存在本地浏览器中，刷新后保持。',
    'zh-TW': '支援 JPG / PNG / WebP / GIF（≤ 4MB）。圖片將轉為 base64 保存在本機瀏覽器中，重新整理後保持。',
    en: 'Supports JPG / PNG / WebP / GIF (≤ 4MB). Images are stored as base64 locally and persist across refreshes.',
    ja: 'JPG / PNG / WebP / GIF（≤ 4MB）に対応。画像は base64 としてローカルに保存され、再読み込み後も保持されます。',
  },
  'bg.bingFailed': {
    'zh-CN': '必应壁纸获取失败',
    'zh-TW': 'Bing 桌布取得失敗',
    en: 'Failed to fetch Bing wallpaper',
    ja: 'Bing 壁紙の取得に失敗しました',
  },
  'bg.imageLoadFailed': {
    'zh-CN': '壁纸图片加载失败，请手动输入图片 URL',
    'zh-TW': '桌布圖片載入失敗，請手動輸入圖片 URL',
    en: 'Failed to load image. Enter a URL manually.',
    ja: '画像の読み込みに失敗。URLを手動入力してください。',
  },


  // 引擎管理
  'engine.setDefault': {
    'zh-CN': '设为默认',
    'zh-TW': '設為預設',
    en: 'Set default',
    ja: 'デフォルトに設定',
  },
  'engine.default': {
    'zh-CN': '默认',
    'zh-TW': '預設',
    en: 'Default',
    ja: 'デフォルト',
  },
  'engine.defaultSuffix': {
    'zh-CN': '{name}（默认）',
    'zh-TW': '{name}（預設）',
    en: '{name} (default)',
    ja: '{name}（デフォルト）',
  },
  'engine.edit': {
    'zh-CN': '编辑引擎',
    'zh-TW': '編輯引擎',
    en: 'Edit engine',
    ja: 'エンジンを編集',
  },
  'engine.delete': {
    'zh-CN': '删除引擎',
    'zh-TW': '刪除引擎',
    en: 'Delete engine',
    ja: 'エンジンを削除',
  },
  'engine.addTitle': {
    'zh-CN': '新增搜索引擎',
    'zh-TW': '新增搜尋引擎',
    en: 'Add search engine',
    ja: '検索エンジンを追加',
  },
  'engine.editTitle': {
    'zh-CN': '编辑搜索引擎',
    'zh-TW': '編輯搜尋引擎',
    en: 'Edit search engine',
    ja: '検索エンジンを編集',
  },
  'engine.nameField': {
    'zh-CN': '引擎名称',
    'zh-TW': '引擎名稱',
    en: 'Engine name',
    ja: 'エンジン名',
  },
  'engine.namePlaceholder': {
    'zh-CN': '如：必应',
    'zh-TW': '如：Bing',
    en: 'e.g. Bing',
    ja: '例：Bing',
  },
  'engine.urlField': {
    'zh-CN': '搜索 URL',
    'zh-TW': '搜尋 URL',
    en: 'Search URL',
    ja: '検索URL',
  },
  'engine.urlPlaceholder': {
    'zh-CN': 'https://example.com/search?q={q}',
    'zh-TW': 'https://example.com/search?q={q}',
    en: 'https://example.com/search?q={q}',
    ja: 'https://example.com/search?q={q}',
  },
  'engine.urlHint': {
    'zh-CN': 'URL 必须包含 {q} 占位符',
    'zh-TW': 'URL 必須包含 {q} 佔位符',
    en: 'URL must contain {q}',
    ja: 'URL に {q} が必要です',
  },
  'engine.enterName': {
    'zh-CN': '请输入引擎名称',
    'zh-TW': '請輸入引擎名稱',
    en: 'Enter an engine name',
    ja: 'エンジン名を入力してください',
  },
  'engine.enterUrl': {
    'zh-CN': '请输入 URL',
    'zh-TW': '請輸入 URL',
    en: 'Enter a URL',
    ja: 'URLを入力してください',
  },
  'engine.badUrl': {
    'zh-CN': 'URL 格式不正确，请检查后重试',
    'zh-TW': 'URL 格式不正確，請檢查後重試',
    en: 'Invalid URL. Check and retry.',
    ja: 'URLの形式が不正です。確認して再試行してください。',
  },
  'engine.noQPlaceholder': {
    'zh-CN': 'URL 必须包含 {q} 占位符',
    'zh-TW': 'URL 必須包含 {q} 佔位符',
    en: 'URL must contain {q}',
    ja: 'URL に {q} が必要です',
  },
  'engine.keepOne': {
    'zh-CN': '至少需要保留一个搜索引擎',
    'zh-TW': '至少需要保留一個搜尋引擎',
    en: 'At least one engine is required',
    ja: '検索エンジンは最低1つ必要です',
  },
  'engine.added': {
    'zh-CN': '引擎已添加',
    'zh-TW': '引擎已新增',
    en: 'Engine added',
    ja: 'エンジンを追加しました',
  },
  'engine.updated': {
    'zh-CN': '引擎已更新',
    'zh-TW': '引擎已更新',
    en: 'Engine updated',
    ja: 'エンジンを更新しました',
  },
  'engine.deleted': {
    'zh-CN': '引擎已删除',
    'zh-TW': '引擎已刪除',
    en: 'Engine deleted',
    ja: 'エンジンを削除しました',
  },
  'engine.notFound': {
    'zh-CN': '引擎不存在或已被删除',
    'zh-TW': '引擎不存在或已被刪除',
    en: 'Engine not found',
    ja: 'エンジンが見つかりません',
  },
  'engine.setDefaultMsg': {
    'zh-CN': '默认引擎已切换为「{name}」',
    'zh-TW': '預設引擎已切換為「{name}」',
    en: 'Default engine set to "{name}"',
    ja: 'デフォルトエンジンを「{name}」に変更しました',
  },
  'engine.fallbackMsg': {
    'zh-CN': '默认引擎已自动回退为必应',
    'zh-TW': '預設引擎已自動回退為 Bing',
    en: 'Default engine fell back to Bing',
    ja: 'デフォルトエンジンを Bing に戻しました',
  },
  'engine.empty': {
    'zh-CN': '暂无搜索引擎',
    'zh-TW': '暫無搜尋引擎',
    en: 'No search engines',
    ja: '検索エンジンがありません',
  },
  'engine.addHint': {
    'zh-CN': '点击「新增引擎」创建',
    'zh-TW': '點擊「新增引擎」建立',
    en: 'Click "Add engine" to create',
    ja: '「エンジンを追加」で作成',
  },
  'engine.iconField': {
    'zh-CN': '图标 URL（可选）',
    'zh-TW': '圖示 URL（選填）',
    en: 'Icon URL (optional)',
    ja: 'アイコンURL（任意）',
  },

  // 壁纸取色
  'seed.noWallpaper': {
    'zh-CN': '当前没有壁纸图片 — 请先设置图片/必应壁纸背景',
    'zh-TW': '目前沒有桌布圖片 — 請先設定圖片/Bing 桌布背景',
    en: 'No wallpaper set. Set an image or Bing wallpaper first.',
    ja: '壁紙がありません。先に画像/Bing 壁紙を設定してください。',
  },
  'seed.extracted': {
    'zh-CN': '已从壁纸提取主题色 {color}',
    'zh-TW': '已從桌布提取主題色 {color}',
    en: 'Extracted theme color {color}',
    ja: '壁紙からテーマカラー {color} を抽出しました',
  },
  'seed.extractFailed': {
    'zh-CN': '壁纸提取主题色失败（图片跨域或不可读），请换用本地图片',
    'zh-TW': '桌布提取主題色失敗（圖片跨域或不可讀），請改用本機圖片',
    en: 'Failed to extract color (cross-origin or unreadable). Use a local image.',
    ja: '色の抽出に失敗（クロスオリジンまたは読込不可）。ローカル画像を使用してください。',
  },

  // 引擎校验
  'engine.needQ': {
    'zh-CN': 'URL 必须包含 {q} 占位符',
    'zh-TW': 'URL 必須包含 {q} 佔位符',
    en: 'URL must contain {q}',
    ja: 'URL に {q} が必要です',
  },
  'engine.nameExists': {
    'zh-CN': '引擎「{name}」已存在',
    'zh-TW': '引擎「{name}」已存在',
    en: 'Engine "{name}" already exists',
    ja: 'エンジン「{name}」は既に存在します',
  },

  // 分组管理（面板内）
  'links.groupNameRequired': {
    'zh-CN': '分组名称不能为空',
    'zh-TW': '群組名稱不能為空',
    en: 'Group name cannot be empty',
    ja: 'グループ名を入力してください',
  },
  'links.groupTag': {
    'zh-CN': '无分组',
    'zh-TW': '無群組',
    en: 'No group',
    ja: 'グループなし',
  },
  'links.noGroupsPanel': {
    'zh-CN': '暂无分组',
    'zh-TW': '暫無群組',
    en: 'No groups yet',
    ja: 'グループがありません',
  },
  'links.urlPlaceholderShort': {
    'zh-CN': 'example.com 或 https://…',
    'zh-TW': 'example.com 或 https://…',
    en: 'example.com or https://…',
    ja: 'example.com または https://…',
  },
  'engine.editTitle2': {
    'zh-CN': '编辑搜索引擎',
    'zh-TW': '編輯搜尋引擎',
    en: 'Edit search engine',
    ja: '検索エンジンを編集',
  },
  'engine.needName': {
    'zh-CN': '请输入引擎名称',
    'zh-TW': '請輸入引擎名稱',
    en: 'Enter an engine name',
    ja: 'エンジン名を入力してください',
  },
  'engine.needOne': {
    'zh-CN': '至少需要保留一个搜索引擎',
    'zh-TW': '至少需要保留一個搜尋引擎',
    en: 'At least one engine is required',
    ja: '検索エンジンは最低1つ必要です',
  },
  'engine.badUrlShort': {
    'zh-CN': 'URL 格式不正确',
    'zh-TW': 'URL 格式不正確',
    en: 'Invalid URL',
    ja: 'URLの形式が不正です',
  },
  'seed.swatchAria': {
    'zh-CN': '配色种子预设色板',
    'zh-TW': '配色種子預設色板',
    en: 'Seed color presets',
    ja: 'シードカラー プリセット',
  },
  'seed.customTitle': {
    'zh-CN': '自定义取色',
    'zh-TW': '自訂取色',
    en: 'Custom color',
    ja: 'カスタムカラー',
  },
  'seed.customAria': {
    'zh-CN': '自定义配色种子',
    'zh-TW': '自訂配色種子',
    en: 'Custom seed color',
    ja: 'カスタムシードカラー',
  },
  'seed.bgSwatchesAria': {
    'zh-CN': '预设色板',
    'zh-TW': '預設色板',
    en: 'Color presets',
    ja: 'カラープリセット',
  },
};

/** 当前语言 */
let current: Lang = 'zh-CN';

/** 设置语言 */
export function setLang(lang: Lang): void {
  current = lang;
}

/** 获取当前语言 */
export function getLang(): Lang {
  return current;
}

/** 简单模板替换：{key} → 值 */
function interpolate(text: string, params?: Record<string, string | number>): string {
  if (params === undefined) return text;
  return text.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`,
  );
}

/** 取文案；key 不存在时回退英文，再回退 zh-CN，最后返回 key */
export function t(key: string, params?: Record<string, string | number>): string {
  const entry = dict[key];
  if (entry === undefined) return key;
  const text = entry[current] ?? entry.en ?? entry['zh-CN'] ?? key;
  return interpolate(text, params);
}
