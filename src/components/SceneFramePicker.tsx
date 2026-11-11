import { useEffect, useRef, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { grabFrame } from '../lib/frameGrab';

export type FrameSourceStory = {
  storyId: string;
  title: string;
  scenes: { id: string; sceneNumber: number; videoUrl: string; text: string; trimStart?: number; trimEnd?: number }[];
};

type Props = {
  stories: FrameSourceStory[];
  /** Which story to open first (e.g. the board's own story). */
  initialStoryId?: string;
  /** What the frame becomes, e.g. "Key picture for Scene 3". */
  useLabel: string;
  onClose: () => void;
  onUse: (dataUrl: string) => void;
};

/** "From a scene": pick a scene from any story, find the frame, use it as a picture. */
export default function SceneFramePicker({ stories, initialStoryId, useLabel, onClose, onUse }: Props) {
  const [storyId, setStoryId] = useState(() =>
    initialStoryId && stories.some((s) => s.storyId === initialStoryId) ? initialStoryId : stories[0]?.storyId || ''
  );
  const story = stories.find((s) => s.storyId === storyId);
  const [sceneId, setSceneId] = useState<string>('');
  const scene = story?.scenes.find((s) => s.id === sceneId);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [at, setAt] = useState(0);
  const [len, setLen] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Open on the story's last scene, at the end of its own part (where the next scene would start).
  useEffect(() => {
    const last = story?.scenes[story.scenes.length - 1];
    setSceneId(last?.id || '');
  }, [storyId]);

  const start = scene?.trimStart ?? 0;
  const end = scene ? Math.min(scene.trimEnd ?? len, len || Number.POSITIVE_INFINITY) : 0;

  const use = async () => {
    if (!scene) return;
    setBusy(true);
    setError(null);
    try {
      videoRef.current?.pause();
      onUse(await grabFrame(scene.videoUrl, at));
    } catch (e: any) {
      setError(`The frame could not be taken: ${e?.message || e}`);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="frame-title" className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full shadow-2xl flex flex-col max-h-[94vh]">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <h3 id="frame-title" className="font-semibold text-lg text-white">From a scene</h3>
            <p className="text-sm text-slate-400 mt-0.5">Pick a scene from any of your stories, then the frame to use as a picture.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="min-w-[44px] min-h-[44px] rounded-lg border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap flex-1 min-h-0 overflow-y-auto">
          <nav aria-label="Stories" className="flex-[0_0_240px] max-sm:flex-[1_1_100%] border-r border-slate-800 p-4 flex flex-col gap-1 max-h-[70vh] overflow-y-auto">
            {!stories.length && <p className="text-sm text-slate-400">No scenes yet. Make a scene first.</p>}
            {stories.map((s) => (
              <button
                key={s.storyId}
                type="button"
                aria-current={s.storyId === storyId}
                onClick={() => setStoryId(s.storyId)}
                className={`text-left min-h-[40px] px-3 rounded-lg border text-sm flex items-center gap-2 cursor-pointer ${s.storyId === storyId ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'border-transparent text-slate-300 hover:bg-slate-800'}`}
              >
                <span className="truncate">{s.title}</span>
                <span className="ml-auto text-xs text-slate-400">{s.scenes.length}</span>
              </button>
            ))}
          </nav>

          <div className="flex-[1_1_420px] min-w-0 p-4 sm:p-5 flex flex-col gap-3">
            {story && (
              <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Scenes">
                {story.scenes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={s.id === sceneId}
                    onClick={() => setSceneId(s.id)}
                    className={`shrink-0 w-[92px] rounded-lg overflow-hidden border-2 text-left cursor-pointer ${s.id === sceneId ? 'border-emerald-400' : 'border-slate-800 hover:border-slate-600'}`}
                  >
                    <video src={`${s.videoUrl}#t=${(s.trimStart ?? 0) + 0.3}`} muted playsInline preload="metadata" className="w-full h-[120px] object-cover bg-black pointer-events-none" />
                    <span className="block px-1.5 py-1 text-[11px] text-slate-300 truncate">Scene {s.sceneNumber}</span>
                  </button>
                ))}
              </div>
            )}
            {scene && (
              <div className="flex flex-col gap-2 bg-slate-950 border border-emerald-700/60 rounded-xl p-3">
                <span className="text-sm text-slate-200">
                  <strong className="text-white">Scene {scene.sceneNumber}.</strong> Play, pause or drag to the frame you want.
                </span>
                <video
                  key={scene.id}
                  ref={videoRef}
                  src={scene.videoUrl}
                  crossOrigin="anonymous"
                  controls
                  muted
                  playsInline
                  preload="auto"
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    setLen(v.duration || 0);
                    const to = Math.max(scene.trimStart ?? 0, Math.min(scene.trimEnd ?? v.duration, v.duration) - 0.1);
                    v.currentTime = to;
                    setAt(to);
                  }}
                  onTimeUpdate={(e) => setAt(e.currentTarget.currentTime)}
                  className="max-h-[44vh] w-auto self-center rounded-lg bg-black"
                />
                {len > 0 && (
                  <div className="flex items-center gap-3">
                    <label htmlFor="scene-frame-at" className="text-xs text-slate-400 shrink-0">Frame at {(at - start).toFixed(1)} s</label>
                    <input
                      id="scene-frame-at"
                      type="range"
                      min={start}
                      max={end}
                      step={0.04}
                      value={Math.min(Math.max(at, start), end)}
                      onChange={(e) => {
                        const t = Number(e.target.value);
                        setAt(t);
                        const v = videoRef.current;
                        if (v) {
                          v.pause();
                          v.currentTime = t;
                        }
                      }}
                      className="flex-1 accent-emerald-400"
                    />
                  </div>
                )}
                {scene.text && <p className="text-xs text-slate-400 line-clamp-2">{scene.text}</p>}
              </div>
            )}
            {error && <p className="text-sm text-rose-300">{error}</p>}
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-slate-800 flex flex-wrap items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="min-h-[44px] px-4 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-slate-500 cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            disabled={!scene || busy}
            onClick={use}
            className="min-h-[48px] px-5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
          >
            {busy && <RefreshCw className="w-4 h-4 animate-spin" />}
            Use this frame · {useLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
