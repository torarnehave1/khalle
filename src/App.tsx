import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Sparkles,
  Upload,
  Maximize2,
  Sliders,
  Film,
  Zap,
  Check,
  AlertCircle,
  Camera,
  RefreshCw,
  Volume2,
  VolumeX,
  Layers,
  ArrowRight,
  ExternalLink,
  Crop,
  Sun,
  Snowflake,
  CloudRain,
  CloudFog,
  Sunrise,
  Rainbow,
  Wind,
  Leaf,
  CreditCard,
  CheckCircle2,
  Coins,
  DollarSign,
  HelpCircle,
  X,
  ShieldAlert,
  Info,
  PlusCircle,
  Clapperboard,
  FastForward,
  ListVideo,
  PlayCircle,
  ChevronRight,
  Wrench,
  Trash2,
  Edit3,
  SlidersHorizontal,
  Shirt,
  ShieldCheck,
  Eye,
  Wand2,
  Settings,
  Shield,
  ScrollText,
  BookOpen,
  ArrowLeft,
  MoveLeft,
  MoveRight,
  Compass,
  Users,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AiDirectorModal } from './components/AiDirectorModal';
import { CinematographyGlossaryModal } from './components/CinematographyGlossaryModal';
import { CinematographyToolbar } from './components/CinematographyToolbar';
import {
  AiStylistModal,
  StylistItem,
  PRESET_CLOTHING,
  PRESET_PROPS,
  PRESET_CHARACTERS,
} from './components/AiStylistModal';
import {
  VideoWatermarkOverlay,
  WatermarkConfig,
  DEFAULT_WATERMARK_CONFIG,
} from './components/VideoWatermarkOverlay';
import { WatermarkSettingsModal } from './components/WatermarkSettingsModal';
import {
  ScriptToStoryModal,
  ScriptSceneSuggestion,
  ScriptStoryboardPlan,
} from './components/ScriptToStoryModal';
import { UploadSceneModal } from './components/UploadSceneModal';
import { useStoryPersistence } from './lib/storyStore';
import { useBoards } from './lib/boardStore';
import StoryBoard from './components/StoryBoard';
import AlbumPicker from './components/AlbumPicker';
import PromptReview, { type PromptReviewData } from './components/PromptReview';
import { newBoard } from './api/board';
import { useTrimmedPlayback } from './lib/trimPlayback';
import { extensionChainSeconds, MAX_EXTENSION_CHAIN_SECONDS } from './lib/extensionChain';
import { grabFrame, imageToDataUrl } from './lib/frameGrab';
import { findExtensionSeam, storyPlayEnd } from './lib/seam';
import { analyzeCut, type CutAnalysis } from './api/cutAnalysis';
import { exportStory } from './lib/storyExport';
import SceneEditBar from './components/SceneEditBar';
import AppLogo from './components/AppLogo';
import CastModal from './components/CastModal';
import TransitionModal from './components/TransitionModal';
import { generateTransition } from './api/transition';
import {
  BellyEmblemModal,
  BellyEmblemConfig,
  NO_SYMBOL_EMBLEM,
  PRESET_EMBLEMS,
} from './components/BellyEmblemModal';
import {
  DiagnosticLogModal,
  GenerationLogRecord,
} from './components/DiagnosticLogModal';

// Default provided rabbit asset path
const DEFAULT_RABBIT_PATH = '/assets/aistudio/1790924612634-1_cd314286.jpg';
const WAYFINDER_RABBIT_PATH = '/assets/aistudio/rabbit_wayfinder_jump.jpg';

export interface ReferenceAngle {
  id: string;
  category: 'character' | 'clothing' | 'shoot_guide' | 'prop';
  label: string;
  tagline: string;
  imagePath?: string;
  imageBase64?: string;
  mimeType?: string;
  enabled: boolean;
  directiveText?: string;
  icon?: string;
  isDefault?: boolean;
}

export const TRANSFORMATION_REFERENCE_ASSETS: ReferenceAngle[] = [
  {
    id: 'ref-start-symbol',
    category: 'character',
    label: '1. Start (image_07de772c.png)',
    tagline: 'Initial state: Authentic oval white felt patch with blue border & two interlocking spiral swirls',
    imagePath: '/assets/aistudio/image_07de772c.png',
    enabled: true,
    isDefault: true,
    icon: '🌀',
  },
  {
    id: 'ref-end-symbol',
    category: 'character',
    label: '2. End (image_07c026d1.png)',
    tagline: 'Final state: Authentic eight-spoke blueprint with asymmetrical comb, circle & crossbar staves',
    imagePath: '/assets/aistudio/image_07c026d1.png',
    enabled: true,
    isDefault: true,
    icon: '✨',
  },
  {
    id: 'ref-face-grin',
    category: 'character',
    label: 'Face Close-Up & Buck Tooth',
    tagline: 'Tall upright ears, single buck tooth, open grin',
    imagePath: '/assets/aistudio/rabbit_face_crop.jpg',
    enabled: true,
    isDefault: true,
    icon: '🦷',
  },
  {
    id: 'ref-master-jump',
    category: 'character',
    label: 'Character Action Silhouette',
    tagline: 'Apple-green fuzzy fleece doll with red boots and original chest emblem',
    imagePath: '/assets/aistudio/1790924612634-1_cd314286.jpg',
    enabled: true,
    isDefault: true,
    icon: '🐰',
  },
];

export const WAYFINDER_REFERENCE_ASSETS: ReferenceAngle[] = [
  {
    id: 'ref-master-jump',
    category: 'character',
    label: 'Master Action Jump',
    tagline: 'Full leap with exact blue chest embroidery',
    imagePath: '/assets/aistudio/rabbit_wayfinder_jump.jpg',
    enabled: true,
    isDefault: true,
    icon: '🐰',
  },
  {
    id: 'ref-face-grin',
    category: 'character',
    label: 'Face Close-Up & Buck Tooth',
    tagline: 'Tall upright ears, single buck tooth, open grin',
    imagePath: '/assets/aistudio/rabbit_face_crop.jpg',
    enabled: true,
    isDefault: true,
    icon: '🦷',
  },
  {
    id: 'ref-emblem-boots',
    category: 'character',
    label: 'Chest Embroidery Close-Up',
    tagline: 'Exact blue embroidered 8-spoke symbol on fleece',
    imagePath: '/assets/aistudio/rabbit_chest_emblem_clean.png',
    enabled: true,
    isDefault: true,
    icon: '✨',
  },
];

export const ORIGINAL_MEDALLION_REFERENCE_ASSETS: ReferenceAngle[] = [
  {
    id: 'ref-emblem-medallion',
    category: 'character',
    label: 'Original Spiral Medallion',
    tagline: 'Oval white felt badge with blue border and two interlocking spiral swirls',
    imagePath: '/assets/aistudio/rabbit_original_emblem_medallion.png',
    enabled: true,
    isDefault: true,
    icon: '🌀',
  },
  {
    id: 'ref-master-jump',
    category: 'character',
    label: 'Master Jump Silhouette',
    tagline: 'Plush rabbit leaping in alpine meadow wearing original chest emblem',
    imagePath: '/assets/aistudio/1790924612634-1_cd314286.jpg',
    enabled: true,
    isDefault: true,
    icon: '🐰',
  },
  {
    id: 'ref-face-grin',
    category: 'character',
    label: 'Face Close-Up & Buck Tooth',
    tagline: 'Tall upright ears, single buck tooth, open grin',
    imagePath: '/assets/aistudio/rabbit_face_crop.jpg',
    enabled: true,
    isDefault: true,
    icon: '🦷',
  },
];

// "No symbol": only pictures of the rabbit with a plain belly, so nothing shows Gemini a symbol.
export const NO_SYMBOL_RABBIT_PATH = '/assets/aistudio/rabbit_wayfinder_jump_no_symbol.jpg';
export const NO_SYMBOL_REFERENCE_ASSETS: ReferenceAngle[] = [
  {
    id: 'ref-master-jump',
    category: 'character',
    label: 'Master Action Jump',
    tagline: 'Full leap, plain pink belly with no symbol',
    imagePath: NO_SYMBOL_RABBIT_PATH,
    enabled: true,
    isDefault: true,
    icon: '🐰',
  },
];

export const DEFAULT_REFERENCE_ASSETS = TRANSFORMATION_REFERENCE_ASSETS;

export interface JumpPreset {
  id: string;
  label: string;
  tagline: string;
  baseAction: string;
  icon: string;
  recommendedAspect: '9:16' | '16:9';
}

export const JUMP_PRESETS: JumpPreset[] = [
  {
    id: 'drone-sweep-sound',
    label: 'Alpine FPV Drone Sweep (Sound)',
    tagline: 'High-speed fly-over banking with mountain wind audio',
    baseAction:
      'Cinematic sweeping FPV drone fly-over shot banking dynamically around the cute green plush rabbit as it leaps toward snow-capped peaks, accompanied by rich natural audio of whistling alpine wind, birdsong, and bouncy toy sound effects.',
    icon: '🛸',
    recommendedAspect: '9:16',
  },
  {
    id: 'drone-glide-silent',
    label: 'Silent Aerial Drone Glide',
    tagline: 'Serene stabilized slow-motion aerial over wildflowers',
    baseAction:
      'Breathtaking silent aerial drone fly-over shot gliding in smooth stabilized slow-motion over blooming alpine wildflowers, tracking the plush rabbit’s high leap with pure visual elegance and no sound.',
    icon: '🚁',
    recommendedAspect: '16:9',
  },
  {
    id: 'high-jump',
    label: 'High Meadow Leap',
    tagline: 'Joyful vertical launch with kicking boots',
    baseAction:
      'The cute green plush rabbit leaps high into the sky, kicking its red boots with pure joy. Its floppy ears flap playfully in the breeze as it reaches the peak of its bounce with arms outstretched happily.',
    icon: '🚀',
    recommendedAspect: '9:16',
  },
  {
    id: 'backflip-bounce',
    label: 'Acrobatic Backflip',
    tagline: 'Playful bouncy flip in mid-air',
    baseAction:
      'The plush rabbit crouches down, spring-loads its feet, and executes an energetic slow-motion backflip in mid-air, landing softly on both boots and pumping its fuzzy paws in celebration.',
    icon: '🤸',
    recommendedAspect: '9:16',
  },
  {
    id: 'daisy-hop',
    label: 'Joyful Forward Hop',
    tagline: 'Bouncy energetic hops across the ground',
    baseAction:
      'The fluffy green rabbit hops forward with rhythmic bouncy leaps, smiling cheerfully with ears bobbing with each jump, arms waving excitedly.',
    icon: '🌸',
    recommendedAspect: '16:9',
  },
  {
    id: 'floating-flight',
    label: 'Alpine Breeze Flight',
    tagline: 'Floating weightlessly above the lake',
    baseAction:
      'A whimsical mountain breeze lifts the plush rabbit floating gently into the air, spinning slowly with arms wide open, soft sunlight gleaming through its green fur with the alpine lake below.',
    icon: '✨',
    recommendedAspect: '16:9',
  },
];

export interface SeasonOption {
  id: string;
  name: string;
  icon: string;
  badge: string;
  description: string;
  particles: string[];
  colorClasses: string;
  activeBorder: string;
}

export const SEASONS: SeasonOption[] = [
  {
    id: 'spring',
    name: 'Spring',
    icon: '🌸',
    badge: 'Wildflower Bloom',
    description:
      'lush green alpine meadow bursting with colorful blooming wildflowers, fresh daisies, tender green grass, and sunny mountain peaks',
    particles: ['🌸', '🌼', '🍀', '✨'],
    colorClasses: 'text-emerald-400 bg-emerald-950/40',
    activeBorder: 'border-emerald-500 shadow-emerald-500/20',
  },
  {
    id: 'summer',
    name: 'Summer',
    icon: '☀️',
    badge: 'Golden Meadow',
    description:
      'sun-drenched lush alpine landscape under brilliant warm golden sun, vibrant green meadows, and shimmering mountain lake water',
    particles: ['☀️', '🌻', '✨', '🦋'],
    colorClasses: 'text-amber-400 bg-amber-950/40',
    activeBorder: 'border-amber-500 shadow-amber-500/20',
  },
  {
    id: 'autumn',
    name: 'Autumn',
    icon: '🍁',
    badge: 'Golden Foliage',
    description:
      'autumn wonderland with golden amber, copper, and fiery crimson foliage, dry leaves fluttering in the crisp fall wind, warm rustic mountain light',
    particles: ['🍁', '🍂', '🌾', '✨'],
    colorClasses: 'text-orange-400 bg-orange-950/40',
    activeBorder: 'border-orange-500 shadow-orange-500/20',
  },
  {
    id: 'winter',
    name: 'Winter',
    icon: '❄️',
    badge: 'Snowy Wonderland',
    description:
      'magical winter wonderland blanketed in fresh powdery white snow, snow-frosted pines, delicate frost in the air, frozen icy lake and majestic snowy mountain peaks',
    particles: ['❄️', '🌨️', '⛄', '✨'],
    colorClasses: 'text-cyan-300 bg-cyan-950/40',
    activeBorder: 'border-cyan-400 shadow-cyan-500/20',
  },
];

export interface WeatherOption {
  id: string;
  name: string;
  icon: string;
  badge: string;
  description: string;
  particles: string[];
}

export const WEATHER_OPTIONS: WeatherOption[] = [
  {
    id: 'sunny',
    name: 'Clear & Sunny',
    icon: '☀️',
    badge: 'Brilliant Sun',
    description:
      'bright clear blue skies with radiant sunshine, sharp crisp alpine lighting and gentle warm breeze',
    particles: ['☀️', '✨'],
  },
  {
    id: 'snowing',
    name: 'Gentle Snowfall',
    icon: '🌨️',
    badge: 'Fluffy Snowflakes',
    description:
      'peaceful fluffy white snowflakes drifting down through the cold alpine air, gently dusting the rabbit and ground in soft white powder',
    particles: ['❄️', '🌨️', '✨'],
  },
  {
    id: 'rain',
    name: 'Refreshing Rain',
    icon: '🌧️',
    badge: 'Gentle Drizzle',
    description:
      'gentle refreshing mountain rain drizzle, soft sparkling raindrops falling and glistening on the rabbit plush fur with moody atmospheric lighting',
    particles: ['💧', '🌧️', '✨'],
  },
  {
    id: 'sunset',
    name: 'Golden Sunset',
    icon: '🌅',
    badge: 'Alpenglow Dusk',
    description:
      'spectacular golden hour sunset with rich rose-gold, purple, and fiery orange alpenglow washing across the sky, mountains, and lake',
    particles: ['✨', '💫', '🔥'],
  },
  {
    id: 'misty',
    name: 'Morning Mist',
    icon: '🌫️',
    badge: 'Ethereal Fog',
    description:
      'dreamy atmospheric morning mist and soft fog drifting through the pine trees and over the lake water, cinematic soft lighting',
    particles: ['🌫️', '✨'],
  },
  {
    id: 'rainbow',
    name: 'Rainbow Sky',
    icon: '🌈',
    badge: 'Post-Rain Rainbow',
    description:
      'a luminous vibrant rainbow arching across the sky above the alpine lake with sparkling ambient sunbeams breaking through soft clouds',
    particles: ['🌈', '✨', '💎'],
  },
];

export interface ContinuationPreset {
  id: string;
  label: string;
  actionTitle: string;
  prompt: string;
  icon: string;
  description: string;
}

export const CONTINUATION_PRESETS: ContinuationPreset[] = [
  {
    id: 'landing-wave',
    label: 'Soft Landing & Wave',
    actionTitle: 'Landing & Cheerful Wave',
    prompt:
      'The plush rabbit gracefully finishes its jump, touching down gently on both red boots into the meadow grass. It turns cheerfully toward the camera, smiles brightly, and waves its fuzzy paw enthusiastically.',
    icon: '🛬',
    description: 'Graceful touchdown on meadow grass followed by an adorable paw wave to camera',
  },
  {
    id: 'victory-spin',
    label: '360° Victory Spin',
    actionTitle: 'Celebratory Pirouette & Double Hop',
    prompt:
      'Upon touching down, the green rabbit performs a joyful 360-degree victory spin on one boot with arms wide open, then does two playful mini hops forward with floppy ears bouncing happily.',
    icon: '🤸',
    description: 'Energetic celebratory spin followed by rhythmic forward hops',
  },
  {
    id: 'bound-lake',
    label: 'Bound Toward Lake',
    actionTitle: 'Bounding Down the Meadow',
    prompt:
      'The rabbit takes off bounding playfully down the wildflower hill toward the sparkling alpine lake, kicking up tiny flower petals as it hops joyfully into the scenic distance.',
    icon: '🏞️',
    description: 'Energetic hops traveling downhill toward the glistening mountain lake',
  },
  {
    id: 'smell-wildflowers',
    label: 'Smell Wildflowers',
    actionTitle: 'Curious Daisy Sniff & Gaze',
    prompt:
      'The rabbit halts amidst the lush meadow, crouches down gently to sniff a cluster of colorful blooming wildflowers, and glances up cheerfully with its bright blue eyes gleaming.',
    icon: '🌸',
    description: 'Gentle curious moment interacting with alpine flowers',
  },
  {
    id: 'peaceful-rest',
    label: 'Alpine Panorama Rest',
    actionTitle: 'Cozy Rest & Mountain Breeze',
    prompt:
      'The rabbit sits down cozily on the warm grassy knoll, panting happily with a warm contented smile, gazing out across the alpine mountain peaks as the breeze rustles its green fur.',
    icon: '✨',
    description: 'Serene resting scene taking in the panoramic mountain vista',
  },
];

export interface QuickCorrectionSuggestion {
  id: string;
  label: string;
  icon: string;
  instruction: string;
  category: 'motion' | 'lighting' | 'character' | 'environment';
}

/** "What is wrong?" in the Change-a-scene window: each adds a clear instruction to the new version. */
export const SCENE_PROBLEMS: { id: string; label: string; instruction: string }[] = [
  { id: 'extra-character', label: 'An extra character appears', instruction: 'Show only the characters in the start frame and the scene text. Remove every other character, also small, distant or in the background.' },
  { id: 'khalle-wrong', label: 'Khalle looks wrong', instruction: 'The green plush rabbit must look exactly like the reference pictures: apple-green fleece, tall upright ears, one white buck tooth, pink snout, pink scarf and red boots.' },
  { id: 'season-wrong', label: 'Wrong season or weather', instruction: 'Show the chosen season and weather clearly in the whole shot.' },
  { id: 'camera-too-much', label: 'Camera moves too much', instruction: 'Keep the camera steady; only slow, gentle camera moves.' },
  { id: 'too-fast', label: 'Movement too fast', instruction: 'Make every movement slower and calmer.' },
  { id: 'cut-jumps', label: 'The cut to the next scene jumps', instruction: 'End in a calm pose close to how the scene started, so the next scene can follow smoothly.' },
];

export const QUICK_CORRECTION_SUGGESTIONS: QuickCorrectionSuggestion[] = [
  {
    id: 'higher-jump',
    label: 'Higher Leap & Spring',
    icon: '🚀',
    instruction: 'Make the rabbit bounce 50% higher with more energetic spring, kicking both boots enthusiastically.',
    category: 'motion',
  },
  {
    id: 'softer-landing',
    label: 'Gentle & Soft Landing',
    icon: '🪶',
    instruction: 'Make the landing softer, gentler, and smoother as the plush rabbit cushions itself into the meadow grass.',
    category: 'motion',
  },
  {
    id: 'wave-camera',
    label: 'Face Camera & Big Wave',
    icon: '🐾',
    instruction: 'Have the rabbit turn face-forward toward camera, smiling cheerfully with bright blue eyes and waving its fuzzy paw.',
    category: 'character',
  },
  {
    id: 'spin-turn',
    label: '360° Mid-Air Pirouette',
    icon: '🤸',
    instruction: 'The rabbit performs a full acrobatic 360-degree mid-air spin with arms outstretched before touching down.',
    category: 'motion',
  },
  {
    id: 'slow-motion',
    label: 'Cinematic Slow Motion',
    icon: '✨',
    instruction: 'Render the motion in graceful cinematic slow motion with soft breeze ruffling the plush green fur.',
    category: 'motion',
  },
  {
    id: 'sunny-bloom',
    label: 'More Wildflowers & Sun',
    icon: '🌸',
    instruction: 'Enhance the scene with radiant sunshine and a dense carpet of colorful blooming daisies, buttercups, and petals.',
    category: 'environment',
  },
  {
    id: 'golden-hour',
    label: 'Warmer Sunset Alpenglow',
    icon: '🌅',
    instruction: 'Switch lighting to intense warm golden hour sunset with purple and amber alpenglow over the alpine peaks.',
    category: 'lighting',
  },
  {
    id: 'winter-snow',
    label: 'Crisp Snowdrifts & Flakes',
    icon: '❄️',
    instruction: 'Blanket the ground in fresh powdery snowdrifts with delicate snowflakes drifting past the rabbit.',
    category: 'environment',
  },
];

export interface GeneratedVideo {
  id: string;
  videoUrl: string;
  prompt: string;
  aspectRatio: '9:16' | '16:9';
  duration: string;
  timestamp: string;
  sourceImage: string;
  season?: string;
  weather?: string;
  cost?: string;
  engine?: 'omni';
  storyId: string;
  sceneNumber: number;
  interactionId?: string;
  previousInteractionId?: string;
  /**
   * Set once the clip of an extension has been checked: Gemini returns an extension as the whole
   * chain from the first scene, so the scene starts playing where its own new part begins.
   */
  extensionTrimChecked?: boolean;
  /** Measured length of the clip file in seconds (an extension's file is longer than its own part). */
  clipSeconds?: number;
  /** Edit list: play only this part of the clip (seconds). The clip file itself is never cut. */
  trimStart?: number;
  trimEnd?: number;
  /** The story's name, kept on every scene of the story (set with Rename on the Stories page). */
  storyTitle?: string;
  /** Whether Khalle's pictures and rule were sent for this scene; the next scene of the story uses the same. */
  includeKhalle?: boolean;
  /** Sound setting used for this scene, and whether the character talked without words. */
  audioMode?: 'with_sound' | 'no_voices' | 'silent';
  silentTalk?: boolean;
  /** The story's approved main character ("Save this character"), kept on every scene of the story. */
  castImage?: string;
  castDescription?: string;
  castName?: string;
  /**
   * Extension only: where its own new part begins in the clip, found from the frames (src/lib/seam.ts).
   * The scene it continues stops here when the two play in a row (storyPlayEnd).
   */
  seamStart?: number;
  /** Set once the seam has been looked for (replaces the old length-only trim). */
  seamChecked?: boolean;
}

/**
 * Seconds a scene plays: its trimmed part of the clip. The clip's end is its measured length when
 * known (an extension's file holds the whole chain), else the scene's duration label.
 */
function scenePlaySeconds(scene: GeneratedVideo, next?: GeneratedVideo): number {
  const full = scene.clipSeconds ?? (parseInt(scene.duration || '', 10) || 5);
  return Math.max(0, (storyPlayEnd(scene, next) ?? full) - (scene.trimStart ?? 0));
}

/** Seconds a story plays: each scene stops where the next one (its extension) takes over. */
function storyPlaySeconds(scenes: GeneratedVideo[]): number {
  return scenes.reduce((sum, scene, i) => sum + scenePlaySeconds(scene, scenes[i + 1]), 0);
}

