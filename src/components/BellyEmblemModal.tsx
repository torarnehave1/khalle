import React, { useState } from 'react';
import {
  X,
  Compass,
  Sparkles,
  Upload,
  CheckCircle2,
  Check,
  Link as LinkIcon,
  Loader2,
  AlertCircle,
  Copy,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react';

export interface BellyEmblemConfig {
  id: string;
  name: string;
  type: 'morph' | 'vegvisir' | 'original_s' | 'default' | 'custom' | 'none';
  imagePath?: string;
  imageBase64?: string;
  imageUrl?: string;
  filename?: string;
  startImagePath?: string;
  endImagePath?: string;
  startImageUrl?: string;
  endImageUrl?: string;
  startFilename?: string;
  endFilename?: string;
  mimeType?: string;
  colorName: string;
  colorHex: string;
  directive: string;
  badgeLabel?: string;
  startSymbolName?: string;
  endSymbolName?: string;
}

export const MORPH_DIRECTIVE = `[EMBROIDERY METAMORPHOSIS DIRECTIVE - ORIGINAL MEDALLION TO EIGHT-SPOKE SYMBOL]:
1. START OF SCENE: The rabbit's chest patch features his authentic original symbol: Reference Image 1 [image_07de772c.png] (an oval white felt medallion badge with a stitched dark-blue outer border ring, containing two interlocking blue spiral swirls that curve together into a central vortex).
2. TRANSFORMATION: As the rabbit pauses peacefully and gently lifts paws toward the morning sky, the blue spiral threads glow softly with azure light and smoothly untangle and stretch outward in all directions into the exact eight-spoke symbol shown in Reference Image 2 [image_07c026d1.png].
3. RUNE FIDELITY MANDATE: Copy the exact asymmetrical staves from Reference Image 2 [image_07c026d1.png] (the comb teeth on the right, circular glyph on the left, and crossbars on vertical staves). DO NOT draw eight identical pitchforks.
4. END OF SCENE: The glow fades, leaving the crisp permanent eight-spoke symbol centered on his chest as he smiles with his buck tooth visible.`;

export const VEGVISIR_DIRECTIVE = `[CUSTOM BELLY EMBLEM - REPLICATE ATTACHED REFERENCE EMBROIDERY]:
The character's oval light-pink fleece belly patch MUST display the EXACT physical blue embroidered eight-armed symbol shown in Reference Image 1 [image_07c026d1.png] from start to finish.
CRITICAL EMBROIDERY FIDELITY:
1. The embroidery consists of the exact eight-armed blue thread emblem shown in the reference blueprint: an unbroken circular center with 8 unique asymmetric radiating arms stitched directly into the plush fleece.
2. Left horizontal arm has a distinct circular ring/glyph with crossbars. Right horizontal arm has comb/rake teeth with crossbars.
3. DO NOT draw a nautical star or maritime compass arrows. DO NOT draw 4 sharp triangle points. DO NOT draw eight identical pitchfork tridents.
4. Replicate the physical pattern with 100% photographic fidelity.`;

export const ORIGINAL_MEDALLION_DIRECTIVE = `[ORIGINAL TOY EMBLEM - OVAL SPIRAL MEDALLION]:
The character's oval light-pink fleece belly patch features his authentic original chest emblem shown in Reference Image 1 [image_07de772c.png]:
1. An oval white felt medallion badge with a stitched dark-blue outer border ring.
2. Inside the oval badge are two interlocking blue spiral swirls that curve together and meet at a central vortex.
3. DO NOT draw any compass, runes, staves, or multi-spoke symbols. Keep the original oval spiral medallion throughout the entire video.`;

export const NO_SYMBOL_DIRECTIVE = `[PLAIN BELLY - NO SYMBOL]:
The character's oval light-pink fleece belly patch is completely plain: soft pink fleece with no emblem, badge, patch, embroidery, logo, letter, rune or drawing on it, from start to finish.`;

export const NO_SYMBOL_EMBLEM: BellyEmblemConfig = {
  id: 'emblem-none',
  name: 'No symbol (plain belly)',
  type: 'none',
  imagePath: '/assets/aistudio/rabbit_face_crop_no_symbol.jpg',
  colorName: 'Plain pink',
  colorHex: '#f9a8d4',
  badgeLabel: 'PLAIN BELLY',
  directive: NO_SYMBOL_DIRECTIVE,
};

export const PRESET_EMBLEMS: BellyEmblemConfig[] = [
  {
    id: 'emblem-original-medallion',
    name: 'Original Spiral Medallion (image_07de772c.png)',
    type: 'original_s',
    imagePath: '/assets/aistudio/image_07de772c.png',
    filename: 'image_07de772c.png',
    mimeType: 'image/png',
    colorName: 'Royal Blue / White',
    colorHex: '#1d4ed8',
    badgeLabel: 'STATIC ORIGINAL EMBLEM',
    directive: ORIGINAL_MEDALLION_DIRECTIVE,
  },
  {
    id: 'emblem-vegvisir',
    name: 'Eight-Spoke Symbol (image_07c026d1.png)',
    type: 'vegvisir',
    imagePath: '/assets/aistudio/image_07c026d1.png',
    filename: 'image_07c026d1.png',
    mimeType: 'image/png',
    colorName: 'Nordic Cyan / Blue',
    colorHex: '#0284c7',
    badgeLabel: 'STATIC 8-SPOKE BLUEPRINT',
    directive: VEGVISIR_DIRECTIVE,
  },
  {
    id: 'emblem-morph',
    name: 'Transformation Scene (image_07de772c.png ➔ image_07c026d1.png)',
    type: 'morph',
    startImagePath: '/assets/aistudio/image_07de772c.png',
    endImagePath: '/assets/aistudio/image_07c026d1.png',
    imagePath: '/assets/aistudio/rabbit_chest_emblem_clean.png',
    startFilename: 'image_07de772c.png',
    endFilename: 'image_07c026d1.png',
    filename: 'image_07c026d1.png',
    mimeType: 'image/png',
    colorName: 'Azure Glow / Blue',
    colorHex: '#38bdf8',
    badgeLabel: 'OPTIONAL METAMORPHOSIS',
    startSymbolName: 'Original Medallion (image_07de772c.png)',
    endSymbolName: 'Authentic 8-Spoke Blueprint (image_07c026d1.png)',
    directive: MORPH_DIRECTIVE,
  },
  NO_SYMBOL_EMBLEM,
];

interface BellyEmblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEmblem: BellyEmblemConfig;
  onSelectEmblem: (emblem: BellyEmblemConfig) => void;
  isMorphingEnabled?: boolean;
  onToggleMorphing?: (enabled: boolean) => void;
}

