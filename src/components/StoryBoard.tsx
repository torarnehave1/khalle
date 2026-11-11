import { pictureOnWhite } from '../lib/onWhite';
import { useRef, useState } from 'react';
import { RefreshCw, Plus, Trash2, Check, ArrowDown, Images, ClipboardPaste, Upload, Wand2, Film } from 'lucide-react';
import {
  makeCastPicture,
  makeKeyPicture,
  newId,
  PICTURE_MODELS,
  splitStory,
  type Board,
  type BoardCast,
  type BoardScene,
  type PictureModel,
} from '../api/board';
import { GEMINI_ALBUM, savePictureToAlbum } from '../api/albums';
import AlbumPicker, { type AlbumDestination } from './AlbumPicker';
import SceneFramePicker, { type FrameSourceStory } from './SceneFramePicker';

/** A video scene of the board's story, as the board needs to know it. */
export type MadeScene = { id: string; sceneNumber: number };

type Props = {
  board: Board;
  boards: Board[];
  onChange: (next: Board) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  /** The video scenes of this board's story, in order. */
  storyScenes: MadeScene[];
  /** Make the video for board scene `index`. */
  onMakeScene: (index: number) => void;
  onOpenStory: () => void;
  busy: boolean;
  ratePerSec: number;
  /** All stories and their scenes, for "From a scene" (a frame becomes a picture). */
  frameStories: FrameSourceStory[];
};

// Transparent pictures are put on white (Gemini ignores transparency; see lib/onWhite).
const fileToDataUrl = (file: Blob) => pictureOnWhite(file);

async function clipboardImage(): Promise<string | null> {
  try {
    const items = await navigator.clipboard.read();
    for (const it of items) {
      const type = it.types.find((t) => t.startsWith('image/'));
      if (type) return fileToDataUrl(await it.getType(type));
    }
  } catch {
    /* no permission or no picture */
  }
  return null;
}

const label = 'text-[11px] font-semibold uppercase tracking-wider text-slate-400';
const ghost = 'min-h-[36px] px-3 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-slate-500 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const field = 'w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500';

