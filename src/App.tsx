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
import { useTrimmedPlayback } from './lib/trimPlayback';
import { extensionChainSeconds, MAX_EXTENSION_CHAIN_SECONDS } from './lib/extensionChain';
import { clipDuration, grabFrame } from './lib/frameGrab';
import { analyzeCut, type CutAnalysis } from './api/cutAnalysis';
import { exportStory } from './lib/storyExport';
import SceneEditBar from './components/SceneEditBar';
import AppLogo from './components/AppLogo';
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
}

/**
 * Seconds a scene plays: its trimmed part of the clip. The clip's end is its measured length when
 * known (an extension's file holds the whole chain), else the scene's duration label.
 */
function scenePlaySeconds(scene: GeneratedVideo): number {
  const full = scene.clipSeconds ?? (parseInt(scene.duration || '', 10) || 5);
  return Math.max(0, (scene.trimEnd ?? full) - (scene.trimStart ?? 0));
}

export default function App() {
  // Image selection state
  const [selectedImage, setSelectedImage] = useState<string>(NO_SYMBOL_RABBIT_PATH);
  const [isDefaultImage, setIsDefaultImage] = useState<boolean>(true);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');

  // Jump Action & Environment state
  const [activePreset, setActivePreset] = useState<string>(JUMP_PRESETS[0].id);
  const [selectedSeason, setSelectedSeason] = useState<string>('spring');
  const [selectedWeather, setSelectedWeather] = useState<string>('sunny');
  const [autoCompose, setAutoCompose] = useState<boolean>(true);

  // Pricing & Spend Cap state
  const [showPricingModal, setShowPricingModal] = useState<boolean>(false);
  const [sessionCost, setSessionCost] = useState<number>(0);

  // Helper to construct prompt from base action + season + weather
  const composePrompt = (baseActionText: string, seasonId: string, weatherId: string) => {
    const s = SEASONS.find((item) => item.id === seasonId) || SEASONS[0];
    const w = WEATHER_OPTIONS.find((item) => item.id === weatherId) || WEATHER_OPTIONS[0];
    return `${baseActionText.trim()} The scene is set in ${s.name.toLowerCase()} with ${s.description}. The weather features ${w.description}.`;
  };

  const [prompt, setPrompt] = useState<string>(() =>
    composePrompt(JUMP_PRESETS[0].baseAction, 'spring', 'sunny')
  );

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
  // without this a story replays its earlier scenes. For every extension not yet checked, read
  // the clip length and start playback where the new part begins (the file itself is kept).
  // Scenes the user trimmed or split are left alone; resetting a trim later is respected.
  const extensionTrimInFlight = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const scene of videoHistory) {
      if (
        !scene.previousInteractionId ||
        scene.extensionTrimChecked ||
        scene.trimStart !== undefined ||
        scene.trimEnd !== undefined ||
        !scene.videoUrl ||
        extensionTrimInFlight.current.has(scene.id)
      ) {
        continue;
      }
      extensionTrimInFlight.current.add(scene.id);
      const ownSeconds = parseInt(String(scene.duration || '0'), 10) || 0;
      clipDuration(scene.videoUrl)
        .then((total) => {
          const startAt = Number.isFinite(total) && ownSeconds > 0 && total > ownSeconds + 0.5 ? total - ownSeconds : undefined;
          const patch = (v: GeneratedVideo): GeneratedVideo =>
            v.id === scene.id && v.trimStart === undefined && v.trimEnd === undefined
              ? { ...v, trimStart: startAt, extensionTrimChecked: true, clipSeconds: Number.isFinite(total) ? total : undefined }
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
  const [transitionPair, setTransitionPair] = useState<{ from: GeneratedVideo; to: GeneratedVideo } | null>(null);
  const [isMakingTransition, setIsMakingTransition] = useState<boolean>(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  // After a scene is corrected, the next scene still follows the old take. Offer a transition.
  const [joinOffer, setJoinOffer] = useState<{ sceneId: string; nextId: string } | null>(null);
  const [correctionFeedback, setCorrectionFeedback] = useState<string>('');
  const [correctionSeason, setCorrectionSeason] = useState<string>('spring');
  const [correctionWeather, setCorrectionWeather] = useState<string>('sunny');
  const [correctionMode, setCorrectionMode] = useState<'replace' | 'duplicate'>('replace');
  const [correctionSeconds, setCorrectionSeconds] = useState<number>(5);
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
  const videoRef = useRef<HTMLVideoElement>(null);
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
  const [audioMode, setAudioMode] = useState<'with_sound' | 'silent'>('with_sound');
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
    setSelectedSeason(scene.season || 'spring');
    setSelectedWeather(scene.weather || 'sunny');
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

  const handleMoveScene = (sceneId: string, direction: 'left' | 'right') => {
    if (!currentVideo) return;
    const storyId = currentVideo.storyId;
    const storyScenes = videoHistory
      .filter((v) => v.storyId === storyId)
      .sort((a, b) => (a.sceneNumber || 1) - (b.sceneNumber || 1));

    const idx = storyScenes.findIndex((s) => s.id === sceneId);
    if (idx === -1) return;

    if (direction === 'left' && idx > 0) {
      const temp = storyScenes[idx];
      storyScenes[idx] = storyScenes[idx - 1];
      storyScenes[idx - 1] = temp;
    } else if (direction === 'right' && idx < storyScenes.length - 1) {
      const temp = storyScenes[idx];
      storyScenes[idx] = storyScenes[idx + 1];
      storyScenes[idx + 1] = temp;
    }

    const renumbered = storyScenes.map((s, i) => ({
      ...s,
      sceneNumber: i + 1,
    }));

    const otherStories = videoHistory.filter((v) => v.storyId !== storyId);
    setVideoHistory([...renumbered, ...otherStories]);
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
  const handleStartNewStory = () => {
    setCurrentVideo(null);
    setCompareMode('video');
    setShowExtensionDrawer(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentStoryScenes = useMemo(() => {
    if (!currentVideo) return [];
    const scenes = videoHistory
      .filter((v) => v.storyId === currentVideo.storyId)
      .sort((a, b) => (a.sceneNumber || 1) - (b.sceneNumber || 1));
    if (!scenes.some((s) => s.id === currentVideo.id)) {
      return [currentVideo];
    }
    return scenes;
  }, [currentVideo, videoHistory]);

  const totalStorySeconds = useMemo(
    () => currentStoryScenes.reduce((sum, scene) => sum + scenePlaySeconds(scene), 0),
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
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    setImageMimeType(file.type);
    setIsDefaultImage(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedImage(result);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  // Reset to default rabbit
  const handleResetToRabbit = () => {
    setSelectedImage(activeEmblem?.type === 'none' ? NO_SYMBOL_RABBIT_PATH : activeEmblem?.id === 'emblem-vegvisir' ? WAYFINDER_RABBIT_PATH : DEFAULT_RABBIT_PATH);
    setIsDefaultImage(true);
    setImageMimeType('image/jpeg');
    setSelectedSeason('spring');
    setSelectedWeather('sunny');
    setActivePreset(JUMP_PRESETS[0].id);
    setPrompt(composePrompt(JUMP_PRESETS[0].baseAction, 'spring', 'sunny'));
    setAspectRatio('9:16');
    setErrorMessage(null);
  };

  // Generate video via Gemini Interactions API (gemini-omni-1.2-flash)
  const handleGenerateVideo = async (overridePrompt?: string) => {
    setIsGenerating(true);
    setErrorMessage(null);
    setProgressPercent(10);
    setProgressStep(`Applying ${currentSeasonObj.name} season & ${currentWeatherObj.name} weather...`);

    const progressInterval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev < 30) {
          setProgressStep(`Connecting to gemini-omni-1.2-flash (${currentSeasonObj.badge})...`);
          return prev + 5;
        } else if (prev < 65) {
          setProgressStep(`Rendering plush rabbit jump in ${currentSeasonObj.name} under ${currentWeatherObj.name}...`);
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
        clothingDirective: combinedClothingDirective || undefined,
        shootGuideDirective: combinedPropDirective || undefined,
        clothingDirectives: clothingItems.map((c) => ({ title: c.title, directive: c.promptDirective || c.directive || '' })),
        propDirectives: propItems.map((p) => ({ title: p.title, directive: p.promptDirective || p.directive || '' })),
        characterDirectives: characterItems.map((ch) => ({ title: ch.title, directive: ch.promptDirective || ch.directive || '' })),
        customEmblemType: activeEmblem?.type,
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

      const response = await fetch('/api/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

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
      };

      setSessionCost((prev) => prev + estimatedCost.amount);
      setCurrentVideo(newVideo);
      setVideoHistory((prev) => [newVideo, ...prev]);
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
  const handleExtendScene = async (parentVideo: GeneratedVideo, overridePrompt?: string) => {
    setIsExtending(true);
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
      const wantedSeconds = Math.max(3, Math.round(newSceneSeconds));
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
      const generationPrompt = continuityLines.length
        ? `${continuityLines.join(' ')}\n\n${continuationPrompt}`
        : continuationPrompt;

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

      const response = await fetch(continueInteraction ? '/api/extend' : '/api/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(continueInteraction
            ? { previousInteractionId: parentVideo.interactionId }
            : { imageBase64: startFrame, imageMimeType: 'image/jpeg' }),
          prompt: generationPrompt,
          aspectRatio: parentVideo.aspectRatio,
          duration: `${sceneSeconds}s`,
          resolution,
          season: parentVideo.season || selectedSeason,
          weather: parentVideo.weather || selectedWeather,
          audioMode,
          clothingDirective: combinedClothingDirective || undefined,
          shootGuideDirective: combinedPropDirective || undefined,
          clothingDirectives: clothingItems.map((c) => ({ title: c.title, directive: c.promptDirective || c.directive || '' })),
          propDirectives: propItems.map((p) => ({ title: p.title, directive: p.promptDirective || p.directive || '' })),
          characterDirectives: characterItems.map((ch) => ({ title: ch.title, directive: ch.promptDirective || ch.directive || '' })),
          customEmblemType: activeEmblem?.type,
          customEmblemDirective: activeEmblem?.directive,
          customEmblemName: activeEmblem?.name,
          customEmblemImage: activeEmblem?.imageBase64 || activeEmblem?.imagePath,
          disableMorph: !isMorphingEnabled || activeEmblem?.type !== 'morph',
          enableMorph: isMorphingEnabled && activeEmblem?.type === 'morph',
          referenceImages: [
            ...continuityRefs,
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
        }),
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
        season: parentVideo.season,
        weather: parentVideo.weather,
        cost: estimatedCost.display,
        engine: 'omni',
        storyId: parentVideo.storyId || parentVideo.id,
        sceneNumber: nextSceneNumber,
        interactionId: data.interactionId,
        previousInteractionId: continueInteraction ? parentVideo.interactionId : undefined,
      };

      setSessionCost((prev) => prev + (resolution === '1080p' ? 0.60 : 0.35));
      // Insert right after the parent (not at the end) and renumber the story.
      const parentNow = videoHistoryRef.current.find((v) => v.id === parentVideo.id);
      const placed = parentNow ? replaceInStory(parentNow.id, [parentNow, newScene]) : undefined;
      if (!placed) setVideoHistory((prev) => [newScene, ...prev]);
      setCurrentVideo(placed?.find((s) => s.id === newScene.id) || newScene);
      setShowExtensionDrawer(false);
    } catch (err: any) {
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
        currentStoryScenes.map((s) => ({ videoUrl: s.videoUrl, trimStart: s.trimStart, trimEnd: s.trimEnd })),
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
    if (correctionFeedback.trim()) {
      finalCorrectedPrompt = `${finalCorrectedPrompt} [Correction: ${correctionFeedback.trim()}]`;
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
          clothingDirective: combinedClothingDirective || undefined,
          shootGuideDirective: combinedPropDirective || undefined,
          clothingDirectives: clothingItems.map((c) => ({ title: c.title, directive: c.promptDirective || c.directive || '' })),
          propDirectives: propItems.map((p) => ({ title: p.title, directive: p.promptDirective || p.directive || '' })),
          characterDirectives: characterItems.map((ch) => ({ title: ch.title, directive: ch.promptDirective || ch.directive || '' })),
          customEmblemType: activeEmblem?.type,
          customEmblemDirective: activeEmblem?.directive,
          customEmblemName: activeEmblem?.name,
          customEmblemImage: activeEmblem?.imageBase64 || activeEmblem?.imagePath,
          disableMorph: !isMorphingEnabled || activeEmblem?.type !== 'morph',
          enableMorph: isMorphingEnabled && activeEmblem?.type === 'morph',
          referenceImages: [
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

        response = await fetch('/api/animate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/extend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            previousInteractionId: sceneToCorrect.previousInteractionId,
            prompt: finalCorrectedPrompt,
            aspectRatio: sceneToCorrect.aspectRatio,
            duration: takeDuration,
            resolution,
            season: correctionSeason,
            weather: correctionWeather,
            audioMode,
            clothingDirective: combinedClothingDirective || undefined,
            shootGuideDirective: combinedPropDirective || undefined,
            clothingDirectives: clothingItems.map((c) => ({ title: c.title, directive: c.promptDirective || c.directive || '' })),
            propDirectives: propItems.map((p) => ({ title: p.title, directive: p.promptDirective || p.directive || '' })),
            characterDirectives: characterItems.map((ch) => ({ title: ch.title, directive: ch.promptDirective || ch.directive || '' })),
            customEmblemType: activeEmblem?.type,
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
          }),
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
        season: correctionSeason,
        weather: correctionWeather,
        cost: estimatedCost.display,
        engine: 'omni',
        interactionId: data.interactionId,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
  const handleTriggerGenerate = () => {
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

  // What happens when the selected scene's segment ends (natural end, or its trimEnd).
  const advanceAfterScene = (player: HTMLVideoElement | null, trimmedEnd: boolean) => {
    if (!currentVideo) return;
    if (playAllContinuous && currentStoryScenes.length > 1) {
      const idx = currentStoryScenes.findIndex((s) => s.id === currentVideo.id);
      if (idx !== -1 && idx < currentStoryScenes.length - 1) {
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

  useTrimmedPlayback(videoRef, currentVideo?.videoUrl, currentVideo?.trimStart, currentVideo?.trimEnd, () =>
    advanceAfterScene(videoRef.current, true)
  );
  useTrimmedPlayback(splitVideoRef, currentVideo?.videoUrl, currentVideo?.trimStart, currentVideo?.trimEnd, () =>
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

  // Generate a clip from the last frame of one scene to the first frame of the next and put it between them.
  const handleCreateTransition = async (
    from: GeneratedVideo,
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
        aspectRatio: from.aspectRatio === '16:9' ? '16:9' : '9:16',
        resolution,
      });
      const transition: GeneratedVideo = {
        id: result.interactionId || `transition-${Date.now()}`,
        videoUrl: result.videoUrl,
        prompt: `Transition: ${args.prompt}`,
        aspectRatio: from.aspectRatio,
        duration: result.duration,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceImage: from.sourceImage,
        season: from.season,
        weather: from.weather,
        engine: 'omni',
        storyId: from.storyId || from.id,
        sceneNumber: (from.sceneNumber || 1) + 1,
        interactionId: result.interactionId,
      };
      setSessionCost((prev) => prev + (resolution === '1080p' ? 0.6 : 0.35));
      const fromNow = videoHistoryRef.current.find((v) => v.id === from.id);
      const placed = fromNow ? replaceInStory(fromNow.id, [fromNow, transition]) : undefined;
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
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AppLogo />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                  Khalle <span className="text-emerald-400 text-sm font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">AI Video</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Animate photos into videos with seasonal & weather controls via <span className="text-emerald-400 font-mono">gemini-omni-1.2-flash</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Atmosphere Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
              <span className="text-base">{currentSeasonObj.icon}</span>
              <span className="font-medium text-slate-300">{currentSeasonObj.name}</span>
              <span className="text-slate-500">•</span>
              <span className="text-base">{currentWeatherObj.icon}</span>
              <span className="font-medium text-slate-300">{currentWeatherObj.name}</span>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute jump SFX' : 'Enable jump SFX'}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              <span className="hidden xl:inline">{soundEnabled ? 'SFX On' : 'SFX Muted'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowScriptModal(true)}
              className="px-2.5 py-1.5 bg-gradient-to-r from-amber-950/70 via-purple-950/70 to-slate-900 hover:from-amber-900/80 hover:to-purple-900/80 text-amber-200 border border-amber-500/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Add a Script or Story to generate several video scenes"
            >
              <ScrollText className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Script to Story</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDirectorTarget('main');
                setShowDirectorModal(true);
              }}
              className="px-2.5 py-1.5 bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-700/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Open AI Director Scene Suggestions"
            >
              <Clapperboard className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">AI Director</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDirectorTarget('main');
                setShowStylistModal(true);
              }}
              className="px-2.5 py-1.5 bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-700/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Open AI Stylist: Wardrobe, Costumes & Shoot Guides"
            >
              <Shirt className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">AI Stylist</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGlossaryModal(true)}
              className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              title="Camera Angles & Zooming Terms Guide"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Camera Guide</span>
            </button>

            <button
              type="button"
              onClick={() => setShowWatermarkModal(true)}
              className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Configure Logo Watermark on video (Gear Icon)"
            >
              <Settings className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Logo Watermark</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  watermarkConfig.enabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {watermarkConfig.enabled ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Belly Emblem / Symbol Studio Button */}
            <button
              type="button"
              onClick={() => setShowEmblemModal(true)}
              className="px-2.5 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-700/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Configure Belly Emblem / Symbol Studio"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">{activeEmblem.name}</span>
              <span className="md:hidden">Symbol</span>
            </button>

            {/* Upload Video Clip Button */}
            <button
              type="button"
              onClick={() => openUploadSceneModal(currentVideo, 'after')}
              className="px-2.5 py-1.5 bg-blue-950/60 hover:bg-blue-900/80 text-blue-200 border border-blue-700/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Upload video clip to insert before, after, or append to storyboard"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">Upload Video</span>
            </button>

            {/* Generation Diagnostic Log Buttons */}
            <div className="flex items-center gap-1 bg-indigo-950/50 p-0.5 rounded-lg border border-indigo-700/50">
              <button
                type="button"
                onClick={handleCopyGenerationLogDirect}
                className="px-2.5 py-1.5 hover:bg-indigo-900/70 text-indigo-200 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Copy Generation Diagnostic Log to clipboard to paste into chat"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden lg:inline">Copy Log</span>
              </button>
              <button
                type="button"
                onClick={() => fetchLatestLog(true)}
                className="p-1.5 hover:bg-indigo-900/70 text-indigo-300 rounded-md transition-colors cursor-pointer"
                title="Inspect reference images and prompt manifest sent to Gemini Omni Flash"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handlePhysicsJump}
              className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-lime-400" />
              <span>Bounce ({jumpCount})</span>
            </button>

            <button
              onClick={handleTriggerGenerate}
              disabled={isGenerating}
              className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold text-xs sm:text-sm rounded-lg shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Generating Video...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950 fill-current" />
                  <span>Make Rabbit Jump</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image, Presets, Season & Weather, Parameters (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Active Image Card with Season & Weather Ambiance Visualizer */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" /> Active Subject
              </span>
              <div className="flex items-center gap-2">
                {!isDefaultImage && (
                  <button
                    onClick={handleResetToRabbit}
                    className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Rabbit
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3 h-3 text-slate-400" />
                  <span>Upload Photo</span>
                </button>
              </div>
            </div>

            {/* Thumbnail preview with atmospheric overlays and interactive bounce */}
            <div className="relative group rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[220px] max-h-[280px]">
              {/* Dynamic Seasonal & Weather Background Effects */}
              {selectedSeason === 'winter' && (
                <div className="absolute inset-0 pointer-events-none bg-blue-900/10 backdrop-contrast-105 z-10">
                  <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] opacity-40 animate-pulse" />
                </div>
              )}
              {selectedSeason === 'autumn' && (
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-amber-950/30 via-orange-950/10 to-transparent z-10" />
              )}
              {selectedWeather === 'sunset' && (
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-purple-950/25 via-pink-950/15 to-amber-950/25 mix-blend-color z-10" />
              )}
              {selectedWeather === 'rainbow' && (
                <div className="absolute top-0 inset-x-0 h-16 pointer-events-none bg-gradient-to-r from-red-500/10 via-yellow-500/10 via-green-500/10 to-blue-500/10 blur-sm z-10" />
              )}
              {selectedWeather === 'rain' && (
                <div className="absolute inset-0 pointer-events-none bg-slate-900/20 z-10">
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_90%,#60a5fa_100%)] [background-size:24px_24px] opacity-30" />
                </div>
              )}

              <motion.img
                src={selectedImage}
                alt="Rabbit to animate"
                animate={
                  isPhysicsJumping
                    ? {
                        y: [-20, -70, 0],
                        rotate: [0, -6, 6, 0],
                        scale: [1, 1.08, 0.96, 1],
                      }
                    : { y: 0, rotate: 0, scale: 1 }
                }
                transition={{ duration: 0.55, ease: 'easeInOut' }}
                onClick={handlePhysicsJump}
                className="max-h-[270px] w-auto object-contain cursor-pointer transition-transform hover:brightness-105 z-0"
                title="Click me to make me jump!"
              />

              {/* Floating particles on jump */}
              <AnimatePresence>
                {particles.map((p) => (
                  <motion.span
                    key={p.id}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 0.8 }}
                    animate={{ opacity: 0, x: p.x, y: p.y, scale: 1.4 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    className="absolute text-xl pointer-events-none select-none z-30"
                  >
                    {p.char}
                  </motion.span>
                ))}
              </AnimatePresence>

              {/* Interactive badge overlay */}
              <div
                onClick={handlePhysicsJump}
                className="absolute bottom-2.5 inset-x-3 py-1.5 px-3 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-700/60 flex items-center justify-between text-xs text-slate-300 cursor-pointer hover:bg-slate-900/95 transition-colors z-20"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-medium text-slate-200">
                    {isDefaultImage ? 'Meadow Rabbit' : 'Uploaded Photo'}
                  </span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                    {currentSeasonObj.name} • {currentWeatherObj.name}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  Click to bounce 🐾
                </span>
              </div>
            </div>

            {/* MULTI-ASSET REFERENCE STUDIO & CHARACTER MODEL KIT */}
            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2.5">
              {/* Likeness Lock Header & Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Character Likeness Lock (100% Fidelity)
                  </span>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTraitsTooltip(!showTraitsTooltip)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <span>Locked Traits</span>
                    <Info className="w-3 h-3" />
                  </button>
                  {showTraitsTooltip && (
                    <div className="absolute right-0 top-6 z-30 w-72 p-3 bg-slate-900 border border-emerald-500/40 rounded-xl shadow-2xl text-[11px] text-slate-300 space-y-1.5 animate-fadeIn">
                      <div className="font-bold text-emerald-300 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Zero-Drift Physical Features:
                      </div>
                      <ul className="space-y-1 text-slate-400">
                        <li>• <strong>Tall upright ears</strong> (never drooping or lop-eared)</li>
                        <li>• <strong>Open cheerful grin</strong> with single white buck tooth centered</li>
                        <li>• <strong>Light-pink snout</strong> with embroidered blue eyes</li>
                        <li>• <strong>{activeEmblem.name}</strong> on oval pink belly</li>
                        <li>• <strong>Bright red fleece boots</strong> & pink neck scarf</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* 3 Reference Angles Cards */}
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

              {/* Custom Belly Symbol / Emblem Studio Card */}
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

              {/* Production Cast, Props & Wardrobe Active Bar */}
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
          </div>

          {/* NEW: Season & Weather Studio Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> Season & Weather Studio
              </span>
              <button
                type="button"
                onClick={() => setAutoCompose(!autoCompose)}
                className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1 transition-colors cursor-pointer ${
                  autoCompose
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-600/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="When ON, changing season or weather automatically adapts the video prompt"
              >
                <span>{autoCompose ? '✓ Auto-Sync Prompt' : 'Manual Prompt'}</span>
              </button>
            </div>

            {/* Season Selector */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Select Season</span>
                <span className="text-[10px] text-slate-500 font-normal">Transforms vegetation & environment</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {SEASONS.map((s) => {
                  const isSelected = selectedSeason === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSeasonChange(s.id)}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? `${s.colorClasses} ${s.activeBorder} shadow-sm font-bold`
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xl">{s.icon}</span>
                      <span className="text-xs">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Weather Selector */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Select Weather & Atmosphere</span>
                <span className="text-[10px] text-slate-500 font-normal">Controls sky, light & precipitation</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {WEATHER_OPTIONS.map((w) => {
                  const isSelected = selectedWeather === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => handleWeatherChange(w.id)}
                      className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500/80 text-amber-300 font-semibold shadow-sm'
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-lg shrink-0">{w.icon}</span>
                      <div className="text-left leading-tight truncate">
                        <div className="text-xs truncate">{w.name}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick action button to re-apply atmosphere to prompt */}
            {!autoCompose && (
              <button
                type="button"
                onClick={handleForceApplyAtmosphere}
                className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Apply {currentSeasonObj.name} & {currentWeatherObj.name} to Prompt</span>
              </button>
            )}
          </div>

          {/* Jump Animation Presets */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-lime-400" /> Jump Presets
            </span>
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
          </div>

          {/* Motion Prompt & Video Specs */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-emerald-400" /> Motion & Environment Prompt
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowScriptModal(true)}
                    className="text-[11px] text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 px-2.5 py-0.5 rounded-md font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                    title="Generate multi-scene storyboard from your story or script"
                  >
                    <ScrollText className="w-3 h-3 text-amber-400" />
                    <span>Script to Story</span>
                  </button>
                  <span className="text-[11px] text-slate-500 font-mono">Gemini Omni Flash</span>
                </div>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setAutoCompose(false);
                }}
                rows={3}
                placeholder="Describe how the rabbit jumps, runs, or bounces..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
              />
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
                isExtension={false}
                previousPrompt={currentVideo?.prompt}
              />
            </div>

            {/* Video Parameters: Aspect Ratio, Duration, Resolution */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/60">
              {/* Aspect Ratio */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <Crop className="w-3 h-3 text-slate-400" /> Aspect Ratio
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('9:16')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                      aspectRatio === '9:16'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="w-3 h-4 border border-current rounded-sm" />
                    <span>9:16 Portrait</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                      aspectRatio === '16:9'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="w-4 h-3 border border-current rounded-sm" />
                    <span>16:9 Landscape</span>
                  </button>
                </div>
              </div>

              {/* Duration & Resolution */}
              <div className="flex flex-col gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Duration
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {duration === '20s' ? '2 Scenes Chained' : duration === '30s' ? '3 Scenes Chained' : duration === '15s' ? 'Single Shot Max' : 'Single Shot'}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {([
                      { id: '5s', label: '5s', tip: 'Quick Clip (5s)' },
                      { id: '10s', label: '10s', tip: 'Standard Scene (10s)' },
                      { id: '15s', label: '15s', tip: 'Extended Shot (15s Max Native)' },
                      { id: '20s', label: '20s', tip: '2-Scene Storyboard Sequence (20s)' },
                      { id: '30s', label: '30s', tip: '3-Scene Storyboard Sequence (30s)' },
                    ] as const).map(({ id, label, tip }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setDuration(id)}
                        title={tip}
                        className={`py-1.5 px-0.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer text-center ${
                          duration === id
                            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-950/50'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {(duration === '20s' || duration === '30s') && (
                    <p className="text-[10px] text-cyan-300/90 mt-1.5 flex items-center gap-1 bg-cyan-950/30 border border-cyan-800/40 rounded px-2 py-1">
                      <span>✨ <strong>Continuous Sequence:</strong> Automatically chains consecutive scenes via Gemini Interactions API</span>
                    </p>
                  )}
                  {duration === '15s' && (
                    <p className="text-[10px] text-emerald-300/90 mt-1.5 flex items-center gap-1 bg-emerald-950/30 border border-emerald-800/40 rounded px-2 py-1">
                      <span>🎬 <strong>Single-Shot:</strong> Native 15-second generation powered by Gemini Omni Flash</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">
                    Resolution
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['720p', '1080p'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setResolution(r)}
                        className={`py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          resolution === r
                            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Audio Mode: With Sound vs Silent */}
              <div className="col-span-2 pt-2 border-t border-slate-800/60">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    {audioMode === 'with_sound' ? (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>Audio Mode</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {audioMode === 'with_sound' ? 'Alpine wind, birdsong & bounce SFX' : 'Pure silent visual elegance'}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAudioMode('with_sound')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      audioMode === 'with_sound'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🔊 With Sound</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioMode('silent')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      audioMode === 'silent'
                        ? 'bg-purple-950/60 border-purple-500 text-purple-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🔇 Silent / No Sound</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Cost Per Video Calculator & Transparency Card */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-200">Cost Per Video:</span>
                  <span
                    className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                      estimatedCost.isFree
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {estimatedCost.display}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPricingModal(true)}
                  className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Cost Details</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed flex items-center justify-between">
                <span>
                  Gemini Omni Flash: {duration} @ {resolution} (${estimatedCost.ratePerSec.toFixed(2)}/sec)
                </span>
                <span className="text-[11px] font-mono text-amber-400 font-semibold">
                  {estimatedCost.display}
                </span>
              </div>
            </div>

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

            {/* Big Action Button */}
            <button
              onClick={handleTriggerGenerate}
              disabled={isGenerating}
              className="w-full py-3.5 font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] cursor-pointer bg-gradient-to-r from-emerald-500 via-teal-500 to-lime-400 hover:from-emerald-400 hover:to-lime-300 text-slate-950 shadow-emerald-500/25"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>
                    Generating {currentSeasonObj.name} Video ({progressPercent}%)...
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950 fill-current" />
                  <span>
                    Generate Video with Gemini Omni ({estimatedCost.display})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Video Player, Comparison & Live Preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Main Stage Display Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-emerald-400" /> Animation Theater
                </span>
                {currentVideo && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Ready
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
              {isGenerating ? (
                <div className="p-6 flex flex-col items-center justify-center text-center max-w-md w-full gap-5 z-20">
                  <div className="relative w-24 h-24">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-emerald-400 border-r-teal-400"
                    />
                    <motion.div
                      animate={{ y: [-10, 10, -10] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 flex items-center justify-center text-4xl"
                    >
                      {currentSeasonObj.icon}
                    </motion.div>
                  </div>

                  <div className="space-y-2 w-full">
                    <h3 className="font-bold text-base text-slate-100">
                      Generating {currentSeasonObj.name} Video with Gemini Omni Flash
                    </h3>
                    <p className="text-xs text-slate-400">{progressStep}</p>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                      <motion.div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"
                        style={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Interactive while waiting feature */}
                  <div className="p-3 bg-slate-900/90 border border-slate-700/60 rounded-xl text-left w-full">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-lime-400" /> Tap while you wait:
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Bounces: {jumpCount}</span>
                    </div>
                    <button
                      onClick={handlePhysicsJump}
                      className="w-full py-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <span>Boing! Make the Rabbit Jump in {currentSeasonObj.name}</span> 🐾
                    </button>
                  </div>
                </div>
              ) : currentVideo ? (
                /* Display Video or Comparison View */
                <div className="w-full h-full flex items-center justify-center relative">
                  {compareMode === 'video' && (
                    <div className="relative max-h-[540px] max-w-full flex items-center justify-center">
                      <video
                        ref={videoRef}
                        src={currentVideo.videoUrl}
                        autoPlay
                        loop={isLooping && !playAllContinuous && currentVideo.trimEnd === undefined}
                        playsInline
                        className="max-h-[540px] max-w-full object-contain rounded-lg shadow-2xl"
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => advanceAfterScene(videoRef.current, false)}
                      />
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
                            loop={isLooping && !playAllContinuous && currentVideo.trimEnd === undefined}
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
                  <div className="relative cursor-pointer group" onClick={handlePhysicsJump}>
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
                    <h3 className="font-bold text-lg text-slate-100">
                      Animate in {currentSeasonObj.name} & {currentWeatherObj.name}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Choose your season and weather above, then click below to render your plush rabbit jumping video using Gemini Omni Flash!
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={handlePhysicsJump}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-lime-400" />
                      <span>Tap to Bounce ({jumpCount})</span>
                    </button>
                    <button
                      onClick={() => handleGenerateVideo()}
                      className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                      <span>Make Rabbit Jump Now</span>
                    </button>
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
                  <span>Correct Scene {currentVideo.sceneNumber || 1}</span>
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
                <div className="flex items-center gap-2">
                  <Clapperboard className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                    Storyboard Movie Sequence
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-medium">
                    {currentStoryScenes.length} {currentStoryScenes.length === 1 ? 'Scene' : 'Scenes'} • {Math.round(totalStorySeconds)}s Total
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStartNewStory}
                    className="text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer bg-slate-950 border-slate-700 text-slate-200 hover:border-emerald-500"
                    title="Close this story and start a new one with the next Generate or Upload Video"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>New story</span>
                  </button>

                  {/* Continuous Auto-play toggle */}
                  <button
                    type="button"
                    onClick={() => setPlayAllContinuous(!playAllContinuous)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                      playAllContinuous
                        ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                    title="When ON, plays all scenes sequentially as one continuous movie"
                  >
                    <ListVideo className="w-3.5 h-3.5" />
                    <span>{playAllContinuous ? 'Continuous Movie: ON' : 'Single Scene Loop'}</span>
                  </button>

                  {/* Export the whole story as one MP4 (edit list applied) */}
                  <button
                    type="button"
                    onClick={handleExportStory}
                    disabled={!!storyExport}
                    className="text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer bg-slate-950 border-slate-700 text-slate-200 hover:border-emerald-500 disabled:cursor-wait disabled:opacity-80"
                    title="Download all scenes of this story as one MP4, each cut to its start and end"
                  >
                    {storyExport ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span aria-live="polite">
                      {storyExport
                        ? `${storyExport.step} ${Math.round(storyExport.fraction * 100)}%`
                        : `Export story (${currentStoryScenes.length} ${currentStoryScenes.length === 1 ? 'scene' : 'scenes'})`}
                    </span>
                  </button>

                  {/* Button to open Script to Storyboard modal */}
                  <button
                    type="button"
                    onClick={() => setShowScriptModal(true)}
                    className="px-2.5 py-1 bg-gradient-to-r from-amber-950/70 via-purple-950/70 to-slate-900 border border-amber-500/50 hover:border-amber-400 text-amber-200 font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Generate multi-scene storyboard from a script or story"
                  >
                    <ScrollText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Script to Story</span>
                  </button>

                  {/* Button to upload video clip */}
                  <button
                    type="button"
                    onClick={() => openUploadSceneModal(currentVideo, 'after')}
                    className="px-3 py-1 bg-blue-950/50 hover:bg-blue-900/70 border border-blue-500/40 text-blue-300 font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Upload an external video file to become the scene before, after, or appended to current scene"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>Upload Clip</span>
                  </button>

                  {/* Button to correct current scene */}
                  <button
                    type="button"
                    onClick={() => openCorrectionModal(currentVideo)}
                    className="px-3 py-1 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Refine or re-take the active scene"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Correct Scene {currentVideo.sceneNumber || 1}</span>
                  </button>

                  {/* Button to open extension drawer */}
                  <button
                    type="button"
                    onClick={() => setShowExtensionDrawer(!showExtensionDrawer)}
                    className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Add Next Scene</span>
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
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
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
                          className="shrink-0 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg text-slate-500 hover:text-emerald-300 hover:bg-emerald-950/40 transition-colors cursor-pointer disabled:opacity-40"
                          title={`Smooth the cut between Scene ${currentStoryScenes[idx - 1].sceneNumber} and Scene ${scene.sceneNumber} with a generated transition`}
                          aria-label={`Smooth transition between scene ${currentStoryScenes[idx - 1].sceneNumber} and scene ${scene.sceneNumber}`}
                        >
                          <ChevronRight className="w-4 h-4" />
                          <span className="text-[9px] font-semibold uppercase tracking-wide">Smooth</span>
                        </button>
                      )}
                      <div
                        onClick={() => {
                          setCurrentVideo(scene);
                          setCompareMode('video');
                        }}
                        className={`shrink-0 w-48 p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 group relative ${
                          isSelected
                            ? 'bg-emerald-950/50 border-emerald-500 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                            <Film className="w-3 h-3" /> Scene {scene.sceneNumber || idx + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                              {scene.trimStart !== undefined || scene.trimEnd !== undefined
                                ? `${(scene.trimStart ?? 0).toFixed(1)}–${scene.trimEnd !== undefined ? scene.trimEnd.toFixed(1) : 'end'}s`
                                : scene.duration || '5s'}
                            </span>
                            {/* Quick card action buttons */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCorrectionModal(scene);
                              }}
                              title="Correct this scene"
                              className="p-1 rounded hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                            >
                              <Wrench className="w-3 h-3" />
                            </button>
                            {currentStoryScenes.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Remove Scene ${scene.sceneNumber || idx + 1} from sequence?`)) {
                                    handleDeleteScene(scene);
                                  }
                                }}
                                title="Remove this scene"
                                className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-300 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-300 line-clamp-2 leading-snug">
                          {scene.prompt}
                        </p>

                        {/* Reorder & Insert Video Strip on Card */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/60">
                          {/* Reorder arrows */}
                          <div className="flex items-center gap-1">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveScene(scene.id, 'left');
                                }}
                                title="Move Scene Earlier"
                                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
                              >
                                <MoveLeft className="w-3 h-3" />
                              </button>
                            )}
                            {idx < currentStoryScenes.length - 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveScene(scene.id, 'right');
                                }}
                                title="Move Scene Later"
                                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
                              >
                                <MoveRight className="w-3 h-3" />
                              </button>
                            )}
                            <span className={scene.cost?.includes('Free') ? 'text-emerald-400 font-medium text-[9px]' : 'text-amber-400 text-[9px]'}>
                              {scene.cost || 'Free'}
                            </span>
                          </div>

                          {/* Quick Insert Video Before / After */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentVideo(scene);
                                setCompareMode('video');
                                setShowExtensionDrawer(true);
                              }}
                              title={
                                idx < currentStoryScenes.length - 1
                                  ? 'Generate a new AI scene between this scene and the next'
                                  : 'Generate a new AI scene after this one'
                              }
                              className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/40 font-medium transition-colors cursor-pointer"
                            >
                              + AI
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openUploadSceneModal(scene, 'before');
                              }}
                              title="Upload video clip to insert BEFORE this scene"
                              className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950/60 hover:bg-blue-900 text-blue-300 border border-blue-700/40 font-medium transition-colors cursor-pointer"
                            >
                              + Before
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openUploadSceneModal(scene, 'after');
                              }}
                              title="Upload video clip to insert AFTER this scene"
                              className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950/60 hover:bg-blue-900 text-blue-300 border border-blue-700/40 font-medium transition-colors cursor-pointer"
                            >
                              + After
                            </button>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                {/* Add Next AI Scene Card */}
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                <button
                  type="button"
                  onClick={() => setShowExtensionDrawer(true)}
                  className="shrink-0 w-36 p-3 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500 bg-slate-950/40 hover:bg-emerald-950/20 text-slate-400 hover:text-emerald-300 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                >
                  <PlusCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-semibold text-center leading-tight">
                    Add Scene {currentStoryScenes.length + 1}
                  </span>
                  <span className="text-[9px] text-slate-500">AI Continuation</span>
                </button>

                {/* Upload Video Clip Card */}
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                <button
                  type="button"
                  onClick={() => openUploadSceneModal(undefined, 'append')}
                  className="shrink-0 w-36 p-3 rounded-xl border border-dashed border-blue-700/60 hover:border-blue-500 bg-blue-950/20 hover:bg-blue-950/40 text-blue-300 hover:text-blue-200 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                  title="Upload any video clip to insert into this movie"
                >
                  <Upload className="w-5 h-5 text-blue-400" />
                  <span className="text-xs font-semibold text-center leading-tight">
                    Upload Video Clip
                  </span>
                  <span className="text-[9px] text-blue-400/80">Append / Insert</span>
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

          {/* Stories: every story with its scenes; click a scene to open that story */}
          {videoHistory.length > 0 && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-lime-400" /> Stories ({stories.length})
                </span>
                <button
                  type="button"
                  onClick={handleStartNewStory}
                  className="text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 cursor-pointer bg-slate-950 border-slate-700 text-slate-200 hover:border-emerald-500"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-400" /> New story
                </button>
              </div>
              {!currentVideo && (
                <p className="text-xs text-emerald-200 bg-emerald-950/40 border border-emerald-800/60 rounded-lg p-2.5">
                  New story: generate the first scene at the top of the page, or use Upload Video. Click any scene below to go back to an older story.
                </p>
              )}
              {stories.map(({ storyId, scenes }) => {
                const isOpen = !!currentVideo && (currentVideo.storyId || currentVideo.id) === storyId;
                const seconds = scenes.reduce((sum, sc) => sum + scenePlaySeconds(sc), 0);
                return (
                  <section key={storyId} className={`flex flex-col gap-2 rounded-xl p-2 ${isOpen ? 'bg-emerald-950/20 ring-1 ring-emerald-700/50' : ''}`}>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 min-w-0">
                      <span className={`font-semibold shrink-0 ${isOpen ? 'text-emerald-300' : 'text-slate-200'}`}>
                        {isOpen ? 'Open story' : 'Story'}
                      </span>
                      <span className="truncate">{scenes[0]?.prompt}</span>
                      <span className="shrink-0 font-mono text-slate-500">
                        {scenes.length} {scenes.length === 1 ? 'scene' : 'scenes'} · {Math.round(seconds)}s
                      </span>
                    </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {scenes.map((vid) => (
                  <div
                    key={vid.id}
                    onClick={() => {
                      setCurrentVideo(vid);
                      setCompareMode('video');
                    }}
                    className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 group ${
                      currentVideo?.id === vid.id
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="relative rounded-lg overflow-hidden bg-slate-900 h-24 flex items-center justify-center">
                      <video
                        key={`${vid.id}-${vid.trimStart ?? 0}`}
                        src={vid.videoUrl}
                        preload="metadata"
                        onLoadedMetadata={(e) => {
                          if (vid.trimStart) e.currentTarget.currentTime = vid.trimStart;
                        }}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-transparent transition-colors" />
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] font-mono text-emerald-400">
                        {vid.aspectRatio}
                      </div>
                      {vid.season && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] text-slate-300">
                          {vid.season}
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 text-slate-200">
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-300 font-medium line-clamp-1">{vid.prompt}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{vid.duration}</span>
                      <span className={vid.cost?.includes('Free') ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                        {vid.cost || 'Free'}
                      </span>
                      <span>{vid.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Scene Correction & Re-take Modal */}
      <AnimatePresence>
        {showCorrectionModal && sceneToCorrect && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white">
                        Correct Scene {sceneToCorrect.sceneNumber || 1}
                      </h3>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {sceneToCorrect.duration} • {sceneToCorrect.aspectRatio}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Re-take this scene with custom directing feedback, motion fixes, or seasonal changes.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmblemModal(true)}
                    className="px-2 py-1 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-slate-300 rounded-lg flex items-center gap-1 cursor-pointer"
                    title="Configure Belly Emblem / Symbol Studio"
                  >
                    <Compass className="w-3 h-3 text-cyan-400" />
                    <span className="hidden sm:inline">Symbol:</span>
                    <span className="font-semibold text-cyan-400 truncate max-w-[80px]">
                      {activeEmblem.name}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWatermarkModal(true)}
                    className="px-2 py-1 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-[11px] text-slate-300 rounded-lg flex items-center gap-1 cursor-pointer"
                    title="Configure logo watermark for this take (Gear icon)"
                  >
                    <Settings className="w-3 h-3 text-emerald-400" />
                    <span className="hidden sm:inline">Logo:</span>
                    <span className={`font-semibold ${watermarkConfig.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {watermarkConfig.enabled ? 'ON' : 'OFF'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCorrectionModal(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Current Scene Context Card */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
                <div className="relative w-20 h-16 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                  <video
                    src={sceneToCorrect.videoUrl}
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                      if (sceneToCorrect.trimStart) e.currentTarget.currentTime = sceneToCorrect.trimStart;
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-slate-950/80 text-[8px] font-mono text-emerald-400">
                    Take
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
                    <span>Current Take Prompt:</span>
                    <span className="text-amber-400 font-mono text-[9px]">{sceneToCorrect.cost || 'Free'}</span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 mt-0.5 italic">
                    "{sceneToCorrect.prompt}"
                  </p>
                </div>
              </div>

              {/* Quick Directional Fixes */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Quick Directing Fixes (Tap to Add)</span>
                  <span className="text-[10px] text-slate-500 font-normal">One-click adjustments</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {QUICK_CORRECTION_SUGGESTIONS.map((fix) => (
                    <button
                      key={fix.id}
                      type="button"
                      onClick={() => handleSelectQuickFix(fix)}
                      className="p-2 rounded-lg bg-slate-950/80 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-200 transition-all text-left flex items-start gap-1.5 cursor-pointer text-xs"
                    >
                      <span className="text-base shrink-0">{fix.icon}</span>
                      <span className="line-clamp-2 text-[11px] font-medium leading-tight">{fix.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Directing Notes / What to Correct */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>What Should Be Corrected? (Directing Notes)</span>
                  <span className="text-[10px] text-amber-400/90 font-mono">Appended to generation prompt</span>
                </label>
                <textarea
                  value={correctionFeedback}
                  onChange={(e) => setCorrectionFeedback(e.target.value)}
                  rows={2}
                  placeholder="e.g., Make the landing softer on the grass, face forward and wave fuzzy paw at camera, smile bigger..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
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

              {/* Base Prompt for this scene */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">
                  Base Scene Prompt (Editable)
                </label>
                <textarea
                  value={correctionPrompt}
                  onChange={(e) => setCorrectionPrompt(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
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

              {/* Atmosphere / Season & Weather Override for this Scene */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">
                    Scene Season
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {SEASONS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setCorrectionSeason(s.id)}
                        className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                          correctionSeason === s.id
                            ? `${s.colorClasses} ${s.activeBorder} font-bold`
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-sm">{s.icon}</span>
                        <span className="text-[10px]">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">
                    Scene Weather
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {WEATHER_OPTIONS.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setCorrectionWeather(w.id)}
                        className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          correctionWeather === w.id
                            ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-semibold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-xs">{w.icon}</span>
                        <span className="text-[10px] truncate">{w.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Length of the new take */}
              {(() => {
                const max = correctionMaxSeconds(sceneToCorrect);
                const shown = Math.min(max, correctionSeconds);
                const root = correctionIsRoot(sceneToCorrect);
                return (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                    <label htmlFor="correction-length" className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <span>Scene length</span>
                      <span className="font-mono text-sm normal-case tracking-normal text-amber-300">{shown} s</span>
                    </label>
                    <input
                      id="correction-length"
                      type="range"
                      min={3}
                      max={max}
                      step={1}
                      value={shown}
                      onChange={(e) => setCorrectionSeconds(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>3 s</span>
                      <span>
                        {max} s{' '}
                        {root
                          ? '(new scene from a picture)'
                          : max < 10
                          ? '(room left in the 30 s chain)'
                          : "(continues the scene before; Gemini's limit)"}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* How to Apply: Replace or Save as Alternate */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-200 block">Correction Target:</span>
                  <span className="text-[11px] text-slate-400">Choose how this corrected take is saved</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCorrectionMode('replace')}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      correctionMode === 'replace'
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🔄 Replace Scene {sceneToCorrect.sceneNumber || 1} in Movie
                  </button>
                  <button
                    type="button"
                    onClick={() => setCorrectionMode('duplicate')}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      correctionMode === 'duplicate'
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ➕ Keep Both (Alternate Take)
                  </button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                {currentStoryScenes.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Remove Scene ${sceneToCorrect.sceneNumber || 1} from your movie sequence?`)) {
                        handleDeleteScene(sceneToCorrect);
                      }
                    }}
                    className="px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-transparent hover:border-red-900/50 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Scene from Sequence</span>
                  </button>
                ) : (
                  <div className="text-[11px] text-slate-500">
                    Engine: <strong className="text-amber-400">Gemini Omni Flash</strong>
                  </div>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowCorrectionModal(false)}
                    className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCorrection}
                    disabled={isCorrecting}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isCorrecting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                        <span>Applying Correction ({progressPercent}%)...</span>
                      </>
                    ) : (
                      <>
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Re-take & Apply Correction (~$0.35 USD)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