export const BellyEmblemModal: React.FC<BellyEmblemModalProps> = ({
  isOpen,
  onClose,
  activeEmblem,
  onSelectEmblem,
  isMorphingEnabled,
  onToggleMorphing,
}) => {
  const [emblemMode, setEmblemMode] = useState<'static' | 'morph'>(
    isMorphingEnabled ?? (activeEmblem.id === 'emblem-morph') ? 'morph' : 'static'
  );
  const [selectedId, setSelectedId] = useState<string>(activeEmblem.id);
  const [selectedColor, setSelectedColor] = useState<string>(activeEmblem.colorName);

  // File upload state
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const [customName, setCustomName] = useState<string>('Custom Uploaded Emblem');

  // URL reference state
  const [urlInput, setUrlInput] = useState<string>('');
  const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlData, setUrlData] = useState<{
    url: string;
    filename: string;
    mimeType: string;
    dataUrl: string;
    base64: string;
  } | null>(null);
  const [urlRole, setUrlRole] = useState<'main' | 'start' | 'end'>('main');

  // Morph custom overrides
  const [morphStartCustom, setMorphStartCustom] = useState<{
    path?: string;
    url?: string;
    base64?: string;
    filename?: string;
    label?: string;
  } | null>(null);

  const [morphEndCustom, setMorphEndCustom] = useState<{
    path?: string;
    url?: string;
    base64?: string;
    filename?: string;
    label?: string;
  } | null>(null);

  const [copiedBadge, setCopiedBadge] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBadge(id);
    setTimeout(() => setCopiedBadge(null), 2000);
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomFile(file);
    const label = file.name.replace(/\.[^/.]+$/, '').slice(0, 30);
    setCustomName(label);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setCustomPreview(base64);
      setSelectedId('custom-uploaded');
    };
    reader.readAsDataURL(file);
  };

  const handleFetchUrlImage = async () => {
    if (!urlInput.trim()) {
      setUrlError('Please enter an image URL.');
      return;
    }
    setUrlError(null);
    setIsLoadingUrl(true);
    try {
      const res = await fetch('/api/fetch-url-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load image from URL.');
      }
      setUrlData({
        url: data.url,
        filename: data.filename || 'url_symbol.png',
        mimeType: data.mimeType || 'image/png',
        dataUrl: data.dataUrl,
        base64: data.base64,
      });

      if (urlRole === 'start') {
        setMorphStartCustom({
          url: data.url,
          filename: data.filename,
          base64: data.base64,
          label: `URL Start Symbol (${data.filename})`,
        });
        setSelectedId('emblem-morph');
      } else if (urlRole === 'end') {
        setMorphEndCustom({
          url: data.url,
          filename: data.filename,
          base64: data.base64,
          label: `URL End Symbol (${data.filename})`,
        });
        setSelectedId('emblem-morph');
      } else {
        setSelectedId('url-symbol');
      }
    } catch (err: any) {
      setUrlError(err.message || 'Could not fetch image from URL.');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleApply = () => {
    if (selectedId === 'url-symbol' && urlData) {
      const newConfig: BellyEmblemConfig = {
        id: `url-emblem-${Date.now()}`,
        name: `Symbol from URL (${urlData.filename})`,
        type: 'custom',
        imageUrl: urlData.url,
        imageBase64: urlData.dataUrl,
        filename: urlData.filename,
        mimeType: urlData.mimeType,
        colorName: selectedColor,
        colorHex: '#0284c7',
        directive: `The character's oval light-pink fleece belly patch features this exact custom symbol from web URL (${urlData.url} | ${urlData.filename}) shown in the reference image. The embroidery must faithfully replicate every stroke and geometric detail with 100% photographic fidelity. The symbol remains static throughout the video.`,
      };
      onToggleMorphing?.(false);
      onSelectEmblem(newConfig);
    } else if (selectedId === 'custom-uploaded' && customPreview) {
      const newConfig: BellyEmblemConfig = {
        id: `custom-emblem-${Date.now()}`,
        name: customName,
        type: 'custom',
        imageBase64: customPreview,
        filename: customFile?.name || 'custom_upload.png',
        mimeType: customFile?.type || 'image/png',
        colorName: selectedColor,
        colorHex: '#0284c7',
        directive: `The character's oval light-pink fleece belly patch features this exact custom symbol (${customName}) shown in the reference image. The embroidery must faithfully match every line, stroke, and geometric feature with zero simplification. The symbol remains static throughout the video.`,
      };
      onToggleMorphing?.(false);
      onSelectEmblem(newConfig);
    } else if (selectedId === 'emblem-morph' && emblemMode === 'morph') {
      const basePreset = PRESET_EMBLEMS.find((p) => p.id === 'emblem-morph') || PRESET_EMBLEMS[2];
      const newConfig: BellyEmblemConfig = {
        ...basePreset,
        startImagePath: morphStartCustom?.path || basePreset.startImagePath,
        startImageUrl: morphStartCustom?.url,
        startFilename: morphStartCustom?.filename || 'image_07de772c.png',
        startSymbolName: morphStartCustom?.label || 'Original Medallion (image_07de772c.png)',
        endImagePath: morphEndCustom?.path || basePreset.endImagePath,
        endImageUrl: morphEndCustom?.url,
        endFilename: morphEndCustom?.filename || 'image_07c026d1.png',
        endSymbolName: morphEndCustom?.label || 'Authentic 8-Spoke Blueprint (image_07c026d1.png)',
        colorName: selectedColor,
      };
      onToggleMorphing?.(true);
      onSelectEmblem(newConfig);
    } else {
      const targetId = selectedId === 'emblem-morph' ? 'emblem-original-medallion' : selectedId;
      const found = PRESET_EMBLEMS.find((p) => p.id === targetId) || PRESET_EMBLEMS[0];
      onToggleMorphing?.(false);
      onSelectEmblem({
        ...found,
        colorName: selectedColor,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 text-cyan-300 flex items-center justify-center shadow-inner">
              <Compass className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Character Belly Symbol & Emblem Studio
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                  URL & FILENAME MAPPING
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Lock your custom symbol onto the rabbit's chest using exact filenames or web image URLs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Explanation Alert */}
          <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-xs text-cyan-200/90 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-cyan-200">
                Start Symbol vs. End Symbol Filename Precision
              </p>
              <p className="text-[11px] leading-relaxed text-slate-300">
                You can refer to exact filenames (e.g.{' '}
                <code className="text-cyan-300 bg-cyan-950/80 px-1 py-0.5 rounded">image_07de772c.png</code> for the start medallion and{' '}
                <code className="text-cyan-300 bg-cyan-950/80 px-1 py-0.5 rounded">image_07c026d1.png</code> for the eight-spoke stave) or supply any public image URL. Gemini Omni Flash will cross-reference the exact image file directly in the prompt.
              </p>
            </div>
          </div>

          {/* Master Mode Switch: Static Symbol vs Metamorphosis */}
          <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Symbol Metamorphosis (Morphing) Mode:</span>
              </span>
              <div className="flex items-center rounded-lg bg-slate-900 border border-slate-700/60 p-0.5 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setEmblemMode('static');
                    if (selectedId === 'emblem-morph') {
                      setSelectedId('emblem-original-medallion');
                    }
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    emblemMode === 'static'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>OFF (Static Symbol)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmblemMode('morph');
                    setSelectedId('emblem-morph');
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    emblemMode === 'morph'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>ON (Metamorphosis)</span>
                </button>
              </div>
            </div>

            {emblemMode === 'static' ? (
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200 flex items-center gap-2">
                <span className="text-base">🔒</span>
                <div>
                  <strong className="text-white block">Symbol Morphing is OFF (Static Symbol Locked):</strong>
                  The rabbit maintains a constant, unchanging chest symbol. Your scene prompts (actions, props, locations) run with 100% priority and will never be overridden by transformation routines.
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-200 flex items-center gap-2">
                <span className="text-base">✨</span>
                <div>
                  <strong className="text-white block">Metamorphosis Story Mode is ON:</strong>
                  The chest symbol will smoothly untangle and morph from Start Symbol (<code className="text-cyan-300">image_07de772c.png</code>) to End Symbol (<code className="text-cyan-300">image_07c026d1.png</code>).
                </div>
              </div>
            )}
          </div>

          {/* Emblem Choice Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Choose Character Belly Symbol Configuration:
            </label>

            <div className="grid grid-cols-1 gap-3">
              {/* 1. Static Original Spiral Medallion */}
              <div
                onClick={() => {
                  setEmblemMode('static');
                  setSelectedId('emblem-original-medallion');
                }}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-2.5 relative ${
                  selectedId === 'emblem-original-medallion'
                    ? 'bg-cyan-950/50 border-cyan-400 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-500/50'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                    <span>🌀 Original Spiral Medallion (image_07de772c.png) - Static Full Scene</span>
                  </span>
                  {selectedId === 'emblem-original-medallion' && (
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-slate-900 overflow-hidden shrink-0 border border-cyan-500/30 p-1 flex items-center justify-center">
                    <img
                      src="/assets/aistudio/image_07de772c.png"
                      alt="Original Spiral Medallion"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-200">Authentic Oval Spiral Medallion (Static)</p>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 bg-slate-800 text-cyan-300 rounded border border-cyan-500/30">
                        image_07de772c.png
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      The rabbit's original toy design: oval white felt patch with dark blue outer border and two interlocking spirals meeting in a central vortex. Remains constant without morphing.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Static Eight-Spoke Blueprint */}
              <div
                onClick={() => {
                  setEmblemMode('static');
                  setSelectedId('emblem-vegvisir');
                }}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-2.5 relative ${
                  selectedId === 'emblem-vegvisir'
                    ? 'bg-cyan-950/50 border-cyan-400 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-500/50'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Eight-Spoke Symbol (image_07c026d1.png) - Static Full Scene</span>
                  </span>
                  {selectedId === 'emblem-vegvisir' && (
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center shrink-0 border border-cyan-500/40 shadow-inner p-1">
                    <img
                      src="/assets/aistudio/image_07c026d1.png"
                      alt="Rabbit Chest Stave Blueprint"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-cyan-200">
                        Authentic Eight-Spoke Stave Blueprint (Static)
                      </p>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 bg-slate-800 text-cyan-300 rounded border border-cyan-500/30">
                        image_07c026d1.png
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Locks the genuine asymmetric staves (circular glyph on the left arm, comb teeth on the right arm, crossbars) throughout the entire video. Remains static with no morphing.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Transformation / Metamorphosis Preset */}
              <div
                onClick={() => {
                  setEmblemMode('morph');
                  setSelectedId('emblem-morph');
                }}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-3 relative ${
                  selectedId === 'emblem-morph'
                    ? 'bg-cyan-950/60 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-500/50'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <span>Transformation Scene (Medallion ➔ Eight-Spoke Symbol)</span>
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                      OPTIONAL MORPH
                    </span>
                  </div>
                  {selectedId === 'emblem-morph' && (
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                {/* Dual Start & End Configuration Card */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  {/* Start Symbol Box */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-14 h-14 rounded-lg bg-slate-950 overflow-hidden flex items-center justify-center shrink-0 border border-cyan-500/40 shadow-inner p-1">
                      <img
                        src={morphStartCustom?.base64 || morphStartCustom?.path || '/assets/aistudio/image_07de772c.png'}
                        alt="Start Symbol"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-[11px] text-slate-300 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-cyan-400 font-bold">1. Start Symbol:</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(morphStartCustom?.filename || 'image_07de772c.png', 'start-fn');
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-mono text-cyan-300 border border-cyan-500/30 flex items-center gap-1 cursor-pointer"
                          title="Copy filename to use in prompt"
                        >
                          <span>{morphStartCustom?.filename || 'image_07de772c.png'}</span>
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                        {copiedBadge === 'start-fn' && (
                          <span className="text-[9px] text-emerald-400 font-bold">Copied!</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                        {morphStartCustom?.label || 'Original Oval Medallion (Two Interlocking Blue Spirals)'}
                      </span>
                    </div>
                  </div>

                  {/* Morph Flow Arrow */}
                  <div className="flex flex-col items-center justify-center text-cyan-400 font-mono text-xs px-2 shrink-0">
                    <span className="text-[10px] text-slate-400">glows & unwinds</span>
                    <ArrowRight className="w-5 h-5 text-cyan-400" />
                  </div>

                  {/* End Symbol Box */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-14 h-14 rounded-lg bg-slate-950 overflow-hidden flex items-center justify-center shrink-0 border border-cyan-500/40 shadow-inner p-1">
                      <img
                        src={morphEndCustom?.base64 || morphEndCustom?.path || '/assets/aistudio/image_07c026d1.png'}
                        alt="End Symbol"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-[11px] text-slate-300 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-cyan-400 font-bold">2. End Symbol:</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(morphEndCustom?.filename || 'image_07c026d1.png', 'end-fn');
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-mono text-cyan-300 border border-cyan-500/30 flex items-center gap-1 cursor-pointer"
                          title="Copy filename to use in prompt"
                        >
                          <span>{morphEndCustom?.filename || 'image_07c026d1.png'}</span>
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                        {copiedBadge === 'end-fn' && (
                          <span className="text-[9px] text-emerald-400 font-bold">Copied!</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                        {morphEndCustom?.label || 'Authentic Eight-Spoke Blueprint (Asymmetrical Staves)'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-tight">
                  Both images are attached to Gemini Omni with explicit filename tags (<code className="text-cyan-300 font-mono text-[10px]">image_07de772c.png</code> and <code className="text-cyan-300 font-mono text-[10px]">image_07c026d1.png</code>). The scene starts with the genuine oval medallion, which then illuminates and transforms into the authentic eight-spoke symbol with asymmetrical staves.
                </p>
              </div>
            </div>
          </div>

          {/* Reference Image from Web URL Section */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Reference Image from Web URL</span>
              </label>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-600/30">
                HTTP / HTTPS SUPPORT
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Paste any public web image URL (PNG, JPG, WebP). The system will fetch it directly and make it referable by its exact URL and filename in your prompts:
            </p>

            <div className="flex items-center gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/my-symbol.png"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={handleFetchUrlImage}
                disabled={isLoadingUrl}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {isLoadingUrl ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Verify & Load URL</span>
                  </>
                )}
              </button>
            </div>

            {urlError && (
              <div className="p-2 rounded-lg bg-red-950/60 border border-red-500/40 text-[11px] text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{urlError}</span>
              </div>
            )}

            {urlData && (
              <div className="p-3 bg-slate-900 rounded-xl border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-slate-700 shadow-inner">
                    <img
                      src={urlData.dataUrl}
                      alt={urlData.filename}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-white block truncate">
                      {urlData.filename}
                    </span>
                    <span className="text-[10px] text-cyan-300 font-mono block truncate max-w-xs">
                      {urlData.url}
                    </span>
                    <span className="text-[9px] text-emerald-400 font-medium block mt-0.5">
                      ✓ Successfully Verified & Ready for Model Prompting
                    </span>
                  </div>
                </div>

                {/* Role Assignment Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setUrlRole('main');
                      setSelectedId('url-symbol');
                    }}
                    className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer ${
                      selectedId === 'url-symbol'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                    }`}
                  >
                    Set as Chest Emblem
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMorphStartCustom({
                        url: urlData.url,
                        filename: urlData.filename,
                        base64: urlData.base64,
                        label: `URL Start Symbol (${urlData.filename})`,
                      });
                      setSelectedId('emblem-morph');
                    }}
                    className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                  >
                    Set as Start ➔
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMorphEndCustom({
                        url: urlData.url,
                        filename: urlData.filename,
                        base64: urlData.base64,
                        label: `URL End Symbol (${urlData.filename})`,
                      });
                      setSelectedId('emblem-morph');
                    }}
                    className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                  >
                    Set as End ➔
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Custom Upload Section */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload Local File Symbol or Logo</span>
              </label>
              <label className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-600/50 text-cyan-200 text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                <span>Browse File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomUpload}
                  className="hidden"
                />
              </label>
            </div>

            {customPreview && (
              <div
                onClick={() => setSelectedId('custom-uploaded')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                  selectedId === 'custom-uploaded'
                    ? 'bg-cyan-950/50 border-cyan-400 ring-1 ring-cyan-500/50'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-14 h-14 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-slate-700">
                  <img
                    src={customPreview}
                    alt="Custom Upload"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-white block truncate">
                    {customName}
                  </span>
                  <span className="text-[10px] text-cyan-300 font-mono block">
                    {customFile?.name || 'custom_symbol.png'}
                  </span>
                </div>
                {selectedId === 'custom-uploaded' && (
                  <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Embroidery Color Style */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Embroidery Thread Color:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { name: 'Nordic Blue', hex: '#0284c7' },
                { name: 'Midnight Charcoal', hex: '#1e293b' },
                { name: 'Golden Amber', hex: '#f59e0b' },
                { name: 'Crimson Red', hex: '#dc2626' },
              ].map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelectedColor(c.name)}
                  className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                    selectedColor === c.name
                      ? 'bg-slate-800 border-cyan-400 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 sticky bottom-0 backdrop-blur-sm">
          <div className="text-xs text-slate-400 truncate max-w-sm">
            Selected:{' '}
            <span className="font-bold text-cyan-300">
              {selectedId === 'emblem-morph'
                ? 'Transformation Scene (image_07de772c.png ➔ image_07c026d1.png)'
                : selectedId === 'emblem-vegvisir'
                ? 'Eight-Spoke Symbol (image_07c026d1.png)'
                : selectedId === 'emblem-original-medallion'
                ? 'Original Spiral Medallion (image_07de772c.png)'
                : selectedId === 'url-symbol' && urlData
                ? `URL: ${urlData.filename}`
                : customName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>Apply Symbol to Character</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
