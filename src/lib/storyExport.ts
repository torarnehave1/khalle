/**
 * Export a story as one MP4, in the browser, with ffmpeg.wasm (same library and core as VEmotion).
 *
 * Each scene is cut to its edit-list segment [trimStart, trimEnd] and re-encoded to one common
 * format (size, 30 fps, H.264 + AAC stereo 48 kHz), because the clips come from different sources
 * (generated, uploaded) and a cut must land on an exact frame. Scenes without sound get silence,
 * so every segment has the same streams. The segments are then joined without re-encoding.
 *
 * ffmpeg.wasm is loaded on first export only (~30 MB from unpkg), not with the app.
 */
import type { FFmpeg } from '@ffmpeg/ffmpeg';

export type ExportScene = { videoUrl: string; trimStart?: number; trimEnd?: number };
export type ExportProgress = { step: string; fraction: number };

const CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
let ffmpegPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import('@ffmpeg/ffmpeg'), import('@ffmpeg/util')]);
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      return ffmpeg;
    })().catch((err) => {
      ffmpegPromise = null;
      throw err;
    });
  }
  return ffmpegPromise;
}

/** Runs `ffmpeg -i file` and reads duration / audio presence from its log. */
async function probe(ffmpeg: FFmpeg, name: string): Promise<{ duration: number; hasAudio: boolean }> {
  const lines: string[] = [];
  const onLog = ({ message }: { message: string }) => lines.push(message);
  ffmpeg.on('log', onLog);
  try {
    await ffmpeg.exec(['-hide_banner', '-i', name]); // exits non-zero (no output file); the log is what we want
  } finally {
    ffmpeg.off('log', onLog);
  }
  const log = lines.join('\n');
  const m = log.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const duration = m ? +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]) : NaN;
  return { duration, hasAudio: /Stream #\d+:\d+.*Audio:/.test(log) };
}

export async function exportStory(
  scenes: ExportScene[],
  aspectRatio: '9:16' | '16:9',
  onProgress: (p: ExportProgress) => void
): Promise<Blob> {
  if (!scenes.length) throw new Error('The story has no scenes to export.');
  const [W, H] = aspectRatio === '16:9' ? [1280, 720] : [720, 1280];

  onProgress({ step: 'Loading the video tools (first time only)…', fraction: 0.02 });
  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import('@ffmpeg/util');

  // Write each distinct clip once (split scenes share one clip).
  const sourceNames = new Map<string, string>();
  const sourceInfo = new Map<string, { duration: number; hasAudio: boolean }>();
  for (const scene of scenes) {
    if (sourceNames.has(scene.videoUrl)) continue;
    const name = `src${sourceNames.size}.mp4`;
    onProgress({ step: `Reading clip ${sourceNames.size + 1}…`, fraction: 0.05 });
    await ffmpeg.writeFile(name, await fetchFile(scene.videoUrl));
    sourceNames.set(scene.videoUrl, name);
    sourceInfo.set(name, await probe(ffmpeg, name));
  }

  const segmentNames: string[] = [];
  const written = [...sourceNames.values()];
  try {
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const src = sourceNames.get(scene.videoUrl)!;
      const info = sourceInfo.get(src)!;
      const start = Math.max(0, scene.trimStart ?? 0);
      // Some files (e.g. browser-recorded WebM) carry no duration in their header. Then the scene
      // runs to the clip's real end: no -t limit on the input, and the silence stops with the video.
      const end = scene.trimEnd ?? info.duration;
      const length = Number.isFinite(end) ? end - start : NaN;
      const knownLength = Number.isFinite(length);
      if (knownLength && length <= 0.05) continue;

      const out = `seg${i}.mp4`;
      const base = 0.1 + (0.85 * i) / scenes.length;
      const span = 0.85 / scenes.length;
      onProgress({ step: `Cutting scene ${i + 1} of ${scenes.length}…`, fraction: base });
      const onProg = ({ progress }: { progress: number }) =>
        onProgress({ step: `Cutting scene ${i + 1} of ${scenes.length}…`, fraction: base + span * Math.min(1, Math.max(0, progress)) });
      ffmpeg.on('progress', onProg);

      // Cut times sit on frame starts (e.g. a seam at frame 236 = 9.8333 s). Seek 5 ms early, so
      // rounding never drops the first frame or keeps the frame after the end.
      const seekAt = Math.max(0, start - 0.005);
      const lengthArgs = knownLength ? ['-t', (start + length - 0.005 - seekAt).toFixed(4)] : [];
      const args = ['-ss', seekAt.toFixed(4), ...lengthArgs, '-i', src];
      if (!info.hasAudio) args.push('-f', 'lavfi', ...lengthArgs, '-i', 'anullsrc=r=48000:cl=stereo');
      args.push(
        '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30`,
        '-map', '0:v:0',
        '-map', info.hasAudio ? '0:a:0' : '1:a:0',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '20', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
        ...(knownLength ? lengthArgs : ['-shortest']),
        out
      );
      let code: number;
      try {
        code = await ffmpeg.exec(args);
      } finally {
        ffmpeg.off('progress', onProg);
      }
      if (code !== 0) throw new Error(`Scene ${i + 1} could not be cut (ffmpeg exit ${code}).`);
      segmentNames.push(out);
    }
    if (!segmentNames.length) throw new Error('Every scene was trimmed to nothing.');

    onProgress({ step: 'Joining the scenes…', fraction: 0.96 });
    await ffmpeg.writeFile('list.txt', segmentNames.map((n) => `file '${n}'`).join('\n'));
    const code = await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', '-movflags', '+faststart', 'story.mp4']);
    if (code !== 0) throw new Error(`The scenes could not be joined (ffmpeg exit ${code}).`);
    const data = (await ffmpeg.readFile('story.mp4')) as Uint8Array;
    onProgress({ step: 'Done', fraction: 1 });
    return new Blob([new Uint8Array(data)], { type: 'video/mp4' });
  } finally {
    for (const n of [...written, ...segmentNames, 'list.txt', 'story.mp4']) {
      await ffmpeg.deleteFile(n).catch(() => {});
    }
  }
}
