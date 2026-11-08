import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Shirt,
  Camera,
  Wand2,
  Upload,
  Check,
  RefreshCw,
  Plus,
  Package,
  Layers,
  ChevronRight,
  Info,
  Users,
  Link as LinkIcon,
  Loader2,
  Trash2,
  ExternalLink,
  Sliders,
} from 'lucide-react';

export interface StylistItem {
  id: string;
  type: 'clothing' | 'prop' | 'character';
  title: string;
  category?: string;
  icon: string;
  description: string;
  promptDirective: string;
  directive?: string;
  tagline?: string;
  mimeType?: string;
  stylingReason?: string;
  imagePath?: string;
  imageBase64?: string;
  imageUrl?: string;
  filename?: string;
}

export const PRESET_CLOTHING: StylistItem[] = [
  {
    id: 'wool-cable-sweater',
    type: 'clothing',
    title: 'Cozy Alpine Wool Cable Sweater',
    category: 'knitwear',
    icon: '🧶',
    description: 'Chunky cream-colored wool cable-knit sweater with crimson snowflake embroidery, snug collar, and soft knitted sleeves.',
    promptDirective: 'The plush rabbit is wearing a snug, chunky cream-colored wool cable-knit sweater with crimson Nordic snowflake patterns, showing tactile knitted yarn loops and ribbed cuffs.',
    stylingReason: 'Adds heartwarming winter/autumn coziness and tactile yarn realism against the plush fur.',
  },
  {
    id: 'yellow-rain-slicker',
    type: 'clothing',
    title: 'Vibrant Yellow Rainy-Day Slicker',
    category: 'outerwear',
    icon: '🧥',
    description: 'Glossy waterproof canary-yellow hooded rain mac with toggle buttons and matching rubber boots.',
    promptDirective: 'The plush rabbit is dressed in a bright canary-yellow waterproof hooded rain slicker with wooden toggle buttons, rain droplets glistening on the glossy fabric.',
    stylingReason: 'High-contrast sunny color that pops brilliantly against green grass, rain, and moody skies.',
  },
  {
    id: 'aviator-pilot-goggles',
    type: 'clothing',
    title: 'Alpine Aviator Goggles & Long Scarf',
    category: 'accessory',
    icon: '🥽',
    description: 'Vintage brass aviator flying goggles resting comfortably on the forehead with a fluttering magenta silk scarf.',
    promptDirective: 'The rabbit sports vintage steampunk brass aviator flying goggles perched above its smiling eyes, with an extra-long magenta scarf streaming backward in the wind.',
    stylingReason: 'Perfect for high-altitude jumps, drone fly-overs, and adventurous aerial flight scenes.',
  },
  {
    id: 'wildflower-crown',
    type: 'clothing',
    title: 'Spring Blossom Garland & Velvet Cape',
    category: 'costume',
    icon: '🌸',
    description: 'Hand-woven alpine floral crown made of fresh yellow buttercups and forget-me-nots, paired with an emerald velvet capelet.',
    promptDirective: 'The rabbit wears a festive hand-woven alpine flower garland crown of blooming buttercups and blue gentians, with a miniature velvet capelet fluttering gently.',
    stylingReason: 'Connects the character directly to the blooming meadow landscape.',
  },
  {
    id: 'winter-beanie-muffler',
    type: 'clothing',
    title: 'Pom-Pom Beanie & Puffer Muffler',
    category: 'knitwear',
    icon: '🧣',
    description: 'Cozy sky-blue pom-pom knitted toque with matching miniature quilted puffer muffler.',
    promptDirective: 'The plush rabbit wears a sky-blue knitted beanie hat with a fluffy white pom-pom on top, and a warm miniature quilted puffer scarf snug around its neck.',
    stylingReason: 'Adds irresistible chilly-weather charm and secondary cloth motion.',
  },
  {
    id: 'explorer-backpack',
    type: 'clothing',
    title: 'Leather Alpine Explorer Backpack',
    category: 'accessory',
    icon: '🎒',
    description: 'Miniature canvas and leather expedition rucksack strapped snugly across the rabbit shoulders.',
    promptDirective: 'The rabbit is equipped with a miniature rustic canvas and tan leather expedition rucksack with tiny brass buckles strapped snugly onto its back.',
    stylingReason: 'Evokes mountain hiking and adventurous journey themes.',
  },
];

