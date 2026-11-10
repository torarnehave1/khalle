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
    // Frame-exact stop: when the frame on screen is the last one before `end`, a timer ends the
    // segment when that frame's time is up, so the frame at `end` (e.g. one the next scene's chain
    // replaced) is never shown. The per-frame check alone fires one frame late.
    let pendingStop: number | null = null;
    let frameDur = 1 / 24;
    let lastMediaTime = NaN;
    const clearPending = () => {
      if (pendingStop !== null) window.clearTimeout(pendingStop);
      pendingStop = null;
    };

    const seekToStart = () => {
      if (start > 0 && Math.abs(v.currentTime - start) > 0.05) v.currentTime = start;
    };
    const check = () => {
      // Paused = the user is scrubbing or stepping: they may look anywhere in the clip.
      if (v.paused) {
        fired = false;
        clearPending();
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

    type FrameMeta = { mediaTime: number; expectedDisplayTime: number };
    const anyV = v as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number, meta: FrameMeta) => void) => number;
      cancelVideoFrameCallback?: (h: number) => void;
    };
    const scheduleStop = (meta: FrameMeta | undefined) => {
      if (!meta || v.paused || fired || pendingStop !== null) return;
      const mt = meta.mediaTime;
      const step = mt - lastMediaTime;
      if (step > 0.005 && step < 0.1) frameDur = step;
      lastMediaTime = mt;
      // Where the segment stops: its end, or (not looping) the clip's last frame, so the next scene
      // does not wait for the browser's late `ended` event. The file's duration can run past the
      // last frame (audio), hence two frames of slack there.
      let stopAt: number | undefined;
      if (end !== undefined) {
        if (mt < end && mt + frameDur >= end - 0.002) stopAt = end;
      } else if (!v.loop && Number.isFinite(v.duration) && mt + 2 * frameDur > v.duration) {
        stopAt = mt + frameDur;
      }
      if (stopAt === undefined) return;
      const rate = v.playbackRate || 1;
      // Half a frame early: the timer must win the race against the compositor showing the next frame.
      const ms = meta.expectedDisplayTime + (((stopAt - mt) - frameDur / 2) * 1000) / rate - performance.now();
      pendingStop = window.setTimeout(() => {
        pendingStop = null;
        if (!v.paused && !fired && v.currentTime >= start) {
          fired = true;
          onEndRef.current();
        }
      }, Math.max(0, ms));
    };
    const loopFrames = (_now?: number, meta?: FrameMeta) => {
      scheduleStop(meta);
      check();
      if (anyV.requestVideoFrameCallback) rvfcHandle = anyV.requestVideoFrameCallback(loopFrames);
    };

    // Play pressed while the playhead sits outside the segment (after scrubbing): start the segment.
    const onSeeking = () => {
      clearPending();
      lastMediaTime = NaN;
    };
    const onPlay = () => {
      if (v.currentTime < start - 0.05 || (end !== undefined && v.currentTime >= end - 0.05)) v.currentTime = start;
    };

    if (v.readyState >= 1) seekToStart();
    v.addEventListener('loadedmetadata', seekToStart);
    v.addEventListener('play', onPlay);
    v.addEventListener('timeupdate', check);
    v.addEventListener('seeked', check);
    v.addEventListener('seeking', onSeeking);
    if (anyV.requestVideoFrameCallback) rvfcHandle = anyV.requestVideoFrameCallback(loopFrames);

    return () => {
      v.removeEventListener('loadedmetadata', seekToStart);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('timeupdate', check);
      v.removeEventListener('seeked', check);
      v.removeEventListener('seeking', onSeeking);
      clearPending();
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