export default function App() {
  // Image selection state
  const [selectedImage, setSelectedImage] = useState<string>(NO_SYMBOL_RABBIT_PATH);
  const [isDefaultImage, setIsDefaultImage] = useState<boolean>(true);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');

  // Jump Action & Environment state
  const [activePreset, setActivePreset] = useState<string>('');
  const [selectedSeason, setSelectedSeason] = useState<string>(''); // '' = not set: nothing about season is sent (decision 2026-11-11)
  const [selectedWeather, setSelectedWeather] = useState<string>('');
  // Off: picking a season never rewrites the user's text (decision 2026-11-11: the box starts empty).
  const [autoCompose, setAutoCompose] = useState<boolean>(false);

  // Pricing & Spend Cap state
  const [showPricingModal, setShowPricingModal] = useState<boolean>(false);
  const [sessionCost, setSessionCost] = useState<number>(0);

  // Helper to construct prompt from base action + season + weather
  const composePrompt = (baseActionText: string, seasonId: string, weatherId: string) => {
    const s = SEASONS.find((item) => item.id === seasonId);
    const w = WEATHER_OPTIONS.find((item) => item.id === weatherId);
    // Season and weather are only written when the user picked them.
    return `${baseActionText.trim()}${s ? ` The scene is set in ${s.name.toLowerCase()} with ${s.description}.` : ''}${w ? ` The weather features ${w.description}.` : ''}`;
  };

  const [prompt, setPrompt] = useState<string>('');

  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [duration, setDuration] = useState<'5s' | '10s' | '15s' | '20s' | '30s'>('5s');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');

  // Generation state
  const [isSpendingCapHit, setIsSpendingCapHit] = useState<boolean>(false);
  const [quotaCheckStatus, setQuotaCheckStatus] = useState<'idle' | 'checking' | 'active' | 'syncing' | 'error'>('idle');
  const [quotaCheckMsg, setQuotaCheckMsg] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInputBlocked, setIsInputBlocked] = useState<boolean>(false);
  const [blockedPromptSuggestion, setBlockedPromptSuggestion] = useState<string | null>(null);
  const [isRephrasingPrompt, setIsRephrasingPrompt] = useState<boolean>(false);

  // Result & Player state
  const [currentVideo, setCurrentVideo] = useState<GeneratedVideo | null>(null);
  const [videoHistory, setVideoHistory] = useState<GeneratedVideo[]>([]);
  // Latest history for handlers that finish after an await (a generation takes minutes).
  const videoHistoryRef = useRef<GeneratedVideo[]>([]);
  videoHistoryRef.current = videoHistory;

  // Gemini returns an extended scene as the whole chain (scene 1 + 2 + … + the new part), so
  // without this a story replays its earlier scenes. For every extension not yet checked, find
  // where its new part begins (src/lib/seam.ts: 4 frames before chain − own length, refined from the
  // picture) and start playback there (the file itself is kept). Scenes the user trimmed or split are
  // left alone. Scenes trimmed by the older length-only rule (trimStart = clip − own) are fixed once.
  const extensionTrimInFlight = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const scene of videoHistory) {
      if (!scene.previousInteractionId || scene.seamChecked || !scene.videoUrl || extensionTrimInFlight.current.has(scene.id)) {
        continue;
      }
      const ownSeconds = parseInt(String(scene.duration || '0'), 10) || 0;
      const untouched = scene.trimStart === undefined && scene.trimEnd === undefined && !scene.extensionTrimChecked;
      const oldAutoTrim =
        !!scene.extensionTrimChecked &&
        scene.trimEnd === undefined &&
        (scene.trimStart === undefined ||
          (scene.clipSeconds !== undefined && Math.abs(scene.trimStart - (scene.clipSeconds - ownSeconds)) < 0.02));
      if (!untouched && !oldAutoTrim) continue;
      const autoStart = scene.trimStart;
      extensionTrimInFlight.current.add(scene.id);
      findExtensionSeam(scene.videoUrl, ownSeconds)
        .then(({ clipSeconds, seamStart }) => {
          const patch = (v: GeneratedVideo): GeneratedVideo =>
            v.id === scene.id && v.trimEnd === undefined && v.trimStart === autoStart && !v.seamChecked
              ? {
                  ...v,
                  trimStart: seamStart,
                  seamStart,
                  seamChecked: true,
                  extensionTrimChecked: true,
                  clipSeconds: Number.isFinite(clipSeconds) ? clipSeconds : undefined,
                }
              : v;
          setVideoHistory((prev) => prev.map(patch));
          setCurrentVideo((cur) => (cur ? patch(cur) : cur));
        })
        .catch(() => {
          /* clip not readable now (e.g. still downloading); try again on the next change */
        })
        .finally(() => extensionTrimInFlight.current.delete(scene.id));
    }
  }, [videoHistory]);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [compareMode, setCompareMode] = useState<'video' | 'split' | 'photo'>('video');

  // Storyboard & Multi-Scene Extension state
  const [showExtensionDrawer, setShowExtensionDrawer] = useState<boolean>(false);
  const [nextScenePrompt, setNextScenePrompt] = useState<string>(CONTINUATION_PRESETS[0].prompt);
  const [selectedContinuationPreset, setSelectedContinuationPreset] = useState<string>(CONTINUATION_PRESETS[0].id);
  const [isExtending, setIsExtending] = useState<boolean>(false);
  const [isAnalyzingCut, setIsAnalyzingCut] = useState<boolean>(false);
  const [storyExport, setStoryExport] = useState<{ step: string; fraction: number } | null>(null);
  const [cutAnalysis, setCutAnalysis] = useState<CutAnalysis | null>(null);
  const [playAllContinuous, setPlayAllContinuous] = useState<boolean>(true);

  // Scene Correction & Re-take state
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [sceneToCorrect, setSceneToCorrect] = useState<GeneratedVideo | null>(null);
  const [correctionPrompt, setCorrectionPrompt] = useState<string>('');
  // Length of a new scene added with + AI / Extend: 5–15 s (10 s max when continuing a clip).
  const [newSceneSeconds, setNewSceneSeconds] = useState<number>(5);
  // Smooth-transition panel: the two scenes the cut sits between.
  // from = null: a new scene before `to` (the first scene), starting on `startImage`.
  const [transitionPair, setTransitionPair] = useState<{ from: GeneratedVideo | null; to: GeneratedVideo; startImage?: string } | null>(null);
  // Drag and drop on the storyboard: the scene being dragged and where it would land.
  const [dragSceneId, setDragSceneId] = useState<string | null>(null);
  /** Where a dragged scene would land: a story and a 0-based slot in it. `copy` while Alt is held. */
  const [dropTarget, setDropTarget] = useState<{ storyId: string; index: number; copy: boolean; landsAs: number; blocked?: string } | null>(null);
  const [isMakingTransition, setIsMakingTransition] = useState<boolean>(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  // After a scene is corrected, the next scene still follows the old take. Offer a transition.
  const [joinOffer, setJoinOffer] = useState<{ sceneId: string; nextId: string } | null>(null);
  const [correctionFeedback, setCorrectionFeedback] = useState<string>('');
  const [correctionSeason, setCorrectionSeason] = useState<string>('');
  const [correctionWeather, setCorrectionWeather] = useState<string>('');
  const [correctionMode, setCorrectionMode] = useState<'replace' | 'duplicate'>('replace');
  const [correctionSeconds, setCorrectionSeconds] = useState<number>(5);
  /** Problems picked in "What is wrong?" (ids from SCENE_PROBLEMS). */
  const [correctionProblems, setCorrectionProblems] = useState<string[]>([]);
  /** Khalle in this new version only; starts from the main switch. */
  const [correctionIncludeKhalle, setCorrectionIncludeKhalle] = useState(true);
  const [isCorrecting, setIsCorrecting] = useState<boolean>(false);

  // AI Cinematographer & Director state
  const [showDirectorModal, setShowDirectorModal] = useState<boolean>(false);
  const [showGlossaryModal, setShowGlossaryModal] = useState<boolean>(false);
  const [directorTarget, setDirectorTarget] = useState<'main' | 'extension' | 'correction'>('main');

  // Interactive jump physics simulator state
  const [jumpCount, setJumpCount] = useState<number>(0);
  const [isPhysicsJumping, setIsPhysicsJumping] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; char: string }[]>([]);

  // Refs
  // The main player is two <video> elements (slots). The visible one is `videoRef`; in story play
  // the hidden one holds the next scene, loaded and seeked to its first frame, so the cut is a swap
  // with no load in between (see handOffToNextScene).
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const slotEls = useRef<(HTMLVideoElement | null)[]>([null, null]);
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const activeSlotRef = useRef<0 | 1>(0);
  const slotRefCallbacks = useMemo(
    () =>
      ([0, 1] as const).map((slot) => (el: HTMLVideoElement | null) => {
        slotEls.current[slot] = el;
        if (slot === activeSlotRef.current) videoRef.current = el;
      }),
    []
  );
  const splitVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Scenes survive a reload and follow the user to other devices: saved in this browser
  // (IndexedDB) and in their account on the server, restored on startup.
  useStoryPersistence<GeneratedVideo>(
    videoHistory,
    (saved) => {
      setVideoHistory(saved);
      // Keep the open scene if it still exists (its URL may be new), else open the newest.
      setCurrentVideo((cur) => (cur ? saved.find((s) => s.id === cur.id) : undefined) || saved[0] || null);
    },
    (message) => setErrorMessage(message),
    // Scenes made on another device while this one also changed: add them, keep everything here.
    (extra) => setVideoHistory((prev) => [...prev, ...extra.filter((e) => !prev.some((p) => p.id === e.id))])
  );

  // Production Cast, Props, Equipment & Wardrobe Multi-Select Studio
  const [referenceAssets, setReferenceAssets] = useState<ReferenceAngle[]>(NO_SYMBOL_REFERENCE_ASSETS);
  const [activeStylistItems, setActiveStylistItems] = useState<StylistItem[]>([]);
  const [audioMode, setAudioMode] = useState<'with_sound' | 'no_voices' | 'silent'>('with_sound');
  /** "Talks without words": the character moves the mouth as if speaking, no voice (for a voice-over later). */
  const [silentTalk, setSilentTalk] = useState(false);
  /** The same, for the version made in the Change-a-scene window. */
  const [correctionSilentTalk, setCorrectionSilentTalk] = useState(false);
  /** Off: Khalle's pictures, belly symbol and identity rule are left out of the request (for scenes about other characters). */
  const [includeKhalle, setIncludeKhalle] = useState(true);
  /** The "More options" panel in step 2 (camera, ideas, clothes, format, sound, Khalle's pictures). */
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  /** With a story open, the next scene from the left panel continues the last scene ('end') or starts from a picture. */
  const [nextStartsFrom, setNextStartsFrom] = useState<'end' | 'picture'>('end');
  /** Set just before a Generate from a picture that should join the open story instead of starting a new one. */
  const appendToStoryRef = useRef<string | null>(null);
  /** The "+ Before" / "+ After" choice on a scene card: make it with AI or upload a clip. */
  const [addMenu, setAddMenu] = useState<{ sceneId: string; side: 'before' | 'after' } | null>(null);
  /** 'stories' shows the Stories page instead of the make-a-scene screen. */
  const [view, setView] = useState<'make' | 'stories' | 'board'>('make');
  /** Story boards (plan the story with key pictures, then make the film scene by scene). */
  const { boards, setBoards } = useBoards((message) => setErrorMessage(message));
  const [activeBoardId, setActiveBoardId] = useState<string>(() => {
    try {
      return localStorage.getItem('khalle:board') || '';
    } catch {
      return '';
    }
  });
  const activeBoard = boards.find((b) => b.id === activeBoardId) || boards[0];
  useEffect(() => {
    try {
      if (activeBoard) localStorage.setItem('khalle:board', activeBoard.id);
    } catch {
      /* not remembered */
    }
  }, [activeBoard?.id]);
  /**
   * A board scene being made: the board's text and picture are put into the make-a-scene state, and
   * the effect below starts the normal Generate once that state is in place (so it reads it fresh).
   */
  const [boardRun, setBoardRun] = useState<{ boardId: string; index: number; lastId?: string; before: string[]; started: boolean; done?: boolean } | null>(null);
  /** "From my albums" on the make-a-scene screen: for the start picture or a reference picture. */
  const [makeAlbums, setMakeAlbums] = useState<null | 'start' | 'ref'>(null);
  // "What Gemini gets": every video request is shown (and can be edited) before it is sent.
  const [promptReview, setPromptReview] = useState<(PromptReviewData & { resolve: (text: string | null) => void }) | null>(null);
  const reviewPrompt = (data: PromptReviewData) =>
    new Promise<string | null>((resolve) => setPromptReview({ ...data, resolve }));
  const cancelledError = () => Object.assign(new Error('Cancelled'), { cancelled: true });
  const talkNote = (on: boolean) =>
    on ? ['Talks without words is on: the main character will also talk (move the mouth and gesture) while doing what the text says. Switch it off if the scene is about another action.'] : [];
  /** Builds the request's text without sending, shows it, then sends exactly what the user approved. */
  const sendWithReview = async (url: string, body: any): Promise<Response> => {
    const pv = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, previewOnly: true }),
    });
    const data = await pv.json().catch(() => ({}));
    if (!pv.ok || !data?.preview) throw new Error(data?.error || 'The text for Gemini could not be made.');
    const title = body.previousInteractionId ? 'continues the scene before' : 'new video';
    const text = await reviewPrompt({ title, text: data.preview.text, pictures: data.preview.pictures || [], notes: talkNote(body.silentTalk === true) });
    if (text === null) throw cancelledError();
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, promptOverride: text }),
    });
  };
  /** While a scene is being made: getting it ready ('preparing') or waiting for Gemini ('making'), its number, and when it started. */
  const [genPhase, setGenPhase] = useState<'preparing' | 'making'>('preparing');
  const [makingSceneNo, setMakingSceneNo] = useState(1);
  const [genStartedAt, setGenStartedAt] = useState(0);
  const [genNow, setGenNow] = useState(0);
  /** A short note after a picture was pasted or dropped (or why it could not be). */
  const [pictureNote, setPictureNote] = useState<string | null>(null);
  const [pictureDropHover, setPictureDropHover] = useState(false);
  /** Extra pictures for the next scene (the wider view, the place, the others around); endHere = finish exactly on it. */
  const [sceneRefs, setSceneRefs] = useState<{ id: string; image: string; label: string; endHere: boolean }[]>([]);
  const [refsDropHover, setRefsDropHover] = useState(false);
  /** A short note in the reference box after a frame from a scene was added. */
  const [refNote, setRefNote] = useState<string | null>(null);
  useEffect(() => {
    if (!refNote) return;
    const t = setTimeout(() => setRefNote(null), 8000);
    return () => clearTimeout(t);
  }, [refNote]);
  /** Where a Cmd/Ctrl+V picture goes right now (kept in a ref for the window paste listener). */
  const pasteToRefsRef = useRef(false);
  /** "Save this character": the frame it was opened on and the scene it came from. */
  const [castModal, setCastModal] = useState<{ frame: string; scene: GeneratedVideo } | null>(null);
  /** Story being renamed on the Stories page, and the text typed so far. */
  const [renaming, setRenaming] = useState<{ storyId: string; text: string } | null>(null);
  /** The ⋯ "Move or copy" menu on a scene card: which scene, to which story ('new' = a new story), at which slot. */
  const [moveMenu, setMoveMenu] = useState<{ sceneId: string; storyId: string; index: number } | null>(null);
  const [showStylistModal, setShowStylistModal] = useState<boolean>(false);
  const [showTraitsTooltip, setShowTraitsTooltip] = useState<boolean>(false);

  // Grouped active items
  const clothingItems = useMemo(
    () => activeStylistItems.filter((i) => i.type === 'clothing'),
    [activeStylistItems]
  );
  const propItems = useMemo(
    () => activeStylistItems.filter((i) => i.type === 'prop'),
    [activeStylistItems]
  );
  const characterItems = useMemo(
    () => activeStylistItems.filter((i) => i.type === 'character'),
    [activeStylistItems]
  );

  const combinedClothingDirective = useMemo(
    () => clothingItems.map((c) => c.promptDirective || c.directive || '').filter(Boolean).join(' '),
    [clothingItems]
  );
  const combinedPropDirective = useMemo(
    () => propItems.map((p) => p.promptDirective || p.directive || '').filter(Boolean).join(' '),
    [propItems]
  );
  const combinedCharacterDirective = useMemo(
    () => characterItems.map((ch) => ch.promptDirective || ch.directive || '').filter(Boolean).join(' '),
    [characterItems]
  );

  // Backwards-compatible labels for single-item badges
  const activeClothingTitle = useMemo(
    () => clothingItems.map((c) => c.title).join(', '),
    [clothingItems]
  );
  const activeClothingDirective = combinedClothingDirective;
  const activeClothingIcon = clothingItems[0]?.icon || '👗';

  const activeShootGuideTitle = useMemo(
    () => propItems.map((p) => p.title).join(', '),
    [propItems]
  );
  const activeShootGuideDirective = combinedPropDirective;
  const activeShootGuideIcon = propItems[0]?.icon || '📸';

  // Script & Story to Multi-Scene Storyboard state
  const [showScriptModal, setShowScriptModal] = useState<boolean>(false);
  const [activeStoryboardPlan, setActiveStoryboardPlan] = useState<ScriptStoryboardPlan | null>(null);

  const handleApplyScriptScene = (scene: ScriptSceneSuggestion) => {
    setPrompt(scene.videoPrompt);
    setSelectedSeason(scene.season || '');
    setSelectedWeather(scene.weather || '');
    if (scene.audioMode === 'silent') {
      setAudioMode('silent');
    } else {
      setAudioMode('with_sound');
    }
    if (scene.clothingDirective && scene.clothingTitle) {
      handleApplyClothingGuide(scene.clothingTitle, scene.clothingDirective, '👗');
    }
    setAutoCompose(false);
  };

  const handleAdoptStoryboardPlan = (plan: ScriptStoryboardPlan) => {
    setActiveStoryboardPlan(plan);
  };

  // Custom Belly Emblem / Symbol Studio state
  const [activeEmblem, setActiveEmblem] = useState<BellyEmblemConfig>(NO_SYMBOL_EMBLEM);
  const [isMorphingEnabled, setIsMorphingEnabled] = useState<boolean>(false);
  const [showEmblemModal, setShowEmblemModal] = useState<boolean>(false);

  const handleSelectEmblem = (emblem: BellyEmblemConfig) => {
    setActiveEmblem(emblem);
    if (emblem.type === 'none') {
      setIsMorphingEnabled(false);
      if (isDefaultImage) setSelectedImage(NO_SYMBOL_RABBIT_PATH);
      setReferenceAssets(NO_SYMBOL_REFERENCE_ASSETS);
    } else if (emblem.id === 'emblem-morph' || emblem.type === 'morph') {
      setIsMorphingEnabled(true);
      if (isDefaultImage) {
        setSelectedImage('/assets/aistudio/1790924612634-1_cd314286.jpg');
      }
      setReferenceAssets(TRANSFORMATION_REFERENCE_ASSETS);
    } else if (emblem.id === 'emblem-vegvisir' || emblem.type === 'vegvisir') {
      setIsMorphingEnabled(false);
      if (isDefaultImage) {
        setSelectedImage(WAYFINDER_RABBIT_PATH);
      }
      setReferenceAssets(WAYFINDER_REFERENCE_ASSETS);
    } else {
      setIsMorphingEnabled(false);
      if (isDefaultImage) {
        setSelectedImage('/assets/aistudio/1790924612634-1_cd314286.jpg');
      }
      setReferenceAssets(ORIGINAL_MEDALLION_REFERENCE_ASSETS);
    }
  };

  const handleToggleMorphingOff = () => {
    setIsMorphingEnabled(false);
    const staticEmblem = PRESET_EMBLEMS.find((p) => p.id === 'emblem-original-medallion') || PRESET_EMBLEMS[0];
    setActiveEmblem(staticEmblem);
    if (isDefaultImage) {
      setSelectedImage('/assets/aistudio/1790924612634-1_cd314286.jpg');
    }
    setReferenceAssets(ORIGINAL_MEDALLION_REFERENCE_ASSETS);
  };

  const handleToggleMorphingOn = () => {
    setIsMorphingEnabled(true);
    const morphEmblem = PRESET_EMBLEMS.find((p) => p.id === 'emblem-morph') || PRESET_EMBLEMS[2];
    setActiveEmblem(morphEmblem);
    if (isDefaultImage) {
      setSelectedImage('/assets/aistudio/1790924612634-1_cd314286.jpg');
    }
    setReferenceAssets(TRANSFORMATION_REFERENCE_ASSETS);
  };

  // Upload Video Scene to Storyboard state
  const [showUploadSceneModal, setShowUploadSceneModal] = useState<boolean>(false);
  const [uploadTargetScene, setUploadTargetScene] = useState<GeneratedVideo | null>(null);
  const [uploadInsertPosition, setUploadInsertPosition] = useState<'before' | 'after' | 'append'>('after');

  const openUploadSceneModal = (
    targetScene?: GeneratedVideo | null,
    pos: 'before' | 'after' | 'append' = 'after'
  ) => {
    setUploadTargetScene(targetScene || currentVideo || null);
    setUploadInsertPosition(pos);
    setShowUploadSceneModal(true);
  };

  // Generation Diagnostic Logging & Reference Inspector state
  const [showDiagnosticModal, setShowDiagnosticModal] = useState<boolean>(false);
  const [latestGenerationLog, setLatestGenerationLog] = useState<GenerationLogRecord | null>(null);
  const [isFetchingLog, setIsFetchingLog] = useState<boolean>(false);
  const [copyLogToast, setCopyLogToast] = useState<string | null>(null);

  const fetchLatestLog = async (openModalAfter = false) => {
    try {
      setIsFetchingLog(true);
      const res = await fetch('/api/last-generation-log');
      const data = await res.json();
      if (data.success && data.log) {
        setLatestGenerationLog(data.log);
        if (openModalAfter) {
          setShowDiagnosticModal(true);
        }
        return data.log;
      } else if (openModalAfter) {
        setShowDiagnosticModal(true);
      }
    } catch (e) {
      console.error('Failed to fetch last generation log:', e);
      if (openModalAfter) {
        setShowDiagnosticModal(true);
      }
    } finally {
      setIsFetchingLog(false);
    }
    return null;
  };

  const handleCopyGenerationLogDirect = async () => {
    let logToCopy = latestGenerationLog;
    if (!logToCopy) {
      logToCopy = await fetchLatestLog(false);
    }

    let textToCopy = logToCopy?.formattedLog;
    if (!textToCopy) {
      try {
        const res = await fetch('/api/debug-log');
        textToCopy = await res.text();
      } catch {
        textToCopy = '';
      }
    }

    if (textToCopy && textToCopy.trim()) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        setCopyLogToast('Generation diagnostic log copied! Paste it into chat for the AI engineer.');
        setTimeout(() => setCopyLogToast(null), 3500);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopyLogToast('Generation diagnostic log copied! Paste it into chat for the AI engineer.');
        setTimeout(() => setCopyLogToast(null), 3500);
      }
    } else {
      setCopyLogToast('No generation log recorded yet. Please generate a scene first.');
      setTimeout(() => setCopyLogToast(null), 3500);
    }
  };

  const handleInsertUploadedVideo = (
    file: File,
    pos: 'before' | 'after' | 'append',
    targetSceneId: string,
    customTitle?: string
  ) => {
    const videoBlobUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.onloadedmetadata = () => {
      const rawDuration = Math.round(tempVideo.duration) || 5;
      const durationLabel = `${rawDuration}s`;

      // No story open (after "New story", or on a fresh start): the upload starts a new story.
      const activeStoryId = currentVideo?.storyId || `story-${Date.now()}`;

      const storyScenes = videoHistory
        .filter((v) => v.storyId === activeStoryId)
        .sort((a, b) => (a.sceneNumber || 1) - (b.sceneNumber || 1));

      const targetIdx = storyScenes.findIndex((s) => s.id === targetSceneId);
      let insertIndex = targetIdx !== -1 ? targetIdx : storyScenes.length;
      if (pos === 'after') {
        insertIndex = targetIdx !== -1 ? targetIdx + 1 : storyScenes.length;
      } else if (pos === 'append') {
        insertIndex = storyScenes.length;
      }

      const newId = `uploaded-scene-${Date.now()}`;
      const newScene: GeneratedVideo = {
        id: newId,
        videoUrl: videoBlobUrl,
        prompt: customTitle?.trim() || `Uploaded Clip: ${file.name.replace(/\.[^/.]+$/, '')}`,
        aspectRatio: currentVideo?.aspectRatio || '9:16',
        duration: durationLabel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceImage: currentVideo?.sourceImage || selectedImage,
        season: currentVideo?.season || selectedSeason,
        weather: currentVideo?.weather || selectedWeather,
        cost: 'Uploaded Clip (Free)',
        engine: 'omni',
        storyId: activeStoryId,
        sceneNumber: 1, // Will be renumbered
      };

      const updated = [...storyScenes];
      updated.splice(insertIndex, 0, newScene);

      const renumbered = updated.map((s, idx) => ({
        ...s,
        sceneNumber: idx + 1,
      }));

      const otherStories = videoHistory.filter((v) => v.storyId !== activeStoryId);
      setVideoHistory([...renumbered, ...otherStories]);
      setCurrentVideo(newScene);
      setCompareMode('video');
    };
    tempVideo.src = videoBlobUrl;
  };

  // Move a scene so it lands at `toIndex` (0-based, counted before the move) in its story.
  const moveSceneTo = (sceneId: string, toIndex: number) => {
    const history = videoHistoryRef.current;
    const scene = history.find((v) => v.id === sceneId);
    if (!scene) return;
    const storyId = scene.storyId;
    const storyScenes = history
      .filter((v) => v.storyId === storyId)
      .sort((a, b) => (a.sceneNumber || 1) - (b.sceneNumber || 1));
    const before = storyScenes.map((s) => s.id).join('|');
    const from = storyScenes.findIndex((s) => s.id === sceneId);
    if (from === -1) return;
    const target = Math.max(0, Math.min(storyScenes.length, toIndex));
    const [moved] = storyScenes.splice(from, 1);
    storyScenes.splice(target > from ? target - 1 : target, 0, moved);
    const renumbered = storyScenes.map((s, i) => ({ ...s, sceneNumber: i + 1 }));
    if (renumbered.map((s) => s.id).join('|') === before) return;
    const next = [...renumbered, ...history.filter((v) => v.storyId !== storyId)];
    videoHistoryRef.current = next;
    setVideoHistory(next);
    setCurrentVideo((cur) => (cur ? renumbered.find((s) => s.id === cur.id) || cur : cur));
  };

  /**
   * Put a scene into a story at `toIndex` (0-based, counted before the move): moved out of its own
   * story, or with `copy` a new scene with its own id (its clip is stored again under that id).
   * Stories keep their place in the list; both stories are renumbered.
   */
  const placeScene = (sceneId: string, targetStoryId: string, toIndex: number, copy: boolean) => {
    const history = videoHistoryRef.current;
    const scene = history.find((v) => v.id === sceneId);
    if (!scene) return;
    if (!copy && scene.storyId === targetStoryId) return moveSceneTo(sceneId, toIndex);
    const byNumber = (a: GeneratedVideo, b: GeneratedVideo) => (a.sceneNumber || 1) - (b.sceneNumber || 1);
    const target = history.filter((v) => v.storyId === targetStoryId).sort(byNumber);
    if (target.length && target[0].aspectRatio !== scene.aspectRatio) {
      setErrorMessage(`That story is ${target[0].aspectRatio} and the scene is ${scene.aspectRatio}. A story can't mix the two shapes.`);
      return;
    }
    // The scene takes the name of the story it lands in (none for a new story).
    const targetTitle = target.find((v) => v.storyTitle)?.storyTitle;
    const targetCast = target.find((v) => v.castImage);
    const card = { castImage: targetCast?.castImage, castDescription: targetCast?.castDescription, castName: targetCast?.castName };
    const placed: GeneratedVideo = copy
      ? { ...scene, id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, storyId: targetStoryId, storyTitle: targetTitle, ...card }
      : { ...scene, storyId: targetStoryId, storyTitle: targetTitle, ...card };
    // A move within one story is handled above, so `target` holds the scene itself only for a copy.
    target.splice(Math.max(0, Math.min(target.length, toIndex)), 0, placed);
    const groups = new Map<string, GeneratedVideo[]>();
    for (const v of history) {
      const key = v.storyId;
      if (!groups.has(key)) groups.set(key, []);
    }
    if (!groups.has(targetStoryId)) groups.set(targetStoryId, []);
    for (const [key] of groups) {
      if (key === targetStoryId) {
        groups.set(key, target);
      } else if (!copy && key === scene.storyId) {
        groups.set(key, history.filter((v) => v.storyId === key && v.id !== sceneId).sort(byNumber));
      } else {
        groups.set(key, history.filter((v) => v.storyId === key));
      }
    }
    const renumber = (list: GeneratedVideo[]) => list.map((s, i) => ({ ...s, sceneNumber: i + 1 }));
    const changed = new Set([targetStoryId, ...(copy ? [] : [scene.storyId])]);
    const next = [...groups.entries()].flatMap(([key, list]) => (changed.has(key) ? renumber(list) : list));
    videoHistoryRef.current = next;
    setVideoHistory(next);
    const placedNow = next.find((v) => v.id === placed.id)!;
    // A moved open scene takes the open story with it, so the result is on screen.
    setCurrentVideo((cur) => (!cur ? cur : !copy && cur.id === sceneId ? placedNow : next.find((v) => v.id === cur.id) || cur));
  };

  /** Drag-and-drop of scene cards, shared by the storyboard strip and the Stories list. */
  const startSceneDrag = (e: React.DragEvent<HTMLElement>, sceneId: string) => {
    setDragSceneId(sceneId);
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/plain', sceneId);
  };
  const endSceneDrag = () => {
    setDragSceneId(null);
    setDropTarget(null);
  };
  const sceneDragOver = (e: React.DragEvent<HTMLElement>, storyId: string, index: number | 'end') => {
    if (!dragSceneId) return;
    e.stopPropagation();
    const history = videoHistoryRef.current;
    const dragged = history.find((v) => v.id === dragSceneId);
    const story = history.filter((v) => v.storyId === storyId);
    const copy = e.altKey;
    let slot = index === 'end' ? story.length : index;
    if (typeof index === 'number') {
      const box = e.currentTarget.getBoundingClientRect();
      slot = e.clientX < box.left + box.width / 2 ? index : index + 1;
    }
    const blocked =
      dragged && story.length && story[0].aspectRatio !== dragged.aspectRatio
        ? `this story is ${story[0].aspectRatio} and the scene is ${dragged.aspectRatio}`
        : undefined;
    if (!blocked) {
      e.preventDefault();
      e.dataTransfer.dropEffect = copy ? 'copy' : 'move';
    }
    // The scene number it gets: moving later in its own story, the slot counts the scene itself.
    const own = !copy && dragged?.storyId === storyId ? story.findIndex((v) => v.id === dragged.id) : -1;
    const sorted = story.slice().sort((a, b) => (a.sceneNumber || 1) - (b.sceneNumber || 1));
    const from = own === -1 ? -1 : sorted.findIndex((v) => v.id === dragSceneId);
    const landsAs = from !== -1 && slot > from ? slot : slot + 1;
    setDropTarget((t) =>
      t && t.storyId === storyId && t.index === slot && t.copy === copy && t.blocked === blocked ? t : { storyId, index: slot, copy, landsAs, blocked }
    );
  };
  const sceneDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragSceneId && dropTarget && !dropTarget.blocked) placeScene(dragSceneId, dropTarget.storyId, dropTarget.index, e.altKey);
    endSceneDrag();
  };
  /** The green (move) or blue (copy) bar beside the card the scene would land next to. */
  const dropBar = (storyId: string, idx: number, sceneId: string) => {
    if (!dragSceneId || !dropTarget || dropTarget.blocked || dropTarget.storyId !== storyId) return '';
    if (dragSceneId === sceneId && !dropTarget.copy) return '';
    // Whole class names, so Tailwind finds them in the source.
    if (dropTarget.index === idx) return dropTarget.copy ? 'shadow-[-6px_0_0_0_rgb(56,189,248)] ' : 'shadow-[-6px_0_0_0_rgb(52,211,153)] ';
    if (dropTarget.index === idx + 1) return dropTarget.copy ? 'shadow-[6px_0_0_0_rgb(56,189,248)] ' : 'shadow-[6px_0_0_0_rgb(52,211,153)] ';
    return '';
  };

  const handleMoveScene = (sceneId: string, direction: 'left' | 'right') => {
    const scene = videoHistoryRef.current.find((v) => v.id === sceneId);
    if (!scene) return;
    const idx = (scene.sceneNumber || 1) - 1;
    moveSceneTo(sceneId, direction === 'left' ? idx - 1 : idx + 2);
  };

  const handleToggleReferenceAsset = (id: string) => {
    setReferenceAssets((prev) =>
      prev.map((asset) => (asset.id === id ? { ...asset, enabled: !asset.enabled } : asset))
    );
  };

  const handleToggleStylistItem = (item: StylistItem) => {
    setActiveStylistItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      if (exists) {
        return prev.filter((i) => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleClearAllStylistItems = () => {
    setActiveStylistItems([]);
  };

  const handleRemoveStylistItem = (id: string) => {
    setActiveStylistItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleApplyClothingGuide = (title: string, directive: string, icon: string) => {
    const id = `item-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    setActiveStylistItems((prev) => {
      if (prev.some((i) => i.id === id || i.title === title)) {
        return prev;
      }
      return [
        ...prev,
        {
          id,
          type: 'clothing',
          title,
          description: title,
          promptDirective: directive,
          directive,
          icon,
          tagline: 'Applied Wardrobe Guide',
        },
      ];
    });

    if (directorTarget === 'correction') {
      const msg = `Wardrobe update: ${title} (${directive})`;
      setCorrectionFeedback((prev) => {
        const trimmed = prev.trim();
        return trimmed ? `${trimmed}. ${msg}` : msg;
      });
    }
  };

  const handleApplyShootGuide = (title: string, directive: string, icon: string) => {
    const id = `item-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    setActiveStylistItems((prev) => {
      if (prev.some((i) => i.id === id || i.title === title)) {
        return prev;
      }
      return [
        ...prev,
        {
          id,
          type: 'prop',
          title,
          description: title,
          promptDirective: directive,
          directive,
          icon,
          tagline: 'Applied Prop Guide',
        },
      ];
    });

    if (directorTarget === 'correction') {
      const msg = `Scene prop & styling: ${title} (${directive})`;
      setCorrectionFeedback((prev) => {
        const trimmed = prev.trim();
        return trimmed ? `${trimmed}. ${msg}` : msg;
      });
    }
  };

  const handleUploadStylistPhoto = (
    file: File,
    category: 'clothing' | 'prop' | 'character',
    label: string
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Url = e.target?.result as string;
      const id = `custom-${category}-${Date.now()}`;
      const isPicture =
        category === 'prop' &&
        (label.toLowerCase().includes('picture') ||
          label.toLowerCase().includes('photo') ||
          label.toLowerCase().includes('design') ||
          label.toLowerCase().includes('artwork') ||
          label.toLowerCase().includes('card') ||
          label.toLowerCase().includes('drawing') ||
          label.toLowerCase().includes('poster') ||
          label.toLowerCase().includes('emblem') ||
          file.name.toLowerCase().includes('design') ||
          file.name.toLowerCase().includes('picture') ||
          file.name.toLowerCase().includes('sodesign'));

      const finalCategory = isPicture ? 'prop' : category;
      const icon = isPicture ? '🖼️' : finalCategory === 'clothing' ? '👗' : finalCategory === 'prop' ? '🧳' : '🦉';
      const promptDirective = isPicture
        ? `The rabbit is holding and peacefully looking directly at the physical picture shown in the attached reference photo (${label}).`
        : finalCategory === 'clothing'
        ? `The character is dressed as shown in the attached custom clothing reference photo (${label}).`
        : finalCategory === 'prop'
        ? `Include the prop/equipment element shown in the attached reference photo (${label}).`
        : `Feature the companion character shown in the attached character reference photo (${label}) alongside the rabbit.`;

      const item: StylistItem = {
        id,
        type: finalCategory,
        title: label,
        icon,
        description: isPicture ? `Physical Picture: ${label}` : label,
        tagline: isPicture
          ? `Physical Picture to View in Scene`
          : `Custom ${finalCategory === 'clothing' ? 'Wardrobe' : finalCategory === 'prop' ? 'Prop' : 'Companion'} Photo Guide`,
        promptDirective,
        directive: promptDirective,
        imageBase64: base64Url,
        mimeType: file.type,
      };

      const newAsset: ReferenceAngle = {
        id,
        category: finalCategory,
        label,
        tagline: item.tagline || '',
        imageBase64: base64Url,
        mimeType: file.type,
        enabled: true,
        icon,
      };

      setReferenceAssets((prev) => [newAsset, ...prev]);
      setActiveStylistItems((prev) => [item, ...prev]);
    };
    reader.readAsDataURL(file);
  };

  const handleAddStylistUrlItem = (
    url: string,
    category: 'clothing' | 'prop' | 'character',
    label: string
  ) => {
    const id = `url-${category}-${Date.now()}`;
    const isPicture =
      category === 'prop' &&
      (label.toLowerCase().includes('picture') ||
        label.toLowerCase().includes('photo') ||
        label.toLowerCase().includes('design') ||
        label.toLowerCase().includes('artwork') ||
        label.toLowerCase().includes('card') ||
        label.toLowerCase().includes('drawing') ||
        label.toLowerCase().includes('poster') ||
        label.toLowerCase().includes('emblem') ||
        url.toLowerCase().includes('design') ||
        url.toLowerCase().includes('picture'));

    const finalCategory = isPicture ? 'prop' : category;
    const icon = isPicture ? '🖼️' : finalCategory === 'clothing' ? '👗' : finalCategory === 'prop' ? '🧳' : '🦉';
    const promptDirective = isPicture
      ? `The rabbit is holding and peacefully looking directly at the physical picture shown in the web reference image (${label}): ${url}`
      : finalCategory === 'clothing'
      ? `The character is dressed as shown in the web clothing reference image (${label}): ${url}`
      : finalCategory === 'prop'
      ? `Include the prop/equipment element shown in the web reference image (${label}): ${url}`
      : `Feature the companion character shown in the web character reference image (${label}) alongside the rabbit: ${url}`;

    const item: StylistItem = {
      id,
      type: finalCategory,
      title: label,
      icon,
      description: isPicture ? `Physical Picture: ${label}` : label,
      tagline: isPicture
        ? `Web URL Physical Picture to View`
        : `Web URL ${finalCategory === 'clothing' ? 'Wardrobe' : finalCategory === 'prop' ? 'Prop' : 'Companion'} Reference`,
      promptDirective,
      directive: promptDirective,
      imageUrl: url,
    };

    const newAsset: ReferenceAngle = {
      id,
      category: finalCategory,
      label,
      tagline: item.tagline || '',
      imagePath: url,
      enabled: true,
      icon,
    };

    setReferenceAssets((prev) => [newAsset, ...prev]);
    setActiveStylistItems((prev) => [item, ...prev]);
  };

  const handleUploadCustomPhoto = (file: File, type: 'clothing' | 'shoot_guide', label: string) => {
    handleUploadStylistPhoto(file, type === 'clothing' ? 'clothing' : 'prop', label);
  };

  const handleRemoveClothing = () => {
    setActiveStylistItems((prev) => prev.filter((i) => i.type !== 'clothing'));
  };

  const handleRemoveShootGuide = () => {
    setActiveStylistItems((prev) => prev.filter((i) => i.type !== 'prop'));
  };

  // Video Watermark & Branding state
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(DEFAULT_WATERMARK_CONFIG);
  const [showWatermarkModal, setShowWatermarkModal] = useState<boolean>(false);
  const [isBurningWatermark, setIsBurningWatermark] = useState<boolean>(false);
  const [burnProgress, setBurnProgress] = useState<number>(0);

  // Active season and weather objects
  const currentSeasonObj = useMemo(
    () => SEASONS.find((s) => s.id === selectedSeason) || SEASONS[0],
    [selectedSeason]
  );
  const currentWeatherObj = useMemo(
    () => WEATHER_OPTIONS.find((w) => w.id === selectedWeather) || WEATHER_OPTIONS[0],
    [selectedWeather]
  );

  // Active story scenes for multi-scene sequence
  // All stories, newest first: each is its scenes in order.
  const stories = useMemo(() => {
    const byId = new Map<string, GeneratedVideo[]>();
    for (const v of videoHistory) {
      const key = v.storyId || v.id;
      if (!byId.has(key)) byId.set(key, []);
      byId.get(key)!.push(v);
    }
    return [...byId.entries()].map(([storyId, scenes]) => ({
      storyId,
      scenes: scenes.sort((a, b) => (a.sceneNumber || 1) - (b.sceneNumber || 1)),
    }));
  }, [videoHistory]);

  // Close the open story; the next Generate or Upload Video starts a new one.
  /** The story's character card as request fields: the picture first in the references, the look as text. */
  const castRequest = (scene?: GeneratedVideo) => {
    if (!scene?.castImage || !scene.castDescription) return { refs: [] as any[], fields: {} };
    const m = scene.castImage.match(/^data:([^;]+);/);
    return {
      refs: [
        {
          label: 'main_character',
          filename: 'main_character.jpg',
          category: 'main_character',
          imageBase64: scene.castImage,
          mimeType: m ? m[1] : 'image/jpeg',
          description: scene.castDescription,
        },
      ],
      fields: { castDescription: scene.castDescription, castName: scene.castName },
    };
  };
  /** Open "Save this character" on the frame the player is showing now. */
  const openCastModal = async (scene: GeneratedVideo) => {
    try {
      const at = videoRef.current && currentVideo?.id === scene.id ? videoRef.current.currentTime : scene.trimStart ?? 0;
      videoRef.current?.pause();
      const frame = await grabFrame(scene.videoUrl, at);
      setCastModal({ frame, scene });
    } catch (e: any) {
      setErrorMessage(e?.message || 'The frame could not be read.');
    }
  };
  /** "Use frame as reference": the frame the player shows now becomes a reference picture for the next scene. */
  const addFrameAsSceneRef = async (scene: GeneratedVideo) => {
    if (sceneRefs.length >= 3) {
      setErrorMessage('A scene can have 3 reference pictures. Remove one in "Reference pictures for this scene" first.');
      return;
    }
    try {
      const at = videoRef.current && currentVideo?.id === scene.id ? videoRef.current.currentTime : scene.trimStart ?? 0;
      videoRef.current?.pause();
      const image = await grabFrame(scene.videoUrl, at);
      const sceneNo = currentStoryScenes.findIndex((s) => s.id === scene.id) + 1 || scene.sceneNumber || 1;
      setSceneRefs((list) =>
        list.length >= 3
          ? list
          : [...list, { id: `ref-${Date.now()}`, image, label: list.length ? `Frame from Scene ${sceneNo} at ${at.toFixed(1)} s` : 'The wider view of the scene', endHere: false }]
      );
      setRefNote(`Frame from Scene ${sceneNo} at ${at.toFixed(1)} s added as a reference picture. Change its text to say what it shows.`);
      setTimeout(() => document.querySelector('[data-scene-refs]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    } catch (e: any) {
      setErrorMessage(e?.message || 'The frame could not be read.');
    }
  };
  /** The next scene's reference pictures (guides only) as request parts. */
  const sceneRefRequest = () => {
    const guides = sceneRefs.filter((r) => !r.endHere);
    return {
      refs: guides.map((r, i) => ({
        label: r.label.trim() || 'The wider view of the scene',
        filename: `scene_reference_${i + 1}.jpg`,
        category: 'scene_reference',
        imageBase64: r.image,
        mimeType: (r.image.match(/^data:([^;]+);/) || [])[1] || 'image/jpeg',
      })),
      fields: guides.length ? { sceneReferenceLabels: guides.map((r) => r.label.trim() || 'The wider view of the scene') } : {},
    };
  };
  /** Card fields copied onto a new scene of the same story. */
  const castFieldsOf = (scene?: GeneratedVideo) =>
    scene?.castImage ? { castImage: scene.castImage, castDescription: scene.castDescription, castName: scene.castName } : {};
  /** Set or clear the character card on every scene of a story. */
  const setStoryCast = (storyId: string, cast: { image: string; description: string; name?: string } | null) => {
    const next = videoHistoryRef.current.map((v) =>
      v.storyId !== storyId
        ? v
        : cast
        ? { ...v, castImage: cast.image, castDescription: cast.description, castName: cast.name || undefined }
        : { ...v, castImage: undefined, castDescription: undefined, castName: undefined }
    );
    videoHistoryRef.current = next;
    setVideoHistory(next);
    setCurrentVideo((cur) => (cur ? next.find((v) => v.id === cur.id) || cur : cur));
  };

  /** A story's name: the one set with Rename, else the start of its first scene's text. */
  const storyName = (scenes: GeneratedVideo[]) => {
    const t = scenes.find((v) => v.storyTitle)?.storyTitle;
    if (t) return t;
    const first = (scenes[0]?.prompt || 'Untitled story').trim();
    return first.length > 48 ? `${first.slice(0, 48).trim()}…` : first;
  };
  const renameStory = (storyId: string, title: string) => {
    const name = title.trim().slice(0, 80) || undefined;
    const next = videoHistoryRef.current.map((v) => (v.storyId === storyId ? { ...v, storyTitle: name } : v));
    videoHistoryRef.current = next;
    setVideoHistory(next);
  };

  const handleStartNewStory = () => {
    setCurrentVideo(null);
    setCompareMode('video');
    setShowExtensionDrawer(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentStoryScenesRaw = useMemo(() => {
    if (!currentVideo) return [];
    const scenes = videoHistory
      .filter((v) => v.storyId === currentVideo.storyId)
      .sort((a, b) => (a.sceneNumber || 1) - (b.sceneNumber || 1));
    if (!scenes.some((s) => s.id === currentVideo.id)) {
      return [currentVideo];
    }
    return scenes;
  }, [currentVideo, videoHistory]);
  const currentStoryScenes = currentStoryScenesRaw;
  /** The last scene of the open story, when a saved story is open (the left panel then makes the next scene). */
  const openStoryLastScene =
    currentVideo && videoHistory.some((v) => v.id === currentVideo.id)
      ? currentStoryScenes[currentStoryScenes.length - 1]
      : undefined;
  const nextSceneNumber = openStoryLastScene ? currentStoryScenes.length + 1 : 1;
  const continuesLastScene = !!openStoryLastScene && nextStartsFrom === 'end';
  pasteToRefsRef.current = continuesLastScene;
  /** The open story's character card, if it has one. */
  const openStoryCast = currentStoryScenes.find((v) => v.castImage);

  const totalStorySeconds = useMemo(
    () => storyPlaySeconds(currentStoryScenes),
    [currentStoryScenes]
  );

  // Real-time cost calculation for Gemini Omni Flash based on duration and resolution
  const estimatedCost = useMemo(() => {
    const sec = duration === '30s' ? 30 : duration === '20s' ? 20 : duration === '15s' ? 15 : duration === '10s' ? 10 : 5;
    // Standard Gemini Omni Flash / Veo Video pricing tiers:
    // 720p: ~$0.07/sec
    // 1080p: ~$0.12/sec
    const rate = resolution === '1080p' ? 0.12 : 0.07;
    const total = sec * rate;
    return {
      amount: total,
      display: `~$${total.toFixed(2)} USD`,
      ratePerSec: rate,
      isFree: false,
      explanation: `Gemini Omni Flash: ${sec}s @ ${resolution} ($${rate.toFixed(2)}/sec)`,
    };
  }, [duration, resolution]);

  // Update prompt when season, weather, or preset changes if autoCompose is on
  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeason(seasonId);
    if (autoCompose) {
      const preset = JUMP_PRESETS.find((p) => p.id === activePreset) || JUMP_PRESETS[0];
      setPrompt(composePrompt(preset.baseAction, seasonId, selectedWeather));
    }
  };

  const handleWeatherChange = (weatherId: string) => {
    setSelectedWeather(weatherId);
    if (autoCompose) {
      const preset = JUMP_PRESETS.find((p) => p.id === activePreset) || JUMP_PRESETS[0];
      setPrompt(composePrompt(preset.baseAction, selectedSeason, weatherId));
    }
  };

  const handleSelectPreset = (preset: JumpPreset) => {
    setActivePreset(preset.id);
    setAspectRatio(preset.recommendedAspect);
    if (autoCompose) {
      setPrompt(composePrompt(preset.baseAction, selectedSeason, selectedWeather));
    } else {
      setPrompt(preset.baseAction);
    }
  };

  const handleForceApplyAtmosphere = () => {
    const preset = JUMP_PRESETS.find((p) => p.id === activePreset) || JUMP_PRESETS[0];
    setPrompt(composePrompt(preset.baseAction, selectedSeason, selectedWeather));
  };

  // Sound effect synthesizer
  const playBoingSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // Audio might be blocked before user gesture
    }
  };

  // Interactive physics jump
  const handlePhysicsJump = () => {
    if (isPhysicsJumping) return;
    setIsPhysicsJumping(true);
    setJumpCount((prev) => prev + 1);
    playBoingSound();

    // Pool particles from current season and weather!
    const availableParticles = [
      ...currentSeasonObj.particles,
      ...currentWeatherObj.particles,
      '🐇',
    ];

    const newParticles = Array.from({ length: 8 }).map((_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 160,
      y: -(Math.random() * 90 + 50),
      char: availableParticles[Math.floor(Math.random() * availableParticles.length)],
    }));
    setParticles((prev) => [...prev, ...newParticles]);

    setTimeout(() => {
      setIsPhysicsJumping(false);
    }, 600);

    setTimeout(() => {
      setParticles([]);
    }, 1200);
  };

  // Custom image upload
  /** Use a picture file (chosen, pasted or dropped) as the start picture. */
  const loadStartPicture = (file: Blob, how: 'chosen' | 'pasted' | 'dropped') => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('That is not a picture. Use a JPEG, PNG or WebP image.');
      return;
    }
    setImageMimeType(file.type);
    setIsDefaultImage(false);
    // With a story open, a new picture means the next scene starts from it.
    setNextStartsFrom('picture');
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setErrorMessage(null);
      setPictureNote(how === 'chosen' ? null : `Picture ${how} as the start picture.`);
    };
    reader.readAsDataURL(file);
  };

  /** Add a picture (chosen, pasted or dropped) to the next scene's reference pictures. */
  const addSceneRef = (file: Blob) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('That is not a picture. Use a JPEG, PNG or WebP image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const image = event.target?.result as string;
      setSceneRefs((list) =>
        list.length >= 3
          ? list
          : [...list, { id: `ref-${Date.now()}`, image, label: list.length ? '' : 'The wider view of the scene', endHere: false }]
      );
      setPictureNote(null);
    };
    reader.readAsDataURL(file);
  };
  const pasteSceneRefFromClipboard = async () => {
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((t) => t.startsWith('image/'));
        if (type) return addSceneRef(await item.getType(type));
      }
      setErrorMessage('There is no picture on the clipboard. Copy a picture first, then paste.');
    } catch {
      setErrorMessage('The browser did not allow reading the clipboard. Click in the reference box and press Cmd+V (Ctrl+V on Windows) instead.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadStartPicture(file, 'chosen');
    e.target.value = '';
  };

  /** "Paste picture" button: read a picture from the clipboard (the browser may ask for permission). */
  const handlePasteButton = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/'));
        if (type) {
          loadStartPicture(await item.getType(type), 'pasted');
          return;
        }
      }
      setPictureNote('There is no picture on the clipboard. Copy a picture first, then paste.');
    } catch {
      setPictureNote('The browser did not allow reading the clipboard. Click here and press Cmd+V (Ctrl+V on Windows) instead.');
    }
  };

  // Reset to default rabbit
  const handleResetToRabbit = () => {
    setSelectedImage(activeEmblem?.type === 'none' ? NO_SYMBOL_RABBIT_PATH : activeEmblem?.id === 'emblem-vegvisir' ? WAYFINDER_RABBIT_PATH : DEFAULT_RABBIT_PATH);
    setIsDefaultImage(true);
    setImageMimeType('image/jpeg');
    setSelectedSeason('');
    setSelectedWeather('');
    setActivePreset(JUMP_PRESETS[0].id);
    setAspectRatio('9:16');
    setErrorMessage(null);
  };

  // Generate video via Gemini Interactions API (gemini-omni-1.2-flash)
  const handleGenerateVideo = async (overridePrompt?: string) => {
    setIsGenerating(true);
    setGenPhase('preparing');
    setGenStartedAt(Date.now());
    {
      const join = appendToStoryRef.current;
      setMakingSceneNo(join ? videoHistoryRef.current.filter((v) => v.storyId === join).length + 1 : 1);
    }
    setErrorMessage(null);
    setProgressPercent(10);
    setProgressStep('Getting the picture and text ready...');

    const progressInterval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev < 30) {
          setProgressStep('Sending to gemini-omni-1.2-flash...');
          return prev + 5;
        } else if (prev < 65) {
          setProgressStep('Gemini is making the video...');
          return prev + 3;
        } else if (prev < 88) {
          setProgressStep('Synthesizing motion frames, atmospheric lighting & particles...');
          return prev + 2;
        }
        return prev;
      });
    }, 1800);

    try {
      const activePrompt = (overridePrompt || prompt).trim();
      const payload: any = {
        prompt: activePrompt,
        aspectRatio,
        duration,
        resolution,
        season: selectedSeason,
        weather: selectedWeather,
        audioMode,
        silentTalk: silentTalk,
        clothingDirective: combinedClothingDirective || undefined,
        shootGuideDirective: combinedPropDirective || undefined,
        clothingDirectives: clothingItems.map((c) => ({ title: c.title, directive: c.promptDirective || c.directive || '' })),
        propDirectives: propItems.map((p) => ({ title: p.title, directive: p.promptDirective || p.directive || '' })),
        characterDirectives: characterItems.map((ch) => ({ title: ch.title, directive: ch.promptDirective || ch.directive || '' })),
        customEmblemType: activeEmblem?.type,
        includeKhalle,
        customEmblemDirective: activeEmblem?.directive,
        customEmblemName: activeEmblem?.name,
        customEmblemImage: activeEmblem?.imageBase64 || activeEmblem?.imagePath,
        customEmblemUrl: activeEmblem?.imageUrl,
        customEmblemStartUrl: activeEmblem?.startImageUrl,
        customEmblemEndUrl: activeEmblem?.endImageUrl,
        customEmblemStartImage: activeEmblem?.startImageUrl || activeEmblem?.startImagePath,
        customEmblemEndImage: activeEmblem?.endImageUrl || activeEmblem?.endImagePath,
        disableMorph: !isMorphingEnabled || activeEmblem?.type !== 'morph',
        enableMorph: isMorphingEnabled && activeEmblem?.type === 'morph',
      };

      const activeRefs = referenceAssets.filter((a) => a.enabled);
      const promptLower = activePrompt.toLowerCase();
      const isFriendPrompt =
        promptLower.includes('friend') ||
        promptLower.includes('companion') ||
        promptLower.includes('buddy') ||
        promptLower.includes('sidekick') ||
        promptLower.includes('partner') ||
        promptLower.includes('dancing with');

      const isPicturePrompt =
        promptLower.includes('picture') ||
        promptLower.includes('looking a') ||
        promptLower.includes('looking at') ||
        promptLower.includes('photo') ||
        promptLower.includes('drawing') ||
        promptLower.includes('artwork');

      const stylistImageRefs = activeStylistItems
        .filter((item) => item.imageBase64 || item.imageUrl || item.imagePath)
        .filter((item) => !activeRefs.some((r) => r.id === item.id))
        .map((item) => {
          const itemTitleLower = item.title.toLowerCase();
          // Check if this item represents a companion/friend character
          const isFriendItem =
            item.type === 'character' ||
            itemTitleLower.includes('friend') ||
            itemTitleLower.includes('companion') ||
            (isFriendPrompt && (
              promptLower.includes(itemTitleLower) ||
              promptLower.includes('1794087089723-1') ||
              item.id.includes('1794087089723-1') ||
              itemTitleLower.includes('1794087089723-1') ||
              (item.imageUrl && item.imageUrl.includes('1794087089723-1'))
            ));

          const isItemPic =
            !isFriendItem &&
            (isPicturePrompt ||
            itemTitleLower.includes('design') ||
            itemTitleLower.includes('picture') ||
            itemTitleLower.includes('photo') ||
            itemTitleLower.includes('drawing') ||
            itemTitleLower.includes('artwork'));

          const resolvedCategory = isFriendItem ? 'character' : (isItemPic ? 'prop' : item.type);

          return {
            label: `${item.title} (${resolvedCategory})`,
            imageUrl: item.imageUrl,
            imagePath: item.imageUrl || item.imagePath,
            imageBase64: item.imageBase64,
            mimeType: item.mimeType || 'image/jpeg',
            category: resolvedCategory as any,
          };
        });

      // User stylist and custom uploaded images are placed FIRST so Gemini Omni prioritizes them at Reference Image 1
      // Characters (especially friends/companions) are sorted to the very front of the reference list
      const combinedReferenceImages = [
        ...stylistImageRefs,
        ...activeRefs.map((ref) => ({
          label: ref.label,
          imageUrl: (ref as any).imageUrl,
          imagePath: ref.imagePath,
          imageBase64: ref.imageBase64,
          mimeType: ref.mimeType || 'image/jpeg',
          category: ref.category,
        })),
      ].sort((a, b) => {
        // Character references (e.g. friend) come first
        if (a.category === 'character' && b.category !== 'character') return -1;
        if (b.category === 'character' && a.category !== 'character') return 1;
        return 0;
      });

      // Joining an open story: its character card goes first and its look is sent as text.
      {
        const join = appendToStoryRef.current;
        const joinScene = join ? videoHistoryRef.current.find((v) => v.storyId === join && v.castImage) : undefined;
        const cast = castRequest(joinScene);
        const guides = sceneRefRequest();
        if (cast.refs.length || guides.refs.length) (combinedReferenceImages as any[]).unshift(...cast.refs, ...guides.refs);
        Object.assign(payload, cast.fields, guides.fields);
      }

      if (combinedReferenceImages.length > 0) {
        payload.referenceImages = combinedReferenceImages;
      }

      if (isDefaultImage) {
        payload.imagePath =
          activeEmblem?.type === 'none'
            ? NO_SYMBOL_RABBIT_PATH
            : activeEmblem?.id === 'emblem-vegvisir'
            ? WAYFINDER_RABBIT_PATH
            : '/assets/aistudio/image_8c4d4a47.png';
        payload.imageMimeType = 'image/jpeg';
      } else {
        payload.imageBase64 = selectedImage;
        payload.imageMimeType = imageMimeType;
      }

      setGenPhase('making');
      const response = await sendWithReview('/api/animate', payload);

      clearInterval(progressInterval);

      const data = await response.json();

      if (data.generationLog) {
        setLatestGenerationLog(data.generationLog);
      }

      if (!response.ok || !data.success) {
        if (
          response.status === 429 ||
          response.status === 402 ||
          data.isSpendingCap ||
          data.error?.includes('spending cap') ||
          data.error?.includes('402') ||
          data.error?.includes('Payment Required')
        ) {
          setIsSpendingCapHit(true);
        }
        if (data.isInputBlocked || data.error?.includes('Input blocked') || data.error?.includes('could not be processed')) {
          setIsInputBlocked(true);
          if (data.suggestedPrompt) {
            setBlockedPromptSuggestion(data.suggestedPrompt);
          }
        }
        throw new Error(data.error || 'Failed to animate video. Please check your Gemini API key and try again.');
      }

      setProgressPercent(100);
      setProgressStep('Complete! Loading generated animation...');

      const vidId = data.interactionId || `vid-${Date.now()}`;
      const newVideo: GeneratedVideo = {
        id: vidId,
        videoUrl: data.videoUrl,
        prompt,
        aspectRatio,
        duration: duration === '20s' || duration === '30s' ? '10s' : duration,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceImage: selectedImage,
        season: selectedSeason,
        weather: selectedWeather,
        cost: estimatedCost.display,
        engine: 'omni',
        storyId: vidId,
        sceneNumber: 1,
        interactionId: data.interactionId,
        includeKhalle,
        audioMode,
        silentTalk,
      };

      setSessionCost((prev) => prev + estimatedCost.amount);
      // From the left panel with a story open: the new scene goes last in that story.
      const joinStory = appendToStoryRef.current;
      appendToStoryRef.current = null;
      const joinLast = joinStory
        ? videoHistoryRef.current
            .filter((v) => v.storyId === joinStory)
            .sort((a, b) => (a.sceneNumber || 1) - (b.sceneNumber || 1))
            .pop()
        : undefined;
      const joined = joinLast
        ? replaceInStory(joinLast.id, [joinLast, { ...newVideo, storyId: joinStory!, storyTitle: joinLast.storyTitle, ...castFieldsOf(joinLast) }])
        : undefined;
      setSceneRefs([]);
      if (joined) {
        setCurrentVideo(joined.find((v) => v.id === newVideo.id) || newVideo);
      } else {
        setCurrentVideo(newVideo);
        setVideoHistory((prev) => [newVideo, ...prev]);
      }
      setCompareMode('video');

      // Seamless Auto-Chaining for 20s (2 scenes) and 30s (3 scenes)
      if ((duration === '20s' || duration === '30s') && data.interactionId) {
        setProgressStep(`Scene 1 ready! Chaining Scene 2 to reach ${duration} continuous sequence...`);
        setProgressPercent(60);

        try {
          const scene2Res = await fetch('/api/continue-scene', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              previousInteractionId: data.interactionId,
              prompt: `Seamless continuation: The rabbit continues the scene action smoothly.`,
              aspectRatio,
              duration: '10s',
              resolution,
              season: selectedSeason,
              weather: selectedWeather,
              audioMode,
              silentTalk: silentTalk,
              parentSceneNumber: 1,
            }),
          });
          const scene2Data = await scene2Res.json();
          if (scene2Res.ok && scene2Data.success) {
            const vidId2 = scene2Data.interactionId || `vid-${Date.now()}-scene2`;
            const video2: GeneratedVideo = {
              id: vidId2,
              videoUrl: scene2Data.videoUrl,
              prompt: `Scene 2 Continuation (${duration} Storyboard)`,
              aspectRatio,
              duration: '10s',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              sourceImage: selectedImage,
              season: selectedSeason,
              weather: selectedWeather,
              cost: estimatedCost.display,
              engine: 'omni',
              storyId: vidId,
              sceneNumber: 2,
              previousInteractionId: data.interactionId,
              interactionId: scene2Data.interactionId,
            };
            setVideoHistory((prev) => [video2, ...prev]);

            if (duration === '30s' && scene2Data.interactionId) {
              setProgressStep('Chaining Scene 3 (final segment for 30s sequence)...');
              setProgressPercent(85);
              const scene3Res = await fetch('/api/continue-scene', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  previousInteractionId: scene2Data.interactionId,
                  prompt: `Grand finale continuation: The rabbit concludes the scene with playful celebration.`,
                  aspectRatio,
                  duration: '10s',
                  resolution,
                  season: selectedSeason,
                  weather: selectedWeather,
                  audioMode,
                  silentTalk: silentTalk,
                  parentSceneNumber: 2,
                }),
              });
              const scene3Data = await scene3Res.json();
              if (scene3Res.ok && scene3Data.success) {
                const vidId3 = scene3Data.interactionId || `vid-${Date.now()}-scene3`;
                const video3: GeneratedVideo = {
                  id: vidId3,
                  videoUrl: scene3Data.videoUrl,
                  prompt: `Scene 3 Finale (30s Storyboard)`,
                  aspectRatio,
                  duration: '10s',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  sourceImage: selectedImage,
                  season: selectedSeason,
                  weather: selectedWeather,
                  cost: estimatedCost.display,
                  engine: 'omni',
                  storyId: vidId,
                  sceneNumber: 3,
                  previousInteractionId: scene2Data.interactionId,
                  interactionId: scene3Data.interactionId,
                };
                setVideoHistory((prev) => [video3, ...prev]);
                setCurrentVideo(video3);
              }
            } else {
              setCurrentVideo(video2);
            }
          }
        } catch (chainErr) {
          console.warn('Auto-chaining notice:', chainErr);
        }
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      if (err?.cancelled) return;
      console.error('Video generation error:', err);
      fetchLatestLog(false);
      if (
        err.message?.includes('spending cap') ||
        err.message?.includes('429') ||
        err.message?.includes('402') ||
        err.message?.includes('Payment Required')
      ) {
        setIsSpendingCapHit(true);
      }
      if (err.message?.includes('Input blocked') || err.message?.includes('could not be processed')) {
        setIsInputBlocked(true);
      }
      setErrorMessage(err.message || 'An error occurred while generating the video.');
    } finally {
      setIsGenerating(false);
    }
  };

  // One-click handler to apply AI-rephrased policy-compliant prompt and regenerate
  const handleApplySafeRephraseAndRetry = async (customPrompt?: string) => {
    const promptToUse = customPrompt || blockedPromptSuggestion;
    if (promptToUse) {
      setPrompt(promptToUse);
      setIsInputBlocked(false);
      setErrorMessage(null);
      setBlockedPromptSuggestion(null);
      setTimeout(() => {
        handleGenerateVideo(promptToUse);
      }, 50);
      return;
    }

    try {
      setIsRephrasingPrompt(true);
      const res = await fetch('/api/safe-rephrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.success && data.rephrasedPrompt) {
        setPrompt(data.rephrasedPrompt);
        setIsInputBlocked(false);
        setErrorMessage(null);
        setBlockedPromptSuggestion(null);
        setTimeout(() => {
          handleGenerateVideo(data.rephrasedPrompt);
        }, 50);
      }
    } catch (e: any) {
      console.error('Failed to safe rephrase:', e);
    } finally {
      setIsRephrasingPrompt(false);
    }
  };

  // Apply AI Director suggestion to the targeted prompt and optionally generate
  const handleApplyDirectorSuggestion = (suggestedPrompt: string, andGenerate = false) => {
    if (directorTarget === 'main') {
      setPrompt(suggestedPrompt);
      setAutoCompose(false);
      if (andGenerate) {
        handleGenerateVideo(suggestedPrompt);
      }
    } else if (directorTarget === 'extension') {
      setNextScenePrompt(suggestedPrompt);
      if (andGenerate && currentVideo) {
        handleExtendScene(currentVideo, suggestedPrompt);
      }
    } else if (directorTarget === 'correction') {
      setCorrectionPrompt(suggestedPrompt);
    }
  };

  // Extend scene continuation handler (Multi-Scene Sequencing)
  const handleExtendScene = async (
    parentVideo: GeneratedVideo,
    overridePrompt?: string,
    opts?: { seconds?: number; season?: string; weather?: string; refs?: ReturnType<typeof sceneRefRequest> }
  ) => {
    setIsExtending(true);
    setGenPhase('preparing');
    setGenStartedAt(Date.now());
    setMakingSceneNo((parentVideo.sceneNumber || 1) + 1);
    setErrorMessage(null);
    const nextSceneNumber = (parentVideo.sceneNumber || 1) + 1;
    const continuationPrompt = (overridePrompt || nextScenePrompt).trim();

    try {
      // Where does the new scene go? Right after the parent; if a scene follows, the new one has
      // to lead into it.
      const storyScenes = videoHistoryRef.current
        .filter((v) => v.storyId === parentVideo.storyId)
        .sort((a, b) => (a.sceneNumber || 1) - (b.sceneNumber || 1));
      const parentIdx = storyScenes.findIndex((s) => s.id === parentVideo.id);
      const followingScene = parentIdx !== -1 ? storyScenes[parentIdx + 1] : undefined;
      // The stored Gemini interaction ends where the clip ends. Continue through it only when the
      // parent plays to its real end; otherwise start a fresh generation from the cut frame.
      // Gemini allows at most 30 s in one chain of extensions (the first clip plus every extension).
      // Past that it fails with INVALID_ARGUMENT, so a longer story starts a fresh generation from the
      // last frame instead. The chain is followed back through previousInteractionId.
      const chainSeconds = extensionChainSeconds(parentVideo, videoHistoryRef.current);
      const wantedSeconds = Math.max(3, Math.round(opts?.seconds ?? newSceneSeconds));
      const continueInteraction =
        !!parentVideo.interactionId &&
        parentVideo.trimEnd === undefined &&
        chainSeconds + Math.min(10, wantedSeconds) <= MAX_EXTENSION_CHAIN_SECONDS;
      const sceneSeconds = Math.min(continueInteraction ? 10 : 15, wantedSeconds);

      setProgressPercent(8);
      setProgressStep('Grabbing the frames on each side of the new scene...');
      const startFrame = continueInteraction
        ? null
        : await grabFrame(parentVideo.videoUrl, parentVideo.trimEnd ?? Number.POSITIVE_INFINITY);
      const endFrame = followingScene ? await grabFrame(followingScene.videoUrl, followingScene.trimStart ?? 0) : null;

      const continuityRefs: any[] = [];
      const continuityLines: string[] = [];
      if (startFrame) {
        continuityRefs.push({
          label: 'scene_start_frame',
          filename: 'scene_start_frame.jpg',
          imageBase64: startFrame,
          mimeType: 'image/jpeg',
          category: 'continuity_frame',
          role: 'CONTINUITY START FRAME: the first frame of this video',
          description: 'The video must begin exactly on this frame: same pose, position, camera framing and lighting.',
        });
        continuityLines.push(
          'The video must begin exactly on scene_start_frame (same pose, position, camera framing and lighting) and continue smoothly from it.'
        );
      }
      if (endFrame) {
        continuityRefs.push({
          label: 'scene_end_frame',
          filename: 'scene_end_frame.jpg',
          imageBase64: endFrame,
          mimeType: 'image/jpeg',
          category: 'continuity_frame',
          role: 'CONTINUITY END FRAME: where this video must arrive',
          description: 'The video must end on this pose, position and camera framing, so the next scene follows without a jump.',
        });
        continuityLines.push(
          'The video must end on the pose, position and camera framing shown in scene_end_frame, so the next scene follows without a jump.'
        );
      }
      // The scene text goes first; the start and end frames are explained in the picture lines.
      void continuityLines;
      const generationPrompt = continuationPrompt;

      setProgressPercent(15);
      setProgressStep(
        continueInteraction
          ? `Analyzing previous video scene with gemini-omni-1.2-flash...`
          : `Generating a new scene from the cut frame with gemini-omni-1.2-flash...`
      );

      const progressInterval = setInterval(() => {
        setProgressPercent((prev) => {
          if (prev < 40) {
            setProgressStep(`Gemini Omni Flash analyzing plush rabbit position & motion vectors...`);
            return prev + 6;
          } else if (prev < 75) {
            setProgressStep(`Synthesizing Scene ${nextSceneNumber} continuation with seamless blend...`);
            return prev + 3;
          } else if (prev < 90) {
            setProgressStep(`Finalizing video stream frames for Scene ${nextSceneNumber}...`);
            return prev + 2;
          }
          return prev;
        });
      }, 1800);

      setGenPhase('making');
      const response = await sendWithReview(continueInteraction ? '/api/extend' : '/api/animate', {
          ...(continueInteraction
            ? { previousInteractionId: parentVideo.interactionId }
            : { imageBase64: startFrame, imageMimeType: 'image/jpeg' }),
          ...castRequest(parentVideo).fields,
          ...(opts?.refs?.fields || {}),
          prompt: generationPrompt,
          aspectRatio: parentVideo.aspectRatio,
          duration: `${sceneSeconds}s`,
          resolution,
          season: opts ? opts.season : parentVideo.season || selectedSeason,
          weather: opts ? opts.weather : parentVideo.weather || selectedWeather,
          audioMode,
          silentTalk: silentTalk,
          clothingDirective: combinedClothingDirective || undefined,
          shootGuideDirective: combinedPropDirective || undefined,
          clothingDirectives: clothingItems.map((c) => ({ title: c.title, directive: c.promptDirective || c.directive || '' })),
          propDirectives: propItems.map((p) => ({ title: p.title, directive: p.promptDirective || p.directive || '' })),
          characterDirectives: characterItems.map((ch) => ({ title: ch.title, directive: ch.promptDirective || ch.directive || '' })),
          customEmblemType: activeEmblem?.type,
          includeKhalle,
          customEmblemDirective: activeEmblem?.directive,
          customEmblemName: activeEmblem?.name,
          customEmblemImage: activeEmblem?.imageBase64 || activeEmblem?.imagePath,
          disableMorph: !isMorphingEnabled || activeEmblem?.type !== 'morph',
          enableMorph: isMorphingEnabled && activeEmblem?.type === 'morph',
          referenceImages: [
            ...continuityRefs,
            ...castRequest(parentVideo).refs,
            ...(opts?.refs?.refs || []),
            ...referenceAssets.filter((a) => a.enabled).map((ref) => ({
              label: ref.label,
              imagePath: ref.imagePath,
              imageBase64: ref.imageBase64,
              mimeType: ref.mimeType || 'image/jpeg',
              category: ref.category,
            })),
            ...activeStylistItems
              .filter((item) => item.imageBase64 || item.imageUrl || item.imagePath)
              .filter((item) => !referenceAssets.some((r) => r.id === item.id))
              .map((item) => ({
                label: `${item.title} (${item.type})`,
                imagePath: item.imageUrl || item.imagePath,
                imageBase64: item.imageBase64,
                mimeType: item.mimeType || 'image/jpeg',
                category: item.type as any,
              })),
          ],
        });

      clearInterval(progressInterval);
      const data = await response.json();

      if (data.generationLog) {
        setLatestGenerationLog(data.generationLog);
      }

      if (!response.ok || !data.success) {
        if (response.status === 429 || data.isSpendingCap || data.error?.includes('spending cap')) {
          setIsSpendingCapHit(true);
        }
        throw new Error(data.error || 'Failed to extend scene with Gemini Omni Flash.');
      }

      const newScene: GeneratedVideo = {
        id: data.interactionId || `omni-scene-${Date.now()}`,
        videoUrl: data.videoUrl,
        prompt: continuationPrompt,
        aspectRatio: parentVideo.aspectRatio,
        duration: `${sceneSeconds}s`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceImage: parentVideo.sourceImage,
        season: opts?.season || parentVideo.season,
        weather: opts?.weather || parentVideo.weather,
        cost: estimatedCost.display,
        engine: 'omni',
        storyId: parentVideo.storyId || parentVideo.id,
        sceneNumber: nextSceneNumber,
        interactionId: data.interactionId,
        previousInteractionId: continueInteraction ? parentVideo.interactionId : undefined,
        includeKhalle,
        audioMode,
        silentTalk,
        storyTitle: parentVideo.storyTitle,
        ...castFieldsOf(parentVideo),
      };

      setSessionCost((prev) => prev + (resolution === '1080p' ? 0.60 : 0.35));
      // Insert right after the parent (not at the end) and renumber the story.
      const parentNow = videoHistoryRef.current.find((v) => v.id === parentVideo.id);
      const placed = parentNow ? replaceInStory(parentNow.id, [parentNow, newScene]) : undefined;
      if (!placed) setVideoHistory((prev) => [newScene, ...prev]);
      setCurrentVideo(placed?.find((s) => s.id === newScene.id) || newScene);
      setShowExtensionDrawer(false);
      if (opts?.refs) setSceneRefs([]);
    } catch (err: any) {
      if (err?.cancelled) return;
      console.error('Scene extension error:', err);
      fetchLatestLog(false);
      if (err.message?.includes('spending cap') || err.message?.includes('429')) {
        setIsSpendingCapHit(true);
      }
      setErrorMessage(err.message || 'Failed to extend the video scene.');
    } finally {
      setIsExtending(false);
      setProgressPercent(0);
      setProgressStep('');
    }
  };

  // Look at the frames around where the new scene goes and suggest its prompt (cheap text call).
  const handleAnalyzeCut = async (parentVideo: GeneratedVideo) => {
    setIsAnalyzingCut(true);
    setErrorMessage(null);
    setCutAnalysis(null);
    try {
      const storyScenes = videoHistoryRef.current
        .filter((v) => v.storyId === parentVideo.storyId)
        .sort((a, b) => (a.sceneNumber || 1) - (b.sceneNumber || 1));
      const idx = storyScenes.findIndex((s) => s.id === parentVideo.id);
      const following = idx !== -1 ? storyScenes[idx + 1] : undefined;
      const startFrame = await grabFrame(parentVideo.videoUrl, parentVideo.trimEnd ?? Number.POSITIVE_INFINITY, 768);
      const endFrame = following ? await grabFrame(following.videoUrl, following.trimStart ?? 0, 768) : null;
      const result = await analyzeCut({
        startFrame,
        endFrame,
        previousPrompt: parentVideo.prompt,
        nextPrompt: following?.prompt,
        wish: nextScenePrompt.trim() || undefined,
      });
      setCutAnalysis(result);
      setNextScenePrompt(result.suggestedPrompt);
    } catch (err: any) {
      setErrorMessage(err?.message || 'The frames could not be analysed.');
    } finally {
      setIsAnalyzingCut(false);
    }
  };

  // One MP4 of the whole story: each scene cut to its trim, joined in order (ffmpeg.wasm).
  const handleExportStory = async () => {
    if (!currentStoryScenes.length || storyExport) return;
    setErrorMessage(null);
    setStoryExport({ step: 'Starting…', fraction: 0 });
    try {
      const blob = await exportStory(
        currentStoryScenes.map((s, i) => ({
          videoUrl: s.videoUrl,
          trimStart: s.trimStart,
          trimEnd: storyPlayEnd(s, currentStoryScenes[i + 1]),
        })),
        currentStoryScenes[0].aspectRatio,
        (p) => setStoryExport(p)
      );
      const url = URL.createObjectURL(blob);
      downloadVideo(url, `khalle-story-${currentStoryScenes.length}-scenes.mp4`);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err: any) {
      setErrorMessage(`The story could not be exported: ${err?.message || err}`);
    } finally {
      setStoryExport(null);
    }
  };

  // A correction of scene 1 is made fresh (up to 15 s). A later scene is made again as a
  // continuation of the scene before it: 3–10 s, and the chain may not pass 30 s in total.
  const correctionIsRoot = (scene: GeneratedVideo) => (scene.sceneNumber || 1) === 1 || !scene.previousInteractionId;
  const correctionMaxSeconds = (scene: GeneratedVideo) => {
    if (correctionIsRoot(scene)) return 15;
    const parent = videoHistoryRef.current.find((v) => v.interactionId === scene.previousInteractionId);
    const used = parent ? extensionChainSeconds(parent, videoHistoryRef.current) : 0;
    return Math.max(3, Math.min(10, MAX_EXTENSION_CHAIN_SECONDS - used));
  };

  // Open correction modal for a specific scene
  const openCorrectionModal = (scene: GeneratedVideo) => {
    setSceneToCorrect(scene);
    setCorrectionSeconds(Math.min(correctionMaxSeconds(scene), Math.max(3, parseInt(String(scene.duration || '5'), 10) || 5)));
    setCorrectionPrompt(scene.prompt);
    setCorrectionFeedback('');
    setCorrectionProblems([]);
    setCorrectionIncludeKhalle(includeKhalle);
    setCorrectionSilentTalk(typeof scene.silentTalk === 'boolean' ? scene.silentTalk : silentTalk);
    setCorrectionSeason(scene.season || selectedSeason);
    setCorrectionWeather(scene.weather || selectedWeather);
    setCorrectionMode('replace');
    setDirectorTarget('correction');
    setShowCorrectionModal(true);
  };

  // Add quick fix suggestion to correction feedback
  const handleSelectQuickFix = (fix: QuickCorrectionSuggestion) => {
    setCorrectionFeedback((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return fix.instruction;
      if (trimmed.includes(fix.instruction)) return trimmed;
      return `${trimmed}. ${fix.instruction}`;
    });
  };

  // Delete scene from storyboard
  const handleDeleteScene = (sceneToDelete: GeneratedVideo) => {
    const storyId = sceneToDelete.storyId;
    const filtered = videoHistory.filter((v) => v.id !== sceneToDelete.id);

    // Re-number scenes belonging to this story to keep sequence neat (Scene 1, Scene 2, ...)
    let sceneIndex = 1;
    const updatedHistory = filtered.map((v) => {
      if (v.storyId === storyId) {
        const updated = { ...v, sceneNumber: sceneIndex };
        sceneIndex++;
        return updated;
      }
      return v;
    });

    setVideoHistory(updatedHistory);

    if (currentVideo?.id === sceneToDelete.id) {
      const nextActive = updatedHistory.find((v) => v.storyId === storyId) || updatedHistory[0] || null;
      setCurrentVideo(nextActive);
    }
    setShowCorrectionModal(false);
  };

  // Apply corrections and re-take the scene
  const handleApplyCorrection = async () => {
    if (!sceneToCorrect) return;
    setIsCorrecting(true);
    setErrorMessage(null);
    setProgressPercent(15);
    setProgressStep(`Synthesizing corrected Scene ${sceneToCorrect.sceneNumber || 1}...`);

    let finalCorrectedPrompt = correctionPrompt.trim();
    const fixes = [
      ...SCENE_PROBLEMS.filter((p) => correctionProblems.includes(p.id)).map((p) => p.instruction),
      correctionFeedback.trim(),
    ].filter(Boolean);
    if (fixes.length) {
      finalCorrectedPrompt = `${finalCorrectedPrompt} [Correction: ${fixes.join(' ')}]`;
    }

    const isRootScene = correctionIsRoot(sceneToCorrect);
    const takeSeconds = Math.min(correctionMaxSeconds(sceneToCorrect), Math.max(3, Math.round(correctionSeconds)));
    const takeDuration = `${takeSeconds}s`;

    try {
      // Gemini Omni Flash
      const progressInterval = setInterval(() => {
        setProgressPercent((prev) => {
          if (prev < 40) {
            setProgressStep(`Analyzing scene corrections with gemini-omni-1.2-flash...`);
            return prev + 6;
          } else if (prev < 75) {
            setProgressStep(`Synthesizing corrected motion frames & atmospheric blend...`);
            return prev + 3;
          } else if (prev < 90) {
            setProgressStep(`Finalizing video stream for corrected Scene ${sceneToCorrect.sceneNumber || 1}...`);
            return prev + 2;
          }
          return prev;
        });
      }, 1800);

      let response: Response;
      if (isRootScene) {
        const payload: any = {
          prompt: finalCorrectedPrompt,
          aspectRatio: sceneToCorrect.aspectRatio,
          duration: takeDuration,
          resolution,
          season: correctionSeason,
          weather: correctionWeather,
          audioMode,
          silentTalk: correctionSilentTalk,
          clothingDirective: combinedClothingDirective || undefined,
          shootGuideDirective: combinedPropDirective || undefined,
          clothingDirectives: clothingItems.map((c) => ({ title: c.title, directive: c.promptDirective || c.directive || '' })),
          propDirectives: propItems.map((p) => ({ title: p.title, directive: p.promptDirective || p.directive || '' })),
          characterDirectives: characterItems.map((ch) => ({ title: ch.title, directive: ch.promptDirective || ch.directive || '' })),
          customEmblemType: activeEmblem?.type,
          includeKhalle: correctionIncludeKhalle,
          ...castRequest(sceneToCorrect).fields,
          customEmblemDirective: activeEmblem?.directive,
          customEmblemName: activeEmblem?.name,
          customEmblemImage: activeEmblem?.imageBase64 || activeEmblem?.imagePath,
          disableMorph: !isMorphingEnabled || activeEmblem?.type !== 'morph',
          enableMorph: isMorphingEnabled && activeEmblem?.type === 'morph',
          referenceImages: [
            ...castRequest(sceneToCorrect).refs,
            ...referenceAssets.filter((a) => a.enabled).map((ref) => ({
              label: ref.label,
              imagePath: ref.imagePath,
              imageBase64: ref.imageBase64,
              mimeType: ref.mimeType || 'image/jpeg',
              category: ref.category,
            })),
            ...activeStylistItems
              .filter((item) => item.imageBase64 || item.imageUrl || item.imagePath)
              .filter((item) => !referenceAssets.some((r) => r.id === item.id))
              .map((item) => ({
                label: `${item.title} (${item.type})`,
                imagePath: item.imageUrl || item.imagePath,
                imageBase64: item.imageBase64,
                mimeType: item.mimeType || 'image/jpeg',
                category: item.type as any,
              })),
          ],
        };
        if (isDefaultImage) {
          payload.imagePath =
            activeEmblem?.type === 'none'
              ? NO_SYMBOL_RABBIT_PATH
              : activeEmblem?.id === 'emblem-vegvisir'
              ? WAYFINDER_RABBIT_PATH
              : '/assets/aistudio/image_8c4d4a47.png';
          payload.imageMimeType = 'image/jpeg';
        } else {
          payload.imageBase64 = selectedImage;
          payload.imageMimeType = imageMimeType;
        }

        response = await sendWithReview('/api/animate', payload);
      } else {
        response = await sendWithReview('/api/extend', {
            previousInteractionId: sceneToCorrect.previousInteractionId,
            prompt: finalCorrectedPrompt,
            aspectRatio: sceneToCorrect.aspectRatio,
            duration: takeDuration,
            resolution,
            season: correctionSeason,
            weather: correctionWeather,
            audioMode,
            silentTalk: correctionSilentTalk,
            clothingDirective: combinedClothingDirective || undefined,
            shootGuideDirective: combinedPropDirective || undefined,
            clothingDirectives: clothingItems.map((c) => ({ title: c.title, directive: c.promptDirective || c.directive || '' })),
            propDirectives: propItems.map((p) => ({ title: p.title, directive: p.promptDirective || p.directive || '' })),
            characterDirectives: characterItems.map((ch) => ({ title: ch.title, directive: ch.promptDirective || ch.directive || '' })),
            customEmblemType: activeEmblem?.type,
            includeKhalle: correctionIncludeKhalle,
            ...castRequest(sceneToCorrect).fields,
            customEmblemDirective: activeEmblem?.directive,
            customEmblemName: activeEmblem?.name,
            customEmblemImage: activeEmblem?.imageBase64 || activeEmblem?.imagePath,
            customEmblemUrl: activeEmblem?.imageUrl,
            customEmblemStartUrl: activeEmblem?.startImageUrl,
            customEmblemEndUrl: activeEmblem?.endImageUrl,
            customEmblemStartImage: activeEmblem?.startImageUrl || activeEmblem?.startImagePath,
            customEmblemEndImage: activeEmblem?.endImageUrl || activeEmblem?.endImagePath,
            disableMorph: !isMorphingEnabled || activeEmblem?.type !== 'morph',
            enableMorph: isMorphingEnabled && activeEmblem?.type === 'morph',
            referenceImages: [
              ...castRequest(sceneToCorrect).refs,
              ...referenceAssets.filter((a) => a.enabled).map((ref) => ({
                label: ref.label,
                imagePath: ref.imagePath,
                imageBase64: ref.imageBase64,
                mimeType: ref.mimeType || 'image/jpeg',
                category: ref.category,
              })),
              ...activeStylistItems
                .filter((item) => item.imageBase64 || item.imageUrl || item.imagePath)
                .filter((item) => !referenceAssets.some((r) => r.id === item.id))
                .map((item) => ({
                  label: `${item.title} (${item.type})`,
                  imagePath: item.imageUrl || item.imagePath,
                  imageBase64: item.imageBase64,
                  mimeType: item.mimeType || 'image/jpeg',
                  category: item.type as any,
                })),
            ],
          });
      }

      clearInterval(progressInterval);
      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 429 || data.isSpendingCap || data.error?.includes('spending cap')) {
          setIsSpendingCapHit(true);
        }
        throw new Error(data.error || 'Failed to generate scene correction.');
      }

      const correctedScene: GeneratedVideo = {
        ...sceneToCorrect,
        id: data.interactionId || `omni-corrected-${Date.now()}`,
        videoUrl: data.videoUrl,
        prompt: finalCorrectedPrompt,
        duration: data.duration || takeDuration,
        // A new take: the old scene's trim and measured length do not apply. For a continuation
        // the auto-trim measures the new clip and starts it where the new part begins.
        trimStart: undefined,
        trimEnd: undefined,
        clipSeconds: undefined,
        extensionTrimChecked: undefined,
        seamStart: undefined,
        seamChecked: undefined,
        season: correctionSeason,
        weather: correctionWeather,
        cost: estimatedCost.display,
        engine: 'omni',
        interactionId: data.interactionId,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        includeKhalle: correctionIncludeKhalle,
        silentTalk: correctionSilentTalk,
      };

      setSessionCost((prev) => prev + (resolution === '1080p' ? 0.60 : 0.35));

      if (correctionMode === 'replace') {
        setVideoHistory((prev) => prev.map((v) => (v.id === sceneToCorrect.id ? correctedScene : v)));
        const ownNumber = sceneToCorrect.sceneNumber || 1;
        const next = videoHistoryRef.current
          .filter((v) => v.storyId === sceneToCorrect.storyId && v.id !== sceneToCorrect.id && (v.sceneNumber || 1) > ownNumber)
          .sort((a, b) => (a.sceneNumber || 1) - (b.sceneNumber || 1))[0];
        setJoinOffer(next ? { sceneId: correctedScene.id, nextId: next.id } : null);
      } else {
        setVideoHistory((prev) => [correctedScene, ...prev]);
      }

      setCurrentVideo(correctedScene);
      setShowCorrectionModal(false);
    } catch (err: any) {
      if (err?.cancelled) return;
      console.error('Scene correction error:', err);
      if (err.message?.includes('spending cap') || err.message?.includes('429')) {
        setIsSpendingCapHit(true);
      }
      setErrorMessage(err.message || 'Failed to correct the scene.');
    } finally {
      setIsCorrecting(false);
      setProgressPercent(0);
      setProgressStep('');
    }
  };

  // Master trigger routing to Gemini Omni Flash
  // The left panel's Generate: a new story, or the next scene of the open story.
  /** Story board → "Make Scene N": Scene 1 starts on its picture, later scenes end exactly on theirs. */
  const startBoardScene = (index: number) => {
    const board = activeBoard;
    const scene = board?.scenes[index];
    if (!board || !scene?.image) return;
    const storyScenes = board.storyId
      ? videoHistory.filter((v) => v.storyId === board.storyId).sort((a, b) => (a.sceneNumber || 1) - (b.sceneNumber || 1))
      : [];
    const last = storyScenes[storyScenes.length - 1];
    setPrompt(scene.action);
    setDuration(scene.seconds === 10 ? '10s' : '5s');
    setAspectRatio(board.aspectRatio);
    if (!last) {
      setSelectedImage(scene.image);
      setIsDefaultImage(false);
      setImageMimeType(scene.image.match(/^data:([^;]+);/)?.[1] || 'image/png');
      setNextStartsFrom('picture');
      setCurrentVideo(null);
      // The board's characters, props and places go along as reference pictures (at most 3).
      setSceneRefs(board.cast.slice(0, 3).map((c) => ({ id: `ref-board-${c.id}`, image: c.image, label: `${c.name} (keep exactly this look)`, endHere: false })));
    } else {
      setNextStartsFrom('end');
      setCurrentVideo(last);
      setSceneRefs([]);
    }
    setBoardRun({ boardId: board.id, index, lastId: last?.id, before: videoHistory.map((v) => v.id), started: false });
    setView('make');
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (!boardRun || boardRun.started) return;
    const board = boards.find((b) => b.id === boardRun.boardId);
    const image = board?.scenes[boardRun.index]?.image;
    if (!board || !image) {
      setBoardRun(null);
      return;
    }
    setBoardRun({ ...boardRun, started: true });
    const last = boardRun.lastId ? videoHistoryRef.current.find((v) => v.id === boardRun.lastId) : undefined;
    void (async () => {
      if (last) await handleEndOnPicture(last, image);
      else {
        appendToStoryRef.current = null;
        await handleGenerateVideo();
      }
      setBoardRun((r) => (r ? { ...r, done: true } : r));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardRun]);

  // When the board's scene is made: remember it on the board (and name a new story after the board).
  useEffect(() => {
    if (!boardRun?.done) return;
    const before = new Set(boardRun.before);
    const lastStory = boardRun.lastId ? videoHistory.find((v) => v.id === boardRun.lastId)?.storyId : undefined;
    const made = videoHistory.find((v) => !before.has(v.id) && (lastStory ? v.storyId === lastStory : true));
    setBoardRun(null);
    if (!made) return; // it failed; the error is shown on the scene screen
    const board = boards.find((b) => b.id === boardRun.boardId);
    if (!board) return;
    setBoards((list) =>
      list.map((b) =>
        b.id === board.id
          ? {
              ...b,
              storyId: made.storyId,
              scenes: b.scenes.map((s, i) => (i === boardRun.index ? { ...s, madeSceneId: made.id } : s)),
              updatedAt: Date.now(),
            }
          : b
      )
    );
    if (!lastStory && board.title.trim()) {
      setVideoHistory((prev) => prev.map((v) => (v.storyId === made.storyId && !v.storyTitle ? { ...v, storyTitle: board.title.trim() } : v)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardRun, videoHistory]);

  const applyAlbumPicture = async (dataUrl: string, dest: string) => {
    setMakeAlbums(null);
    const blob = await (await fetch(dataUrl)).blob();
    if (dest === 'ref') addSceneRef(blob);
    else loadStartPicture(blob, 'chosen');
  };

  const handleTriggerGenerate = () => {
    const last = openStoryLastScene;
    const endRef = sceneRefs.find((r) => r.endHere);
    if (endRef) {
      handleEndOnPicture(last, endRef.image);
      return;
    }
    if (last && nextStartsFrom === 'end') {
      handleExtendScene(last, prompt, { seconds: parseInt(duration, 10) || 5, season: selectedSeason, weather: selectedWeather, refs: sceneRefRequest() });
      return;
    }
    appendToStoryRef.current = last ? last.storyId : null;
    handleGenerateVideo();
  };

  // Test whether spend cap update is live on Google Cloud
  const handleCheckQuota = async () => {
    setQuotaCheckStatus('checking');
    setQuotaCheckMsg('Testing connection to Gemini API...');
    try {
      const res = await fetch('/api/test-quota');
      const data = await res.json();
      if (data.status === 'video_rate_limited') {
        setQuotaCheckStatus('syncing');
        setIsSpendingCapHit(true);
        setQuotaCheckMsg(data.videoRateLimit || data.message || 'Daily video model limit reached (20 videos/day).');
      } else if (data.success && data.status === 'active') {
        setQuotaCheckStatus('active');
        setIsSpendingCapHit(false);
        setErrorMessage(null);
        setQuotaCheckMsg('Quota is active and ready to generate!');
      } else if (data.status === 'spend_cap_still_syncing' || data.isSpendingCap) {
        setQuotaCheckStatus('syncing');
        setQuotaCheckMsg(
          'Google Cloud is still propagating your new spend cap across regional billing servers (typically takes 5–15 minutes).'
        );
      } else {
        setQuotaCheckStatus('error');
        setQuotaCheckMsg(data.error || 'Could not verify quota.');
      }
    } catch (e: any) {
      setQuotaCheckStatus('error');
      setQuotaCheckMsg(e.message || 'Connection test failed.');
    }
  };

  // Video playback controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const restartVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsPlaying(true);
  };

  // Story play: the scene that comes next (the first one again when the story loops).
  const nextStoryScene = useMemo(() => {
    if (!currentVideo || !playAllContinuous || currentStoryScenes.length < 2) return undefined;
    const idx = currentStoryScenes.findIndex((s) => s.id === currentVideo.id);
    if (idx === -1) return undefined;
    if (idx < currentStoryScenes.length - 1) return currentStoryScenes[idx + 1];
    return isLooping ? currentStoryScenes[0] : undefined;
  }, [currentVideo, currentStoryScenes, playAllContinuous, isLooping]);

  // Where the selected scene stops. In story play a scene stops where its extension takes over
  // (the seam), not at its own end: the chain replaced its last frames.
  const playEnd = currentVideo
    ? playAllContinuous
      ? storyPlayEnd(currentVideo, nextStoryScene)
      : currentVideo.trimEnd
    : undefined;

  // The hidden slot loads the next scene and waits on its first frame, muted and paused.
  const preloadScene = compareMode === 'video' ? nextStoryScene : undefined;
  useEffect(() => {
    const el = slotEls.current[activeSlot === 0 ? 1 : 0];
    if (!el) return;
    el.pause();
    el.muted = true;
    if (!preloadScene) return;
    const start = preloadScene.trimStart ?? 0;
    const seek = () => {
      if (Math.abs(el.currentTime - start) > 0.02) el.currentTime = start;
    };
    if (el.readyState >= 1) seek();
    el.addEventListener('loadedmetadata', seek);
    return () => el.removeEventListener('loadedmetadata', seek);
  }, [activeSlot, preloadScene?.id, preloadScene?.videoUrl, preloadScene?.trimStart, compareMode]);

  // Swap to the hidden slot when it already holds `next` on its first frame. False = not ready:
  // the caller falls back to loading the next scene in the visible player.
  const handOffToNextScene = (player: HTMLVideoElement | null, next: GeneratedVideo): boolean => {
    if (compareMode !== 'video') return false;
    const fromSlot = activeSlotRef.current;
    const toSlot: 0 | 1 = fromSlot === 0 ? 1 : 0;
    const from = slotEls.current[fromSlot];
    const to = slotEls.current[toSlot];
    if (!from || !to || player !== from) return false;
    if (to.getAttribute('src') !== next.videoUrl || to.readyState < 2) return false;
    const start = next.trimStart ?? 0;
    if (Math.abs(to.currentTime - start) > 0.1) return false;
    to.muted = from.muted;
    to.volume = from.volume;
    to.playbackRate = from.playbackRate;
    activeSlotRef.current = toSlot;
    videoRef.current = to;
    // Show the new slot now, not after React's next render (~100 ms in this big component, during
    // which the old frame would freeze). The render sets the same classes again.
    const shownClass = from.className;
    from.className = to.className;
    to.className = shownClass;
    to.removeAttribute('aria-hidden');
    from.setAttribute('aria-hidden', 'true');
    to.play().catch(() => {});
    from.pause();
    setActiveSlot(toSlot);
    return true;
  };

  // What happens when the selected scene's segment ends (natural end, or its trimEnd).
  const advanceAfterScene = (player: HTMLVideoElement | null, trimmedEnd: boolean) => {
    if (!currentVideo) return;
    if (playAllContinuous && currentStoryScenes.length > 1) {
      const idx = currentStoryScenes.findIndex((s) => s.id === currentVideo.id);
      if (nextStoryScene && handOffToNextScene(player, nextStoryScene)) {
        setCurrentVideo(nextStoryScene);
      } else if (idx !== -1 && idx < currentStoryScenes.length - 1) {
        setCurrentVideo(currentStoryScenes[idx + 1]);
      } else if (isLooping) {
        if (currentStoryScenes[0].id === currentVideo.id && player) {
          player.currentTime = currentVideo.trimStart || 0;
          player.play().catch(() => {});
        }
        setCurrentVideo(currentStoryScenes[0]);
      } else {
        player?.pause();
        setIsPlaying(false);
      }
    } else if (trimmedEnd && isLooping && player) {
      // Native `loop` only knows the clip's real end; loop the trimmed segment ourselves.
      player.currentTime = currentVideo.trimStart || 0;
      player.play().catch(() => {});
    } else if (!isLooping || trimmedEnd) {
      player?.pause();
      setIsPlaying(false);
    }
  };

  useTrimmedPlayback(videoRef, currentVideo?.videoUrl, currentVideo?.trimStart, playEnd, () =>
    advanceAfterScene(videoRef.current, true)
  );
  useTrimmedPlayback(splitVideoRef, currentVideo?.videoUrl, currentVideo?.trimStart, playEnd, () =>
    advanceAfterScene(splitVideoRef.current, true)
  );

  const replaceInStory = (sceneId: string, replacement: GeneratedVideo[]) => {
    const history = videoHistoryRef.current;
    const target = history.find((v) => v.id === sceneId);
    if (!target) return;
    const storyId = target.storyId;
    const storyScenes = history
      .filter((v) => v.storyId === storyId)
      .sort((a, b) => (a.sceneNumber || 1) - (b.sceneNumber || 1));
    const idx = storyScenes.findIndex((s) => s.id === sceneId);
    if (idx === -1) return;
    storyScenes.splice(idx, 1, ...replacement.map((r) => ({ ...r, storyId })));
    const renumbered = storyScenes.map((s, i) => ({ ...s, sceneNumber: i + 1 }));
    const otherStories = history.filter((v) => v.storyId !== storyId);
    const next = [...renumbered, ...otherStories];
    videoHistoryRef.current = next;
    setVideoHistory(next);
    return renumbered;
  };

  useEffect(() => setCutAnalysis(null), [currentVideo?.id]);

  // A: when another story is opened, the Khalle switch follows what that story's last scene used,
  // so the next scene keeps the same characters as the one before.
  const openStoryKey = openStoryLastScene?.storyId;
  useEffect(() => {
    if (openStoryLastScene && typeof openStoryLastScene.includeKhalle === 'boolean') {
      setIncludeKhalle(openStoryLastScene.includeKhalle);
    }
    if (openStoryLastScene && typeof openStoryLastScene.silentTalk === 'boolean') {
      setSilentTalk(openStoryLastScene.silentTalk);
    }
    if (openStoryLastScene?.audioMode) setAudioMode(openStoryLastScene.audioMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openStoryKey]);

  // Paste a picture anywhere on the scene screen (Cmd/Ctrl+V) to use it as the start picture.
  // Not while a window (dialog) is open or on the Stories page; text pastes are left alone.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (view !== 'make' || document.querySelector('[aria-modal="true"]')) return;
      const item = [...(e.clipboardData?.items || [])].find((it) => it.kind === 'file' && it.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (!file) return;
      e.preventDefault();
      // Continuing a scene, or pasting inside the reference box: it is a reference picture.
      const inRefs = (e.target as HTMLElement | null)?.closest?.('[data-scene-refs]');
      if (inRefs || pasteToRefsRef.current) addSceneRef(file);
      else loadStartPicture(file, 'pasted');
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // The "38 s so far" clock while a scene is being made.
  useEffect(() => {
    if (!isGenerating && !isExtending) return;
    setGenNow(Date.now());
    const t = setInterval(() => setGenNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isGenerating, isExtending]);

  // Generate a clip from the last frame of one scene to the first frame of the next and put it between them.
  const handleCreateTransition = async (
    from: GeneratedVideo | null,
    to: GeneratedVideo,
    args: { firstFrame: string; lastFrame: string; prompt: string; seconds: number }
  ) => {
    setIsMakingTransition(true);
    setTransitionError(null);
    try {
      const result = await generateTransition({
        firstFrame: args.firstFrame,
        lastFrame: args.lastFrame,
        prompt: args.prompt,
        seconds: args.seconds,
        aspectRatio: (from || to).aspectRatio === '16:9' ? '16:9' : '9:16',
        resolution,
      });
      const base = from || to;
      const transition: GeneratedVideo = {
        id: result.interactionId || `transition-${Date.now()}`,
        videoUrl: result.videoUrl,
        prompt: from ? `Transition: ${args.prompt}` : args.prompt,
        aspectRatio: base.aspectRatio,
        duration: result.duration,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceImage: base.sourceImage,
        season: base.season,
        weather: base.weather,
        cost: estimatedCost.display,
        engine: 'omni',
        storyId: base.storyId || base.id,
        sceneNumber: from ? (from.sceneNumber || 1) + 1 : to.sceneNumber || 1,
        interactionId: result.interactionId,
        includeKhalle: base.includeKhalle,
        audioMode: base.audioMode,
        silentTalk: base.silentTalk,
        storyTitle: base.storyTitle,
        ...castFieldsOf(base),
      };
      setSessionCost((prev) => prev + (resolution === '1080p' ? 0.6 : 0.35));
      // A transition goes right after `from`; a new opening scene goes right before `to`.
      const anchor = videoHistoryRef.current.find((v) => v.id === (from || to).id);
      const placed = anchor
        ? replaceInStory(anchor.id, from ? [anchor, transition] : [transition, anchor])
        : undefined;
      if (!placed) setVideoHistory((prev) => [transition, ...prev]);
      setCurrentVideo(placed?.find((v) => v.id === transition.id) || transition);
      setCompareMode('video');
      setTransitionPair(null);
      setJoinOffer(null);
    } catch (err: any) {
      console.error('Transition error:', err);
      setTransitionError(`The transition could not be made: ${err?.message || 'unknown error'}`);
    } finally {
      setIsMakingTransition(false);
    }
  };

  /**
   * The next scene ends exactly on a reference picture: Gemini's first-and-last-frame mode. Starts on the
   * last frame of the open story's last scene (continuing) or on the start picture.
   */
  const handleEndOnPicture = async (last: GeneratedVideo | undefined, endImage: string) => {
    setIsGenerating(true);
    setGenPhase('preparing');
    setGenStartedAt(Date.now());
    setMakingSceneNo(last ? currentStoryScenes.length + 1 : 1);
    setErrorMessage(null);
    setProgressPercent(10);
    try {
      const continuing = !!last && nextStartsFrom === 'end';
      const firstFrame = continuing ? await grabFrame(last!.videoUrl, last!.trimEnd ?? Number.POSITIVE_INFINITY) : await imageToDataUrl(selectedImage);
      const lastFrame = await imageToDataUrl(endImage);
      const secs = Math.min(10, parseInt(duration, 10) || 5);
      const talk = silentTalk
        ? ' The main character talks during the whole shot: the mouth moves in a speaking rhythm with expressions and gestures, but there are no audible words.'
        : '';
      const proposed = [
        prompt.trim(),
        'In a single continuous shot, with no scene cuts.',
        'The first image is the first frame. The video ends exactly on the second image.',
        talk.trim(),
      ]
        .filter(Boolean)
        .join('\n');
      const reviewed = await reviewPrompt({
        title: 'ends on your picture',
        text: proposed,
        pictures: [
          { n: 1, line: 'First frame', previewUrl: firstFrame },
          { n: 2, line: 'Last frame', previewUrl: lastFrame },
        ],
        notes: talkNote(silentTalk),
      });
      if (reviewed === null) throw cancelledError();
      setGenPhase('making');
      setProgressPercent(35);
      const result = await generateTransition({
        firstFrame,
        lastFrame,
        prompt: reviewed,
        seconds: secs,
        aspectRatio: (last?.aspectRatio || aspectRatio) === '16:9' ? '16:9' : '9:16',
        resolution,
      });
      const id = result.interactionId || `vid-${Date.now()}`;
      const scene: GeneratedVideo = {
        id,
        videoUrl: result.videoUrl,
        prompt: prompt.trim(),
        aspectRatio: last?.aspectRatio || aspectRatio,
        duration: result.duration,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceImage: continuing ? last!.sourceImage : selectedImage,
        season: selectedSeason,
        weather: selectedWeather,
        cost: estimatedCost.display,
        engine: 'omni',
        storyId: last ? last.storyId : id,
        sceneNumber: last ? currentStoryScenes.length + 1 : 1,
        interactionId: result.interactionId,
        includeKhalle,
        audioMode,
        silentTalk,
        storyTitle: last?.storyTitle,
        ...castFieldsOf(last),
      };
      setSessionCost((prev) => prev + secs * estimatedCost.ratePerSec);
      const placed = last ? replaceInStory(last.id, [last, scene]) : undefined;
      if (!placed) setVideoHistory((prev) => [scene, ...prev]);
      setCurrentVideo(placed?.find((v) => v.id === scene.id) || scene);
      setCompareMode('video');
      setSceneRefs([]);
    } catch (err: any) {
      if (err?.cancelled) return;
      console.error('End-on-picture error:', err);
      setErrorMessage(`The scene could not be made: ${err?.message || 'unknown error'}`);
    } finally {
      setIsGenerating(false);
      setProgressPercent(0);
    }
  };

  const handleTrimScene = (scene: GeneratedVideo, trimStart: number | undefined, trimEnd: number | undefined) => {
    const updated = { ...scene, trimStart, trimEnd };
    const renumbered = replaceInStory(scene.id, [updated]);
    const next = renumbered?.find((s) => s.id === scene.id) || updated;
    setCurrentVideo(next);
  };

  // Split one scene into two edit-list entries over the same clip, at `at` seconds.
  const handleSplitScene = (scene: GeneratedVideo, at: number) => {
    const firstId = `${scene.id}-split-${Date.now()}`;
    const first: GeneratedVideo = {
      ...scene,
      id: firstId,
      trimEnd: at,
      // The stored Gemini interaction ends where the clip ends, not at the cut, so the first part
      // can't be continued through it.
      interactionId: undefined,
    };
    const second: GeneratedVideo = {
      ...scene,
      trimStart: at,
      previousInteractionId: undefined,
    };
    const renumbered = replaceInStory(scene.id, [first, second]);
    setCurrentVideo(renumbered?.find((s) => s.id === firstId) || first);
    videoRef.current?.pause();
    setIsPlaying(false);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const downloadVideo = (videoUrl: string, filename = 'jumping-rabbit.mp4') => {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadWatermarkedVideo = async (videoUrl: string, filename = 'jumping-rabbit-watermarked.mp4') => {
    if (!watermarkConfig.enabled) {
      downloadVideo(videoUrl, filename);
      return;
    }

    setIsBurningWatermark(true);
    setBurnProgress(15);

    try {
      const offscreenVideo = document.createElement('video');
      offscreenVideo.crossOrigin = 'anonymous';
      offscreenVideo.src = videoUrl;
      offscreenVideo.muted = true;
      offscreenVideo.playsInline = true;

      await new Promise<void>((resolve, reject) => {
        offscreenVideo.onloadedmetadata = () => resolve();
        offscreenVideo.onerror = () => reject(new Error('Failed to load video for watermarking'));
      });

      const width = offscreenVideo.videoWidth || 720;
      const height = offscreenVideo.videoHeight || 1280;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas 2D context not available');
      }

      let logoImg: HTMLImageElement | null = null;
      if (watermarkConfig.type === 'image' && watermarkConfig.customImageUrl) {
        logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.src = watermarkConfig.customImageUrl;
        await new Promise<void>((resolve) => {
          if (!logoImg) return resolve();
          logoImg.onload = () => resolve();
          logoImg.onerror = () => resolve();
        });
      }

      const stream = canvas.captureStream(30);
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
        mimeType = 'video/mp4;codecs=avc1';
      }

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6000000 });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recorderFinishedPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };
      });

      recorder.start(100);
      offscreenVideo.currentTime = 0;
      await offscreenVideo.play();

      const durationSec = offscreenVideo.duration || 5;

      const renderFrame = () => {
        if (offscreenVideo.paused || offscreenVideo.ended) return;

        ctx.drawImage(offscreenVideo, 0, 0, width, height);

        ctx.save();
        ctx.globalAlpha = watermarkConfig.opacity;

        const scaleMult =
          watermarkConfig.scale === 'small' ? 0.75 : watermarkConfig.scale === 'large' ? 1.4 : 1.0;
        const padX = 22 * scaleMult;
        const padY = 12 * scaleMult;
        const fontSize = Math.round(18 * scaleMult);

        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;

        let watermarkText = '';
        if (watermarkConfig.type === 'preset') {
          if (watermarkConfig.presetId === 'rabbithop') watermarkText = '🐇 Khalle Studio';
          else if (watermarkConfig.presetId === 'omni_flash') watermarkText = '✨ Gemini Omni Flash';
          else if (watermarkConfig.presetId === 'alpine_cinema') watermarkText = '🎬 Alpine Cinema 4K';
          else watermarkText = watermarkConfig.customText || '@KhalleStudio';
        } else if (watermarkConfig.type === 'text') {
          watermarkText = watermarkConfig.customText || '@Creator';
        }

        const textMetrics = ctx.measureText(watermarkText);
        const textWidth = textMetrics.width;

        const badgeW = (logoImg ? Math.min(160 * scaleMult, logoImg.naturalWidth || 140) : textWidth) + padX * 2;
        const badgeH = (logoImg ? (logoImg.naturalHeight / (logoImg.naturalWidth || 1)) * (badgeW - padX * 2) : fontSize * 1.5) + padY * 2;

        const margin = 28;
        let posX = margin;
        let posY = margin;

        if (watermarkConfig.position === 'top-right') {
          posX = width - badgeW - margin;
          posY = margin;
        } else if (watermarkConfig.position === 'bottom-left') {
          posX = margin;
          posY = height - badgeH - margin;
        } else if (watermarkConfig.position === 'bottom-right') {
          posX = width - badgeW - margin;
          posY = height - badgeH - margin;
        } else if (watermarkConfig.position === 'center') {
          posX = (width - badgeW) / 2;
          posY = (height - badgeH) / 2;
        }

        if (watermarkConfig.showPillBackdrop) {
          ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
          ctx.strokeStyle = 'rgba(51, 65, 85, 0.65)';
          ctx.lineWidth = 2;
          const radius = Math.min(badgeH / 2, 20);

          ctx.beginPath();
          ctx.roundRect(posX, posY, badgeW, badgeH, radius);
          ctx.fill();
          ctx.stroke();
        }

        if (logoImg) {
          const imgDrawW = badgeW - padX * 2;
          const imgDrawH = badgeH - padY * 2;
          ctx.drawImage(logoImg, posX + padX, posY + padY, imgDrawW, imgDrawH);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.textBaseline = 'middle';
          ctx.fillText(watermarkText, posX + padX, posY + badgeH / 2);
        }

        ctx.restore();

        const currentProgress = Math.min(95, Math.round((offscreenVideo.currentTime / durationSec) * 100));
        setBurnProgress(currentProgress);

        requestAnimationFrame(renderFrame);
      };

      requestAnimationFrame(renderFrame);

      await new Promise<void>((resolve) => {
        offscreenVideo.onended = () => resolve();
      });

      recorder.stop();
      setBurnProgress(98);

      const recordedBlob = await recorderFinishedPromise;
      const downloadUrl = URL.createObjectURL(recordedBlob);

      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const cleanFilename = filename.replace(/\.(mp4|webm)$/, `.${extension}`);

      downloadVideo(downloadUrl, cleanFilename);
      setBurnProgress(100);
      setTimeout(() => {
        setIsBurningWatermark(false);
        setBurnProgress(0);
      }, 1200);
    } catch (err) {
      console.error('Error burning watermark into video:', err);
      setIsBurningWatermark(false);
      setBurnProgress(0);
      downloadVideo(videoUrl, filename);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Top bar: name, Khalle switch, Stories, Log */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AppLogo />
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight">Khalle</h1>
              <p className="text-xs text-slate-400 hidden sm:block">Videos of the green plush rabbit</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-end gap-2 min-w-0" aria-label="Main">
            <button
              type="button"
              role="switch"
              aria-checked={includeKhalle}
              onClick={() => setIncludeKhalle((v) => !v)}
              className={`min-h-[40px] px-3 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                includeKhalle
                  ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border-emerald-600/60'
                  : 'bg-amber-950/70 hover:bg-amber-900/80 text-amber-200 border-amber-500/70'
              }`}
              title={
                includeKhalle
                  ? 'Khalle is in the scene: his pictures and the green-rabbit rule are sent. Click to leave him out'
                  : 'Khalle is left out: no Khalle pictures, symbol or green-rabbit rule are sent. Click to put him back'
              }
            >
              <span className={`relative w-8 h-4 rounded-full shrink-0 ${includeKhalle ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${includeKhalle ? 'translate-x-4' : ''}`} />
              </span>
              <span>{includeKhalle ? 'Khalle in scene' : 'Khalle left out'}</span>
            </button>
            <button
              type="button"
              aria-current={view === 'board' ? 'page' : undefined}
              onClick={() => {
                setView((v) => (v === 'board' ? 'make' : 'board'));
                window.scrollTo({ top: 0 });
              }}
              className={`min-h-[40px] px-3 rounded-lg text-sm font-medium border cursor-pointer ${
                view === 'board' ? 'border-emerald-400 bg-emerald-950/70 text-emerald-100' : 'border-slate-700 text-slate-200 hover:border-emerald-500'
              }`}
            >
              {view === 'board' ? 'Back to the scene' : 'Story board'}
            </button>
            <button
              type="button"
              aria-current={view === 'stories' ? 'page' : undefined}
              onClick={() => {
                setView((v) => (v === 'stories' ? 'make' : 'stories'));
                window.scrollTo({ top: 0 });
              }}
              className={`min-h-[40px] px-3 rounded-lg text-sm font-medium border cursor-pointer ${
                view === 'stories' ? 'border-emerald-400 bg-emerald-950/70 text-emerald-100' : 'border-slate-700 text-slate-200 hover:border-emerald-500'
              }`}
            >
              {view === 'stories' ? 'Back to the scene' : `Stories (${stories.length})`}
            </button>
            <div className="flex items-center rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={handleCopyGenerationLogDirect}
                className="min-h-[40px] px-3 text-sm font-medium text-slate-200 hover:text-emerald-200 flex items-center gap-1.5 cursor-pointer"
                title="Copy the log of the last generation, to paste into a chat"
              >
                <FileText className="w-4 h-4 text-slate-400" />
                <span>Log</span>
              </button>
              <button
                type="button"
                onClick={() => fetchLatestLog(true)}
                className="min-h-[40px] px-2.5 border-l border-slate-700 text-slate-300 hover:text-emerald-200 cursor-pointer"
                title="See the pictures and text sent to Gemini"
                aria-label="See the pictures and text sent to Gemini"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Story board */}
      {view === 'board' && (
        <main id="board" className="flex-1 max-w-[1440px] w-full mx-auto p-4 lg:p-6">
          {activeBoard ? (
            <StoryBoard
              board={activeBoard}
              boards={boards}
              onChange={(next) => setBoards((list) => list.map((b) => (b.id === next.id ? next : b)))}
              onSelect={setActiveBoardId}
              onNew={() => {
                const b = newBoard(aspectRatio);
                setBoards((list) => [b, ...list]);
                setActiveBoardId(b.id);
              }}
              onDelete={(id) => {
                setBoards((list) => list.map((b) => (b.id === id ? { ...b, deleted: true, cast: [], scenes: [], updatedAt: Date.now() } : b)));
                setActiveBoardId('');
              }}
              storyScenes={
                activeBoard.storyId
                  ? videoHistory
                      .filter((v) => v.storyId === activeBoard.storyId)
                      .sort((a, b) => (a.sceneNumber || 1) - (b.sceneNumber || 1))
                      .map((v) => ({ id: v.id, sceneNumber: v.sceneNumber }))
                  : []
              }
              onMakeScene={startBoardScene}
              onOpenStory={() => {
                const last = videoHistory
                  .filter((v) => v.storyId === activeBoard.storyId)
                  .sort((a, b) => (a.sceneNumber || 1) - (b.sceneNumber || 1))
                  .pop();
                if (last) setCurrentVideo(last);
                setView('make');
                window.scrollTo({ top: 0 });
              }}
              busy={isGenerating}
              ratePerSec={estimatedCost.ratePerSec}
              frameStories={stories.map((st) => ({
                storyId: st.storyId,
                title: storyName(st.scenes),
                scenes: st.scenes.map((v, i) => ({
                  id: v.id,
                  sceneNumber: i + 1,
                  videoUrl: v.videoUrl,
                  text: v.prompt,
                  trimStart: v.trimStart,
                  trimEnd: storyPlayEnd(v, st.scenes[i + 1]),
                })),
              }))}
            />
          ) : (
            <div className="max-w-xl mx-auto mt-12 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-3 text-center">
              <h1 className="text-2xl font-bold text-white">Story board</h1>
              <p className="text-slate-300">
                Write the story in a few lines. Gemini splits it into scenes and makes one key picture for each. You approve the
                pictures, and then each scene is made so it ends exactly on its picture.
              </p>
              <button
                type="button"
                onClick={() => {
                  const b = newBoard(aspectRatio);
                  setBoards((list) => [b, ...list]);
                  setActiveBoardId(b.id);
                }}
                className="self-center min-h-[48px] px-5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold cursor-pointer"
              >
                Start a story board
              </button>
            </div>
          )}
        </main>
      )}

      {/* Main Studio Layout */}
      {view === 'stories' && (
        <main id="stories" className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">Stories</h1>
              <p className="text-sm text-slate-400 mt-1">
                Drag a scene into any story to move it. Hold Alt (Option) while dropping to copy it. On a phone, use the ⋯ button on the scene.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                handleStartNewStory();
                setView('make');
              }}
              className="min-h-[44px] px-4 rounded-lg border border-slate-700 text-sm font-medium text-slate-200 hover:border-emerald-500 flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" /> New story
            </button>
          </div>

          {stories.length === 0 && (
            <p className="text-sm text-slate-400 bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              No stories yet. Go back, make a scene, and it becomes the first scene of your first story.
            </p>
          )}

          {stories.map(({ storyId, scenes }) => {
            const isOpen = !!currentVideo && (currentVideo.storyId || currentVideo.id) === storyId;
            const seconds = scenes.reduce((sum, sc) => sum + scenePlaySeconds(sc), 0);
            const shape = scenes[0]?.aspectRatio === '16:9' ? 'Wide 16:9' : 'Tall 9:16';
            const dropHere = !!dragSceneId && dropTarget?.storyId === storyId;
            return (
              <section
                key={storyId}
                aria-label={`Story: ${storyName(scenes)}`}
                onDragOver={(e) => sceneDragOver(e, storyId, 'end')}
                onDrop={sceneDrop}
                className={`rounded-2xl p-4 flex flex-col gap-3 border ${
                  dropHere
                    ? dropTarget!.blocked
                      ? 'bg-rose-950/20 border-rose-700/70'
                      : dropTarget!.copy
                      ? 'bg-sky-950/20 border-sky-500/70'
                      : 'bg-emerald-950/30 border-emerald-400'
                    : isOpen
                    ? 'bg-slate-900/80 border-emerald-700/60'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {renaming?.storyId === storyId ? (
                    <form
                      className="flex flex-wrap items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        renameStory(storyId, renaming.text);
                        setRenaming(null);
                      }}
                    >
                      <label htmlFor={`rename-${storyId}`} className="sr-only">Story name</label>
                      <input
                        id={`rename-${storyId}`}
                        autoFocus
                        value={renaming.text}
                        maxLength={80}
                        onChange={(e) => setRenaming({ storyId, text: e.target.value })}
                        className="min-h-[40px] w-64 max-w-full bg-slate-950 border border-slate-600 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button type="submit" className="min-h-[40px] px-3 rounded-lg bg-emerald-400 text-slate-950 text-sm font-bold cursor-pointer">Save name</button>
                      <button type="button" onClick={() => setRenaming(null)} className="min-h-[40px] px-3 rounded-lg text-sm text-slate-400 hover:text-slate-200 cursor-pointer">Cancel</button>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0">
                      <h2 className="text-lg font-semibold text-white truncate">{storyName(scenes)}</h2>
                      <span className="text-sm text-slate-400">
                        {scenes.length} {scenes.length === 1 ? 'scene' : 'scenes'} · {Math.round(seconds)} s · {shape}
                        {isOpen ? ' · open' : ''}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentVideo(scenes[0]);
                        setCompareMode('video');
                        setView('make');
                        window.scrollTo({ top: 0 });
                      }}
                      className="min-h-[40px] px-3 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-emerald-500 cursor-pointer"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenaming({ storyId, text: scenes.find((v) => v.storyTitle)?.storyTitle || '' })}
                      className="min-h-[40px] px-3 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-emerald-500 cursor-pointer"
                    >
                      Rename
                    </button>
                  </div>
                </div>

                {dropHere && (
                  <p className={`text-sm font-medium ${dropTarget!.blocked ? 'text-rose-300' : dropTarget!.copy ? 'text-sky-300' : 'text-emerald-300'}`}>
                    {dropTarget!.blocked
                      ? `Can't drop here: ${dropTarget!.blocked}.`
                      : `Drop to ${dropTarget!.copy ? 'copy' : 'move'} the scene here as Scene ${dropTarget!.landsAs}.${dropTarget!.copy ? '' : ' Hold Alt (Option) to copy instead.'}`}
                  </p>
                )}

                <div className="flex gap-3 overflow-x-auto pb-1 items-start">
                  {scenes.map((vid, idx) => {
                    const menuOpen = moveMenu?.sceneId === vid.id;
                    const sameShape = stories.filter(
                      (st) => st.storyId !== storyId && (st.scenes[0]?.aspectRatio || vid.aspectRatio) === vid.aspectRatio
                    );
                    const targetScenes = moveMenu && moveMenu.storyId !== 'new' ? stories.find((st) => st.storyId === moveMenu.storyId)?.scenes || [] : [];
                    return (
                      <div key={vid.id} className="shrink-0 flex items-start gap-3">
                        <div
                          draggable
                          onDragStart={(e) => startSceneDrag(e, vid.id)}
                          onDragOver={(e) => sceneDragOver(e, storyId, idx)}
                          onDrop={sceneDrop}
                          onDragEnd={endSceneDrag}
                          title="Drag into any story to move this scene. Hold Alt (Option) to copy it instead"
                          className={`w-40 p-2 rounded-xl border bg-slate-950 flex flex-col gap-1.5 cursor-grab ${dragSceneId === vid.id ? 'opacity-40 ' : ''}${dropBar(storyId, idx, vid.id)}${
                            menuOpen ? 'border-emerald-400' : 'border-slate-800'
                          }`}
                        >
                          <div className={`relative rounded-lg overflow-hidden bg-slate-900 ${vid.aspectRatio === '16:9' ? 'h-20' : 'h-36'}`}>
                            <video
                              key={`${vid.id}-${vid.trimStart ?? 0}`}
                              src={vid.videoUrl}
                              preload="metadata"
                              muted
                              onLoadedMetadata={(e) => {
                                if (vid.trimStart) e.currentTarget.currentTime = vid.trimStart;
                              }}
                              className="w-full h-full object-cover pointer-events-none"
                            />
                          </div>
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs text-slate-300 leading-snug line-clamp-2" title={vid.prompt}>
                              <strong className="text-white">{idx + 1}</strong> · {vid.prompt}
                            </span>
                            <button
                              type="button"
                              aria-label={`Move or copy Scene ${idx + 1}`}
                              aria-expanded={menuOpen}
                              onClick={() =>
                                setMoveMenu(
                                  menuOpen
                                    ? null
                                    : {
                                        sceneId: vid.id,
                                        storyId: sameShape[0]?.storyId || 'new',
                                        index: sameShape[0]?.scenes.length ?? 0,
                                      }
                                )
                              }
                              className="shrink-0 w-9 h-9 rounded-lg border border-slate-700 text-slate-200 hover:border-emerald-500 font-bold cursor-pointer"
                            >
                              ⋯
                            </button>
                          </div>
                        </div>

                        {menuOpen && moveMenu && (
                          <div role="dialog" aria-label={`Move or copy Scene ${idx + 1}`} className="w-72 p-3.5 rounded-xl bg-slate-900 border border-emerald-500/70 flex flex-col gap-2.5">
                            <strong className="text-sm text-white">Move or copy Scene {idx + 1}</strong>
                            <label htmlFor={`to-story-${vid.id}`} className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">To story</label>
                            <select
                              id={`to-story-${vid.id}`}
                              value={moveMenu.storyId}
                              onChange={(e) => {
                                const sid = e.target.value;
                                const len = sid === 'new' ? 0 : stories.find((st) => st.storyId === sid)?.scenes.length ?? 0;
                                setMoveMenu({ sceneId: vid.id, storyId: sid, index: len });
                              }}
                              className="min-h-[44px] bg-slate-950 border border-slate-600 rounded-lg px-2.5 text-sm text-white"
                            >
                              {stories.map((st) => {
                                const fits = (st.scenes[0]?.aspectRatio || vid.aspectRatio) === vid.aspectRatio;
                                return (
                                  <option key={st.storyId} value={st.storyId} disabled={!fits}>
                                    {storyName(st.scenes)}
                                    {st.storyId === storyId ? ' (this story)' : ''}
                                    {fits ? '' : ` (${st.scenes[0]?.aspectRatio === '16:9' ? 'wide 16:9' : 'tall 9:16'}, can't take it)`}
                                  </option>
                                );
                              })}
                              <option value="new">A new story</option>
                            </select>
                            {moveMenu.storyId !== 'new' && (
                              <>
                                <label htmlFor={`to-place-${vid.id}`} className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Place</label>
                                <select
                                  id={`to-place-${vid.id}`}
                                  value={moveMenu.index}
                                  onChange={(e) => setMoveMenu({ ...moveMenu, index: Number(e.target.value) })}
                                  className="min-h-[44px] bg-slate-950 border border-slate-600 rounded-lg px-2.5 text-sm text-white"
                                >
                                  <option value={0}>First</option>
                                  {targetScenes.map((t, k) =>
                                    k < targetScenes.length - 1 ? (
                                      <option key={t.id} value={k + 1}>
                                        After Scene {k + 1}
                                      </option>
                                    ) : null
                                  )}
                                  {targetScenes.length > 0 && <option value={targetScenes.length}>Last (after Scene {targetScenes.length})</option>}
                                </select>
                              </>
                            )}
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const sid = moveMenu.storyId === 'new' ? `story-${Date.now()}` : moveMenu.storyId;
                                  placeScene(vid.id, sid, moveMenu.index, true);
                                  setMoveMenu(null);
                                }}
                                className="min-h-[44px] rounded-lg border border-slate-600 text-sm font-medium text-slate-200 hover:border-emerald-500 cursor-pointer"
                              >
                                Copy
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const sid = moveMenu.storyId === 'new' ? `story-${Date.now()}` : moveMenu.storyId;
                                  placeScene(vid.id, sid, moveMenu.index, false);
                                  setMoveMenu(null);
                                }}
                                className="min-h-[44px] rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-sm font-bold cursor-pointer"
                              >
                                Move
                              </button>
                            </div>
                            <p className="text-xs text-slate-400">A moved scene keeps its video. The cut where it lands may jump; use Smooth cut there.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </main>
      )}
      <main className={`${view !== 'make' ? 'hidden ' : ''}flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6`}>
        {/* Left column: 1 Who and where, 2 What happens, Generate */}
        <section aria-label="Make a scene" className="lg:col-span-5 flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl self-start">
          <div className="p-4 sm:p-5 flex flex-col gap-5">
            {/* With a story open, the panel makes the story's next scene */}
            {openStoryLastScene && (
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-white">Next scene: Scene {nextSceneNumber}</h2>
                  <button type="button" onClick={handleStartNewStory} className="text-sm text-slate-400 hover:text-emerald-300 cursor-pointer">
                    Start a new story instead
                  </button>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Starts from</span>
                <div className="flex flex-wrap gap-2">
                  <button type="button" aria-pressed={nextStartsFrom === 'end'} onClick={() => setNextStartsFrom('end')} className={`min-h-[36px] px-3.5 rounded-full border text-sm font-medium transition-colors cursor-pointer ${nextStartsFrom === 'end' ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                    End of Scene {nextSceneNumber - 1}
                  </button>
                  <button type="button" aria-pressed={nextStartsFrom === 'picture'} onClick={() => setNextStartsFrom('picture')} className={`min-h-[36px] px-3.5 rounded-full border text-sm font-medium transition-colors cursor-pointer ${nextStartsFrom === 'picture' ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                    A new picture
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  {nextStartsFrom === 'end'
                    ? `Continues the same shot, so the cut from Scene ${nextSceneNumber - 1} is smooth.`
                    : `Starts on the picture below. The cut from Scene ${nextSceneNumber - 1} is a hard cut; you can smooth it afterwards.`}
                </p>
              </div>
            )}

            {/* The story's approved main character */}
            {openStoryLastScene && openStoryCast && (
              <div className="flex gap-3 items-start bg-slate-950 border border-emerald-800/60 rounded-xl p-3">
                <img src={openStoryCast.castImage} alt="Main character" className="w-14 h-16 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">Main character · approved look</span>
                  <span className="text-sm font-medium text-white truncate">{openStoryCast.castName || 'Main character'}</span>
                  <p className="text-xs text-slate-400 line-clamp-2" title={openStoryCast.castDescription}>{openStoryCast.castDescription}</p>
                  <div className="flex gap-3 mt-0.5">
                    <button type="button" onClick={() => currentVideo && openCastModal(currentVideo)} className="text-sm text-emerald-300 hover:text-emerald-200 cursor-pointer">Update</button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Stop sending this character card with the scenes of this story?')) setStoryCast(openStoryLastScene.storyId, null);
                      }}
                      className="text-sm text-slate-400 hover:text-rose-300 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
            {openStoryLastScene && !openStoryCast && (
              <p className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                Tip: pause the video on a good frame and press <strong className="text-slate-200">Save this character</strong> under it. Every later scene of this story is then told to keep that look.
              </p>
            )}

            {/* Step 1: who and where (not needed when the scene continues the last one) */}
            {!continuesLastScene && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center">1</span>
                <h2 className="text-base font-semibold text-white">Who and where</h2>
              </div>
              <div
                className={`flex gap-3.5 items-center bg-slate-950 border rounded-xl p-3 ${pictureDropHover ? 'border-emerald-400 bg-emerald-950/40' : 'border-slate-800'}`}
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes('Files')) return;
                  e.preventDefault();
                  setPictureDropHover(true);
                }}
                onDragLeave={() => setPictureDropHover(false)}
                onDrop={(e) => {
                  const file = e.dataTransfer.files?.[0];
                  setPictureDropHover(false);
                  if (!file) return;
                  e.preventDefault();
                  loadStartPicture(file, 'dropped');
                }}
              >
                <img src={selectedImage} alt="Start picture" className="w-20 h-24 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Start picture</span>
                  <span className="text-sm text-slate-200 truncate">{isDefaultImage ? 'Khalle in a spring meadow' : 'Your own picture'}</span>
                  <span className="text-xs text-slate-400">Or press Cmd+V / Ctrl+V to paste one, or drop a picture here.</span>
                  {pictureNote && <span role="status" className="text-xs text-emerald-300">{pictureNote}</span>}
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/jpeg,image/png,image/webp" className="hidden" />
                  <div className="flex flex-wrap gap-2 mt-0.5">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="min-h-[36px] px-3 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-emerald-500 cursor-pointer flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-slate-400" /> Change picture
                    </button>
                    <button type="button" onClick={handlePasteButton} className="min-h-[36px] px-3 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-emerald-500 cursor-pointer">
                      Paste picture
                    </button>
                    <button type="button" onClick={() => setMakeAlbums('start')} className="min-h-[36px] px-3 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-emerald-500 cursor-pointer">
                      From my albums
                    </button>
                    {!isDefaultImage && (
                      <button type="button" onClick={handleResetToRabbit} className="min-h-[36px] px-3 rounded-lg text-sm text-slate-400 hover:text-emerald-300 cursor-pointer">
                        Use Khalle's picture
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {includeKhalle ? (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-300">Belly symbol: <strong className="text-white">{activeEmblem.type === 'none' ? 'None' : activeEmblem.name}</strong></span>
                  <button type="button" onClick={() => setShowEmblemModal(true)} className="min-h-[36px] px-3 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-emerald-500 cursor-pointer">
                    Change symbol
                  </button>
                </div>
              ) : (
                <p className="text-sm text-amber-200 bg-amber-950/40 border border-amber-700/60 rounded-lg p-2.5">
                  Khalle is left out. Only the characters in the start picture and your text are shown.
                </p>
              )}
            </div>
            )}

            <div className="h-px bg-slate-800" />

            {/* Step 2: what happens */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center">{continuesLastScene ? 1 : 2}</span>
                <h2 className="text-base font-semibold text-white">What happens</h2>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="scene-text" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">What happens in the scene</label>
                  <button
                    type="button"
                    onClick={() => {
                      setDirectorTarget('main');
                      setShowDirectorModal(true);
                    }}
                    className="text-sm font-medium text-emerald-300 hover:text-emerald-200 cursor-pointer"
                  >
                    Help me write it
                  </button>
                </div>
                <textarea
                  id="scene-text"
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    setAutoCompose(false);
                  }}
                  rows={4}
                  placeholder="Example: Khalle wakes up, stretches and hops out of the burrow into the snow."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y"
                />
              </div>

              {/* Reference pictures for this scene: what Gemini cannot see yet (e.g. the wider view) */}
              <div
                data-scene-refs
                tabIndex={0}
                aria-label="Reference pictures for this scene"
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes('Files')) return;
                  e.preventDefault();
                  setRefsDropHover(true);
                }}
                onDragLeave={() => setRefsDropHover(false)}
                onDrop={(e) => {
                  setRefsDropHover(false);
                  const files = [...(e.dataTransfer.files || [])].filter((f) => f.type.startsWith('image/'));
                  if (!files.length) return;
                  e.preventDefault();
                  files.forEach((f) => addSceneRef(f));
                }}
                className={`flex flex-col gap-2.5 rounded-xl p-3 border outline-none focus:border-emerald-500 ${refsDropHover ? 'border-emerald-400 bg-emerald-950/40' : 'border-slate-800 bg-slate-950'}`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-white">Reference pictures for this scene <span className="text-slate-400 font-normal">(optional)</span></span>
                  <span className="text-xs text-slate-400">
                    {continuesLastScene
                      ? 'Paste (Cmd+V / Ctrl+V) or drop a picture of what Gemini cannot see yet, for example the wider view when the camera zooms out.'
                      : 'Click here and paste (Cmd+V / Ctrl+V), or drop a picture, for example the place or the others around.'}
                    {' '}Or pause a scene on a frame and press <strong className="text-slate-300">Use frame as reference</strong> under the video.
                  </span>
                  {refNote && <span role="status" className="text-xs text-sky-300">{refNote}</span>}
                </div>
                {sceneRefs.map((r) => (
                  <div key={r.id} className="flex gap-3 items-start border-t border-slate-800 pt-2.5">
                    <img src={r.image} alt="Reference picture" className="w-14 h-20 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <label className="sr-only" htmlFor={`ref-label-${r.id}`}>What the picture shows</label>
                      <input
                        id={`ref-label-${r.id}`}
                        value={r.label}
                        maxLength={120}
                        onChange={(e) => setSceneRefs((list) => list.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))}
                        placeholder="What it shows, e.g. the ring of rabbits under the tree"
                        className="min-h-[36px] bg-slate-900 border border-slate-700 rounded-lg px-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={r.endHere}
                          onChange={(e) =>
                            setSceneRefs((list) => list.map((x) => ({ ...x, endHere: x.id === r.id ? e.target.checked : false })))
                          }
                          className="accent-emerald-500 w-4 h-4"
                        />
                        End exactly on this picture
                      </label>
                      {r.endHere && (
                        <p className="text-xs text-amber-200">
                          The scene starts {continuesLastScene ? `on the end of Scene ${nextSceneNumber - 1}` : 'on the start picture'} and finishes on this picture (up to 10 s). In this mode Gemini gets only the two pictures and your text; no character card or other references.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSceneRefs((list) => list.filter((x) => x.id !== r.id))}
                      aria-label="Remove this reference picture"
                      className="w-9 h-9 rounded-lg border border-slate-700 text-slate-300 hover:text-rose-300 hover:border-rose-500/60 cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                ))}
                {sceneRefs.length < 3 && (
                  <div className="flex flex-wrap gap-2">
                    <label className="min-h-[36px] px-3 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-emerald-500 cursor-pointer flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-slate-400" /> Add picture
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) addSceneRef(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button type="button" onClick={pasteSceneRefFromClipboard} className="min-h-[36px] px-3 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-emerald-500 cursor-pointer">
                      Paste picture
                    </button>
                    <button type="button" onClick={() => setMakeAlbums('ref')} className="min-h-[36px] px-3 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-emerald-500 cursor-pointer">
                      From my albums
                    </button>
                  </div>
                )}
              </div>

              {/* Talks without words: mouth and gestures as in speech, no voice (for a voice-over later) */}
              <div className="flex flex-col gap-2.5 bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={silentTalk}
                    aria-labelledby="silent-talk-label"
                    onClick={() => {
                      const on = !silentTalk;
                      setSilentTalk(on);
                      if (on && audioMode === 'with_sound') setAudioMode('no_voices');
                    }}
                    className={`relative w-11 h-6 rounded-full shrink-0 cursor-pointer ${silentTalk ? 'bg-emerald-500' : 'bg-slate-600'}`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${silentTalk ? 'translate-x-5' : ''}`} />
                  </button>
                  <span id="silent-talk-label" className="text-sm">
                    <strong className="text-white">Talks without words</strong>{' '}
                    <span className="text-slate-400">(for a voice-over later)</span>
                  </span>
                </div>
                {silentTalk && (
                  <>
                    <p className="text-xs text-slate-400">
                      The character moves the mouth as if speaking, with gestures and expressions. No words or other voices are made.
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sound</span>
                      <div className="flex flex-wrap gap-2">
                        {([
                          ['with_sound', 'On'],
                          ['no_voices', 'Background only, no voices'],
                          ['silent', 'Off'],
                        ] as const).map(([id, text]) => (
                          <button key={id} type="button" aria-pressed={audioMode === id} onClick={() => setAudioMode(id)} className={`min-h-[36px] px-3.5 rounded-full border text-sm font-medium transition-colors cursor-pointer ${audioMode === id ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                            {text}
                          </button>
                        ))}
                      </div>
                      {audioMode === 'with_sound' && (
                        <p className="text-xs text-amber-200">With talking, "On" still gives no voices: only background sound.</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Season <span className="normal-case tracking-normal font-normal text-slate-500">· optional, tap again to clear{!selectedSeason && !selectedWeather ? ' · none sent' : ''}</span></span>
                <div className="flex flex-wrap gap-2">
                  {SEASONS.map((s) => (
                    <button key={s.id} type="button" aria-pressed={selectedSeason === s.id} onClick={() => handleSeasonChange(selectedSeason === s.id ? '' : s.id)} className={`min-h-[36px] px-3.5 rounded-full border text-sm font-medium transition-colors cursor-pointer ${selectedSeason === s.id ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Weather</span>
                <div className="flex flex-wrap gap-2">
                  {WEATHER_OPTIONS.map((w) => (
                    <button key={w.id} type="button" aria-pressed={selectedWeather === w.id} onClick={() => handleWeatherChange(selectedWeather === w.id ? '' : w.id)} className={`min-h-[36px] px-3.5 rounded-full border text-sm font-medium transition-colors cursor-pointer ${selectedWeather === w.id ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                      {({ sunny: 'Sunny', snowing: 'Snow', rain: 'Rain', sunset: 'Sunset', misty: 'Mist', rainbow: 'Rainbow' } as Record<string, string>)[w.id] || w.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Length</span>
                <div className="flex flex-wrap gap-2">
                  {(['5s', '10s', '15s'] as const).map((d) => (
                    <button key={d} type="button" aria-pressed={duration === d} disabled={continuesLastScene && d === '15s'} onClick={() => setDuration(d)} className={`min-h-[36px] px-3.5 rounded-full border text-sm font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${duration === d ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                      {parseInt(d, 10)} s
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400">
                  {continuesLastScene ? 'Up to 10 s when the scene continues the one before.' : 'Longer story? Add more scenes after this one.'}
                </p>
              </div>

              {/* More options: everything a scene does not always need */}
              <button
                type="button"
                aria-expanded={showMoreOptions}
                onClick={() => setShowMoreOptions((v) => !v)}
                className={`w-full min-h-[48px] px-3.5 rounded-xl border flex items-center justify-between text-sm font-medium cursor-pointer ${showMoreOptions ? 'bg-slate-950 border-emerald-500/70 text-white' : 'bg-slate-950 border-slate-700 text-slate-200 hover:border-slate-500'}`}
              >
                <span>
                  More options <span className="text-slate-400 font-normal">· camera, ideas, clothes, format, sound</span>
                </span>
                <span aria-hidden="true" className="text-slate-400">{showMoreOptions ? '▴' : '▾'}</span>
              </button>

              {showMoreOptions && (
                <div className="flex flex-col gap-5 bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Camera</span>
                    <CinematographyToolbar
                      currentPrompt={prompt}
                      onUpdatePrompt={(newP) => {
                        setPrompt(newP);
                        setAutoCompose(false);
                      }}
                      onOpenDirectorModal={() => {
                        setDirectorTarget('main');
                        setShowDirectorModal(true);
                      }}
                      onOpenGlossary={() => setShowGlossaryModal(true)}
                      season={selectedSeason}
                      weather={selectedWeather}
                      isExtension={continuesLastScene}
                      previousPrompt={currentVideo?.prompt}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Start from an idea</span>
                    <p className="text-xs text-slate-400">Replaces your text with a ready-made scene you can edit.</p>
            <div className="grid grid-cols-2 gap-2">
              {JUMP_PRESETS.map((p) => {
                const isActive = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xl">{p.icon}</span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {p.recommendedAspect}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">{p.label}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{p.tagline}</div>
                    </div>
                  </button>
                );
              })}
            </div>
                    <button type="button" onClick={() => setShowScriptModal(true)} className="self-start min-h-[36px] px-3 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-emerald-500 cursor-pointer flex items-center gap-1.5">
                      <ScrollText className="w-3.5 h-3.5 text-amber-400" /> Write a whole story from a script
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Clothes, things and friends</span>
              <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shirt className="w-3.5 h-3.5 text-purple-400" />
                    <span>Cast, Props & Wardrobe:</span>
                    {activeStylistItems.length > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 border border-purple-700/50">
                        {activeStylistItems.length} active
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {activeStylistItems.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllStylistItems}
                        className="text-[10px] text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowStylistModal(true)}
                      className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>Studio & Upload</span>
                    </button>
                  </div>
                </div>

                {/* Active items badges */}
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {activeStylistItems.map((item) => {
                    const badgeStyles =
                      item.category === 'character'
                        ? 'bg-sky-950/70 border-sky-500/50 text-sky-200'
                        : item.category === 'prop'
                        ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                        : 'bg-purple-950/70 border-purple-500/50 text-purple-200';
                    return (
                      <div
                        key={item.id}
                        className={`px-2 py-1 rounded-lg border text-xs flex items-center gap-1.5 shadow-sm ${badgeStyles}`}
                      >
                        <span>{item.icon}</span>
                        <span className="font-semibold text-[11px]">{item.title}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStylistItem(item.id)}
                          className="hover:text-white p-0.5 ml-0.5 transition-colors cursor-pointer"
                          title={`Remove ${item.title}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}

                  {activeStylistItems.length === 0 && (
                    <span className="text-[11px] text-slate-500 italic py-0.5">
                      Standard bunny outfit active. Click presets below or open Studio to add clothing, props & companion characters!
                    </span>
                  )}
                </div>

                {/* Quick Toggle Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 shrink-0">
                    Quick Add:
                  </span>
                  {[
                    PRESET_CLOTHING[0],
                    PRESET_CLOTHING[1],
                    PRESET_CLOTHING[2],
                    PRESET_PROPS[0],
                    PRESET_PROPS[1],
                    PRESET_CHARACTERS[0],
                    PRESET_CHARACTERS[1],
                  ].map((preset) => {
                    const isSelected = activeStylistItems.some((i) => i.id === preset.id);
                    const tagClass =
                      preset.category === 'character'
                        ? isSelected
                          ? 'bg-sky-600 text-white border-sky-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-sky-500/50 hover:text-sky-200'
                        : preset.category === 'prop'
                        ? isSelected
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-200'
                        : isSelected
                        ? 'bg-purple-600 text-white border-purple-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-purple-500/50 hover:text-purple-200';
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleToggleStylistItem(preset)}
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer ${tagClass}`}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.title}</span>
                        {isSelected && <span className="text-[9px]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Format</span>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" aria-pressed={aspectRatio === '9:16'} onClick={() => setAspectRatio('9:16')} className={`min-h-[36px] px-3.5 rounded-full border text-sm font-medium transition-colors cursor-pointer ${aspectRatio === '9:16' ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`}>Tall 9:16</button>
                        <button type="button" aria-pressed={aspectRatio === '16:9'} onClick={() => setAspectRatio('16:9')} className={`min-h-[36px] px-3.5 rounded-full border text-sm font-medium transition-colors cursor-pointer ${aspectRatio === '16:9' ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`}>Wide 16:9</button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sound</span>
                      <div className="flex flex-wrap gap-2">
                        {([
                          ['with_sound', 'On'],
                          ['no_voices', 'Background only, no voices'],
                          ['silent', 'Off'],
                        ] as const).map(([id, text]) => (
                          <button key={id} type="button" aria-pressed={audioMode === id} onClick={() => setAudioMode(id)} className={`min-h-[36px] px-3.5 rounded-full border text-sm font-medium transition-colors cursor-pointer ${audioMode === id ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                            {text}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Quality</span>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" aria-pressed={resolution === '720p'} onClick={() => setResolution('720p')} className={`min-h-[36px] px-3.5 rounded-full border text-sm font-medium transition-colors cursor-pointer ${resolution === '720p' ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`}>720p · $0.07 per second</button>
                      <button type="button" aria-pressed={resolution === '1080p'} onClick={() => setResolution('1080p')} className={`min-h-[36px] px-3.5 rounded-full border text-sm font-medium transition-colors cursor-pointer ${resolution === '1080p' ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`}>1080p · $0.12 per second</button>
                    </div>
                    <button type="button" onClick={() => setShowPricingModal(true)} className="self-start text-xs text-slate-400 hover:text-emerald-300 cursor-pointer">About the cost</button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">How Khalle looks</span>
                    <p className="text-xs text-slate-400">Pictures of Khalle sent with every scene so he keeps his look. Click a picture to stop sending it.</p>
              <div className="grid grid-cols-3 gap-2">
                {referenceAssets
                  .filter((a) => a.category === 'character')
                  .map((angle) => (
                    <div
                      key={angle.id}
                      onClick={() => handleToggleReferenceAsset(angle.id)}
                      className={`relative rounded-xl border p-1.5 flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        angle.enabled
                          ? 'bg-slate-950 border-emerald-500/60 shadow-sm ring-1 ring-emerald-500/20'
                          : 'bg-slate-950/40 border-slate-800 opacity-50'
                      }`}
                      title={angle.tagline}
                    >
                      <div className="w-full h-16 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center relative">
                        <img
                          src={angle.imagePath || angle.imageBase64}
                          alt={angle.label}
                          className="w-full h-full object-cover"
                        />
                        <div
                          className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            angle.enabled
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {angle.enabled ? '✓' : '×'}
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-slate-200 text-center leading-tight truncate w-full">
                        {angle.label}
                      </span>
                    </div>
                  ))}
              </div>
              <div className={`p-2.5 rounded-xl border flex flex-col gap-2.5 transition-all ${
                isMorphingEnabled || activeEmblem.id === 'emblem-morph'
                  ? 'bg-cyan-950/40 border-cyan-500/40'
                  : 'bg-slate-950/90 border-emerald-500/30'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  {isMorphingEnabled || activeEmblem.id === 'emblem-morph' ? (
                    /* Dual Preview for Transformation Mode */
                    <div className="flex items-center gap-1.5 shrink-0 bg-slate-900 border border-cyan-500/40 p-1 rounded-lg shadow-inner">
                      <div
                        className="w-9 h-9 rounded bg-slate-950 overflow-hidden flex items-center justify-center border border-cyan-500/30 p-0.5"
                        title="Start Symbol: image_07de772c.png"
                      >
                        <img
                          src={activeEmblem.startImageUrl || activeEmblem.startImagePath || '/assets/aistudio/image_07de772c.png'}
                          alt="Start Symbol"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-cyan-400 font-bold text-xs">➔</span>
                      <div
                        className="w-9 h-9 rounded bg-slate-950 overflow-hidden flex items-center justify-center border border-cyan-500/30 p-0.5"
                        title="End Symbol: image_07c026d1.png"
                      >
                        <img
                          src={activeEmblem.endImageUrl || activeEmblem.endImagePath || '/assets/aistudio/image_07c026d1.png'}
                          alt="End Symbol"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Single Preview for Static Emblems */
                    <div className="w-10 h-10 rounded-lg bg-slate-900 border border-emerald-500/40 p-0.5 flex items-center justify-center shrink-0 overflow-hidden relative group">
                      <img
                        src={activeEmblem.imageUrl || activeEmblem.imageBase64 || activeEmblem.imagePath || '/assets/aistudio/image_07de772c.png'}
                        alt={activeEmblem.name}
                        className="w-full h-full object-contain rounded"
                      />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-white truncate">
                        {activeEmblem.name}
                      </span>
                      {isMorphingEnabled || activeEmblem.id === 'emblem-morph' ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-600/50 font-bold animate-pulse">
                          METAMORPHOSIS ACTIVE
                        </span>
                      ) : activeEmblem.type === 'none' ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-pink-950 text-pink-200 border border-pink-600/50 font-semibold">
                          PLAIN BELLY
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/50 font-semibold flex items-center gap-1">
                          <span>🔒</span>
                          <span>STATIC (MORPHING OFF)</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {isMorphingEnabled || activeEmblem.id === 'emblem-morph'
                        ? 'Metamorphosis is ON: Symbol glows & unwinds during video. Click "Turn OFF Morphing" so your prompts run without symbol overrides.'
                        : activeEmblem.type === 'none'
                        ? 'No symbol on the belly • only plain-belly pictures are sent to Gemini'
                        : activeEmblem.id === 'emblem-vegvisir'
                        ? 'Static 8-Stave Blueprint locked (image_07c026d1.png) • No morphing • Prompts have 100% priority'
                        : activeEmblem.id === 'emblem-original-medallion' || activeEmblem.id === 'emblem-original-s'
                        ? 'Static Original Toy Medallion locked (image_07de772c.png) • No morphing • Prompts have 100% priority'
                        : activeEmblem.imageUrl
                        ? `Static Web URL Symbol: ${activeEmblem.filename || activeEmblem.imageUrl} • No morphing`
                        : 'Static Custom Symbol locked • No morphing'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {isMorphingEnabled || activeEmblem.id === 'emblem-morph' ? (
                    <button
                      type="button"
                      onClick={handleToggleMorphingOff}
                      className="px-2.5 py-1.5 bg-amber-950/90 hover:bg-amber-900 text-amber-200 border border-amber-500/60 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                      title="Turn OFF symbol morphing so it does not overrun your prompts"
                    >
                      <X className="w-3.5 h-3.5 text-amber-400" />
                      <span>Turn OFF Morphing</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleToggleMorphingOn}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-cyan-950 text-slate-300 hover:text-cyan-200 border border-slate-700/60 hover:border-cyan-500/50 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Enable symbol metamorphosis (image_07de772c.png to image_07c026d1.png)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Enable Morphing</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowEmblemModal(true)}
                    className="px-2.5 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-200 border border-cyan-600/50 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Change Symbol</span>
                  </button>
                  {activeEmblem.type === 'none' ? (
                    <button
                      type="button"
                      onClick={handleToggleMorphingOff}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-emerald-950 text-slate-300 hover:text-emerald-200 border border-slate-700/60 hover:border-emerald-500/50 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1 cursor-pointer"
                      title="Put the original spiral symbol back on the belly"
                    >
                      <span>Add symbol</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectEmblem(NO_SYMBOL_EMBLEM)}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-pink-950 text-slate-300 hover:text-pink-200 border border-slate-700/60 hover:border-pink-500/50 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1 cursor-pointer"
                      title="Plain pink belly: no symbol, and no symbol pictures sent to Gemini"
                    >
                      <X className="w-3.5 h-3.5 text-pink-400" />
                      <span>No symbol</span>
                    </button>
                  )}
                </div>
              </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Logo on the video</span>
                    <button type="button" onClick={() => setShowWatermarkModal(true)} className="self-start min-h-[36px] px-3 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-emerald-500 cursor-pointer flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-emerald-400" /> Logo: {watermarkConfig.enabled ? 'On' : 'Off'} · Change
                    </button>
                  </div>
                </div>
              )}

            {/* 429 Spending Cap & Model Rate Limit Alert Banner */}
            {isSpendingCapHit && (
              <div className="p-3.5 bg-amber-950/50 border border-amber-500/70 rounded-xl text-amber-200 text-xs flex flex-col gap-3 shadow-lg shadow-amber-950/30 relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
                        Google Cloud Daily Spend Cap / Quota Notice (HTTP 402 / 429)
                      </p>
                      <p className="text-amber-200/90 leading-relaxed text-[11px]">
                        Google Cloud enforces <strong>daily spending limits ($)</strong> and request quotas. The <strong>HTTP 402 (Payment Required)</strong> status indicates that your API project has reached its daily spending limit. Quotas typically reset at <strong>midnight Pacific Time (00:00 PST / 08:00 UTC)</strong>, or you can raise your daily budget in Google Cloud Console / AI Studio settings.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSpendingCapHit(false);
                      setErrorMessage(null);
                    }}
                    className="p-1 rounded text-amber-400/80 hover:text-amber-200 hover:bg-amber-900/40 transition-colors cursor-pointer shrink-0"
                    title="Dismiss notice"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Exact Google API error message */}
                {errorMessage && (
                  <div className="p-2.5 rounded-lg bg-black/75 border border-amber-500/40 text-[11px] text-amber-200 font-mono leading-relaxed">
                    <span className="text-amber-400 font-bold block mb-1">Google API Details:</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Quota Check Feedback */}
                {quotaCheckMsg && (
                  <div
                    className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                      quotaCheckStatus === 'active'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                        : quotaCheckStatus === 'checking'
                        ? 'bg-slate-900 text-slate-300'
                        : 'bg-amber-900/40 text-amber-200 border border-amber-500/30'
                    }`}
                  >
                    {quotaCheckStatus === 'checking' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                    ) : quotaCheckStatus === 'active' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className="text-[11px] leading-tight">{quotaCheckMsg}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSpendingCapHit(false);
                      handleGenerateVideo();
                    }}
                    disabled={isGenerating}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>Retry Video Generation Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCheckQuota}
                    disabled={quotaCheckStatus === 'checking'}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 text-amber-400 ${quotaCheckStatus === 'checking' ? 'animate-spin' : ''}`} />
                    <span>Check Quota Status</span>
                  </button>

                  <div className="flex items-center gap-2 ml-auto">
                    <a
                      href="https://ai.dev/rate-limit"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/40 text-amber-300 hover:text-amber-100 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors"
                      title="View tier rate limits or upgrade your tier"
                    >
                      <span>Tier Limits (20/day)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <a
                      href="https://ai.studio/spend"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 text-slate-400 hover:text-amber-200 text-[11px] flex items-center gap-1 transition-colors"
                      title="Manage monthly dollar spend cap"
                    >
                      <span>Spend Cap ($)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* AI Cinematographer Prompt Polish Helper */}
            {(isInputBlocked || errorMessage?.includes('Input blocked') || errorMessage?.includes('could not be processed')) && !isSpendingCapHit && (
              <div className="p-4 bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl shadow-xl text-slate-200 text-xs flex flex-col gap-3 animate-fadeIn">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      <Wand2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-200 text-xs sm:text-sm flex items-center gap-1.5">
                        <span>AI Video Prompt Polish</span>
                      </h4>
                      <span className="text-[10px] text-emerald-400/80 font-mono">
                        Optimized for Gemini Omni Flash Video Conditioning
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsInputBlocked(false);
                      setErrorMessage(null);
                    }}
                    className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 text-slate-300 text-[11px] leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <p>
                    Google's automated video safety filters can occasionally flag symbolic, ritual, or abstract phrasing. Video diffusion models achieve the highest visual fidelity when guided directly by the <strong>attached reference image</strong> alongside concrete optical, lighting, and camera motion instructions.
                  </p>
                </div>

                {/* One-Click AI Rephrase & Regenerate */}
                <div className="flex flex-col gap-2 pt-1">
                  {blockedPromptSuggestion && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-400">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Polished Visual Prompt (Ready to Generate):
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-100 italic line-clamp-3">
                        "{blockedPromptSuggestion}"
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleApplySafeRephraseAndRetry()}
                    disabled={isRephrasingPrompt || isGenerating}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-500 via-teal-400 to-lime-400 hover:from-emerald-400 hover:to-lime-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isRephrasingPrompt ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Polishing & Generating Video...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        <span>✨ Apply Polished Prompt & Generate Video</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* General Error banner if not 429 and not input blocked */}
            {errorMessage && !isSpendingCapHit && !isInputBlocked && !errorMessage.includes('Input blocked') && !errorMessage.includes('could not be processed') && (
              <div className="p-3.5 bg-red-950/70 border border-red-800/90 rounded-xl text-red-200 text-xs flex flex-col gap-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="font-semibold text-red-300">Animation Request Note</p>
                    <p className="text-red-200/90 leading-relaxed font-mono text-[11px] break-words">{errorMessage}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-red-800/50">
                  <button
                    type="button"
                    onClick={handleCopyGenerationLogDirect}
                    className="px-2.5 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Copy generation diagnostic log to clipboard"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Copy Error Diagnostic Log</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchLatestLog(true)}
                    className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Log</span>
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* The one Generate button, always at the bottom of the panel */}
          <div className="sticky bottom-0 mt-auto p-4 sm:p-5 border-t border-slate-800 bg-slate-900 rounded-b-2xl flex flex-col gap-2">
            <button
              type="button"
              onClick={handleTriggerGenerate}
              disabled={isGenerating || isExtending || !prompt.trim()}
              className="w-full min-h-[52px] rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isGenerating || isExtending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Making the scene… {progressPercent}%</span>
                </>
              ) : (
                (() => {
                  const secs = continuesLastScene ? Math.min(10, parseInt(duration, 10) || 5) : parseInt(duration, 10) || 5;
                  if (!prompt.trim()) return <span>Write what happens first</span>;
                  return (
                    <span>
                      Generate {openStoryLastScene ? `Scene ${nextSceneNumber}` : 'scene'} · {secs} s · ${(secs * estimatedCost.ratePerSec).toFixed(2)}
                    </span>
                  );
                })()
              )}
            </button>
            <p className="text-xs text-slate-400 text-center">Takes about 1 minute.</p>
          </div>
        </section>

        {/* Right Column: Video Player, Comparison & Live Preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Main Stage Display Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-emerald-400" /> Preview
                </span>
                {currentVideo && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Now playing · Scene {currentVideo.sceneNumber || 1} of {currentStoryScenes.length}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowWatermarkModal(true)}
                  className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-[11px] text-slate-300 hover:text-emerald-300 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Configure video logo watermark (Gear icon)"
                >
                  <Settings className="w-3 h-3 text-emerald-400" />
                  <span>Logo:</span>
                  <span className={`font-mono font-bold ${watermarkConfig.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {watermarkConfig.enabled ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              {/* View mode toggle */}
              {currentVideo && (
                <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setCompareMode('video')}
                    className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                      compareMode === 'video' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Video
                  </button>
                  <button
                    onClick={() => setCompareMode('split')}
                    className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                      compareMode === 'split' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Compare
                  </button>
                  <button
                    onClick={() => setCompareMode('photo')}
                    className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                      compareMode === 'photo' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Original
                  </button>
                </div>
              )}
            </div>

            {/* Video Canvas / Display Area */}
            <div className="relative w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[420px] max-h-[580px]">
              {/* Generating overlay state */}
              {isGenerating || isExtending ? (
                (() => {
                  const secs = Math.max(0, Math.round((genNow - genStartedAt) / 1000));
                  const steps = [
                    { label: 'Getting the picture and text ready', state: genPhase === 'preparing' ? 'active' : 'done' },
                    { label: 'Gemini is making the video', state: genPhase === 'making' ? 'active' : 'pending' },
                    { label: 'It plays here and joins the story', state: 'pending' },
                  ] as const;
                  return (
                    <div className="p-6 flex flex-col items-center justify-center text-center max-w-md w-full gap-5 z-20" role="status" aria-live="polite">
                      <h3 className="font-bold text-xl text-slate-100">Making Scene {makingSceneNo}</h3>
                      <p className="text-sm text-slate-300">
                        Usually about 1 minute · {secs} s so far
                      </p>
                      <div
                        className="w-full max-w-sm bg-slate-800 h-2 rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progressPercent}
                        aria-label="Progress"
                      >
                        <div className="bg-emerald-400 h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.max(4, progressPercent)}%` }} />
                      </div>
                      <ol className="w-full max-w-sm flex flex-col gap-3 text-left text-sm">
                        {steps.map((st) => (
                          <li key={st.label} className={`flex items-center gap-2.5 ${st.state === 'pending' ? 'text-slate-500' : 'text-slate-100'}`}>
                            {st.state === 'done' ? (
                              <span className="w-6 h-6 rounded-full bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center shrink-0">✓</span>
                            ) : st.state === 'active' ? (
                              <span className="w-6 h-6 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" aria-hidden="true" />
                            ) : (
                              <span className="w-6 h-6 rounded-full border-2 border-slate-700 shrink-0" aria-hidden="true" />
                            )}
                            <span className={st.state === 'active' ? 'font-semibold' : ''}>{st.label}</span>
                          </li>
                        ))}
                      </ol>
                      <p className="text-xs text-slate-400">Keep this page open until it is done.</p>
                    </div>
                  );
                })()
              ) : currentVideo ? (
                /* Display Video or Comparison View */
                <div className="w-full h-full flex items-center justify-center relative">
                  {compareMode === 'video' && (
                    <div className="relative max-h-[540px] max-w-full flex items-center justify-center">
                      {([0, 1] as const).map((slot) => {
                        const isActive = slot === activeSlot;
                        return (
                          <video
                            key={slot}
                            ref={slotRefCallbacks[slot]}
                            src={isActive ? currentVideo.videoUrl : preloadScene?.videoUrl}
                            autoPlay={isActive}
                            preload="auto"
                            loop={isActive && isLooping && !playAllContinuous && playEnd === undefined}
                            playsInline
                            aria-hidden={!isActive}
                            className={
                              isActive
                                ? 'max-h-[540px] max-w-full object-contain rounded-lg shadow-2xl'
                                : 'absolute inset-0 w-full h-full object-contain rounded-lg opacity-0 pointer-events-none'
                            }
                            onPlay={(e) => e.currentTarget === videoRef.current && setIsPlaying(true)}
                            onPause={(e) => e.currentTarget === videoRef.current && setIsPlaying(false)}
                            onEnded={(e) => e.currentTarget === videoRef.current && advanceAfterScene(e.currentTarget, false)}
                          />
                        );
                      })}
                      <VideoWatermarkOverlay config={watermarkConfig} />
                    </div>
                  )}

                  {compareMode === 'photo' && (
                    <img
                      src={currentVideo.sourceImage}
                      alt="Original Still Photo"
                      className="max-h-[540px] max-w-full object-contain rounded-lg"
                    />
                  )}

                  {compareMode === 'split' && (
                    <div className="grid grid-cols-2 gap-2 p-2 w-full h-full items-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] text-slate-400 font-medium mb-1">Original Photo</span>
                        <img
                          src={currentVideo.sourceImage}
                          alt="Before"
                          className="max-h-[460px] object-contain rounded-lg border border-slate-800"
                        />
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] text-emerald-400 font-medium mb-1">
                          Scene {currentVideo.sceneNumber || 1} ({currentVideo.season || 'Video'})
                        </span>
                        <div className="relative max-h-[460px] flex items-center justify-center">
                          <video
                            ref={splitVideoRef}
                            src={currentVideo.videoUrl}
                            autoPlay
                            loop={isLooping && !playAllContinuous && playEnd === undefined}
                            playsInline
                            className="max-h-[460px] object-contain rounded-lg border border-emerald-500/40"
                            onEnded={() => advanceAfterScene(splitVideoRef.current, false)}
                          />
                          <VideoWatermarkOverlay config={watermarkConfig} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top-right overlay specs badge */}
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5">
                    <span className="font-mono text-emerald-400">{currentVideo.aspectRatio}</span>
                    <span>•</span>
                    <span>{currentVideo.duration}</span>
                  </div>
                </div>
              ) : (
                /* Initial Empty/Ready State: Showcase Rabbit with Jump Physics Demo */
                <div className="flex flex-col items-center justify-center text-center p-8 max-w-md w-full gap-4">
                  <div className="relative group">
                    <motion.div
                      animate={
                        isPhysicsJumping
                          ? {
                              y: [-15, -80, 0],
                              rotate: [0, -8, 8, 0],
                              scale: [1, 1.1, 0.95, 1],
                            }
                          : { y: 0, rotate: 0, scale: 1 }
                      }
                      transition={{ duration: 0.55, ease: 'easeInOut' }}
                      className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl shadow-emerald-500/20 bg-slate-900"
                    >
                      <img
                        src={selectedImage}
                        alt="Rabbit Preview"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </motion.div>

                    {/* Season / Weather Particles */}
                    <AnimatePresence>
                      {particles.map((p) => (
                        <motion.span
                          key={p.id}
                          initial={{ opacity: 1, x: 0, y: 0, scale: 0.8 }}
                          animate={{ opacity: 0, x: p.x, y: p.y, scale: 1.4 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.9, ease: 'easeOut' }}
                          className="absolute text-2xl pointer-events-none select-none z-30"
                        >
                          {p.char}
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-slate-100">No scene yet</h3>
                    <p className="text-sm text-slate-400 max-w-sm mx-auto">
                      Pick a start picture, describe what happens, then press Generate scene. The new scene plays here.
                    </p>
                  </div>

                </div>
              )}
            </div>

            {/* Scene edit bar: trim / split the selected scene (edit list, no re-encode) */}
            {currentVideo && compareMode === 'video' && (
              <SceneEditBar
                videoRef={videoRef}
                src={currentVideo.videoUrl}
                trimStart={currentVideo.trimStart}
                trimEnd={currentVideo.trimEnd}
                onTrim={(start, end) => handleTrimScene(currentVideo, start, end)}
                onSplit={(at) => handleSplitScene(currentVideo, at)}
              />
            )}

            {/* Video Controls Bar (Active when video exists) */}
            {currentVideo && (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                  <button
                    onClick={restartVideo}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
                    title="Restart"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsLooping(!isLooping)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                      isLooping
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {isLooping ? 'Loop: On' : 'Loop: Off'}
                  </button>
                </div>

                {/* Speed selector */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  {[0.5, 1, 1.5, 2].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => handleSpeedChange(spd)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                        playbackSpeed === spd ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                {/* Watermark Controls */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setWatermarkConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      watermarkConfig.enabled
                        ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Toggle logo watermark on video"
                  >
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Logo: {watermarkConfig.enabled ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWatermarkModal(true)}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Configure logo watermark (upload custom logo, position, opacity, scale)"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Correct Scene Button */}
                <button
                  type="button"
                  onClick={() => openCorrectionModal(currentVideo)}
                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  title="If this scene didn't turn out right, re-take or refine it"
                >
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  <span>Change this scene</span>
                </button>
                <button
                  type="button"
                  onClick={() => openCastModal(currentVideo)}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  title="Pause on a good frame, then save how the main character looks, so later scenes keep that look"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{openStoryCast ? 'Update the character' : 'Save this character'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => addFrameAsSceneRef(currentVideo)}
                  className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 border border-sky-500/40 font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  title="Pause on a frame, then use it as a reference picture for the next scene (for example the wider view)"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-sky-300" />
                  <span>Use frame as reference</span>
                </button>

                {/* Generation Diagnostic & Reference Log Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopyGenerationLogDirect}
                    className="px-3 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    title="Copy exact reference images, prompt directives, and API payload to clipboard"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Copy Generation Log</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchLatestLog(true)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-300 border border-slate-800 transition-colors cursor-pointer"
                    title="Inspect reference images and prompt manifest sent to Gemini Omni Flash"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Download Group */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isBurningWatermark}
                    onClick={() =>
                      downloadWatermarkedVideo(
                        currentVideo.videoUrl,
                        `rabbit-jump-${currentVideo.season || 'take'}-${currentVideo.aspectRatio}${watermarkConfig.enabled ? '-branded' : ''}.mp4`
                      )
                    }
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    title="Download video with your custom logo or watermark burned in"
                  >
                    {isBurningWatermark ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Baking Logo ({burnProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Download {watermarkConfig.enabled ? 'Watermarked' : 'MP4'}</span>
                      </>
                    )}
                  </button>

                  {watermarkConfig.enabled && (
                    <button
                      type="button"
                      onClick={() =>
                        downloadVideo(
                          currentVideo.videoUrl,
                          `rabbit-jump-${currentVideo.season || 'take'}-${currentVideo.aspectRatio}-clean.mp4`
                        )
                      }
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium rounded-lg transition-colors cursor-pointer"
                      title="Download clean original video without watermark"
                    >
                      Clean MP4
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Storyboard & Multi-Scene Sequence Card */}
          {currentVideo && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Story</span>
                  <span className="text-sm text-slate-200 mt-0.5">
                    {currentStoryScenes.length} {currentStoryScenes.length === 1 ? 'scene' : 'scenes'} · {Math.round(totalStorySeconds)} s
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={playAllContinuous}
                    onClick={() => setPlayAllContinuous(!playAllContinuous)}
                    className={`min-h-[40px] px-3 rounded-lg border text-sm font-medium flex items-center gap-1.5 cursor-pointer ${
                      playAllContinuous ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'border-slate-700 text-slate-200 hover:border-emerald-500'
                    }`}
                    title="On: the scenes play one after another as one film. Off: the open scene loops"
                  >
                    <ListVideo className="w-4 h-4" />
                    <span>{playAllContinuous ? 'Play whole story: On' : 'Play whole story: Off'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportStory}
                    disabled={!!storyExport}
                    className="min-h-[40px] px-3 rounded-lg border border-slate-700 text-sm font-medium text-slate-200 hover:border-emerald-500 flex items-center gap-1.5 cursor-pointer disabled:cursor-wait disabled:opacity-80"
                    title="Download all scenes of this story as one MP4, each cut to its start and end"
                  >
                    {storyExport ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span aria-live="polite">
                      {storyExport ? `${storyExport.step} ${Math.round(storyExport.fraction * 100)}%` : 'Export story as one video'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStartNewStory}
                    className="min-h-[40px] px-3 rounded-lg border border-slate-700 text-sm font-medium text-slate-200 hover:border-emerald-500 flex items-center gap-1.5 cursor-pointer"
                    title="Close this story; the next Generate starts a new one"
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-400" />
                    <span>New story</span>
                  </button>
                </div>
              </div>

              {/* Active Script Storyboard Roadmap Ribbon */}
              {activeStoryboardPlan && (
                <div className="p-3 bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-950 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ScrollText className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-amber-200">
                        Roadmap: {activeStoryboardPlan.storyTitle}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({activeStoryboardPlan.scenes.length} Scenes Planned)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowScriptModal(true)}
                        className="text-[11px] text-amber-300 hover:text-amber-200 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>View / Edit Story</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveStoryboardPlan(null)}
                        className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>

                  {/* Planned Scenes Sequence Ribbon */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {activeStoryboardPlan.scenes.map((scene, idx) => {
                      const isGenerated = currentStoryScenes.some(
                        (s) => s.sceneNumber === scene.sceneNumber || idx < currentStoryScenes.length
                      );
                      const isCurrent = currentStoryScenes.length === idx;
                      return (
                        <div
                          key={scene.sceneNumber || idx}
                          onClick={() => handleApplyScriptScene(scene)}
                          className={`shrink-0 p-2 rounded-lg border text-left cursor-pointer transition-all flex flex-col gap-1 w-44 ${
                            isGenerated
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                              : isCurrent
                              ? 'bg-amber-950/50 border-amber-500 text-amber-100 ring-1 ring-amber-500/50 shadow-md shadow-amber-500/10'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              {isGenerated ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <span className="w-3.5 h-3.5 rounded-full bg-amber-500/30 text-amber-300 text-[9px] flex items-center justify-center font-mono font-bold">
                                  {scene.sceneNumber || idx + 1}
                                </span>
                              )}
                              <span>Scene {scene.sceneNumber || idx + 1}</span>
                            </span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-900 text-slate-400 capitalize">
                              {scene.season}
                            </span>
                          </div>
                          <p className="text-[10px] line-clamp-1 font-semibold text-slate-200">
                            {scene.title}
                          </p>
                          <p className="text-[9px] line-clamp-1 text-slate-400">
                            {scene.storyBeat}
                          </p>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[9px]">
                            <span className="text-amber-400/90 font-medium truncate max-w-[90px]">
                              {scene.cameraPerspective}
                            </span>
                            <span className="text-emerald-400 font-bold hover:underline">
                              Load ➔
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* After a correction: the next scene was made to follow the old take */}
              {(() => {
                if (!joinOffer) return null;
                const fixed = currentStoryScenes.find((v) => v.id === joinOffer.sceneId);
                const next = currentStoryScenes.find((v) => v.id === joinOffer.nextId);
                if (!fixed || !next) return null;
                return (
                  <div role="status" className="mb-2 p-2.5 rounded-xl border border-amber-500/40 bg-amber-950/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-amber-100">
                      Scene {next.sceneNumber} was made to follow the old Scene {fixed.sceneNumber}, so the cut between them may jump.
                    </span>
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTransitionError(null);
                          setTransitionPair({ from: fixed, to: next });
                        }}
                        disabled={isMakingTransition}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer disabled:opacity-50"
                      >
                        Make a smooth transition
                      </button>
                      <button
                        type="button"
                        onClick={() => setJoinOffer(null)}
                        className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </span>
                  </div>
                );
              })()}

              {/* Timeline Strip */}
              <div
                className="flex items-stretch gap-2 overflow-x-auto pb-1 scrollbar-thin"
                onDragOver={(e) => sceneDragOver(e, currentVideo.storyId, 'end')}
                onDrop={sceneDrop}
              >
                {currentStoryScenes.map((scene, idx) => {
                  const isSelected = currentVideo.id === scene.id;
                  return (
                    <React.Fragment key={scene.id}>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setTransitionError(null);
                            setTransitionPair({ from: currentStoryScenes[idx - 1], to: scene });
                          }}
                          disabled={isMakingTransition}
                          className="shrink-0 self-center min-h-[44px] px-2 rounded-lg border border-dashed border-emerald-500/70 text-emerald-300 hover:bg-emerald-950/40 text-xs font-semibold leading-tight cursor-pointer disabled:opacity-40"
                          title={`Make a short AI clip between Scene ${currentStoryScenes[idx - 1].sceneNumber} and Scene ${scene.sceneNumber}, so the cut does not jump`}
                          aria-label={`Smooth the cut between scene ${currentStoryScenes[idx - 1].sceneNumber} and scene ${scene.sceneNumber}`}
                        >
                          Smooth
                          <br />
                          cut
                        </button>
                      )}
                      <div
                        draggable
                        onDragStart={(e) => startSceneDrag(e, scene.id)}
                        onDragOver={(e) => sceneDragOver(e, scene.storyId, idx)}
                        onDrop={sceneDrop}
                        onDragEnd={endSceneDrag}
                        onClick={() => {
                          setCurrentVideo(scene);
                          setCompareMode('video');
                        }}
                        title="Drag to move this scene, here or into another story. Hold Alt (Option) to copy it instead"
                        className={`shrink-0 w-52 self-stretch p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 group relative ${
                          dragSceneId === scene.id ? 'opacity-40 ' : ''
                        }${
                          dropBar(scene.storyId, idx, scene.id)
                        }${
                          isSelected
                            ? 'bg-emerald-950/50 border-emerald-500 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <strong className="text-white">Scene {scene.sceneNumber || idx + 1}</strong>
                          <span className="text-slate-400">
                            {isSelected ? 'playing · ' : ''}
                            {Math.round(scenePlaySeconds(scene))} s
                          </span>
                        </div>
                        <div className="relative rounded-lg overflow-hidden bg-slate-900 h-28">
                          <video
                            key={`${scene.id}-${scene.trimStart ?? 0}`}
                            src={scene.videoUrl}
                            preload="metadata"
                            muted
                            onLoadedMetadata={(e) => {
                              if (scene.trimStart) e.currentTarget.currentTime = scene.trimStart;
                            }}
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-2 leading-snug" title={scene.prompt}>
                          {scene.prompt}
                        </p>

                        {/* Add a scene before / after: choose AI or an uploaded clip */}
                        <div className="grid grid-cols-2 gap-1.5 mt-auto">
                          {(['before', 'after'] as const).map((side) => (
                            <button
                              key={side}
                              type="button"
                              aria-expanded={addMenu?.sceneId === scene.id && addMenu.side === side}
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddMenu((m) => (m?.sceneId === scene.id && m.side === side ? null : { sceneId: scene.id, side }));
                              }}
                              className="min-h-[36px] rounded-lg border border-slate-700 text-xs font-medium text-slate-200 hover:border-emerald-500 cursor-pointer"
                            >
                              {side === 'before' ? '+ Before' : '+ After'}
                            </button>
                          ))}
                        </div>
                        {addMenu?.sceneId === scene.id && (
                          <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-slate-900 border border-emerald-500/50" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[11px] text-slate-400">
                              New scene {addMenu.side === 'before' ? 'before' : 'after'} Scene {scene.sceneNumber || idx + 1}
                            </span>
                            <button
                              type="button"
                              disabled={addMenu.side === 'before' && isMakingTransition}
                              onClick={() => {
                                setAddMenu(null);
                                if (addMenu.side === 'before') {
                                  setTransitionError(null);
                                  setTransitionPair(
                                    idx > 0
                                      ? { from: currentStoryScenes[idx - 1], to: scene }
                                      : { from: null, to: scene, startImage: scene.sourceImage || selectedImage }
                                  );
                                } else {
                                  setCurrentVideo(scene);
                                  setCompareMode('video');
                                  setShowExtensionDrawer(true);
                                }
                              }}
                              className="min-h-[36px] rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                              Make it with AI
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddMenu(null);
                                openUploadSceneModal(scene, addMenu.side);
                              }}
                              className="min-h-[36px] rounded-lg border border-slate-600 text-xs font-medium text-slate-200 hover:border-emerald-500 cursor-pointer"
                            >
                              Upload a clip
                            </button>
                          </div>
                        )}

                        {/* Change, move earlier / later, remove */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCorrectionModal(scene);
                            }}
                            className="min-h-[32px] px-2 rounded-lg text-xs text-slate-300 hover:text-amber-200 hover:bg-amber-500/10 flex items-center gap-1 cursor-pointer"
                            title="Make a new version of this scene"
                          >
                            <Wrench className="w-3.5 h-3.5" /> Change
                          </button>
                          <div className="flex items-center gap-0.5">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveScene(scene.id, 'left');
                                }}
                                title="Move earlier"
                                aria-label={`Move Scene ${scene.sceneNumber || idx + 1} earlier`}
                                className="p-1.5 rounded text-slate-400 hover:text-emerald-300 hover:bg-slate-800 cursor-pointer"
                              >
                                <MoveLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {idx < currentStoryScenes.length - 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveScene(scene.id, 'right');
                                }}
                                title="Move later"
                                aria-label={`Move Scene ${scene.sceneNumber || idx + 1} later`}
                                className="p-1.5 rounded text-slate-400 hover:text-emerald-300 hover:bg-slate-800 cursor-pointer"
                              >
                                <MoveRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {currentStoryScenes.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Remove Scene ${scene.sceneNumber || idx + 1} from the story? This can't be undone.`)) {
                                    handleDeleteScene(scene);
                                  }
                                }}
                                title="Remove this scene"
                                aria-label={`Remove Scene ${scene.sceneNumber || idx + 1}`}
                                className="p-1.5 rounded text-slate-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                {/* The next scene is written in the left panel */}
                <button
                  type="button"
                  onClick={() => {
                    setNextStartsFrom('end');
                    const box = document.getElementById('scene-text') as HTMLTextAreaElement | null;
                    box?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    box?.focus();
                  }}
                  className="shrink-0 w-40 self-stretch p-3 rounded-xl border border-dashed border-slate-600 hover:border-emerald-500 text-slate-300 hover:text-emerald-200 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer"
                >
                  <strong className="text-sm text-white">Scene {currentStoryScenes.length + 1}</strong>
                  <span className="text-xs">Write it in the left panel</span>
                </button>

                {/* Upload Video Clip Card */}
                <button
                  type="button"
                  onClick={() => openUploadSceneModal(undefined, 'append')}
                  className="shrink-0 w-36 self-stretch p-3 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500 text-slate-400 hover:text-emerald-200 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer"
                  title="Upload a video clip to add at the end of the story"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-xs font-medium">Upload a clip</span>
                </button>
              </div>

              {/* Extension Panel / Drawer */}
              <AnimatePresence>
                {showExtensionDrawer && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-slate-950/90 border border-emerald-500/40 rounded-xl flex flex-col gap-3 mt-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                            Extend Scene {currentVideo.sceneNumber || 1} ➔ Add Scene {(currentVideo.sceneNumber || 1) + 1}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            The AI analyzes the previous video frames and plush rabbit momentum to synthesize a seamless continuation.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowExtensionDrawer(false)}
                          className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Continuation Presets */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                          Pick a Continuation Action:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {CONTINUATION_PRESETS.map((cp) => {
                            const isSelected = selectedContinuationPreset === cp.id;
                            return (
                              <button
                                key={cp.id}
                                type="button"
                                onClick={() => {
                                  setSelectedContinuationPreset(cp.id);
                                  setNextScenePrompt(cp.prompt);
                                }}
                                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2 ${
                                  isSelected
                                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                <span className="text-lg shrink-0">{cp.icon}</span>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold truncate">{cp.label}</div>
                                  <div className="text-[10px] text-slate-400 line-clamp-1">{cp.description}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Editable Continuation Prompt */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Continuation Prompt for Scene {(currentVideo.sceneNumber || 1) + 1}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setDirectorTarget('extension');
                              setShowDirectorModal(true);
                            }}
                            className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Ask AI Director to Suggest Scene</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAnalyzeCut(currentVideo)}
                          disabled={isAnalyzingCut || isExtending}
                          title="Look at the frame where the new scene starts (and the first frame of the scene after it) and write a prompt that joins them. Uses your current text as the wish."
                          className="mb-1.5 text-[11px] text-emerald-300 hover:text-emerald-200 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        >
                          {isAnalyzingCut ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                          <span>{isAnalyzingCut ? 'Looking at the frames…' : 'Suggest from the frames'}</span>
                        </button>
                        {cutAnalysis && (
                          <div className="mb-1.5 rounded-md border border-slate-800 bg-slate-900/60 p-2 text-[10px] leading-snug text-slate-400">
                            <p><span className="font-semibold text-slate-300">Starts on:</span> {cutAnalysis.startState}</p>
                            {cutAnalysis.endState && (
                              <p className="mt-0.5"><span className="font-semibold text-slate-300">Must end on:</span> {cutAnalysis.endState}</p>
                            )}
                          </div>
                        )}
                        <textarea
                          value={nextScenePrompt}
                          onChange={(e) => setNextScenePrompt(e.target.value)}
                          rows={2}
                          placeholder="Describe how the rabbit continues its action..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                        />
                        <CinematographyToolbar
                          currentPrompt={nextScenePrompt}
                          onUpdatePrompt={(newP) => setNextScenePrompt(newP)}
                          onOpenDirectorModal={() => {
                            setDirectorTarget('extension');
                            setShowDirectorModal(true);
                          }}
                          onOpenGlossary={() => setShowGlossaryModal(true)}
                          season={selectedSeason}
                          weather={selectedWeather}
                          isExtension={true}
                          previousPrompt={currentVideo?.prompt}
                        />
                      </div>

                      {/* New scene length */}
                      {(() => {
                        const willContinue = !!currentVideo.interactionId && currentVideo.trimEnd === undefined;
                        const max = willContinue ? 10 : 15;
                        const shown = Math.min(max, newSceneSeconds);
                        return (
                          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
                            <label htmlFor="new-scene-length" className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                              <span>Scene length</span>
                              <span className="font-mono text-sm normal-case tracking-normal text-emerald-300">{shown} s</span>
                            </label>
                            <input
                              id="new-scene-length"
                              type="range"
                              min={5}
                              max={max}
                              step={1}
                              value={shown}
                              onChange={(e) => setNewSceneSeconds(Number(e.target.value))}
                              className="w-full accent-emerald-500 cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                              <span>5 s</span>
                              <span>{max} s</span>
                            </div>
                            {willContinue && (
                              <p className="text-[11px] text-slate-500">
                                This scene continues the previous clip, and Gemini allows at most 10 s for a continuation. For up to 15 s, trim or split the scene first; then it is generated from the cut frame.
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {/* Cost & Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">Extension Engine:</span>
                          <span className="text-[11px] font-semibold text-emerald-400">
                            Gemini Omni Flash (~$0.35 USD)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowExtensionDrawer(false)}
                            className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExtendScene(currentVideo)}
                            disabled={isExtending || !nextScenePrompt.trim()}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {isExtending ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Synthesizing Scene {(currentVideo.sceneNumber || 1) + 1}...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 fill-current" />
                                <span>Synthesize Scene {(currentVideo.sceneNumber || 1) + 1} Continuation</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        </div>
      </main>

      {promptReview && (
        <PromptReview
          title={promptReview.title}
          text={promptReview.text}
          pictures={promptReview.pictures}
          notes={promptReview.notes}
          onCancel={() => {
            promptReview.resolve(null);
            setPromptReview(null);
          }}
          onSend={(text) => {
            promptReview.resolve(text);
            setPromptReview(null);
          }}
        />
      )}
      {makeAlbums && (
        <AlbumPicker
          destinations={[
            { id: 'start', label: 'Start picture', hint: 'The next scene starts on it.' },
            { id: 'ref', label: 'Reference picture', hint: 'A guide for the next scene (up to 3).' },
          ]}
          initial={makeAlbums}
          onClose={() => setMakeAlbums(null)}
          onUse={(dataUrl, dest) => void applyAlbumPicture(dataUrl, dest)}
        />
      )}

      {castModal && (
        <CastModal
          frame={castModal.frame}
          sceneNumber={castModal.scene.sceneNumber || 1}
          existing={
            castModal.scene.castDescription
              ? { name: castModal.scene.castName, description: castModal.scene.castDescription }
              : undefined
          }
          onClose={() => setCastModal(null)}
          onSave={(card) => {
            setStoryCast(castModal.scene.storyId, card);
            setCastModal(null);
          }}
        />
      )}

      {/* Change a scene (mockup screen 5) */}
        {showCorrectionModal && sceneToCorrect && (() => {
          const sceneNo = sceneToCorrect.sceneNumber || 1;
          const storyNow = videoHistory
            .filter((v) => v.storyId === sceneToCorrect.storyId)
            .sort((x, y) => (x.sceneNumber || 1) - (y.sceneNumber || 1));
          const at = storyNow.findIndex((v) => v.id === sceneToCorrect.id);
          const nextScene = at !== -1 ? storyNow[at + 1] : undefined;
          const max = correctionMaxSeconds(sceneToCorrect);
          const shown = Math.min(max, correctionSeconds);
          const root = correctionIsRoot(sceneToCorrect);
          const cost = (shown * estimatedCost.ratePerSec).toFixed(2);
          const toggleProblem = (id: string) =>
            setCorrectionProblems((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
          return (
          <div key="change-scene" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="change-scene-title"
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full shadow-2xl flex flex-col max-h-[94vh]"
            >
              <div className="px-5 sm:px-6 py-4 border-b border-slate-800 flex items-start justify-between gap-4">
                <div>
                  <h3 id="change-scene-title" className="font-semibold text-lg text-white">Change Scene {sceneNo}</h3>
                  <p className="text-sm text-slate-400 mt-0.5">Gemini makes a new version of the scene. The old one stays until you choose what to keep.</p>
                </div>
                <button type="button" onClick={() => setShowCorrectionModal(false)} aria-label="Close" className="min-w-[44px] min-h-[44px] rounded-lg border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-5 sm:px-6 py-5 overflow-y-auto flex flex-wrap gap-6 items-start">
                <div className="flex-[0_1_240px] min-w-[200px] flex flex-col gap-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">The scene now</span>
                  <video
                    src={sceneToCorrect.videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                      if (sceneToCorrect.trimStart) e.currentTarget.currentTime = sceneToCorrect.trimStart;
                    }}
                    className={`w-full rounded-xl bg-black object-contain ${sceneToCorrect.aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] max-h-[420px]'}`}
                  />
                  <p className="text-xs text-slate-400">
                    {root ? 'A first scene: the new version starts from the start picture.' : `Continues Scene ${sceneNo - 1}, so the new version starts where Scene ${sceneNo - 1} ends.`}
                  </p>
                </div>

                <div className="flex-[1_1_480px] min-w-0 flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">What is wrong?</span>
                    <div className="flex flex-wrap gap-2">
                      {SCENE_PROBLEMS.map((pr) => (
                        <button key={pr.id} type="button" aria-pressed={correctionProblems.includes(pr.id)} onClick={() => toggleProblem(pr.id)} className={`min-h-[36px] px-3.5 rounded-full border text-sm font-medium transition-colors cursor-pointer ${correctionProblems.includes(pr.id) ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                          {pr.label}
                        </button>
                      ))}
                    </div>
                    {correctionProblems.includes('extra-character') && correctionIncludeKhalle && (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-amber-100 bg-amber-950/40 border border-amber-700/60 rounded-lg p-2.5">
                        <span>Is the extra character Khalle? Then leave him out of this version.</span>
                        <button type="button" onClick={() => setCorrectionIncludeKhalle(false)} className="min-h-[36px] px-3 rounded-lg bg-amber-400 text-slate-950 text-sm font-semibold cursor-pointer">
                          Leave Khalle out
                        </button>
                      </div>
                    )}
                    <label htmlFor="change-note" className="text-sm text-slate-400 mt-1">Or say it in your own words</label>
                    <textarea
                      id="change-note"
                      value={correctionFeedback}
                      onChange={(e) => setCorrectionFeedback(e.target.value)}
                      rows={2}
                      placeholder="Example: The green rabbit appears behind him at the end. Only the old rabbit should be there."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label htmlFor="change-text" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">What happens in the scene</label>
                      <span className="text-xs text-slate-400">Edit if you want the scene itself to change</span>
                    </div>
                    <textarea
                      id="change-text"
                      value={correctionPrompt}
                      onChange={(e) => setCorrectionPrompt(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex flex-wrap gap-5">
                    <div className="flex-[1_1_240px] flex flex-col gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Season and weather <span className="normal-case tracking-normal font-normal text-slate-500">· optional, tap again to clear</span></span>
                      <div className="flex flex-wrap gap-2">
                        {SEASONS.map((x) => (
                          <button key={x.id} type="button" aria-pressed={correctionSeason === x.id} onClick={() => setCorrectionSeason(correctionSeason === x.id ? '' : x.id)} className={`min-h-[36px] px-3.5 rounded-full border text-sm font-medium transition-colors cursor-pointer ${correctionSeason === x.id ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                            {x.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {WEATHER_OPTIONS.map((w) => (
                          <button key={w.id} type="button" aria-pressed={correctionWeather === w.id} onClick={() => setCorrectionWeather(correctionWeather === w.id ? '' : w.id)} className={`min-h-[36px] px-3.5 rounded-full border text-sm font-medium transition-colors cursor-pointer ${correctionWeather === w.id ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                            {({ sunny: 'Sunny', snowing: 'Snow', rain: 'Rain', sunset: 'Sunset', misty: 'Mist', rainbow: 'Rainbow' } as Record<string, string>)[w.id] || w.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-[1_1_220px] flex flex-col gap-2">
                      <label htmlFor="correction-length" className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <span>Length</span>
                        <span className="text-sm normal-case tracking-normal text-emerald-300">{shown} s</span>
                      </label>
                      <input id="correction-length" type="range" min={3} max={max} step={1} value={shown} onChange={(e) => setCorrectionSeconds(Number(e.target.value))} className="w-full accent-emerald-500 cursor-pointer" />
                      <p className="text-xs text-slate-400">
                        3–{max} s{' '}
                        {root ? '(a new scene from a picture).' : max < 10 ? '(the room left in the 30 s chain).' : "(it continues the scene before, which is Gemini's limit)."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={correctionIncludeKhalle}
                      aria-label="Khalle in this new version"
                      onClick={() => setCorrectionIncludeKhalle((v) => !v)}
                      className={`relative w-11 h-6 rounded-full shrink-0 cursor-pointer ${correctionIncludeKhalle ? 'bg-emerald-500' : 'bg-slate-600'}`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${correctionIncludeKhalle ? 'translate-x-5' : ''}`} />
                    </button>
                    <span>
                      <strong className="text-white">{correctionIncludeKhalle ? 'Khalle in this version' : 'Khalle left out'}</strong>{' '}
                      <span className="text-slate-400">
                        {correctionIncludeKhalle ? 'His pictures and look are sent.' : 'for this new version only. No Khalle pictures, symbol or green-rabbit rule are sent.'}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={correctionSilentTalk}
                      aria-label="Talks without words in this new version"
                      onClick={() => setCorrectionSilentTalk((v) => !v)}
                      className={`relative w-11 h-6 rounded-full shrink-0 cursor-pointer ${correctionSilentTalk ? 'bg-emerald-500' : 'bg-slate-600'}`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${correctionSilentTalk ? 'translate-x-5' : ''}`} />
                    </button>
                    <span>
                      <strong className="text-white">Talks without words</strong>{' '}
                      <span className="text-slate-400">
                        {correctionSilentTalk ? 'The mouth moves as if speaking; no voices are made (for a voice-over later).' : '(off)'}
                      </span>
                    </span>
                  </div>

                  <details className="bg-slate-950/60 border border-slate-800 rounded-xl">
                    <summary className="min-h-[44px] px-3.5 flex items-center text-sm font-medium text-slate-200 cursor-pointer">
                      More options for this version <span className="text-slate-400 font-normal ml-1">· camera, clothes, symbol</span>
                    </summary>
                    <div className="p-3.5 pt-1 flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Camera</span>
                        <CinematographyToolbar
                          currentPrompt={correctionPrompt}
                          onUpdatePrompt={(newP) => setCorrectionPrompt(newP)}
                          onOpenDirectorModal={() => {
                            setDirectorTarget('correction');
                            setShowDirectorModal(true);
                          }}
                          onOpenGlossary={() => setShowGlossaryModal(true)}
                          season={correctionSeason}
                          weather={correctionWeather}
                          isExtension={false}
                          previousPrompt={sceneToCorrect.prompt}
                        />
                      </div>
              {/* AI Stylist: Wardrobe, Clothing & Accessories for this Correction Take */}
              <div className="p-3 bg-purple-950/20 rounded-xl border border-purple-900/40 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                      <Shirt className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-purple-200">
                        Wardrobe, Clothing & Accessories (AI Stylist)
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Upload custom clothing photo or pick accessories to dress the rabbit on this re-take
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Open full AI Stylist Modal */}
                    <button
                      type="button"
                      onClick={() => {
                        setDirectorTarget('correction');
                        setShowStylistModal(true);
                      }}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Shirt className="w-3 h-3" />
                      <span>Open AI Stylist</span>
                    </button>

                    {/* Direct Quick Upload Button */}
                    <label className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-purple-200 border border-purple-700/50 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all">
                      <Upload className="w-3 h-3 text-purple-400" />
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setDirectorTarget('correction');
                            handleUploadCustomPhoto(
                              file,
                              'clothing',
                              file.name.replace(/\.[^/.]+$/, '').slice(0, 24)
                            );
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Active Items Badges if chosen */}
                {activeStylistItems.length > 0 ? (
                  <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-purple-950/40 border border-purple-600/30 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-purple-200 text-[11px] flex items-center gap-1">
                        <Shirt className="w-3.5 h-3.5 text-purple-400" />
                        <span>Active Cast, Props & Wardrobe ({activeStylistItems.length}):</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleClearAllStylistItems}
                        className="text-[10px] text-slate-400 hover:text-red-400 cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeStylistItems.map((item) => {
                        const badgeColor =
                          item.category === 'character'
                            ? 'bg-sky-950/70 border-sky-500/50 text-sky-200'
                            : item.category === 'prop'
                            ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                            : 'bg-purple-950/70 border-purple-500/50 text-purple-200';
                        return (
                          <div
                            key={item.id}
                            className={`px-2 py-0.5 rounded border text-[11px] flex items-center gap-1 ${badgeColor}`}
                          >
                            <span>{item.icon}</span>
                            <span>{item.title}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveStylistItem(item.id)}
                              className="hover:text-white p-0.5 cursor-pointer"
                              title="Remove item"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <span className="text-slate-500 font-medium">Quick presets for this scene:</span>
                  </div>
                )}

                {/* Quick Multi-Select Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    PRESET_CLOTHING[0],
                    PRESET_CLOTHING[1],
                    PRESET_CLOTHING[2],
                    PRESET_PROPS[0],
                    PRESET_PROPS[1],
                    PRESET_CHARACTERS[0],
                    PRESET_CHARACTERS[1],
                  ].map((preset) => {
                    const isSelected = activeStylistItems.some((i) => i.id === preset.id);
                    const tagClass =
                      preset.category === 'character'
                        ? isSelected
                          ? 'bg-sky-600 text-white border-sky-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-sky-500/50 hover:text-sky-200'
                        : preset.category === 'prop'
                        ? isSelected
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-200'
                        : isSelected
                        ? 'bg-purple-600 text-white border-purple-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-purple-500/50 hover:text-purple-200';
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setDirectorTarget('correction');
                          handleToggleStylistItem(preset);
                        }}
                        className={`px-2 py-1 rounded-md border text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${tagClass}`}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.title}</span>
                        {isSelected && <span className="text-[9px]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

                      <button type="button" onClick={() => setShowEmblemModal(true)} className="self-start min-h-[36px] px-3 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-emerald-500 cursor-pointer">
                        Belly symbol: {activeEmblem.type === 'none' ? 'None' : activeEmblem.name} · Change
                      </button>
                    </div>
                  </details>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">When it is ready</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {([
                        { id: 'replace', title: `Replace Scene ${sceneNo}`, note: 'The old version is removed.' },
                        { id: 'duplicate', title: 'Keep both', note: 'The new version goes right after the old one.' },
                      ] as const).map((o) => (
                        <label key={o.id} className={`flex gap-2.5 items-start p-3 rounded-xl border cursor-pointer ${correctionMode === o.id ? 'border-emerald-400 bg-emerald-950/50' : 'border-slate-700 hover:border-slate-500'}`}>
                          <input type="radio" name="keep-version" checked={correctionMode === o.id} onChange={() => setCorrectionMode(o.id)} className="mt-1 accent-emerald-500" />
                          <span>
                            <strong className="block text-sm text-white">{o.title}</strong>
                            <span className="text-xs text-slate-400">{o.note}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    {nextScene && correctionMode === 'replace' && (
                      <p className="text-xs text-slate-400">
                        Scene {nextScene.sceneNumber} was made to follow the old Scene {sceneNo}. After the change you can smooth the cut between them.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 sm:px-6 py-4 border-t border-slate-800 flex flex-wrap items-center justify-end gap-3">
                <span className="text-sm text-slate-400 mr-auto">Takes about 1 minute.</span>
                <button type="button" onClick={() => setShowCorrectionModal(false)} className="min-h-[44px] px-4 rounded-lg border border-slate-700 text-sm text-slate-200 hover:border-slate-500 cursor-pointer">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCorrection}
                  disabled={isCorrecting}
                  className="min-h-[48px] px-5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-base flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isCorrecting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Making the new Scene {sceneNo}… {progressPercent}%</span>
                    </>
                  ) : (
                    <span>Make new Scene {sceneNo} · {shown} s · ${cost}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
          );
        })()}

      {/* Pricing & Spend Cap Breakdown Modal */}
      <AnimatePresence>
        {showPricingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Video Generation Cost & Rates</h3>
                    <p className="text-xs text-slate-400">Gemini Omni Flash Pricing & Spend Cap Details</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPricingModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Pricing breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Per-Video Pricing Breakdown
                </h4>
                <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-amber-300 text-sm">Gemini Omni Flash (gemini-omni-1.2-flash)</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                      Production AI
                    </span>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                    <li className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                      <span>5s @ 720p (Economy):</span>
                      <strong className="text-amber-300 font-mono">~$0.35 USD</strong>
                    </li>
                    <li className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                      <span>10s @ 720p:</span>
                      <strong className="text-amber-300 font-mono">~$0.70 USD</strong>
                    </li>
                    <li className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                      <span>5s @ 1080p (HD):</span>
                      <strong className="text-amber-300 font-mono">~$0.60 USD</strong>
                    </li>
                    <li className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                      <span>10s @ 1080p (HD):</span>
                      <strong className="text-amber-300 font-mono">~$1.20 USD</strong>
                    </li>
                  </ul>
                  <p className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-2">
                    Billed per second of generated video (~$0.07 – $0.12/sec) directly to your Google Cloud project billed through Google AI Studio.
                  </p>
                </div>
              </div>

              {/* Multi-scene extension explainer */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-2">
                <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Clapperboard className="w-4 h-4 text-amber-400" /> Multi-Scene Extension & Clip Continuations
                </h4>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  When adding a scene to extend a video clip, Gemini Omni Flash analyzes the ending frame, plush rabbit posture, and camera angle of the preceding video to synthesize a seamless continuation. Each 5s extended scene is ~$0.35 USD on Omni Flash.
                </p>
              </div>

              {/* Why video generation is expensive */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-2">
                <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-400" /> Why is AI video generation expensive?
                </h4>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Unlike text (which generates small text tokens) or single static images, video models synthesize 24 to 30 coherent frames every second (150–300 individual visual frames per 5–10s take) through massive multimodal diffusion neural networks. That is why video models have per-second pricing and can reach a $5–$10 monthly cap in just 10–15 takes.
                </p>
              </div>

              {/* How to manage spend cap */}
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200/90 space-y-2">
                <h4 className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-amber-400" /> How to adjust or raise your Spend Cap
                </h4>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  You can set, increase, or remove the monthly spend cap for your project at any time in the Google AI Studio console:
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href="https://ai.studio/spend"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 hover:bg-amber-400 transition-colors"
                  >
                    <span>Manage Spend Cap at ai.studio/spend</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Director Scene Suggestion Modal */}
      <AiDirectorModal
        isOpen={showDirectorModal}
        onClose={() => setShowDirectorModal(false)}
        targetSceneNumber={
          directorTarget === 'extension' && currentVideo
            ? (currentVideo.sceneNumber || 1) + 1
            : directorTarget === 'correction' && sceneToCorrect
            ? sceneToCorrect.sceneNumber || 1
            : 1
        }
        previousPrompt={
          directorTarget === 'extension'
            ? currentVideo?.prompt
            : directorTarget === 'correction'
            ? sceneToCorrect?.prompt
            : currentVideo?.prompt || undefined
        }
        currentSeason={selectedSeason}
        currentWeather={selectedWeather}
        aspectRatio={aspectRatio}
        onApplyPrompt={handleApplyDirectorSuggestion}
        onOpenGlossary={() => {
          setShowDirectorModal(false);
          setShowGlossaryModal(true);
        }}
      />

      {/* Cinematography & Zooming Terms Guide Modal */}
      <CinematographyGlossaryModal
        isOpen={showGlossaryModal}
        onClose={() => setShowGlossaryModal(false)}
        onInsertTerm={(snippet) => {
          if (directorTarget === 'main') {
            setPrompt((prev) => `${prev.trim()} Shot with ${snippet}.`);
            setAutoCompose(false);
          } else if (directorTarget === 'extension') {
            setNextScenePrompt((prev) => `${prev.trim()} Shot with ${snippet}.`);
          } else if (directorTarget === 'correction') {
            setCorrectionPrompt((prev) => `${prev.trim()} Shot with ${snippet}.`);
          }
        }}
      />

      {/* AI Cast, Props & Wardrobe Studio Modal */}
      <AiStylistModal
        isOpen={showStylistModal}
        onClose={() => setShowStylistModal(false)}
        season={directorTarget === 'correction' ? correctionSeason : selectedSeason}
        weather={directorTarget === 'correction' ? correctionWeather : selectedWeather}
        currentPrompt={directorTarget === 'correction' ? correctionPrompt : prompt}
        activeItems={activeStylistItems}
        onToggleItem={handleToggleStylistItem}
        onClearAllItems={handleClearAllStylistItems}
        onUploadCustomPhoto={handleUploadStylistPhoto}
        onAddUrlItem={handleAddStylistUrlItem}
        onApplyClothingGuide={handleApplyClothingGuide}
        onApplyShootGuide={handleApplyShootGuide}
      />

      {/* Video Logo & Watermark Settings Modal */}
      <WatermarkSettingsModal
        isOpen={showWatermarkModal}
        onClose={() => setShowWatermarkModal(false)}
        config={watermarkConfig}
        onUpdateConfig={(newConfig) => setWatermarkConfig(newConfig)}
        videoPreviewUrl={currentVideo?.videoUrl}
        sourceImageUrl={currentVideo?.sourceImage || selectedImage}
      />

      {/* Script & Story to Multi-Scene Storyboard Modal */}
      <ScriptToStoryModal
        isOpen={showScriptModal}
        onClose={() => setShowScriptModal(false)}
        onApplyScene={handleApplyScriptScene}
        onAdoptPlan={handleAdoptStoryboardPlan}
        activePlan={activeStoryboardPlan}
      />

      {/* Upload External Video Scene Modal */}
      {transitionPair && (
        <TransitionModal
          from={transitionPair.from}
          startImage={transitionPair.startImage}
          to={transitionPair.to}
          busy={isMakingTransition}
          error={transitionError}
          onClose={() => !isMakingTransition && setTransitionPair(null)}
          onGenerate={(args) => handleCreateTransition(transitionPair.from, transitionPair.to, args)}
        />
      )}

      <UploadSceneModal
        isOpen={showUploadSceneModal}
        onClose={() => setShowUploadSceneModal(false)}
        currentStoryScenes={currentStoryScenes}
        activeScene={uploadTargetScene || currentVideo || null}
        onInsertVideo={handleInsertUploadedVideo}
        initialPosition={uploadInsertPosition}
      />

      {/* Belly Emblem / Norse Runic Symbol Studio Modal */}
      <BellyEmblemModal
        isOpen={showEmblemModal}
        onClose={() => setShowEmblemModal(false)}
        activeEmblem={activeEmblem}
        onSelectEmblem={handleSelectEmblem}
        isMorphingEnabled={isMorphingEnabled}
        onToggleMorphing={(val) => (val ? handleToggleMorphingOn() : handleToggleMorphingOff())}
      />

      {/* Generation Diagnostic & Reference Inspector Modal */}
      <DiagnosticLogModal
        isOpen={showDiagnosticModal}
        onClose={() => setShowDiagnosticModal(false)}
        log={latestGenerationLog}
        onRefresh={() => fetchLatestLog(false)}
        isLoading={isFetchingLog}
      />

      {/* 1-Click Copy Diagnostic Log Toast */}
      <AnimatePresence>
        {copyLogToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 max-w-md p-3.5 bg-slate-900 border border-emerald-500/60 rounded-xl shadow-2xl flex items-center gap-3 text-slate-100 text-xs backdrop-blur-md"
          >
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">Log Copied to Clipboard!</p>
              <p className="text-slate-300 text-[11px] leading-snug mt-0.5">{copyLogToast}</p>
            </div>
            <button
              onClick={() => setCopyLogToast(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