export const PRESET_PROPS: StylistItem[] = [
  {
    id: 'vintage-wooden-sled',
    type: 'prop',
    title: 'Handcrafted Wooden Alpine Sled',
    icon: '🛷',
    description: 'Rustic ash-wood mountain toboggan with curved steel runners resting nearby in the clover.',
    promptDirective: 'Include a rustic handcrafted wooden alpine sled with curved steel runners in the scene, anchoring the mountain expedition atmosphere.',
  },
  {
    id: 'wicker-picnic-basket',
    type: 'prop',
    title: 'Meadow Picnic Basket & Dandelion Fluff',
    icon: '🧺',
    description: 'Open woven wicker picnic basket with red-checkered cloth and floating white dandelion seeds in the air.',
    promptDirective: 'Foreground features a quaint woven wicker picnic basket with red-checkered cloth, surrounded by floating dandelion fluff illuminated by golden sunbeams.',
  },
  {
    id: 'panoramic-reflection-lake',
    type: 'prop',
    title: 'Mirror-Glass Alpine Reflection Lake',
    icon: '🏞️',
    description: 'Pristine turquoise glacial lake in the background mirroring the snowy peaks and azure sky.',
    promptDirective: 'The scene is set with a pristine turquoise glacial lake in the midground reflecting snowy alpine mountain peaks and wildflowers.',
  },
  {
    id: 'stone-campfire',
    type: 'prop',
    title: 'Crackling Campfire with Marshmallows',
    icon: '🪵',
    description: 'Cozy circle of river stones with glowing orange embers and sweet toasted marshmallow on a twig.',
    promptDirective: 'A cozy campfire built within a circle of river stones with glowing warm embers and gentle soft smoke curling upward into the crisp mountain air.',
  },
  {
    id: 'wooden-trail-signpost',
    type: 'prop',
    title: 'Rustic Mountain Trail Signpost',
    icon: '🪧',
    description: 'Weathered cedar signpost pointing toward "Alpine Meadows" and "Summit Peak".',
    promptDirective: 'A rustic hand-carved wooden trail signpost with arrows pointing toward mountain peaks stands beside the blooming wildflower path.',
  },
  {
    id: 'brass-telescope',
    type: 'prop',
    title: 'Brass Explorer Telescope on Tripod',
    icon: '🔭',
    description: 'Vintage polished brass stargazer telescope mounted on wooden tripod overlooking the valley.',
    promptDirective: 'A polished vintage brass explorer telescope mounted on a miniature wooden tripod stands overlooking the dramatic mountain valley.',
  },
];

