/**
 * Keeps the user's scenes across reloads, in this browser only (IndexedDB).
 *
 * - `clips` store: one Blob per scene id (the video bytes).
 * - `meta` store: key 'history' → the scene list without `videoUrl` (the URL is rebuilt from the
 *   Blob as a blob: URL on load, so the list stays small).
 *
 * One database per signed-in email, so two people on the same browser don't see each other's work.
 */
import { useEffect, useRef } from 'react';
import { readStoredUser } from './auth';

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

/**
 * Loads the saved scenes once on mount, then saves whenever the list changes (debounced).
 * Saving starts only after loading finished, so an empty first render never wipes the store.
 */
export function useStoryPersistence<T extends WithVideo>(
  history: T[],
  onLoaded: (items: T[]) => void,
  onError?: (message: string) => void
) {
  const loaded = useRef(false);
  const storedIds = useRef(new Set<string>());
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    let cancelled = false;
    loadStory<T>()
      .then((items) => {
        if (cancelled) return;
        items.forEach((i) => i.videoUrl.startsWith('blob:') && storedIds.current.add(i.id));
        loaded.current = true;
        if (items.length) onLoadedRef.current(items);
      })
      .catch((err) => {
        // Still allow saving new work; a store that can't be read is replaced on the next save.
        if (!cancelled) loaded.current = true;
        onError?.(`Saved scenes could not be loaded: ${err?.message || err}`);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const timer = setTimeout(() => {
      saveStory(history, storedIds.current).catch((err) =>
        onError?.(`Your scenes could not be saved in this browser: ${err?.message || err}`)
      );
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);
}
