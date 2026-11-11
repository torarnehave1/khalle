import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export type PromptReviewData = {
  title: string;
  text: string;
  pictures: { n: number; line: string; previewUrl?: string }[];
  notes?: string[];
};

type Props = PromptReviewData & {
  onSend: (text: string) => void;
  onCancel: () => void;
};

const words = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

/** "What Gemini gets": the exact text and pictures, shown and editable before anything is sent. */
export default function PromptReview({ title, text, pictures, notes, onSend, onCancel }: Props) {
  const [value, setValue] = useState(text);
  const edited = value.trim() !== text.trim();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="review-title" className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[94vh]">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <h3 id="review-title" className="font-semibold text-lg text-white">What Gemini gets · {title}</h3>
            <p className="text-sm text-slate-400 mt-0.5">
              This is everything that is sent: the pictures in this order, then the text. Change the text if you want; it is sent exactly as it stands.
            </p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close" className="min-w-[44px] min-h-[44px] rounded-lg border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 flex flex-col gap-4">
          {pictures.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1" aria-label="Pictures sent">
              {pictures.map((p) => (
                <figure key={p.n} className="shrink-0 w-[132px] flex flex-col gap-1">
                  {p.previewUrl ? (
                    <img src={p.previewUrl} alt={`Picture ${p.n}`} className="w-[132px] h-[132px] object-cover rounded-lg border border-slate-700 bg-black" />
                  ) : (
                    <div className="w-[132px] h-[132px] rounded-lg border border-slate-700 bg-slate-950 flex items-center justify-center text-xs text-slate-500">Picture {p.n}</div>
                  )}
                  <figcaption className="text-[11px] leading-snug text-slate-300">
                    <strong className="text-white">Picture {p.n}</strong>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No pictures are sent: the video is made from the text alone.</p>
          )}

          {notes?.map((n) => (
            <p key={n} className="text-sm text-amber-200 bg-amber-950/40 border border-amber-700/60 rounded-lg px-3 py-2">{n}</p>
          ))}

          <label htmlFor="review-text" className="text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center justify-between gap-3">
            <span>The text · {words(value)} words</span>
            {edited && (
              <button type="button" onClick={() => setValue(text)} className="normal-case tracking-normal font-normal text-emerald-300 hover:text-emerald-200 cursor-pointer">
                Undo my changes
              </button>
            )}
          </label>
          <textarea
            id="review-text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={Math.min(18, Math.max(8, value.split('\n').length + 2))}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 outline-none p-3 text-sm text-slate-100 leading-relaxed font-mono"
          />
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-slate-800 flex flex-wrap items-center justify-end gap-3">
          <button type="button" onClick={onCancel} className="min-h-[44px] px-4 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-slate-500 cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            disabled={!value.trim()}
            onClick={() => onSend(value.trim())}
            className="min-h-[48px] px-5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Send to Gemini{edited ? ' · with my changes' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