export const PRESET_CHARACTERS: StylistItem[] = [
  {
    id: 'owl-barnaby',
    type: 'character',
    title: 'Barnaby the Wise Mountain Owl',
    category: 'companion',
    icon: '🦉',
    description: 'An adorable fluffy plush horned owl with wire-rim spectacles, soft felt feathers, and a calm, wise expression.',
    promptDirective: 'Accompanying the rabbit is Barnaby the Wise Mountain Owl, an adorable miniature fuzzy plush horned owl doll with tiny wire-rim glasses, perched curiously on a wooden post and watching with gentle curiosity.',
    stylingReason: 'Adds a whimsical, intellectual buddy dynamic to the scene.',
  },
  {
    id: 'fox-rusty',
    type: 'character',
    title: 'Rusty the Alpine Fox Pup',
    category: 'companion',
    icon: '🦊',
    description: 'A sweet plush orange fox cub with a snowy white-tipped tail, black button nose, and playful bouncing paws.',
    promptDirective: 'Joined by Rusty the Alpine Fox Pup, a sweet energetic plush orange fox cub with an oversized fluffy white-tipped tail, bounding happily alongside the green rabbit.',
    stylingReason: 'Creates joyful companion playfulness and lively chase/hop movement.',
  },
  {
    id: 'hedgehog-pip',
    type: 'character',
    title: 'Pip the Meadow Hedgehog',
    category: 'companion',
    icon: '🦔',
    description: 'A tiny textured felt hedgehog holding a yellow buttercup flower, snuffling peacefully near the boots.',
    promptDirective: 'Beside the rabbit stands Pip the Meadow Hedgehog, a tiny fuzzy plush hedgehog holding a single freshly-picked yellow buttercup flower in its tiny paws.',
    stylingReason: 'Gives miniature scale contrast and gentle storybook charm.',
  },
  {
    id: 'bunny-snowdrop',
    type: 'character',
    title: 'Snowdrop the White Bunny Friend',
    category: 'companion',
    icon: '🐰',
    description: 'A companion pure-white plush bunny rabbit with long floppy ears wearing a matching sky-blue knit scarf.',
    promptDirective: 'Joined by Snowdrop the White Bunny, a fluffy pure-white plush bunny rabbit with floppy ears wearing a cozy sky-blue scarf, hopping in synchronized harmony with the green rabbit.',
    stylingReason: 'Doubles the bunny hopping fun with delightful character interplay.',
  },
  {
    id: 'fawn-bramble',
    type: 'character',
    title: 'Bramble the Velveteen Fawn',
    category: 'companion',
    icon: '🦌',
    description: 'A miniature velveteen spotted deer fawn with gentle dark eyes and soft felt ears, standing peacefully.',
    promptDirective: 'Standing peacefully in the wildflower clover is Bramble the Fawn, a miniature velveteen plush baby deer with white dappled spots and gentle doe eyes.',
    stylingReason: 'Enhances serene alpine wilderness harmony and fairytale wonder.',
  },
];

interface AiStylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  season: string;
  weather: string;
  currentPrompt: string;
  activeItems: StylistItem[];
  onToggleItem: (item: StylistItem) => void;
  onClearAllItems?: () => void;
  onUploadCustomPhoto: (file: File, type: 'clothing' | 'prop' | 'character', label: string) => void;
  onAddUrlItem?: (url: string, type: 'clothing' | 'prop' | 'character', label: string) => void;
  onApplyClothingGuide?: (title: string, directive: string, icon: string) => void;
  onApplyShootGuide?: (title: string, directive: string, icon: string) => void;
}

