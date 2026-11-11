/**
 * Gemini does not use the transparency of a picture. A cutout PNG often still holds the original
 * photo under its transparent pixels (the cutout tool only hides them), so Gemini sees the old
 * background. Every picture with transparency is therefore put on a solid white background and
 * sent as JPEG (decision 2026-11-11). Pictures without transparency are left as they are.
 */

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The picture could not be read.'));
    img.src = url;
  });

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

/** The picture as a data URL; with transparency → on white, as JPEG. */
export async function pictureOnWhite(input: Blob | string): Promise<string> {
  const url = typeof input === 'string' ? input : await blobToDataUrl(input);
  // Only formats that can hold transparency need a look.
  if (!/^data:image\/(png|webp|gif|avif)/i.test(url)) return url;
  let img: HTMLImageElement;
  try {
    img = await loadImage(url);
  } catch {
    return url;
  }
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return url;
  const probe = document.createElement('canvas');
  probe.width = w;
  probe.height = h;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  if (!pctx) return url;
  pctx.drawImage(img, 0, 0);
  const data = pctx.getImageData(0, 0, w, h).data;
  let transparent = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      transparent = true;
      break;
    }
  }
  if (!transparent) return url;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0); // drawing blends by transparency, so hidden colours never show
  return out.toDataURL('image/jpeg', 0.92);
}

/** Same for a picture held as base64 + MIME type (the request builder's form). */
export async function base64OnWhite(base64: string, mimeType: string): Promise<{ base64: string; mimeType: string }> {
  if (!/^image\/(png|webp|gif|avif)$/i.test(mimeType)) return { base64, mimeType };
  const url = await pictureOnWhite(`data:${mimeType};base64,${base64}`);
  const m = url.match(/^data:([^;]+);base64,(.+)$/);
  return m ? { mimeType: m[1], base64: m[2] } : { base64, mimeType };
}
