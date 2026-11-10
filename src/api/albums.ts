/**
 * The signed-in user's Vegvisr photo albums (albums.vegvisr.org + photos-api.vegvisr.org).
 * Same sign-in as the rest of Khalle: the X-API-Token header. Both services allow any origin.
 *
 * - listAlbums / listAlbumPictures: read the albums and the pictures in one album.
 * - albumPictureAsDataUrl: fetch a picture through gemini.vegvisr.org /v1/fetch-image, so it can
 *   be used as a start picture, reference, character or key picture (Gemini needs the bytes).
 * - savePictureToAlbum: upload a picture into an album (the album is made if it does not exist).
 */
import { getApiToken } from '../lib/auth';
import { fetchRemoteImage } from './gemini';

const ALBUMS_BASE = 'https://albums.vegvisr.org';
const PHOTOS_BASE = 'https://photos-api.vegvisr.org';

/** Where pictures made on the story board are saved unless the user picks another album. */
export const GEMINI_ALBUM = 'Khalle – made by Gemini';

export type AlbumSummary = { name: string; imageCount?: number; updatedAt?: string | null };
export type AlbumPicture = { key: string; url: string };

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getApiToken();
  if (!token) throw new Error('Sign in to see your albums.');
  const res = await fetch(url, { ...init, headers: { ...(init.headers || {}), 'X-API-Token': token } });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
    } catch {
      /* not JSON */
    }
    throw new Error(message);
  }
  return res;
}

export async function listAlbums(): Promise<AlbumSummary[]> {
  const res = await call(`${ALBUMS_BASE}/photo-albums?includeMeta=1`, { cache: 'no-store' });
  const body = await res.json();
  const raw: unknown[] = Array.isArray(body?.albums) ? body.albums : [];
  return raw
    .map((a: any) => (typeof a === 'string' ? { name: a } : { name: String(a?.name || ''), imageCount: a?.imageCount, updatedAt: a?.updatedAt }))
    .filter((a) => a.name)
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) || a.name.localeCompare(b.name));
}

export async function listAlbumPictures(album: string): Promise<AlbumPicture[]> {
  const res = await call(`${PHOTOS_BASE}/list-r2-images?album=${encodeURIComponent(album)}`, { cache: 'no-store' });
  const body = await res.json();
  return ((body?.images as any[]) || [])
    // Albums can hold videos too; only pictures are offered here.
    .filter((i) => i?.url && !/\.(mp4|mov|m4v|webm|avi|mkv|mp3|wav|m4a|pdf)(\?|$)/i.test(String(i.key || i.url)))
    .map((i) => ({ key: String(i.key), url: String(i.url) }));
}

/** A small version for the grid when the host can resize (imgix), else the picture itself. */
export function thumbnailUrl(url: string, size = 320): string {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('imgix')) return url;
    u.searchParams.set('w', String(size));
    u.searchParams.set('h', String(size));
    u.searchParams.set('fit', 'crop');
    u.searchParams.set('auto', 'format');
    return u.toString();
  } catch {
    return url;
  }
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

export async function albumPictureAsDataUrl(url: string): Promise<string> {
  const res = await fetchRemoteImage(url, 30000);
  return blobToDataUrl(await res.blob());
}

export async function savePictureToAlbum(dataUrl: string, album: string, name: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  const safe = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'picture';
  const form = new FormData();
  form.append('file', blob, `khalle-${safe}-${Date.now()}.${ext}`);
  form.append('album', album);
  form.append('displayName', name.slice(0, 80));
  const res = await call(`${PHOTOS_BASE}/upload`, { method: 'POST', body: form });
  const body = await res.json().catch(() => ({}));
  return String(body?.urls?.[0] || '');
}
