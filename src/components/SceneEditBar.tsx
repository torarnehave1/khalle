import { useEffect, useState, type RefObject } from 'react';
import { Scissors, CornerDownRight, CornerDownLeft, RotateCcw } from 'lucide-react';
import { formatSeconds } from '../lib/trimPlayback';

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  src: string;
  trimStart?: number;
  trimEnd?: number;
  onTrim: (trimStart: number | undefined, trimEnd: number | undefined) => void;
  onSplit: (atSeconds: number) => void;
};

/**
 * Edit the selected scene without re-encoding: set where it starts and ends, or split it in two
 * at the playhead. Pause the video on the frame you want, then use the buttons.
 */
export default function SceneEditBar({ videoRef, src, trimStart, trimEnd, onTrim, onSplit }: Props) {
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(NaN);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const update = () => {
      setTime(v.currentTime);
      if (Number.isFinite(v.duration)) setLength(v.duration);
    };
    update();
    v.addEventListener('timeupdate', update);
    v.addEventListener('seeked', update);
    v.addEventListener('loadedmetadata', update);
    return () => {
      v.removeEventListener('timeupdate', update);
      v.removeEventListener('seeked', update);
      v.removeEventListener('loadedmetadata', update);
    };
  }, [videoRef, src]);

  const start = trimStart ?? 0;
  const end = trimEnd ?? length;
  const trimmed = trimStart !== undefined || trimEnd !== undefined;
  const insideSegment = time > start + 0.1 && time < end - 0.1;

  const btn =
    'flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-wrap items-center gap-2 text-xs">
      <span className="font-mono text-slate-300 tabular-nums" aria-live="off">
        {formatSeconds(time)} / {formatSeconds(length)}
      </span>
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
  );
}