export const AiStylistModal: React.FC<AiStylistModalProps> = ({
  isOpen,
  onClose,
  season,
  weather,
  currentPrompt,
  activeItems,
  onToggleItem,
  onClearAllItems,
  onUploadCustomPhoto,
  onAddUrlItem,
}) => {
  const [activeTab, setActiveTab] = useState<'clothing' | 'prop' | 'character' | 'upload'>('clothing');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [customTheme, setCustomTheme] = useState<string>('');
  const [stylistTip, setStylistTip] = useState<string>(
    'You can now select MULTIPLE clothing items, props, and companion characters at once. Gemini Omni Flash blends all selected elements into a rich, coordinated scene.'
  );

  const [clothingList, setClothingList] = useState<StylistItem[]>(PRESET_CLOTHING);
  const [propList, setPropList] = useState<StylistItem[]>(PRESET_PROPS);
  const [characterList, setCharacterList] = useState<StylistItem[]>(PRESET_CHARACTERS);

  // Upload tab state
  const [customUploadType, setCustomUploadType] = useState<'clothing' | 'prop' | 'character'>('prop');
  const [customSubCategory, setCustomSubCategory] = useState<'picture' | 'clothing' | 'prop' | 'character'>('picture');
  const [customUploadLabel, setCustomUploadLabel] = useState<string>('');
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customFilePreview, setCustomFilePreview] = useState<string | null>(null);

  // URL state
  const [urlInput, setUrlInput] = useState<string>('');
  const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(false);
  const [urlPreview, setUrlPreview] = useState<string | null>(null);
  const [urlFilename, setUrlFilename] = useState<string>('');
  const [urlError, setUrlError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isItemActive = (id: string) => activeItems.some((item) => item.id === id);

  const activeClothingCount = activeItems.filter((i) => i.type === 'clothing').length;
  const activePropCount = activeItems.filter((i) => i.type === 'prop').length;
  const activeCharacterCount = activeItems.filter((i) => i.type === 'character').length;

  const handleFetchAiSuggestions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/suggest-clothing-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season,
          weather,
          currentPrompt,
          theme: customTheme.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate suggestions');
      const data = await res.json();

      if (data.clothingSuggestions?.length > 0) {
        const mapped = data.clothingSuggestions.map((c: any) => ({
          ...c,
          type: 'clothing',
        }));
        setClothingList((prev) => [...mapped, ...prev.filter((p) => !mapped.some((m: any) => m.id === p.id))]);
      }
      if (data.shootGuideSuggestions?.length > 0) {
        const mapped = data.shootGuideSuggestions.map((p: any) => ({
          ...p,
          type: 'prop',
        }));
        setPropList((prev) => [...mapped, ...prev.filter((pr) => !mapped.some((m: any) => m.id === pr.id))]);
      }
      if (data.characterSuggestions?.length > 0) {
        const mapped = data.characterSuggestions.map((ch: any) => ({
          ...ch,
          type: 'character',
        }));
        setCharacterList((prev) => [...mapped, ...prev.filter((c) => !mapped.some((m: any) => m.id === c.id))]);
      }
      if (data.stylistTip) {
        setStylistTip(data.stylistTip);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    if (!customUploadLabel) {
      setCustomUploadLabel(cleanName);
    }
    const lowerName = cleanName.toLowerCase();
    if (
      lowerName.includes('design') ||
      lowerName.includes('picture') ||
      lowerName.includes('photo') ||
      lowerName.includes('art') ||
      lowerName.includes('draw') ||
      lowerName.includes('emblem') ||
      lowerName.includes('symbol') ||
      lowerName.includes('poster') ||
      lowerName.includes('card') ||
      lowerName.includes('sodesign')
    ) {
      setCustomSubCategory('picture');
      setCustomUploadType('prop');
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomFilePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVerifyUrl = async () => {
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
        throw new Error(data.error || 'Failed to fetch image from URL.');
      }
      setUrlPreview(data.dataUrl);
      setUrlFilename(data.filename);
      const cleanName = data.filename.replace(/\.[^/.]+$/, '');
      if (!customUploadLabel) {
        setCustomUploadLabel(cleanName);
      }
      const lowerName = cleanName.toLowerCase();
      if (
        lowerName.includes('design') ||
        lowerName.includes('picture') ||
        lowerName.includes('photo') ||
        lowerName.includes('art') ||
        lowerName.includes('draw') ||
        lowerName.includes('emblem') ||
        lowerName.includes('symbol') ||
        lowerName.includes('poster') ||
        lowerName.includes('card') ||
        lowerName.includes('sodesign')
      ) {
        setCustomSubCategory('picture');
        setCustomUploadType('prop');
      }
    } catch (err: any) {
      setUrlError(err.message || 'Could not verify URL.');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleApplyCustom = () => {
    let label = customUploadLabel.trim() || 'Custom Reference';
    if (customSubCategory === 'picture' && !label.toLowerCase().includes('picture') && !label.toLowerCase().includes('photo') && !label.toLowerCase().includes('design')) {
      label = `${label} Picture`;
    }
    const finalType: 'clothing' | 'prop' | 'character' =
      customSubCategory === 'picture' ? 'prop' : customUploadType;

    if (customFile) {
      onUploadCustomPhoto(customFile, finalType, label);
      setCustomFile(null);
      setCustomFilePreview(null);
      setCustomUploadLabel('');
    } else if (urlInput.trim() && onAddUrlItem) {
      onAddUrlItem(urlInput.trim(), finalType, label);
      setUrlInput('');
      setUrlPreview(null);
      setCustomUploadLabel('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900/95 to-purple-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Multi-Wardrobe, Props & Companion Characters Studio
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-mono font-semibold">
                  MULTIPLE COMBINATIONS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Select multiple outfits, scenery props, and companion characters to feature together in Gemini Omni Flash video
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Clothing Tab */}
            <button
              onClick={() => setActiveTab('clothing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'clothing'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Clothing ({clothingList.length})</span>
              {activeClothingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-purple-400 text-slate-950 text-[10px] font-bold flex items-center justify-center ml-0.5">
                  {activeClothingCount}
                </span>
              )}
            </button>

            {/* Props Tab */}
            <button
              onClick={() => setActiveTab('prop')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'prop'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Props & Scenery ({propList.length})</span>
              {activePropCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-bold flex items-center justify-center ml-0.5">
                  {activePropCount}
                </span>
              )}
            </button>

            {/* Characters Tab (NEW!) */}
            <button
              onClick={() => setActiveTab('character')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'character'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Characters & Companions ({characterList.length})</span>
              {activeCharacterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center justify-center ml-0.5">
                  {activeCharacterCount}
                </span>
              )}
            </button>

            {/* Upload Tab */}
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Custom Photo or URL</span>
            </button>
          </div>

          {/* AI Generator */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Theme (e.g. Winter Skiing, Campfire Picnic)..."
              value={customTheme}
              onChange={(e) => setCustomTheme(e.target.value)}
              className="text-xs bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 w-44"
            />
            <button
              onClick={handleFetchAiSuggestions}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Generate new wardrobe, props, and companion ideas"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>AI Suggest</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tip Banner */}
        <div className="px-4 sm:px-5 py-2 bg-purple-950/30 border-b border-purple-500/20 flex items-start gap-2.5 text-xs text-purple-200/90">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            <strong className="font-semibold text-purple-300">Multi-Asset Direction: </strong>
            {stylistTip}
          </p>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: CLOTHING & COSTUMES */}
          {activeTab === 'clothing' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {clothingList.map((item) => {
                const active = isItemActive(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => onToggleItem(item)}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all cursor-pointer group ${
                      active
                        ? 'bg-purple-950/50 border-purple-400 shadow-md shadow-purple-500/20 ring-1 ring-purple-400/40'
                        : 'bg-slate-950/80 border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                            {item.icon}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                              {item.title}
                            </h4>
                            <span className="text-[10px] text-purple-400 uppercase font-mono tracking-wider">
                              {item.category || 'Wardrobe'}
                            </span>
                          </div>
                        </div>

                        {/* Active checkbox badge */}
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                            active
                              ? 'bg-purple-500 text-white border-purple-400 shadow-sm'
                              : 'bg-slate-900 text-slate-500 border-slate-700'
                          }`}
                        >
                          {active ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>
                      <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[11px] font-mono text-purple-200/90">
                        "{item.promptDirective}"
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 italic max-w-[220px] truncate">
                        {item.stylingReason || 'Tactile fabric detail'}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
                          active
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'text-slate-400 group-hover:text-purple-300'
                        }`}
                      >
                        {active ? '✓ In Shoot' : '+ Add to Shoot'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: PROPS & SCENERY */}
          {activeTab === 'prop' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {propList.map((item) => {
                const active = isItemActive(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => onToggleItem(item)}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all cursor-pointer group ${
                      active
                        ? 'bg-emerald-950/50 border-emerald-400 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400/40'
                        : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                            {item.icon}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                              {item.title}
                            </h4>
                            <span className="text-[10px] text-emerald-400 uppercase font-mono tracking-wider">
                              Scene Prop / Environment
                            </span>
                          </div>
                        </div>

                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                            active
                              ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                              : 'bg-slate-900 text-slate-500 border-slate-700'
                          }`}
                        >
                          {active ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>
                      <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[11px] font-mono text-emerald-200/90">
                        "{item.promptDirective}"
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
                          active
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'text-slate-400 group-hover:text-emerald-300'
                        }`}
                      >
                        {active ? '✓ In Shoot' : '+ Add Prop to Shoot'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: CHARACTERS & COMPANIONS (NEW!) */}
          {activeTab === 'character' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {characterList.map((item) => {
                const active = isItemActive(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => onToggleItem(item)}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all cursor-pointer group ${
                      active
                        ? 'bg-amber-950/50 border-amber-400 shadow-md shadow-amber-500/20 ring-1 ring-amber-400/40'
                        : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                            {item.icon}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                              {item.title}
                            </h4>
                            <span className="text-[10px] text-amber-400 uppercase font-mono tracking-wider">
                              Companion Character
                            </span>
                          </div>
                        </div>

                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                            active
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                              : 'bg-slate-900 text-slate-500 border-slate-700'
                          }`}
                        >
                          {active ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>
                      <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[11px] font-mono text-amber-200/90">
                        "{item.promptDirective}"
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 italic">
                        {item.stylingReason || 'Plush companion character'}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
                          active
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'text-slate-400 group-hover:text-amber-300'
                        }`}
                      >
                        {active ? '✓ In Scene' : '+ Add Character'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: UPLOAD CUSTOM PHOTO OR URL */}
          {activeTab === 'upload' && (
            <div className="p-4 sm:p-6 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-5">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Upload or Reference a Custom Photo (Clothing, Prop, or Character)
                </h4>
                <p className="text-xs text-slate-400">
                  Select a category, upload an image from your device or paste a web URL. The photo will be passed directly into Gemini Omni Flash to visually condition the video generation.
                </p>
              </div>

              {/* Guide Category Selector */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-semibold block">Target Category:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomSubCategory('picture');
                      setCustomUploadType('prop');
                    }}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      customSubCategory === 'picture'
                        ? 'bg-blue-600/30 border-blue-400 text-blue-200 shadow-sm ring-1 ring-blue-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🖼️</span>
                    <span>Picture / Artwork</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomSubCategory('clothing');
                      setCustomUploadType('clothing');
                    }}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      customSubCategory === 'clothing'
                        ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-sm ring-1 ring-purple-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>👗</span>
                    <span>Clothing / Outfit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomSubCategory('prop');
                      setCustomUploadType('prop');
                    }}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      customSubCategory === 'prop'
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200 shadow-sm ring-1 ring-emerald-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🛷</span>
                    <span>Prop / Scenery</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomSubCategory('character');
                      setCustomUploadType('character');
                    }}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      customSubCategory === 'character'
                        ? 'bg-amber-600/30 border-amber-500 text-amber-200 shadow-sm ring-1 ring-amber-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🐾</span>
                    <span>Companion</span>
                  </button>
                </div>

                {customSubCategory === 'picture' && (
                  <p className="text-[11px] text-blue-300/90 bg-blue-950/40 border border-blue-800/50 rounded-lg p-2 mt-1">
                    💡 <strong>In-Scene Picture & Artwork Mode:</strong> The video model will generate this as a physical photo, print, or card held and viewed by the rabbit in the meadow, and will <strong>NOT</strong> dress the rabbit in it.
                  </p>
                )}
                {customSubCategory === 'clothing' && (
                  <p className="text-[11px] text-purple-300/90 bg-purple-950/40 border border-purple-800/50 rounded-lg p-2 mt-1">
                    👗 <strong>Costume Mode:</strong> The video model will dress the plush rabbit in this garment/outfit.
                  </p>
                )}
                {customSubCategory === 'prop' && (
                  <p className="text-[11px] text-emerald-300/90 bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-2 mt-1">
                    🛷 <strong>Prop / Scenery Mode:</strong> The video model will place this physical item, vehicle, or scenery prop into the scene alongside the rabbit.
                  </p>
                )}
                {customSubCategory === 'character' && (
                  <p className="text-[11px] text-amber-300/90 bg-amber-950/40 border border-amber-800/50 rounded-lg p-2 mt-1">
                    🐾 <strong>Friend / Companion Character Mode:</strong> The video model will render this exact character as the rabbit's companion/friend celebrating, dancing, or interacting in the scene (Reference Image 1 priority).
                  </p>
                )}
              </div>

              {/* Label Input */}
              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">
                  Reference Label or Description:
                </label>
                <input
                  type="text"
                  placeholder="e.g., Red knitted mountain scarf, Vintage wooden sled, Little Fox Friend..."
                  value={customUploadLabel}
                  onChange={(e) => setCustomUploadLabel(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* URL or File Upload Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option A: Local File Upload */}
                <div className="border-2 border-dashed border-slate-700 hover:border-purple-500/60 rounded-xl p-5 flex flex-col items-center justify-center gap-2.5 bg-slate-900/40 text-center cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {customFilePreview ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <img
                        src={customFilePreview}
                        alt="Preview"
                        className="max-h-28 rounded-lg border border-slate-700 object-contain shadow-md"
                      />
                      <span className="text-[11px] font-semibold text-purple-300">
                        ✓ File: {customFile?.name}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          Upload Local Image File
                        </p>
                        <p className="text-[10px] text-slate-500">Supports JPEG, PNG, WebP</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Option B: Web Image URL */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between gap-2.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Or Reference via Web Image URL</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="url"
                        placeholder="https://example.com/item.png"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyUrl}
                        disabled={isLoadingUrl}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0 disabled:opacity-50"
                      >
                        {isLoadingUrl ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                        <span>Verify</span>
                      </button>
                    </div>

                    {urlError && <p className="text-[10px] text-red-400">{urlError}</p>}

                    {urlPreview && (
                      <div className="flex items-center gap-2 pt-1">
                        <img src={urlPreview} alt="URL Preview" className="w-10 h-10 object-contain rounded bg-white p-0.5 border" />
                        <span className="text-[10px] text-emerald-400 font-mono truncate">{urlFilename} verified!</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-500">
                    Bypasses browser CORS; image is fetched server-side and mapped to Gemini Omni.
                  </p>
                </div>
              </div>

              {/* Submit button */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!customFile && !urlPreview}
                  onClick={handleApplyCustom}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Active Shoot</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Persistent Bottom Active Tray */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/95 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-bold text-slate-300 shrink-0">
              Active in Shoot ({activeItems.length}):
            </span>

            {activeItems.length === 0 ? (
              <span className="text-xs text-slate-500 italic">
                None selected yet. Click any item above to add!
              </span>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap max-h-16 overflow-y-auto">
                {activeItems.map((item) => (
                  <span
                    key={item.id}
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                      item.type === 'clothing'
                        ? 'bg-purple-950 text-purple-300 border-purple-500/40'
                        : item.type === 'prop'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-950 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="max-w-[120px] truncate">{item.title}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleItem(item);
                      }}
                      className="hover:text-white cursor-pointer ml-0.5"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeItems.length > 0 && onClearAllItems && (
              <button
                type="button"
                onClick={onClearAllItems}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-300 text-xs font-medium border border-slate-800 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-purple-500/20 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Done ({activeItems.length} Selected)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
