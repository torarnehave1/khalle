/**
 * Keeps the user's scenes across reloads: a fast copy in this browser (IndexedDB), synced to the
 * signed-in user's account on the server (api/storyServer.ts) so stories follow them to any device.
 *
 * - `clips` store: one Blob per scene id (the video bytes).
 * - `meta` store: key 'history' → the scene list without `videoUrl` (the URL is rebuilt from the
 *   Blob as a blob: URL on load, so the list stays small).
 *
 * One database per signed-in email, so two people on the same browser don't see each other's work.
 */
import { useEffect, useRef } from 'react';
import { readStoredUser } from './auth';
import {
  clipFileName,
  deleteServerFile,
  getServerFile,
  getServerStory,
  hasServerSession,
  imageFileName,
  isBoardFile,
  listServerFiles,
  putServerFile,
  putServerStory,
} from '../api/storyServer';

const DB_VERSION = 1;
const CLIPS = 'clips';
const META = 'meta';

type WithVideo = { id: string; videoUrl: string };

const dbName = () => `rabbithop-story:${readStoredUser()?.email || 'anonymous'}`;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName(), DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CLIPS)) db.createObjectStore(CLIPS);
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** data: and blob: URLs are readable from this page; anything else is left as a URL. */
async function urlToBlob(url: string): Promise<Blob | null> {
  if (!url.startsWith('data:') && !url.startsWith('blob:')) return null;
  try {
    const res = await fetch(url);
    return res.ok ? await res.blob() : null;
  } catch {
    return null;
  }
}

export async function loadStory<T extends WithVideo>(): Promise<T[]> {
  const db = await openDb();
  try {
    const tx = db.transaction([META, CLIPS], 'readonly');
    const list = ((await reqToPromise(tx.objectStore(META).get('history'))) as (T & { remoteUrl?: string })[]) || [];
    const out: T[] = [];
    for (const item of list) {
      const blob = (await reqToPromise(tx.objectStore(CLIPS).get(item.id))) as Blob | undefined;
      const videoUrl = blob ? URL.createObjectURL(blob) : item.remoteUrl || '';
      if (!videoUrl) continue; // clip bytes lost — drop the scene rather than show a dead player
      const { remoteUrl: _r, ...rest } = item;
      out.push({ ...(rest as unknown as T), videoUrl });
    }
    return out;
  } finally {
    db.close();
  }
}

/** Writes the list, stores Blobs for new clips, and deletes Blobs of scenes no longer in the list. */
export async function saveStory<T extends WithVideo>(history: T[], storedIds: Set<string>): Promise<void> {
  // Read the bytes before opening the transaction: an IndexedDB transaction closes on any await
  // that isn't an IndexedDB request.
  const newBlobs: [string, Blob][] = [];
  for (const item of history) {
    if (storedIds.has(item.id)) continue;
    const blob = await urlToBlob(item.videoUrl);
    if (blob) newBlobs.push([item.id, blob]);
  }

  const db = await openDb();
  try {
    const tx = db.transaction([META, CLIPS], 'readwrite');
    const clips = tx.objectStore(CLIPS);
    for (const [id, blob] of newBlobs) {
      clips.put(blob, id);
      storedIds.add(id);
    }
    const keep = new Set(history.map((h) => h.id));
    const existingKeys = (await reqToPromise(clips.getAllKeys())) as string[];
    for (const key of existingKeys) {
      if (!keep.has(key)) {
        clips.delete(key);
        storedIds.delete(key);
      }
    }
    const meta = history.map(({ videoUrl, ...rest }) => ({
      ...rest,
      // Keep a plain URL only when it isn't a page-local one (those are rebuilt from the Blob).
      remoteUrl: videoUrl.startsWith('data:') || videoUrl.startsWith('blob:') ? undefined : videoUrl,
    }));
    tx.objectStore(META).put(meta, 'history');
    await txDone(tx);
  } finally {
    db.close();
  }
}

/** Which server version this browser's copy is based on, and a fingerprint of what was synced. */
type SyncState = { serverAt: number; syncedHash: string };

async function loadSyncState(): Promise<SyncState> {
  const db = await openDb();
  try {
    const tx = db.transaction(META, 'readonly');
    const v = (await reqToPromise(tx.objectStore(META).get('serverSync'))) as SyncState | undefined;
    return v && typeof v.serverAt === 'number' ? v : { serverAt: 0, syncedHash: '' };
  } finally {
    db.close();
  }
}

async function saveSyncState(state: SyncState): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(META, 'readwrite');
    tx.objectStore(META).put(state, 'serverSync');
    await txDone(tx);
  } finally {
    db.close();
  }
}

