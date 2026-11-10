import { useEffect, useMemo, useRef, useState } from 'react';
import { X, RefreshCw, Check, Upload } from 'lucide-react';
import {
  albumPictureAsDataUrl,
  listAlbumPictures,
  listAlbums,
  savePictureToAlbum,
  thumbnailUrl,
  type AlbumPicture,
  type AlbumSummary,
} from '../api/albums';

export type AlbumDestination = { id: string; label: string; hint: string };

type Props = {
  /** What the chosen picture can be used as; the first is chosen unless `initial` says otherwise. */
  destinations: AlbumDestination[];
  initial?: string;
  onClose: () => void;
  /** Gets the picture as a data URL and where it should go. */
  onUse: (dataUrl: string, destinationId: string) => void;
};

const LAST_ALBUM = 'khalle:lastAlbum';

/** "From my albums": pick a picture from the user's Vegvisr photo albums. */
export default function AlbumPicker({ destinations, initial, onClose, onUse }: Props) {
  const [albums, setAlbums] = useState<AlbumSummary[] | null>(null);
  const [album, setAlbum] = useState<string>(() => {
    try {
      return localStorage.getItem(LAST_ALBUM) || '';
    } catch {
      return '';
    }
  });
  const [search, setSearch] = useState('');
  const [pictures, setPictures] = useState<AlbumPicture[] | null>(null);
  const [picked, setPicked] = useState<AlbumPicture | null>(null);
  const [dest, setDest] = useState(initial || destinations[0]?.id || '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'' | 'loading' | 'using' | 'uploading'>('');
  const uploadRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    listAlbums()
      .then((list) => {
        setAlbums(list);
        setAlbum((cur) => (cur && list.some((a) => a.name === cur) ? cur : list[0]?.name || ''));
      })
      .catch((e) => setError(`Your albums could not be loaded: ${e?.message || e}`));
  }, []);

  const loadPictures = (name: string) => {
    setPictures(null);
    setPicked(null);
    if (!name) return;
    listAlbumPictures(name)
      .then(setPictures)
      .catch((e) => {
        setPictures([]);
        setError(`The album "${name}" could not be opened: ${e?.message || e}`);
      });
  };

  useEffect(() => {
    if (!album) return;
    try {
      localStorage.setItem(LAST_ALBUM, album);
    } catch {
      /* not stored: the first album is opened next time */
    }
    setError(null);
    loadPictures(album);
  }, [album]);

  const shown = useMemo(
    () => (albums || []).filter((a) => a.name.toLowerCase().includes(search.trim().toLowerCase())),
    [albums, search]
  );

  const use = async () => {
    if (!picked) return;
    setBusy('using');
    setError(null);
    try {
      onUse(await albumPictureAsDataUrl(picked.url), dest);
    } catch (e: any) {
      setError(`The picture could not be fetched: ${e?.message || e}`);
      setBusy('');
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length || !album) return;
    setBusy('uploading');
    setError(null);
    try {
      for (const f of [...files].filter((f) => f.type.startsWith('image/'))) {
        const dataUrl = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(String(r.result));
          r.onerror = () => rej(r.error);
          r.readAsDataURL(f);
        });
        await savePictureToAlbum(dataUrl, album, f.name.replace(/\.[^.]+$/, ''));
      }
      loadPictures(album);
    } catch (e: any) {
      setError(`The upload did not finish: ${e?.message || e}`);
    } finally {
      setBusy('');
    }
  };

  const destLabel = destinations.find((d) => d.id === dest)?.label || 'Use';
  const label = 'text-[11px] font-semibold uppercase tracking-wider text-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="albums-title" className="bg-slate-900 border border-slate-700 rounded-2xl max-w-6xl w-full shadow-2xl flex flex-col max-h-[94vh]">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <h3 id="albums-title" className="font-semibold text-lg text-white">From my albums</h3>
            <p className="text-sm text-slate-400 mt-0.5">
              Your Vegvisr photo albums. Put photos from the Photos app into an album once, and use them here on any device.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="min-w-[44px] min-h-[44px] rounded-lg border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap flex-1 min-h-0 overflow-y-auto">
          <nav aria-label="Albums" className="flex-[0_0_240px] max-sm:flex-[1_1_100%] border-r border-slate-800 p-4 flex flex-col gap-1.5">
            <label htmlFor="album-search" className="text-sm text-slate-400">Find an album</label>
            <input
              id="album-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search albums"
              className="min-h-[40px] bg-slate-950 border border-slate-700 rounded-lg px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 mb-2"
            />
            {!albums && !error && <p className="text-sm text-slate-400 flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Loading albums…</p>}
            {albums && !albums.length && <p className="text-sm text-slate-400">No albums yet. Make one at photos.vegvisr.org, or upload here once an album exists.</p>}
            <div className="flex flex-col gap-1 max-h-[46vh] overflow-y-auto">
              {shown.map((a) => (
                <button
                  key={a.name}
                  type="button"
                  aria-current={a.name === album}
                  onClick={() => setAlbum(a.name)}
                  className={`text-left min-h-[40px] px-3 rounded-lg border text-sm flex items-center gap-2 cursor-pointer ${a.name === album ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'border-transparent text-slate-300 hover:bg-slate-800'}`}
                >
                  <span className="truncate">{a.name}</span>
                  {typeof a.imageCount === 'number' && <span className="ml-auto text-xs text-slate-400">{a.imageCount}</span>}
                </button>
              ))}
            </div>
            {album && (
              <div className="mt-auto pt-3 border-t border-slate-800 flex flex-col gap-2">
                <button type="button" disabled={!!busy} onClick={() => uploadRef.current?.click()} className="min-h-[40px] px-3 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-slate-500 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                  {busy === 'uploading' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {busy === 'uploading' ? 'Uploading…' : 'Upload photos to this album'}
                </button>
                <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void upload(e.target.files); e.target.value = ''; }} />
              </div>
            )}
          </nav>

          <div className="flex-[1_1_420px] min-w-0 p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex justify-between items-baseline gap-2">
              <span className={label}>{album ? `${album}${pictures ? ` · ${pictures.length} photos` : ''}` : 'Pick an album'}</span>
              {picked && <span className="text-sm text-slate-400">1 selected</span>}
            </div>
            {error && <p className="text-sm text-rose-300">{error}</p>}
            {album && !pictures && !error && <p className="text-sm text-slate-400 flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Loading photos…</p>}
            {pictures && !pictures.length && !error && <p className="text-sm text-slate-400">This album has no photos yet.</p>}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2.5">
              {(pictures || []).map((p) => {
                const on = picked?.key === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    aria-pressed={on}
                    aria-label={p.key.split('/').pop()}
                    onClick={() => setPicked(on ? null : p)}
                    className={`relative aspect-square rounded-lg overflow-hidden bg-slate-950 border-2 cursor-pointer ${on ? 'border-emerald-400' : 'border-transparent hover:border-slate-600'}`}
                  >
                    <img src={thumbnailUrl(p.url)} alt="" loading="lazy" className="w-full h-full object-cover" />
                    {on && (
                      <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {destinations.length > 1 && (
            <fieldset className="flex-[0_0_260px] max-sm:flex-[1_1_100%] border-l border-slate-800 p-4 flex flex-col gap-2">
              <legend className={`${label} mb-2`}>Use the picture as</legend>
              {destinations.map((d) => (
                <label key={d.id} className={`flex gap-2.5 items-start p-3 rounded-lg border cursor-pointer ${dest === d.id ? 'border-emerald-400 bg-emerald-950/60' : 'border-slate-700'}`}>
                  <input type="radio" name="album-dest" checked={dest === d.id} onChange={() => setDest(d.id)} className="mt-1 accent-emerald-400" />
                  <span>
                    <strong className="block text-sm text-white">{d.label}</strong>
                    <span className="text-xs text-slate-400">{d.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-slate-800 flex flex-wrap items-center justify-end gap-3">
          <span className="text-sm text-slate-400 mr-auto">The photo stays in your album. Khalle keeps its own copy for the story.</span>
          <button type="button" onClick={onClose} className="min-h-[44px] px-4 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-slate-500 cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            disabled={!picked || busy === 'using'}
            onClick={use}
            className="min-h-[48px] px-5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
          >
            {busy === 'using' && <RefreshCw className="w-4 h-4 animate-spin" />}
            {busy === 'using' ? 'Getting the picture…' : destinations.length > 1 ? `Use as ${destLabel.toLowerCase()}` : destLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