/** Story board: write the story → scenes with key pictures → approve → make the film scene by scene. */
export default function StoryBoard({ board, boards, onChange, onSelect, onNew, onDelete, storyScenes, onMakeScene, onOpenStory, busy, ratePerSec, frameStories }: Props) {
  const [splitting, setSplitting] = useState(false);
  const [making, setMaking] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string | null>(null);
  const [albums, setAlbums] = useState<{ target: string } | null>(null);
  /** "From a scene": which board scene (id) or 'cast' gets the frame. */
  const [framePick, setFramePick] = useState<{ target: string } | null>(null);
  const [castForm, setCastForm] = useState<{ name: string; description: string; busy: boolean; error?: string } | null>(null);
  const castFileRef = useRef<HTMLInputElement | null>(null);
  const sceneFileRef = useRef<HTMLInputElement | null>(null);
  const sceneFileFor = useRef<string>('');
  /** Latest board, so pictures made one after another all land on the current board. */
  const boardRef = useRef(board);
  boardRef.current = board;

  const update = (patch: Partial<Board>) => {
    const next = { ...boardRef.current, ...patch, updatedAt: Date.now() };
    boardRef.current = next;
    onChange(next);
  };
  const updateScene = (id: string, patch: Partial<BoardScene>) =>
    update({ scenes: boardRef.current.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const setErr = (id: string, msg?: string) => setErrors((e) => ({ ...e, [id]: msg || '' }));

  const madeIds = new Set(storyScenes.map((s) => s.id));
  const isMade = (s: BoardScene) => !!s.madeSceneId && madeIds.has(s.madeSceneId);
  const sceneNumberOf = (s: BoardScene) => storyScenes.find((v) => v.id === s.madeSceneId)?.sceneNumber;
  const nextIndex = board.scenes.findIndex((s) => !isMade(s));
  const next = nextIndex >= 0 ? board.scenes[nextIndex] : undefined;
  const approvedCount = board.scenes.filter((s) => s.status === 'approved').length;
  const nothingMade = !board.scenes.some(isMade);

  const split = async () => {
    if (!board.story.trim()) return;
    if (board.scenes.some((s) => s.image || isMade(s)) && !window.confirm('Split the story again? The scenes and pictures on this board are replaced. Videos already made stay in the story.')) return;
    setSplitting(true);
    setNote(null);
    try {
      const res = await splitStory(board.story, board.cast);
      update({
        title: board.title === 'New story' && res.title ? res.title : board.title,
        scenes: res.scenes.map((s) => ({ id: newId('bs'), action: s.action, picture: s.picture, seconds: s.seconds, status: 'none' as const })),
      });
    } catch (e: any) {
      setNote(e?.message || 'The story could not be split. Try again.');
    } finally {
      setSplitting(false);
    }
  };

  const makePicture = async (id: string) => {
    const b = boardRef.current;
    const i = b.scenes.findIndex((s) => s.id === id);
    if (i < 0) return;
    setMaking((m) => ({ ...m, [id]: true }));
    setErr(id);
    try {
      const image = await makeKeyPicture({ board: b, scene: b.scenes[i], previous: b.scenes[i - 1] });
      updateScene(id, { image, status: 'check' });
    } catch (e: any) {
      setErr(id, e?.message || 'No picture this time. Try again.');
    } finally {
      setMaking((m) => ({ ...m, [id]: false }));
    }
  };

  /** One after another, so each picture can follow the one before. */
  const makeAllMissing = async () => {
    for (const s of boardRef.current.scenes) {
      if (s.image || isMade(s)) continue;
      await makePicture(s.id);
    }
  };

  const setScenePicture = (id: string, image: string) => {
    updateScene(id, { image, status: 'check' });
    setErr(id);
  };

  const addCast = (image: string, name?: string) =>
    update({ cast: [...boardRef.current.cast, { id: newId('cast'), name: name || `Character ${boardRef.current.cast.length + 1}`, image }] });

  const pasteTo = async (target: string) => {
    const img = await clipboardImage();
    if (!img) {
      setNote('No picture on the clipboard. Copy a picture first (or drop it on the scene).');
      return;
    }
    if (target === 'cast') addCast(img);
    else setScenePicture(target, img);
  };

  const dropTo = async (target: string, e: React.DragEvent) => {
    e.preventDefault();
    const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'));
    if (!file) return;
    const img = await fileToDataUrl(file);
    if (target === 'cast') addCast(img);
    else setScenePicture(target, img);
  };

  const saveToAlbum = async (s: BoardScene, i: number) => {
    if (!s.image) return;
    setNote(`Saving the picture of Scene ${i + 1} to "${GEMINI_ALBUM}"…`);
    try {
      await savePictureToAlbum(s.image, GEMINI_ALBUM, `${board.title} – scene ${i + 1}`);
      setNote(`The picture of Scene ${i + 1} is in your album "${GEMINI_ALBUM}".`);
    } catch (e: any) {
      setNote(`The picture could not be saved to your album: ${e?.message || e}`);
    }
  };

  const makeCast = async () => {
    if (!castForm?.description.trim()) return;
    setCastForm({ ...castForm, busy: true, error: undefined });
    try {
      const image = await makeCastPicture({ name: castForm.name.trim() || 'Character', description: castForm.description, model: board.model, others: board.cast });
      addCast(image, castForm.name.trim() || undefined);
      setCastForm(null);
    } catch (e: any) {
      setCastForm((f) => (f ? { ...f, busy: false, error: e?.message || 'No picture this time.' } : f));
    }
  };

  const albumDestinations: AlbumDestination[] = albums
    ? albums.target === 'cast'
      ? [{ id: 'cast', label: 'Character, prop or place', hint: 'Sent with every key picture of this board.' }]
      : [
          { id: albums.target, label: `Key picture for Scene ${board.scenes.findIndex((s) => s.id === albums.target) + 1}`, hint: 'The scene ends exactly on it.' },
          { id: 'cast', label: 'Character, prop or place', hint: 'Sent with every key picture of this board.' },
        ]
    : [];

  const nextBlocked = !next
    ? 'Every scene on the board is made.'
    : next.status !== 'approved'
    ? `Next: approve the picture of Scene ${nextIndex + 1}.`
    : nextIndex > 0 && !board.storyId
    ? 'Make Scene 1 first.'
    : '';

  return (
    <div className="flex flex-col gap-5 pb-28">
      {/* Board picker */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <label htmlFor="board-title" className="sr-only">Board title</label>
          <input
            id="board-title"
            value={board.title}
            onChange={(e) => update({ title: e.target.value })}
            className="bg-transparent text-2xl font-bold text-white border-b border-transparent hover:border-slate-700 focus:border-emerald-500 focus:outline-none min-w-0"
          />
          <p className="text-sm text-slate-400">Story board · {board.aspectRatio === '9:16' ? 'Tall 9:16' : 'Wide 16:9'} · saved to your account</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {boards.length > 1 && (
            <>
              <label htmlFor="board-pick" className="text-sm text-slate-400">Board</label>
              <select id="board-pick" value={board.id} onChange={(e) => onSelect(e.target.value)} className="min-h-[40px] bg-slate-950 border border-slate-700 rounded-lg px-2 text-sm text-white">
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>{b.title || 'Untitled'}</option>
                ))}
              </select>
            </>
          )}
          <button type="button" onClick={onNew} className={ghost}><Plus className="w-4 h-4" /> New board</button>
          <button
            type="button"
            onClick={() => window.confirm(`Remove the board "${board.title}"? Videos already made stay in the story.`) && onDelete(board.id)}
            className={ghost}
            aria-label="Remove this board"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {note && <p role="status" className="text-sm text-amber-200 bg-amber-950/40 border border-amber-800/60 rounded-lg px-3 py-2">{note}</p>}

      <div className="flex flex-wrap gap-6 items-start">
        {/* Left: story, cast, model */}
        <div className="flex-[0_1_400px] min-w-[300px] flex flex-col gap-4">
          <section aria-label="The story" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <label htmlFor="board-story" className={label}>1 · The story</label>
            <textarea
              id="board-story"
              value={board.story}
              onChange={(e) => update({ story: e.target.value })}
              rows={7}
              placeholder="Example: The old rabbit tells the young rabbits about a dream. He falls asleep in his bed. In the dream he flies over the snowy forest on a big owl. He wakes up smiling."
              className={field}
            />
            <p className="text-sm text-slate-400">Write it in a few lines. Gemini splits it into scenes and describes one key picture for each.</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!board.story.trim() || splitting}
                onClick={split}
                className="min-h-[40px] px-4 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {splitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                {splitting ? 'Splitting…' : board.scenes.length ? 'Split into scenes again' : 'Split into scenes'}
              </button>
              {nothingMade && (
                <div className="flex gap-1" role="group" aria-label="Frame">
                  {(['9:16', '16:9'] as const).map((ar) => (
                    <button key={ar} type="button" aria-pressed={board.aspectRatio === ar} onClick={() => update({ aspectRatio: ar })} className={`min-h-[36px] px-3 rounded-full border text-sm cursor-pointer ${board.aspectRatio === ar ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'border-slate-700 text-slate-300'}`}>
                      {ar === '9:16' ? 'Tall' : 'Wide'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section
            aria-label="Characters, props and places"
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => dropTo('cast', e)}
          >
            <span className={label}>Characters, props and places</span>
            <p className="text-sm text-slate-400">Sent with every key picture, so the looks stay the same. Drop a picture here too.</p>
            {board.cast.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {board.cast.map((c) => (
                  <div key={c.id} className="w-[96px] flex flex-col gap-1.5 items-center">
                    <div className="relative">
                      <img src={c.image} alt="" className="w-[84px] h-[84px] rounded-xl object-cover border-2 border-emerald-400/70" />
                      <button
                        type="button"
                        aria-label={`Remove ${c.name}`}
                        onClick={() => update({ cast: board.cast.filter((x) => x.id !== c.id) })}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 border border-slate-600 text-slate-200 flex items-center justify-center cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                    <input
                      aria-label="Name"
                      value={c.name}
                      onChange={(e) => update({ cast: board.cast.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)) })}
                      className="w-full bg-transparent text-xs text-center text-slate-200 border-b border-slate-700 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setAlbums({ target: 'cast' })} className={ghost}><Images className="w-4 h-4" /> From my albums</button>
              <button type="button" onClick={() => setFramePick({ target: 'cast' })} className={ghost}><Film className="w-4 h-4" /> From a scene</button>
              <button type="button" onClick={() => pasteTo('cast')} className={ghost}><ClipboardPaste className="w-4 h-4" /> Paste</button>
              <button type="button" onClick={() => castFileRef.current?.click()} className={ghost}><Upload className="w-4 h-4" /> Upload</button>
              <button type="button" onClick={() => setCastForm({ name: '', description: '', busy: false })} className={ghost}><Wand2 className="w-4 h-4" /> Make with Gemini</button>
              <input
                ref={castFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) addCast(await fileToDataUrl(f), f.name.replace(/\.[^.]+$/, ''));
                }}
              />
            </div>
            {castForm && (
              <div className="flex flex-col gap-2 border border-slate-700 rounded-xl p-3">
                <input value={castForm.name} onChange={(e) => setCastForm({ ...castForm, name: e.target.value })} placeholder="Name, e.g. Big white owl" aria-label="Name" className={field} />
                <textarea value={castForm.description} onChange={(e) => setCastForm({ ...castForm, description: e.target.value })} rows={3} placeholder="How it looks, e.g. a big fluffy white plush owl with yellow eyes and grey wing tips" aria-label="How it looks" className={field} />
                {castForm.error && <p className="text-sm text-rose-300">{castForm.error}</p>}
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setCastForm(null)} className={ghost}>Cancel</button>
                  <button type="button" disabled={!castForm.description.trim() || castForm.busy} onClick={makeCast} className="min-h-[36px] px-3 rounded-lg bg-emerald-400 text-slate-950 font-semibold text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50">
                    {castForm.busy && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {castForm.busy ? 'Making…' : 'Make the picture'}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section aria-label="Picture model" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <span className={label}>Picture model</span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PICTURE_MODELS) as PictureModel[]).map((m) => (
                <button key={m} type="button" aria-pressed={board.model === m} onClick={() => update({ model: m })} className={`min-h-[36px] px-3.5 rounded-full border text-sm cursor-pointer ${board.model === m ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                  {PICTURE_MODELS[m].label}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right: scenes and key pictures */}
        <section aria-label="Scenes and key pictures" className="flex-[1_1_560px] min-w-0 flex flex-col gap-3">
          <div className="flex flex-wrap justify-between items-baseline gap-2">
            <span className={label}>2 · Scenes and key pictures</span>
            {board.scenes.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">{approvedCount} of {board.scenes.length} pictures approved</span>
                {board.scenes.some((s) => !s.image && !isMade(s)) && (
                  <button type="button" disabled={Object.values(making).some(Boolean)} onClick={makeAllMissing} className={ghost}>
                    Make missing pictures
                  </button>
                )}
              </div>
            )}
          </div>

          {!board.scenes.length && (
            <div className="border border-dashed border-slate-700 rounded-2xl p-8 text-center text-slate-400 text-sm">
              No scenes yet. Write the story on the left and press <strong className="text-slate-200">Split into scenes</strong>.
            </div>
          )}

          {board.scenes.map((s, i) => {
            const made = isMade(s);
            const busyPic = !!making[s.id];
            return (
              <div key={s.id} className="flex flex-col gap-2">
                {i > 0 && (
                  <p className="flex items-center gap-2 pl-14 text-xs text-emerald-300">
                    <ArrowDown className="w-3.5 h-3.5" /> Scene {i + 1} runs from the end of Scene {i} and ends exactly on its picture
                  </p>
                )}
                <div
                  className={`flex flex-wrap gap-4 bg-slate-900 border rounded-2xl p-3.5 ${made ? 'border-emerald-800/70' : 'border-slate-800'}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => !made && dropTo(s.id, e)}
                >
                  <div className={`relative flex-[0_0_132px] ${board.aspectRatio === '9:16' ? 'h-[234px]' : 'h-[74px] flex-[0_0_132px]'} rounded-xl overflow-hidden bg-slate-950 border ${s.image ? 'border-slate-800' : 'border-dashed border-slate-700'} flex items-center justify-center`}>
                    {s.image && <img src={s.image} alt={`Key picture for Scene ${i + 1}`} className="w-full h-full object-cover" />}
                    {busyPic && (
                      <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2 text-center p-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-300" />
                        <span className="text-xs text-slate-300">Making the picture… about {board.model === 'pro' ? 15 : 9} s</span>
                      </div>
                    )}
                    {!s.image && !busyPic && <span className="text-xs text-slate-500 p-2 text-center">No picture yet</span>}
                  </div>
                  <div className="flex-1 min-w-[240px] flex flex-col gap-2">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <strong className="text-white">Scene {i + 1}</strong>
                        <div className="flex gap-1" role="group" aria-label={`Length of Scene ${i + 1}`}>
                          {([5, 10] as const).map((sec) => (
                            <button key={sec} type="button" disabled={made} aria-pressed={s.seconds === sec} onClick={() => updateScene(s.id, { seconds: sec })} className={`min-h-[28px] px-2.5 rounded-full border text-xs cursor-pointer disabled:cursor-default ${s.seconds === sec ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'border-slate-700 text-slate-400'}`}>
                              {sec} s
                            </button>
                          ))}
                        </div>
                      </div>
                      {made ? (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-200">Made · Scene {sceneNumberOf(s)} of the story</span>
                      ) : s.status === 'approved' ? (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-200">Approved{i === 0 ? ' · the film starts here' : ''}</span>
                      ) : s.status === 'check' ? (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-950 text-amber-200">Check this picture</span>
                      ) : (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">{busyPic ? 'Making picture' : 'Needs a picture'}</span>
                      )}
                    </div>
                    <label className="text-xs text-slate-400" htmlFor={`act-${s.id}`}>What happens</label>
                    <textarea id={`act-${s.id}`} value={s.action} disabled={made} onChange={(e) => updateScene(s.id, { action: e.target.value })} rows={2} className={field} />
                    <label className="text-xs text-slate-400" htmlFor={`pic-${s.id}`}>Key picture{i === 0 ? ' (the film starts on it)' : ' (the scene ends exactly on it)'}</label>
                    <textarea id={`pic-${s.id}`} value={s.picture} disabled={made} onChange={(e) => updateScene(s.id, { picture: e.target.value })} rows={2} className={field} />
                    {errors[s.id] && <p className="text-sm text-rose-300">{errors[s.id]}</p>}
                    {!made && (
                      <div className="flex flex-wrap gap-2">
                        {s.image && s.status !== 'approved' && (
                          <button type="button" onClick={() => updateScene(s.id, { status: 'approved' })} className="min-h-[36px] px-3.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-sm flex items-center gap-1.5 cursor-pointer">
                            <Check className="w-4 h-4" /> Approve picture
                          </button>
                        )}
                        <button type="button" disabled={busyPic || !s.picture.trim()} onClick={() => makePicture(s.id)} className={`${ghost} ${!s.image ? 'border-emerald-500 text-emerald-100' : ''}`}>
                          {s.image ? 'Make again' : 'Make picture'}
                        </button>
                        <button type="button" onClick={() => pasteTo(s.id)} className={ghost}><ClipboardPaste className="w-4 h-4" /> Paste</button>
                        <button type="button" onClick={() => setAlbums({ target: s.id })} className={ghost}><Images className="w-4 h-4" /> From my albums</button>
                        <button type="button" onClick={() => setFramePick({ target: s.id })} className={ghost}><Film className="w-4 h-4" /> From a scene</button>
                        <button type="button" onClick={() => { sceneFileFor.current = s.id; sceneFileRef.current?.click(); }} className={ghost}><Upload className="w-4 h-4" /> Upload</button>
                        {s.image && <button type="button" onClick={() => saveToAlbum(s, i)} className={ghost}>Save to album</button>}
                        <button
                          type="button"
                          aria-label={`Remove Scene ${i + 1} from the board`}
                          onClick={() => update({ scenes: board.scenes.filter((x) => x.id !== s.id) })}
                          className={`${ghost} ml-auto`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {made && s.image && (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => saveToAlbum(s, i)} className={ghost}>Save picture to album</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {board.scenes.length > 0 && (
            <button
              type="button"
              onClick={() => update({ scenes: [...board.scenes, { id: newId('bs'), action: '', picture: '', seconds: 5, status: 'none' }] })}
              className={`${ghost} self-start`}
            >
              <Plus className="w-4 h-4" /> Add a scene
            </button>
          )}
          <input
            ref={sceneFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f && sceneFileFor.current) setScenePicture(sceneFileFor.current, await fileToDataUrl(f));
            }}
          />
        </section>
      </div>

      {/* Make the film */}
      {board.scenes.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-3 flex flex-wrap gap-3 items-center justify-between">
            <div className="min-w-0">
              <span className={label}>3 · Make the film</span>
              <p className="text-sm text-slate-400">
                Scenes are made one at a time into the story "{board.title}". You watch each one before the next.
                {board.storyId && storyScenes.length > 0 && (
                  <>
                    {' '}
                    <button type="button" onClick={onOpenStory} className="text-emerald-300 hover:text-emerald-200 underline cursor-pointer">
                      Open the story ({storyScenes.length} scene{storyScenes.length === 1 ? '' : 's'})
                    </button>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {nextBlocked && <span className="text-sm text-slate-400">{nextBlocked}</span>}
              {next && (
                <button
                  type="button"
                  disabled={!!nextBlocked || busy}
                  onClick={() => onMakeScene(nextIndex)}
                  className="min-h-[48px] px-5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {busy ? 'A scene is being made…' : `Make Scene ${nextIndex + 1} · ${next.seconds} s · $${(next.seconds * ratePerSec).toFixed(2)}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {framePick && (
        <SceneFramePicker
          stories={frameStories}
          initialStoryId={board.storyId}
          useLabel={
            framePick.target === 'cast'
              ? 'character, prop or place'
              : `key picture for Scene ${board.scenes.findIndex((s) => s.id === framePick.target) + 1}`
          }
          onClose={() => setFramePick(null)}
          onUse={(dataUrl) => {
            const target = framePick.target;
            setFramePick(null);
            if (target === 'cast') addCast(dataUrl);
            else setScenePicture(target, dataUrl);
          }}
        />
      )}

      {albums && (
        <AlbumPicker
          destinations={albumDestinations}
          onClose={() => setAlbums(null)}
          onUse={(dataUrl, dest) => {
            setAlbums(null);
            if (dest === 'cast') addCast(dataUrl);
            else setScenePicture(dest, dataUrl);
          }}
        />
      )}
    </div>
  );
}

export type { BoardCast };
