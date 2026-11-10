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

export type ServerStory<T> = { history: T[] | null; updatedAt: number; boards?: unknown[] };

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
  return {
    history: Array.isArray(body?.history) ? body.history : null,
    updatedAt: Number(body?.updatedAt) || 0,
    boards: Array.isArray(body?.boards) ? body.boards : undefined,
  };
}

/**
 * Saves the story boards next to the scene list. The scene list and its updatedAt (`base`, from a
 * getServerStory just before) are sent back exactly as the server has them, so this never changes the scenes or looks like a scene edit.
 * (A scene save sends no boards; the worker then keeps these.) Run it in the same queue as the
 * scene sync (storyStore.queueServerTask) so the two never overlap.
 */
export async function putServerBoards(boards: unknown[], base: { history: unknown[] | null; updatedAt: number }): Promise<void> {
  await call('/v1/stories', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history: base.history || [], boards, updatedAt: base.updatedAt }),
  });
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
  const type = blob.type || (name.startsWith('img-') || name.startsWith('board-') ? 'image/jpeg' : 'video/mp4');
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

/** Story-board pictures are files `board-<sha256>`; the scene sync leaves them alone. */
export const isBoardFile = (name: string) => name.startsWith('board-');

export async function boardImageFileName(dataUrl: string): Promise<string> {
  return `board-${(await imageFileName(dataUrl)).slice(4)}`;
}

export async function imageFileName(dataUrl: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataUrl));
  return `img-${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}
