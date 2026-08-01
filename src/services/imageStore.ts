/**
 * 背景图片的 IndexedDB 存储层（替代 localStorage 存 base64）。
 *
 * 背景：
 *   - localStorage 配额约 5MB，base64 又膨胀 ~33%，大图根本放不下；
 *   - IndexedDB 配额按磁盘计算（通常数百 MB 起步），可直接存原始 Blob，
 *     上传的原图零压缩、零损耗。
 *
 * 约定：
 *   - 设置里 background.image 字段存放 `idb://background` 标记
 *     （旧数据可能是 data: 开头的 base64，见 migrateLegacyImage）；
 *   - 运行时通过 resolveImageSource() 把标记解析为可用的 objectURL。
 */

/** 上传背景图在 IndexedDB 中的固定 key（同一时间只有一张上传背景图） */
const IMAGE_KEY = 'background';
/** 设置中存储的标记前缀 */
const IDB_PREFIX = 'idb://';
/** 标记值 */
export const IDB_BACKGROUND = `${IDB_PREFIX}${IMAGE_KEY}`;

const DB_NAME = 'my-startpage';
const DB_VERSION = 1;
const STORE_NAME = 'images';

/** 当前已解析出的 objectURL（页面生命周期内缓存，删除/覆盖时 revoke） */
let backgroundObjectUrl: string | null = null;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise !== null) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB 打开失败'));
  });
  return dbPromise;
}

function getBlob(key: string): Promise<Blob | null> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
        req.onerror = () =>
          reject(req.error ?? new Error('IndexedDB 读取失败'));
      }),
  );
}

function putBlob(key: string, blob: Blob): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(blob, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () =>
          reject(tx.error ?? new Error('IndexedDB 写入失败'));
      }),
  );
}

function deleteBlob(key: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () =>
          reject(tx.error ?? new Error('IndexedDB 删除失败'));
      }),
  );
}

/** 保存上传的背景图（原图 Blob，不压缩），返回持久化标记 */
export async function saveBackgroundImage(blob: Blob): Promise<string> {
  if (backgroundObjectUrl !== null) {
    URL.revokeObjectURL(backgroundObjectUrl);
    backgroundObjectUrl = null;
  }
  await putBlob(IMAGE_KEY, blob);
  return IDB_BACKGROUND;
}

/** 读取上传的背景图 Blob（不存在返回 null） */
export function loadBackgroundImage(): Promise<Blob | null> {
  return getBlob(IMAGE_KEY);
}

/** 删除上传的背景图 */
export async function deleteBackgroundImage(): Promise<void> {
  if (backgroundObjectUrl !== null) {
    URL.revokeObjectURL(backgroundObjectUrl);
    backgroundObjectUrl = null;
  }
  await deleteBlob(IMAGE_KEY);
}

/** src 是否为 IndexedDB 标记 */
export function isIdbSource(src: string): boolean {
  return src.startsWith(IDB_PREFIX);
}

/**
 * 把设置里的图片源解析为可直接用于 <img src> 的地址：
 *   - `idb://` 标记 → 从 IndexedDB 读 Blob → objectURL（缓存复用）；
 *   - 其他（data: / http(s): / blob:）原样返回。
 */
export function resolveImageSource(src: string): Promise<string> {
  if (!isIdbSource(src)) return Promise.resolve(src);
  if (backgroundObjectUrl !== null) return Promise.resolve(backgroundObjectUrl);
  return loadBackgroundImage().then((blob) => {
    if (blob === null) return '';
    backgroundObjectUrl = URL.createObjectURL(blob);
    return backgroundObjectUrl;
  });
}

/** data URL → Blob（用于迁移旧 base64 数据） */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}
