import { useEffect, useState } from 'react';
import { X, Wand2, Eye, RefreshCw, ArrowRight } from 'lucide-react';
import type { GeneratedVideo } from '../App';
import { grabFrame, imageToDataUrl } from '../lib/frameGrab';
import { analyzeCut } from '../api/cutAnalysis';
import { DEFAULT_BEFORE_PROMPT, DEFAULT_TRANSITION_PROMPT, TRANSITION_MAX_SECONDS, TRANSITION_MIN_SECONDS } from '../api/transition';

type Props = {
  /** The scene before the cut. Null for a new scene before the first scene: it starts on `startImage`. */
  from: GeneratedVideo | null;
  startImage?: string;
  to: GeneratedVideo;
  busy: boolean;
  error?: string | null;
  onClose: () => void;
  onGenerate: (args: { firstFrame: string; lastFrame: string; prompt: string; seconds: number }) => void;
};

/**
 * Smooth the cut between two scenes: Gemini generates a clip that starts on the last frame of
 * the first scene and ends on the first frame of the next one (first-and-last-frame mode).
 */
export default function TransitionModal({ from, startImage, to, busy, error, onClose, onGenerate }: Props) {
  const isBefore = !from;
  const toNo = to.sceneNumber;
  const [firstFrame, setFirstFrame] = useState<string | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [frameError, setFrameError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(from ? DEFAULT_TRANSITION_PROMPT : DEFAULT_BEFORE_PROMPT);
  const [seconds, setSeconds] = useState(from ? 4 : 6);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  // The two frames the cut sits between: where `from` stops playing and where `to` starts.
  useEffect(() => {
    let cancelled = false;
    setFirstFrame(null);
    setLastFrame(null);
    setFrameError(null);
    Promise.all([
      from
        ? grabFrame(from.videoUrl, from.trimEnd ?? Number.POSITIVE_INFINITY)
        : startImage
        ? imageToDataUrl(startImage)
        : Promise.reject(new Error('There is no start picture for the new scene.')),
      grabFrame(to.videoUrl, to.trimStart ?? 0),
    ])
      .then(([a, b]) => {
        if (cancelled) return;
        setFirstFrame(a);
        setLastFrame(b);
      })
      .catch((e) => !cancelled && setFrameError(e?.message || 'The frames could not be read.'));
    return () => {
      cancelled = true;
    };
  }, [from?.id, from?.videoUrl, from?.trimEnd, startImage, to.id, to.videoUrl, to.trimStart]);

  const suggest = async () => {
    if (!firstFrame || !lastFrame) return;
    setSuggesting(true);
    setSuggestError(null);
    try {
      const r = await analyzeCut({
        startFrame: firstFrame,
        endFrame: lastFrame,
        previousPrompt: from?.prompt,
        nextPrompt: to.prompt,
        wish: from ? `a ${seconds}-second smooth transition with no cuts` : `a ${seconds}-second opening scene that ends exactly on the last frame, with no cuts`,
      });
      setPrompt(r.suggestedPrompt);
    } catch (e: any) {
      setSuggestError(e?.message || 'No suggestion this time. Try again.');
    } finally {
      setSuggesting(false);
    }
  };

  const ready = !!firstFrame && !!lastFrame && !!prompt.trim() && !busy;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="transition-title">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="transition-title" className="text-sm font-bold text-white flex items-center gap-1.5">
              <Wand2 className="w-4 h-4 text-emerald-400" />{' '}
              {from ? `Smooth transition: Scene ${from.sceneNumber} → Scene ${toNo}` : `New scene before Scene ${toNo}`}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {from
                ? `Gemini makes a clip that starts on the last frame of Scene ${from.sceneNumber} and ends on the first frame of Scene ${toNo}. It goes in between them.`
                : `Gemini makes a scene that starts on the start picture and ends on the first frame of Scene ${toNo}, so it runs straight into it. It goes before Scene ${toNo}.`}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="p-1 text-slate-400 hover:text-white cursor-pointer disabled:opacity-40" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-3">
          {[firstFrame, lastFrame].map((src, i) => (
            <div key={i} className="flex items-center gap-3">
              {i === 1 && <ArrowRight className="w-5 h-5 text-slate-500 shrink-0" />}
              <figure className="flex flex-col items-center gap-1">
                <div className="h-36 aspect-[9/16] rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                  {src ? (
                    <img src={src} alt={i === 0 ? 'Start frame' : 'End frame'} className="w-full h-full object-contain" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-slate-600 animate-spin" />
                  )}
                </div>
                <figcaption className="text-[10px] text-slate-500">
                  {i === 0 ? (from ? `Starts here (end of Scene ${from.sceneNumber})` : 'Starts here (start picture)') : `Ends here (start of Scene ${toNo})`}
                </figcaption>
              </figure>
            </div>
          ))}
        </div>
        {frameError && <p className="text-xs text-rose-300">{frameError}</p>}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="transition-length" className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>{isBefore ? 'Scene length' : 'Transition length'}</span>
            <span className="font-mono text-sm normal-case tracking-normal text-emerald-300">{seconds} s</span>
          </label>
          <input
            id="transition-length"
            type="range"
            min={TRANSITION_MIN_SECONDS}
            max={TRANSITION_MAX_SECONDS}
            step={1}
            value={seconds}
            onChange={(e) => setSeconds(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>{TRANSITION_MIN_SECONDS} s</span>
            <span>{TRANSITION_MAX_SECONDS} s (Gemini's limit for this mode)</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="transition-prompt" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {isBefore ? 'What happens in the new scene' : 'What happens in between'}
            </label>
            <button
              type="button"
              onClick={suggest}
              disabled={!firstFrame || !lastFrame || suggesting || busy}
              className="text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 flex items-center gap-1 cursor-pointer disabled:opacity-40"
            >
              {suggesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
              {suggesting ? 'Looking at the frames…' : 'Suggest from the frames'}
            </button>
          </div>
          <textarea
            id="transition-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          {suggestError && <p className="text-xs text-rose-300">{suggestError}</p>}
        </div>

        {error && (
          <p role="alert" className="text-xs text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-lg p-2">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <span className="text-[11px] text-slate-400">One Gemini Omni Flash generation</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={busy} className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer disabled:opacity-40">
              Cancel
            </button>
            <button
              type="button"
              disabled={!ready}
              onClick={() => firstFrame && lastFrame && onGenerate({ firstFrame, lastFrame, prompt, seconds })}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              {busy
                ? isBefore ? 'Generating the scene…' : 'Generating the transition…'
                : isBefore ? `Generate ${seconds} s scene` : `Generate ${seconds} s transition`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
