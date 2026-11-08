import { useEffect, useRef, type RefObject } from 'react';

/**
 * Plays only [trimStart, trimEnd] of a clip. The clip file is never cut: the edit list stores
 * the two times, and the player seeks to the start and treats trimEnd as the end of the scene.
 *
 * Uses requestVideoFrameCallback where the browser has it (frame-accurate stop), otherwise the
 * timeupdate event (~4×/s, so the stop can be up to ~250 ms late — preview only; the final
 * export cuts exactly).
 */
export function useTrimmedPlayback(
  videoRef: RefObject<HTMLVideoElement | null>,
  src: string | undefined,
  trimStart: number | undefined,
  trimEnd: number | undefined,
  onSegmentEnd: () => void
) {
  const onEndRef = useRef(onSegmentEnd);
  onEndRef.current = onSegmentEnd;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const start = trimStart && trimStart > 0 ? trimStart : 0;
    const end = trimEnd && trimEnd > start ? trimEnd : undefined;
    let fired = false;
    let rvfcHandle: number | null = null;

    const seekToStart = () => {
      if (start > 0 && Math.abs(v.currentTime - start) > 0.05) v.currentTime = start;
    };
    const check = () => {
      // Paused = the user is scrubbing or stepping: they may look anywhere in the clip.
      if (v.paused) {
        fired = false;
        return;
      }
      // Native loop / restart jumps to 0: bring it back inside the segment.
      if (start > 0 && v.currentTime < start - 0.05) {
        v.currentTime = start;
        fired = false;
        return;
      }
      if (end !== undefined && v.currentTime >= end) {
        if (!fired) {
          fired = true;
          onEndRef.current();
        }
      } else {
        fired = false;
      }
    };

    const anyV = v as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
      cancelVideoFrameCallback?: (h: number) => void;
    };
    const loopFrames = () => {
      check();
      if (anyV.requestVideoFrameCallback) rvfcHandle = anyV.requestVideoFrameCallback(loopFrames);
    };

    // Play pressed while the playhead sits outside the segment (after scrubbing): start the segment.
    const onPlay = () => {
      if (v.currentTime < start - 0.05 || (end !== undefined && v.currentTime >= end - 0.05)) v.currentTime = start;
    };

    if (v.readyState >= 1) seekToStart();
    v.addEventListener('loadedmetadata', seekToStart);
    v.addEventListener('play', onPlay);
    v.addEventListener('timeupdate', check);
    v.addEventListener('seeked', check);
    if (anyV.requestVideoFrameCallback) rvfcHandle = anyV.requestVideoFrameCallback(loopFrames);

    return () => {
      v.removeEventListener('loadedmetadata', seekToStart);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('timeupdate', check);
      v.removeEventListener('seeked', check);
      if (rvfcHandle !== null && anyV.cancelVideoFrameCallback) anyV.cancelVideoFrameCallback(rvfcHandle);
    };
  }, [videoRef, src, trimStart, trimEnd]);
}

export const formatSeconds = (s: number) => {
  if (!Number.isFinite(s)) return '–';
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(1).padStart(4, '0')}`;
};
