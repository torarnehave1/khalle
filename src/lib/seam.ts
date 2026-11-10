/**
 * Where an extension's own new part begins inside its clip, and where the scene before it must stop.
 *
 * Gemini returns an extension as the whole chain (scene 1 + 2 + … + the new part), and the new part
 * overwrites the last 4 frames of the clip it continues. Measured 2026-11-10 on one story's chain
 * files (24 fps): scene 2's 480-frame chain starts its new part at frame 236, scene 3's 720-frame
 * chain keeps scene 2's frames 0–475 and starts at frame 476. So:
 *   - the new part starts at (chain frames − own frames − 4), not at (chain − own);
 *   - the scene before it must stop at that same frame, or it shows 4 frames the chain replaced.
 * The frame is refined by looking for the one-frame jump in the picture within ±3 frames.
 */

export const GEMINI_FPS = 24;
export const EXTENSION_OVERLAP_FRAMES = 4;
const SEARCH_FRAMES = 3;

type SeamScene = {
  id: string;
  interactionId?: string;
  previousInteractionId?: string;
  trimStart?: number;
  trimEnd?: number;
  seamStart?: number;
  clipSeconds?: number;
  duration?: string;
};

export type SeamResult = {
  /** Length of the clip file in seconds. */
  clipSeconds: number;
  /** Time where the new part begins (start of its first frame), or undefined when the clip is not a chain. */
  seamStart?: number;
  /** True when the picture showed the jump; false when the frame count alone was used. */
  detected: boolean;
};

function waitFor(v: HTMLVideoElement, event: string, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      v.removeEventListener(event, done);
      reject(new Error(`Timed out waiting for ${event}.`));
    }, ms);
    const done = () => {
      clearTimeout(timer);
      v.removeEventListener(event, done);
      resolve();
    };
    v.addEventListener(event, done);
  });
}

/** Finds where an extension's new part starts in its clip. `ownSeconds` is the scene's own length. */
export async function findExtensionSeam(videoUrl: string, ownSeconds: number): Promise<SeamResult> {
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.crossOrigin = 'anonymous';
  v.src = videoUrl;
  try {
    await Promise.race([
      waitFor(v, 'loadedmetadata', 20000),
      waitFor(v, 'error', 20000).then(() => {
        throw new Error('The clip could not be read.');
      }),
    ]);
    const clipSeconds = Number.isFinite(v.duration) ? v.duration : NaN;
    if (!Number.isFinite(clipSeconds) || !(ownSeconds > 0) || clipSeconds <= ownSeconds + 0.5) {
      return { clipSeconds, detected: false };
    }
    // The file's duration can include a few ms of audio past the last frame: floor, not round.
    const parentFrames = Math.floor((clipSeconds - ownSeconds) * GEMINI_FPS + 0.01);
    const expected = parentFrames - EXTENSION_OVERLAP_FRAMES;
    if (expected <= SEARCH_FRAMES + 1) return { clipSeconds, detected: false };

    let best = expected;
    let detected = false;
    try {
      // Frames expected-4 … expected+3: the change into each frame from the one before it.
      const first = expected - SEARCH_FRAMES - 1;
      const last = expected + SEARCH_FRAMES;
      const w = 72;
      const h = Math.max(1, Math.round((w * (v.videoHeight || 16)) / (v.videoWidth || 9)));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('no canvas');
      const frames: Float32Array[] = [];
      for (let k = first; k <= last; k++) {
        const seeked = waitFor(v, 'seeked', 5000);
        v.currentTime = (k + 0.5) / GEMINI_FPS;
        await seeked;
        ctx.drawImage(v, 0, 0, w, h);
        const px = ctx.getImageData(0, 0, w, h).data;
        const gray = new Float32Array(w * h);
        for (let i = 0; i < gray.length; i++) gray[i] = px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114;
        frames.push(gray);
      }
      const diffs: { k: number; d: number }[] = [];
      for (let i = 1; i < frames.length; i++) {
        let s = 0;
        for (let j = 0; j < frames[i].length; j++) s += Math.abs(frames[i][j] - frames[i - 1][j]);
        diffs.push({ k: first + i, d: s / frames[i].length });
      }
      const sorted = [...diffs].sort((a, b) => b.d - a.d);
      const rest = sorted.slice(1).map((x) => x.d).sort((a, b) => a - b);
      const median = rest[Math.floor(rest.length / 2)] || 0;
      // The seam is a whole-picture redraw: clearly larger than the frames around it.
      if (sorted[0] && sorted[0].d > median * 1.15 && sorted[0].d > 0.5) {
        best = sorted[0].k;
        detected = true;
      }
    } catch {
      /* frames not readable (e.g. no CORS): the frame count alone is still right for Gemini chains */
    }
    return { clipSeconds, seamStart: best / GEMINI_FPS, detected };
  } finally {
    v.removeAttribute('src');
    v.load();
  }
}

/**
 * Where `scene` should stop when `next` plays right after it in the story. The user's own trimEnd
 * wins. Otherwise, when `next` is the extension made from this scene, stop at `next`'s seam: the
 * frames after it were replaced in the chain. Both clips share one timeline (the chain starts at
 * scene 1's first frame), so the seam time applies to this clip too.
 */
export function storyPlayEnd(scene: SeamScene, next: SeamScene | undefined): number | undefined {
  if (scene.trimEnd !== undefined) return scene.trimEnd;
  if (!next || next.seamStart === undefined || !scene.interactionId) return undefined;
  if (next.previousInteractionId !== scene.interactionId) return undefined;
  const start = scene.trimStart ?? 0;
  if (next.seamStart <= start + 0.5) return undefined;
  const clipEnd = scene.clipSeconds ?? (parseInt(scene.duration || '', 10) || Infinity);
  if (next.seamStart > clipEnd + 0.05) return undefined;
  return next.seamStart;
}
