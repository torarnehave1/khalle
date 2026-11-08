import { useCallback, useEffect, useRef, useState, type RefObject, type PointerEvent as ReactPointerEvent } from 'react';
import { Scissors, CornerDownRight, CornerDownLeft, RotateCcw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { formatSeconds } from '../lib/trimPlayback';
import { grabThumbnails } from '../lib/frameGrab';

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  src: string;
  trimStart?: number;
  trimEnd?: number;
  onTrim: (trimStart: number | undefined, trimEnd: number | undefined) => void;
  onSplit: (atSeconds: number) => void;
};

const THUMBS = 10;
const FRAME = 1 / 30;

/**
 * Edit the selected scene without re-encoding. Drag on the timeline (or use the step buttons /
 * arrow keys) to find a frame, then set where the scene starts and ends, or split it there.
 */
export default function SceneEditBar({ videoRef, src, trimStart, trimEnd, onTrim, onSplit }: Props) {
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(NaN);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let raf = 0;
    const update = () => {
      setTime(v.currentTime);
      if (Number.isFinite(v.duration)) setLength(v.duration);
    };
    // Smooth playhead while playing; timeupdate alone moves it only ~4 times a second.
    const tick = () => {
      update();
      if (!v.paused) raf = requestAnimationFrame(tick);
    };
    const onPlay = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    update();
    v.addEventListener('timeupdate', update);
    v.addEventListener('seeked', update);
    v.addEventListener('loadedmetadata', update);
    v.addEventListener('durationchange', update);
    v.addEventListener('play', onPlay);
    if (!v.paused) onPlay();
    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener('timeupdate', update);
      v.removeEventListener('seeked', update);
      v.removeEventListener('loadedmetadata', update);
      v.removeEventListener('durationchange', update);
      v.removeEventListener('play', onPlay);
    };
  }, [videoRef, src]);

  // Thumbnail strip, built once per clip.
  useEffect(() => {
    setThumbs([]);
    if (!Number.isFinite(length) || length <= 0) return;
    let cancelled = false;
    const times = Array.from({ length: THUMBS }, (_, i) => ((i + 0.5) * length) / THUMBS);
    grabThumbnails(src, times)
      .then((t) => !cancelled && setThumbs(t))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src, length]);

  const seek = useCallback(
    (t: number) => {
      const v = videoRef.current;
      if (!v) return;
      const max = Number.isFinite(v.duration) ? v.duration : length;
      if (!v.paused) v.pause();
      const clamped = Math.max(0, Math.min(Number.isFinite(max) ? max - 0.001 : t, t));
      v.currentTime = clamped;
      setTime(clamped);
    },
    [videoRef, length]
  );

  const timeAtPointer = (e: ReactPointerEvent) => {
    const el = trackRef.current;
    if (!el || !Number.isFinite(length)) return 0;
    const r = el.getBoundingClientRect();
    return (Math.max(0, Math.min(r.width, e.clientX - r.left)) / r.width) * length;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!Number.isFinite(length)) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    seek(timeAtPointer(e));
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) seek(timeAtPointer(e));
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 1 : FRAME;
    if (e.key === 'ArrowLeft') seek(time - step);
    else if (e.key === 'ArrowRight') seek(time + step);
    else if (e.key === 'Home') seek(trimStart ?? 0);
    else if (e.key === 'End' && Number.isFinite(length)) seek((trimEnd ?? length) - FRAME);
    else return;
    e.preventDefault();
  };

  const start = trimStart ?? 0;
  const end = trimEnd ?? length;
  const trimmed = trimStart !== undefined || trimEnd !== undefined;
  const insideSegment = time > start + 0.1 && time < end - 0.1;
  const pct = (t: number) => (Number.isFinite(length) && length > 0 ? `${(Math.max(0, Math.min(length, t)) / length) * 100}%` : '0%');

  const btn =
    'flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
  const stepBtn = 'p-1 rounded-md border border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-500 cursor-pointer';

  return (
    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col gap-2 text-xs">
      {/* Timeline: drag to scrub, arrow keys step one frame (Shift = 1 s) */}
      {Number.isFinite(length) ? (
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Scene timeline"
          aria-valuemin={0}
          aria-valuemax={Math.round(length * 10) / 10}
          aria-valuenow={Math.round(time * 10) / 10}
          aria-valuetext={formatSeconds(time)}
          className="relative h-12 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 cursor-ew-resize select-none touch-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <div className="absolute inset-0 flex pointer-events-none">
            {Array.from({ length: THUMBS }, (_, i) =>
              thumbs[i] ? (
                <img key={i} src={thumbs[i]} alt="" draggable={false} className="h-full flex-1 min-w-0 object-cover" />
              ) : (
                <div key={i} className="h-full flex-1 border-r border-slate-800/60" />
              )
            )}
          </div>
          {/* Dim what the scene does not play */}
          <div className="absolute inset-y-0 left-0 bg-black/65 pointer-events-none" style={{ width: pct(start) }} />
          <div className="absolute inset-y-0 right-0 bg-black/65 pointer-events-none" style={{ left: pct(end) }} />
          <div
            className="absolute inset-y-0 border-y-2 border-emerald-500/80 pointer-events-none"
            style={{ left: pct(start), right: `calc(100% - ${pct(end)})` }}
          />
          {/* Playhead */}
          <div className="absolute inset-y-0 w-0.5 -ml-px bg-amber-300 shadow-[0_0_4px_rgba(0,0,0,0.8)] pointer-events-none" style={{ left: pct(time) }}>
            <div className="absolute -top-0.5 -left-[5px] w-3 h-2 bg-amber-300 rounded-b-sm" />
          </div>
        </div>
      ) : (
        <div className="h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
          This clip does not report its length, so the timeline is off. Play it once to the end and it appears.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" className={stepBtn} title="Back 1 second (Shift+←)" onClick={() => seek(time - 1)}>
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button type="button" className={stepBtn} title="Back 1 frame (←)" onClick={() => seek(time - FRAME)}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-slate-300 tabular-nums px-1" aria-live="off">
            {formatSeconds(time)} / {formatSeconds(length)}
          </span>
          <button type="button" className={stepBtn} title="Forward 1 frame (→)" onClick={() => seek(time + FRAME)}>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button type="button" className={stepBtn} title="Forward 1 second (Shift+→)" onClick={() => seek(time + 1)}>
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className="text-slate-500">
          Plays {formatSeconds(start)}–{formatSeconds(end)}
        </span>
        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
          <button
            type="button"
            className={`${btn} border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-500`}
            title="This scene starts at the current frame"
            disabled={time >= end - 0.1}
            onClick={() => onTrim(time > 0.05 ? time : undefined, trimEnd)}
          >
            <CornerDownRight className="w-3 h-3" /> Start here
          </button>
          <button
            type="button"
            className={`${btn} border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-500`}
            title="This scene ends at the current frame"
            disabled={time <= start + 0.1}
            onClick={() => onTrim(trimStart, Number.isFinite(length) && time >= length - 0.05 ? undefined : time)}
          >
            <CornerDownLeft className="w-3 h-3" /> End here
          </button>
          <button
            type="button"
            className={`${btn} border-amber-600/50 bg-amber-950/40 text-amber-200 hover:bg-amber-900/50`}
            title="Split this scene in two at the current frame, so a new scene can go in between"
            disabled={!insideSegment}
            onClick={() => onSplit(time)}
          >
            <Scissors className="w-3 h-3" /> Split here
          </button>
          {trimmed && (
            <button
              type="button"
              className={`${btn} border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200`}
              title="Play the whole clip again"
              onClick={() => onTrim(undefined, undefined)}
            >
              <RotateCcw className="w-3 h-3" /> Full clip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