async function localClip(id: string): Promise<Blob | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(CLIPS, 'readonly');
    return ((await reqToPromise(tx.objectStore(CLIPS).get(id))) as Blob | undefined) || null;
  } finally {
    db.close();
  }
}

const sha = async (text: string) => {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

/** A scene as the server keeps it: no bytes, only the names of its files. */
type ServerItem = Record<string, unknown> & {
  id: string;
  clipFile?: string;
  remoteUrl?: string;
  sourceImageFile?: string;
  /** The story's approved main-character picture (castImage), stored once as an img- file. */
  castImageFile?: string;
};

const imageNames = new Map<string, string>();

/**
 * One queue for everything that writes the account's story document, so a scene save and a
 * story-board save never overlap (each sends the whole document).
 */
let serverQueue: Promise<void> = Promise.resolve();
export function queueServerTask(task: () => Promise<void>): Promise<void> {
  const run = serverQueue.then(task);
  serverQueue = run.catch(() => {});
  return run;
}

async function toServerItems<T extends WithVideo>(history: T[]) {
  const files = new Map<string, () => Promise<Blob | null>>();
  const items: ServerItem[] = [];
  for (const item of history) {
    const { videoUrl, sourceImage, castImage, ...rest } = item as T & { sourceImage?: string; castImage?: string };
    const entry: ServerItem = { ...(rest as unknown as ServerItem) };
    if (videoUrl.startsWith('data:') || videoUrl.startsWith('blob:')) {
      entry.clipFile = clipFileName(item.id);
      files.set(entry.clipFile, () => urlToBlob(videoUrl));
    } else {
      entry.remoteUrl = videoUrl;
    }
    if (typeof sourceImage === 'string' && sourceImage.startsWith('data:')) {
      let name = imageNames.get(sourceImage);
      if (!name) {
        name = await imageFileName(sourceImage);
        imageNames.set(sourceImage, name);
      }
      entry.sourceImageFile = name;
      if (!files.has(name)) files.set(name, () => urlToBlob(sourceImage));
    } else if (sourceImage !== undefined) {
      entry.sourceImage = sourceImage;
    }
    if (typeof castImage === 'string' && castImage.startsWith('data:')) {
      let name = imageNames.get(castImage);
      if (!name) {
        name = await imageFileName(castImage);
        imageNames.set(castImage, name);
      }
      entry.castImageFile = name;
      if (!files.has(name)) files.set(name, () => urlToBlob(castImage));
    } else if (castImage !== undefined) {
      entry.castImage = castImage;
    }
    items.push(entry);
  }
  return { items, files, json: JSON.stringify(items) };
}

/** Rebuilds scenes from the server list: clip from this browser if it has it, else downloaded. */
async function hydrate<T extends WithVideo>(items: ServerItem[]): Promise<T[]> {
  const out: T[] = [];
  const images = new Map<string, string>();
  for (const item of items) {
    const { clipFile, remoteUrl, sourceImageFile, castImageFile, ...rest } = item;
    let videoUrl = '';
    if (clipFile) {
      const blob = (await localClip(item.id)) || (await getServerFile(clipFile).catch(() => null));
      if (blob) videoUrl = URL.createObjectURL(blob);
    } else if (remoteUrl) {
      videoUrl = remoteUrl;
    }
    if (!videoUrl) continue; // clip missing on the server too: drop the scene rather than show a dead player
    const scene: Record<string, unknown> = { ...rest, videoUrl };
    if (sourceImageFile) {
      let dataUrl = images.get(sourceImageFile);
      if (dataUrl === undefined) {
        dataUrl = await getServerFile(sourceImageFile).then(blobToDataUrl).catch(() => '');
        images.set(sourceImageFile, dataUrl);
        if (dataUrl) imageNames.set(dataUrl, sourceImageFile);
      }
      scene.sourceImage = dataUrl;
    }
    if (castImageFile) {
      let dataUrl = images.get(castImageFile);
      if (dataUrl === undefined) {
        dataUrl = await getServerFile(castImageFile).then(blobToDataUrl).catch(() => '');
        images.set(castImageFile, dataUrl);
        if (dataUrl) imageNames.set(dataUrl, castImageFile);
      }
      if (dataUrl) scene.castImage = dataUrl;
    }
    out.push(scene as unknown as T);
  }
  return out;
}

/**
 * Loads the saved scenes once on mount, then saves whenever the list changes (debounced): first
 * to this browser, then to the user's account.
 *
 * Server sync rules:
 * - Server newer and nothing changed here since the last sync → take the server's list (this is
 *   how a second device picks up the stories).
 * - Both changed → keep everything here and add the server's scenes this browser doesn't have, so
 *   nothing made on another device is lost.
 * - Otherwise upload missing clips/images, save the list, and remove files no scene uses.
 * Saving starts only after loading finished, so an empty first render never wipes a store.
 */
export function useStoryPersistence<T extends WithVideo>(
  history: T[],
  onLoaded: (items: T[]) => void,
  onError?: (message: string) => void,
  onMerged?: (extra: T[]) => void
) {
  const loaded = useRef(false);
  const storedIds = useRef(new Set<string>());
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;
  const onMergedRef = useRef(onMerged);
  onMergedRef.current = onMerged;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const historyRef = useRef(history);
  historyRef.current = history;

  const sync = useRef<SyncState | null>(null);
  const serverFiles = useRef<Set<string> | null>(null);
  const queued = useRef(false);
  const lastServerError = useRef('');

  const reconcile = async () => {
    if (!hasServerSession()) return;
    if (!sync.current) sync.current = await loadSyncState();
    const state = sync.current;
    const current = historyRef.current;
    const { items, files, json } = await toServerItems(current);
    const hash = await sha(json);

    const server = await getServerStory<ServerItem>();
    if (server.history && server.updatedAt > state.serverAt) {
      // Never synced from this browser: anything here counts as a local change, so it is kept.
      const changedHere = state.syncedHash ? hash !== state.syncedHash : current.length > 0;
      const emptyHere = current.length === 0;
      if (!changedHere || emptyHere) {
        const pulled = await hydrate<T>(server.history);
        const pulledHash = await sha((await toServerItems(pulled)).json);
        sync.current = { serverAt: server.updatedAt, syncedHash: pulledHash };
        await saveSyncState(sync.current);
        onLoadedRef.current(pulled);
        return;
      }
      const have = new Set(current.map((i) => i.id));
      const extra = await hydrate<T>(server.history.filter((i) => !have.has(i.id)));
      sync.current = { ...state, serverAt: server.updatedAt };
      if (extra.length && onMergedRef.current) {
        onMergedRef.current(extra); // the list changes, which saves (and uploads) again
        return;
      }
    }

    if (hash === sync.current.syncedHash && server.history) return;

    if (!serverFiles.current) serverFiles.current = await listServerFiles();
    for (const [name, getBlob] of files) {
      if (serverFiles.current.has(name)) continue;
      const blob = await getBlob();
      if (!blob) continue;
      await putServerFile(name, blob);
      serverFiles.current.add(name);
    }
    const updatedAt = Date.now();
    await putServerStory(items, updatedAt);
    sync.current = { serverAt: updatedAt, syncedHash: hash };
    await saveSyncState(sync.current);
    for (const name of [...serverFiles.current]) {
      if (files.has(name) || isBoardFile(name)) continue; // story-board pictures are kept by the board sync
      await deleteServerFile(name).catch(() => {});
      serverFiles.current.delete(name);
    }
  };

  const scheduleServerSync = () => {
    if (queued.current) return;
    queued.current = true;
    void queueServerTask(async () => {
      queued.current = false;
      try {
        await reconcile();
        lastServerError.current = '';
      } catch (err: any) {
        const message = `Your stories could not be saved to your account: ${err?.message || err}. They are still in this browser.`;
        if (message !== lastServerError.current) onErrorRef.current?.(message);
        lastServerError.current = message;
      }
    });
  };

  useEffect(() => {
    let cancelled = false;
    loadStory<T>()
      .then((items) => {
        if (cancelled) return;
        items.forEach((i) => i.videoUrl.startsWith('blob:') && storedIds.current.add(i.id));
        loaded.current = true;
        if (items.length) onLoadedRef.current(items);
        else scheduleServerSync(); // nothing here: fetch the account's stories now
      })
      .catch((err) => {
        // Still allow saving new work; a store that can't be read is replaced on the next save.
        if (!cancelled) loaded.current = true;
        onErrorRef.current?.(`Saved scenes could not be loaded: ${err?.message || err}`);
        if (!cancelled) scheduleServerSync();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const timer = setTimeout(() => {
      saveStory(history, storedIds.current)
        .catch((err) => onErrorRef.current?.(`Your scenes could not be saved in this browser: ${err?.message || err}`))
        .finally(scheduleServerSync);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);
}

/** Read/write one value in this browser's story database (used by the story board). */
export async function readMeta<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  try {
    const tx = db.transaction(META, 'readonly');
    return (await reqToPromise(tx.objectStore(META).get(key))) as T | undefined;
  } finally {
    db.close();
  }
}

export async function writeMeta(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(META, 'readwrite');
    tx.objectStore(META).put(value, key);
    await txDone(tx);
  } finally {
    db.close();
  }
}
