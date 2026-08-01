/**
 * 壁纸取色共享工具（main.ts 自动取色与设置面板手动取色共用）。
 *
 * 关键点：跨域图片若直接用 <img src> 加载，canvas 会被污染
 * （tainted），getImageData 读不到像素导致取色失败。必须先 fetch
 * 探测 CORS，允许则转成 blob URL（同源）再取色；不支持 CORS 的
 * 图片返回 null，由调用方决定提示。
 */

/** 加载一张可读取像素的 <img>（用于取色），失败返回 null */
export async function loadImageForPixels(
  src: string,
  timeoutMs = 8000,
): Promise<HTMLImageElement | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const img = new Image();
    if (/^https?:/i.test(src)) {
      // 带超时的 CORS fetch：慢图源 / 无 CORS 时及时放弃，避免取色挂起
      const response = await fetch(src, { signal: controller.signal });
      if (!response.ok) return null;
      const blob = await response.blob();
      img.src = URL.createObjectURL(blob);
    } else {
      img.src = src;
    }
    await img.decode();
    return img;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
