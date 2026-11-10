import { useEffect, useRef, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { describeCharacter } from '../api/cast';

type Props = {
  /** The frame the user is on, as a JPEG data URL. */
  frame: string;
  sceneNumber: number;
  /** The card the story already has, if any (for "Update the character"). */
  existing?: { name?: string; description?: string };
  onClose: () => void;
  onSave: (card: { image: string; description: string; name: string }) => void;
};

type Box = { x: number; y: number; w: number; h: number }; // fractions of the frame, 0..1

/**
 * "Save this character": frame the character on the current frame, let Gemini describe the look,
 * edit and approve it. The approved card is sent with every later scene of the story.
 */
export default function CastModal({ frame, sceneNumber, existing, onClose, onSave }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [describing, setDescribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pointAt = (e: React.PointerEvent) => {
    const r = imgRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  /** The framed part of the frame (or the whole frame) as a JPEG data URL. */
  const cropped = (): string => {
    const img = imgRef.current;
    if (!img || !box || box.w < 0.03 || box.h < 0.03) return frame;
    const c = document.createElement('canvas');
    const sx = box.x * img.naturalWidth;
    const sy = box.y * img.naturalHeight;
    c.width = Math.max(1, Math.round(box.w * img.naturalWidth));
    c.height = Math.max(1, Math.round(box.h * img.naturalHeight));
    c.getContext('2d')!.drawImage(img, sx, sy, c.width, c.height, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.9);
  };

  const describe = async () => {
    setDescribing(true);
    setError(null);
    try {
      const look = await describeCharacter(cropped());
      setDescription(look.description);
      if (!name.trim()) setName(look.name);
    } catch (e: any) {
      setError(e?.message || 'No description this time. Try again.');
    } finally {
      setDescribing(false);
    }
  };

  const label = 'text-[11px] font-semibold uppercase tracking-wider text-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="cast-title" className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[94vh]">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <h3 id="cast-title" className="font-semibold text-lg text-white">
              {existing ? 'Update the main character' : 'Save this character'}
            </h3>
            <p className="text-sm text-slate-400 mt-0.5">
              From Scene {sceneNumber}. Every new scene and every change in this story is told to keep exactly this look.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="min-w-[44px] min-h-[44px] rounded-lg border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 overflow-y-auto flex flex-wrap gap-6 items-start">
          <div className="flex-[0_1_300px] min-w-[220px] flex flex-col gap-2">
            <span className={label}>1 · Frame the character</span>
            <div
              className="relative select-none touch-none rounded-xl overflow-hidden bg-black cursor-crosshair"
              onPointerDown={(e) => {
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                const p = pointAt(e);
                setDrag(p);
                setBox({ x: p.x, y: p.y, w: 0, h: 0 });
              }}
              onPointerMove={(e) => {
                if (!drag) return;
                const p = pointAt(e);
                setBox({ x: Math.min(drag.x, p.x), y: Math.min(drag.y, p.y), w: Math.abs(p.x - drag.x), h: Math.abs(p.y - drag.y) });
              }}
              onPointerUp={() => setDrag(null)}
            >
              <img ref={imgRef} src={frame} alt={`Frame from Scene ${sceneNumber}`} className="w-full h-auto block pointer-events-none" draggable={false} />
              {box && box.w > 0.01 && box.h > 0.01 && (
                <div
                  className="absolute border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.6)] pointer-events-none"
                  style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
                />
              )}
            </div>
            <p className="text-xs text-slate-400">Drag a box around the character. Without a box the whole frame is used.</p>
            {box && (
              <button type="button" onClick={() => setBox(null)} className="self-start text-sm text-slate-300 hover:text-emerald-300 cursor-pointer">
                Use the whole frame
              </button>
            )}
          </div>

          <div className="flex-[1_1_380px] min-w-0 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className={label}>2 · Describe the look</span>
              <button
                type="button"
                onClick={describe}
                disabled={describing}
                className="self-start min-h-[44px] px-4 rounded-lg border border-emerald-500/70 text-sm font-semibold text-emerald-200 hover:bg-emerald-950/50 flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {describing && <RefreshCw className="w-4 h-4 animate-spin" />}
                {describing ? 'Looking at the character…' : description ? 'Describe again from the picture' : 'Let Gemini describe the look'}
              </button>
              {error && <p className="text-sm text-rose-300">{error}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cast-name" className={label}>Name</label>
              <input
                id="cast-name"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                placeholder="Example: Old grey rabbit"
                className="min-h-[44px] bg-slate-950 border border-slate-700 rounded-lg px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cast-look" className={label}>3 · Check the look (edit if anything is wrong)</label>
              <textarea
                id="cast-look"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Example: Grey plush rabbit with a long white beard, pink nose, long floppy ears with pink insides, soft fluffy fur, no clothes."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-slate-800 flex flex-wrap items-center justify-end gap-3">
          <span className="text-sm text-slate-400 mr-auto">The picture and the text are sent with each scene of this story.</span>
          <button type="button" onClick={onClose} className="min-h-[44px] px-4 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-slate-500 cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            disabled={!description.trim()}
            onClick={() => onSave({ image: cropped(), description: description.trim(), name: name.trim() })}
            className="min-h-[48px] px-5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Approve this look
          </button>
        </div>
      </div>
    </div>
  );
}
