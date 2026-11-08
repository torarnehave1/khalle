/**
 * Stories saved in the signed-in user's Vegvisr account (gemini.vegvisr.org /v1/stories,
 * R2 bucket khalle-stories, one folder per user). The browser copy (storyStore.ts) stays the
 * fast cache; this is what makes stories follow the user to another device.
 *
 * - The story list is one JSON document `{ history, updatedAt }` without any video bytes.
 * - Each clip is a file `clip-<scene id>`; an uploaded photo used as a scene's source image is a
 *   file `img-<sha256>` so the same photo is stored once however many scenes use it.
 */
import { getApiToken } from '../lib/auth';
import { GEMINI_WORKER_BASE } from './gemini';

export type ServerStory<T> = { history: T[] | null; updatedAt: number };

export class StoryServerError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const hasServerSession = () => !!getApiToken();

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getApiToken();
  if (!token) throw new StoryServerError('Not signed in.', 401);
  const res = await fetch(`${GEMINI_WORKER_BASE}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), 'X-API-Token': token },
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = String(body.error);
    } catch {
      /* not JSON */
    }
    throw new StoryServerError(message, res.status);
  }
  return res;
}

export async function getServerStory<T>(): Promise<ServerStory<T>> {
  const res = await call('/v1/stories', { cache: 'no-store' });
  const body = await res.json();
  return { history: Array.isArray(body?.history) ? body.history : null, updatedAt: Number(body?.updatedAt) || 0 };
}

export async function putServerStory<T>(history: T[], updatedAt: number): Promise<void> {
  await call('/v1/stories', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history, updatedAt }),
  });
}

export async function listServerFiles(): Promise<Set<string>> {
  const res = await call('/v1/stories/files', { cache: 'no-store' });
  const body = await res.json();
  return new Set(((body?.files as { name: string }[]) || []).map((f) => f.name));
}

export async function putServerFile(name: string, blob: Blob): Promise<void> {
  const type = blob.type || (name.startsWith('img-') ? 'image/jpeg' : 'video/mp4');
  await call(`/v1/stories/files/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { 'Content-Type': type },
    body: blob,
  });
}

export async function getServerFile(name: string): Promise<Blob> {
  const res = await call(`/v1/stories/files/${encodeURIComponent(name)}`, { cache: 'no-store' });
  return await res.blob();
}

export async function deleteServerFile(name: string): Promise<void> {
  await call(`/v1/stories/files/${encodeURIComponent(name)}`, { method: 'DELETE' });
}

/** File name for a scene's clip. Scene ids are app-made (`vid-…`, `uploaded-scene-…`), but stay safe. */
export const clipFileName = (sceneId: string) => `clip-${sceneId.replace(/[^\w.-]/g, '_')}`.slice(0, 160);

export async function imageFileName(dataUrl: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataUrl));
  return `img-${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}
