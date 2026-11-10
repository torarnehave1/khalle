/**
 * Keeps the story boards: a copy in this browser (IndexedDB, same database as the scenes) and in
 * the signed-in user's account (the `boards` field of gemini.vegvisr.org /v1/stories).
 *
 * On the server a board holds no picture bytes: each picture is a file `board-<sha256>` and the
 * board names it (`imageFile`). Boards are merged by id, the newer `updatedAt` wins, so work from
 * another device is picked up. A removed board stays as `deleted: true` so it does not come back.
 */
import { useEffect, useRef, useState } from 'react';
import type { Board } from '../api/board';
import {
  boardImageFileName,
  deleteServerFile,
  getServerFile,
  getServerStory,
  hasServerSession,
  isBoardFile,
  listServerFiles,
  putServerBoards,
  putServerFile,
} from '../api/storyServer';
import { queueServerTask, readMeta, writeMeta } from './storyStore';

const KEY = 'boards';

type Stored = Record<string, unknown> & { image?: string; imageFile?: string };

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

const names = new Map<string, string>(); // data URL → file name

async function fileNameOf(dataUrl: string): Promise<string> {
  let n = names.get(dataUrl);
  if (!n) {
    n = await boardImageFileName(dataUrl);
    names.set(dataUrl, n);
  }
  return n;
}

/** Board → server form: pictures replaced by file names; returns the files the boards use. */
async function toServer(boards: Board[]) {
  const files = new Map<string, string>(); // name → data URL
  const strip = async <T extends Stored>(item: T): Promise<T> => {
    if (!item.image || !item.image.startsWith('data:')) return item;
    const name = await fileNameOf(item.image);
    files.set(name, item.image);
    const { image: _i, ...rest } = item;
    return { ...(rest as T), imageFile: name };
  };
  const out = [];
  for (const b of boards) {
    out.push({
      ...b,
      cast: b.deleted ? [] : await Promise.all(b.cast.map((c) => strip(c as unknown as Stored))),
      scenes: b.deleted ? [] : await Promise.all(b.scenes.map((s) => strip(s as unknown as Stored))),
    });
  }
  return { boards: out, files };
}

async function fromServer(raw: unknown[]): Promise<Board[]> {
  const cache = new Map<string, string>();
  const fill = async (item: Stored) => {
    if (!item.imageFile) return item;
    let url = cache.get(item.imageFile);
    if (url === undefined) {
      url = await getServerFile(item.imageFile).then(blobToDataUrl).catch(() => '');
      cache.set(item.imageFile, url);
      if (url) names.set(url, item.imageFile);
    }
    const { imageFile: _f, ...rest } = item;
    return url ? { ...rest, image: url } : rest;
  };
  const out: Board[] = [];
  for (const b of raw as any[]) {
    if (!b?.id) continue;
    out.push({
      ...b,
      cast: (await Promise.all(((b.cast as Stored[]) || []).map(fill))).filter((c: any) => c.image),
      scenes: await Promise.all(((b.scenes as Stored[]) || []).map(fill)),
    } as Board);
  }
  return out;
}

/** Newer updatedAt wins per board id. */
function merge(a: Board[], b: Board[]): Board[] {
  const byId = new Map<string, Board>();
  for (const x of [...a, ...b]) {
    const have = byId.get(x.id);
    if (!have || x.updatedAt > have.updatedAt) byId.set(x.id, x);
  }
  return [...byId.values()].sort((x, y) => y.updatedAt - x.updatedAt);
}

const fingerprint = (boards: Board[]) => JSON.stringify(boards.map((b) => [b.id, b.updatedAt, !!b.deleted]));

export function useBoards(onError?: (message: string) => void) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);
  const synced = useRef('');
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const boardsRef = useRef(boards);
  boardsRef.current = boards;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let local: Board[] = [];
      try {
        local = (await readMeta<Board[]>(KEY)) || [];
      } catch {
        /* unreadable: start empty, the server copy fills it */
      }
      if (!cancelled) setBoards(local);
      try {
        if (hasServerSession()) {
          const server = await getServerStory();
          const remote = server.boards ? await fromServer(server.boards) : [];
          synced.current = fingerprint(remote);
          if (!cancelled) setBoards((cur) => merge(cur.length ? cur : local, remote));
        }
      } catch (err: any) {
        onErrorRef.current?.(`Story boards could not be loaded from your account: ${err?.message || err}. The copy in this browser is used.`);
      }
      loaded.current = true;
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const timer = setTimeout(() => {
      writeMeta(KEY, boards).catch(() => {});
      const fp = fingerprint(boards);
      if (!hasServerSession() || fp === synced.current) return;
      void queueServerTask(async () => {
        try {
          // Merge with what the account has now: a board changed on another device since this
          // browser loaded is newer there, and is kept (and shown here) instead of overwritten.
          const server = await getServerStory();
          const remoteRaw = (server.boards || []) as any[];
          const mine = new Map(boardsRef.current.map((b) => [b.id, b]));
          const newerThere = remoteRaw.filter((r) => r?.id && (!mine.has(r.id) || Number(r.updatedAt) > mine.get(r.id)!.updatedAt));
          const keepIds = new Set(newerThere.map((r) => r.id));
          const { boards: serverBoards, files } = await toServer(boardsRef.current.filter((b) => !keepIds.has(b.id)));
          const used = new Set(files.keys());
          for (const r of newerThere) for (const it of [...(r.cast || []), ...(r.scenes || [])]) if (it?.imageFile) used.add(it.imageFile);
          const have = await listServerFiles();
          for (const [name, dataUrl] of files) {
            if (have.has(name)) continue;
            await putServerFile(name, await (await fetch(dataUrl)).blob());
          }
          const all = [...serverBoards, ...newerThere];
          await putServerBoards(all, server);
          for (const name of have) {
            if (isBoardFile(name) && !used.has(name)) await deleteServerFile(name).catch(() => {});
          }
          if (newerThere.length) {
            const pulled = await fromServer(newerThere);
            setBoards((cur) => merge(cur, pulled));
          } else {
            synced.current = fp;
          }
        } catch (err: any) {
          onErrorRef.current?.(`The story board could not be saved to your account: ${err?.message || err}. It is still in this browser.`);
        }
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [boards]);

  return { boards: boards.filter((b) => !b.deleted), allBoards: boards, setBoards, ready };
}
