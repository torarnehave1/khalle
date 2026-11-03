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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Default provided rabbit asset path
const DEFAULT_RABBIT_PATH = '/assets/aistudio/1790924612634-1_cd314286.jpg';

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

interface GeneratedVideo {
  id: string;
  videoUrl: string;
  prompt: string;
  aspectRatio: '9:16' | '16:9';
  duration: string;
  timestamp: string;
  sourceImage: string;
  season?: string;
  weather?: string;
}

export default function App() {
  // Image selection state
  const [selectedImage, setSelectedImage] = useState<string>(DEFAULT_RABBIT_PATH);
  const [isDefaultImage, setIsDefaultImage] = useState<boolean>(true);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');

  // Jump Action & Environment state
  const [activePreset, setActivePreset] = useState<string>(JUMP_PRESETS[0].id);
  const [selectedSeason, setSelectedSeason] = useState<string>('spring');
  const [selectedWeather, setSelectedWeather] = useState<string>('sunny');
  const [autoCompose, setAutoCompose] = useState<boolean>(true);

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
  const [duration, setDuration] = useState<'5s' | '10s'>('5s');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result & Player state
  const [currentVideo, setCurrentVideo] = useState<GeneratedVideo | null>(null);
  const [videoHistory, setVideoHistory] = useState<GeneratedVideo[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [compareMode, setCompareMode] = useState<'video' | 'split' | 'photo'>('video');

  // Interactive jump physics simulator state
  const [jumpCount, setJumpCount] = useState<number>(0);
  const [isPhysicsJumping, setIsPhysicsJumping] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; char: string }[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Active season and weather objects
  const currentSeasonObj = useMemo(
    () => SEASONS.find((s) => s.id === selectedSeason) || SEASONS[0],
    [selectedSeason]
  );
  const currentWeatherObj = useMemo(
    () => WEATHER_OPTIONS.find((w) => w.id === selectedWeather) || WEATHER_OPTIONS[0],
    [selectedWeather]
  );

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
    setSelectedImage(DEFAULT_RABBIT_PATH);
    setIsDefaultImage(true);
    setImageMimeType('image/jpeg');
    setSelectedSeason('spring');
    setSelectedWeather('sunny');
    setActivePreset(JUMP_PRESETS[0].id);
    setPrompt(composePrompt(JUMP_PRESETS[0].baseAction, 'spring', 'sunny'));
    setAspectRatio('9:16');
    setErrorMessage(null);
  };

  // Generate video via Gemini Interactions API
  const handleGenerateVideo = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setProgressPercent(10);
    setProgressStep(`Applying ${currentSeasonObj.name} season & ${currentWeatherObj.name} weather...`);

    const progressInterval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev < 30) {
          setProgressStep(`Connecting to gemini-omni-1.1-flash (${currentSeasonObj.badge})...`);
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
      const payload: any = {
        prompt,
        aspectRatio,
        duration,
        resolution,
        season: selectedSeason,
        weather: selectedWeather,
      };

      if (isDefaultImage) {
        payload.imagePath = DEFAULT_RABBIT_PATH;
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

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to animate video. Please check your Gemini API key and try again.');
      }

      setProgressPercent(100);
      setProgressStep('Complete! Loading generated animation...');

      const newVideo: GeneratedVideo = {
        id: data.interactionId || `vid-${Date.now()}`,
        videoUrl: data.videoUrl,
        prompt,
        aspectRatio,
        duration,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceImage: selectedImage,
        season: selectedSeason,
        weather: selectedWeather,
      };

      setCurrentVideo(newVideo);
      setVideoHistory((prev) => [newVideo, ...prev]);
      setCompareMode('video');
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error('Video generation error:', err);
      setErrorMessage(err.message || 'An error occurred while generating the video.');
    } finally {
      setIsGenerating(false);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-lime-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-xl">
                🐇
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                  RabbitHop <span className="text-emerald-400 text-sm font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">AI Video</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Animate photos into videos with seasonal & weather controls via <span className="text-emerald-400 font-mono">gemini-omni-1.1-flash</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Atmosphere Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
              <span className="text-base">{currentSeasonObj.icon}</span>
              <span className="font-medium text-slate-300">{currentSeasonObj.name}</span>
              <span className="text-slate-500">•</span>
              <span className="text-base">{currentWeatherObj.icon}</span>
              <span className="font-medium text-slate-300">{currentWeatherObj.name}</span>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute jump SFX' : 'Enable jump SFX'}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              <span className="hidden lg:inline">{soundEnabled ? 'SFX On' : 'SFX Muted'}</span>
            </button>

            <button
              onClick={handlePhysicsJump}
              className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-lime-400" />
              <span>Bounce ({jumpCount})</span>
            </button>

            <button
              onClick={handleGenerateVideo}
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-emerald-400" /> Motion & Environment Prompt
                </label>
                <span className="text-[11px] text-slate-500 font-mono">Gemini Omni Flash</span>
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
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">
                    Duration
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['5s', '10s'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDuration(d)}
                        className={`py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          duration === d
                            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
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
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-red-300">Animation Request Note</p>
                  <p className="text-red-200/90 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Big Action Button */}
            <button
              onClick={handleGenerateVideo}
              disabled={isGenerating}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-lime-400 hover:from-emerald-400 hover:to-lime-300 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Generating Video in {currentSeasonObj.name}...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950 fill-current" />
                  <span>
                    Make Rabbit Jump in {currentSeasonObj.name} ({currentWeatherObj.name})
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
                    <video
                      ref={videoRef}
                      src={currentVideo.videoUrl}
                      autoPlay
                      loop={isLooping}
                      playsInline
                      className="max-h-[540px] max-w-full object-contain rounded-lg"
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
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
                          Gemini Omni ({currentVideo.season || 'Video'})
                        </span>
                        <video
                          src={currentVideo.videoUrl}
                          autoPlay
                          loop
                          playsInline
                          className="max-h-[460px] object-contain rounded-lg border border-emerald-500/40"
                        />
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
                      onClick={handleGenerateVideo}
                      className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                      <span>Make Rabbit Jump Now</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

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

                {/* Download */}
                <button
                  onClick={() => downloadVideo(currentVideo.videoUrl, `rabbit-jump-${currentVideo.season || 'take'}-${currentVideo.aspectRatio}.mp4`)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MP4</span>
                </button>
              </div>
            )}
          </div>

          {/* Video History Gallery */}
          {videoHistory.length > 0 && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-lime-400" /> Generated Takes ({videoHistory.length})
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {videoHistory.map((vid) => (
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
                        src={vid.videoUrl}
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
                      <span>{vid.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
