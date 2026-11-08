import React, { useState } from 'react';
import {
  X,
  ScrollText,
  Sparkles,
  BookOpen,
  Film,
  Camera,
  Layers,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Wand2,
  Play,
  RotateCcw,
  Shirt,
  Volume2,
  VolumeX,
  Clock,
  Compass,
  ChevronRight,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';

export interface ScriptSceneSuggestion {
  sceneNumber: number;
  title: string;
  storyBeat: string;
  videoPrompt: string;
  cameraPerspective: string;
  cameraMotion: string;
  season: string;
  weather: string;
  clothingTitle?: string;
  clothingDirective?: string;
  audioMode?: string;
  soundDescription?: string;
  directorTip: string;
}

export interface ScriptStoryboardPlan {
  storyTitle: string;
  storyLogline: string;
  totalDurationEstimate?: string;
  scenes: ScriptSceneSuggestion[];
  directingSummary?: string;
  createdAt: string;
}

interface ScriptToStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyScene: (scene: ScriptSceneSuggestion) => void;
  onAdoptPlan: (plan: ScriptStoryboardPlan) => void;
  activePlan: ScriptStoryboardPlan | null;
}

const PRESET_SCRIPTS = [
  {
    id: 'winter_cabin',
    title: '❄️ Cozy Winter Cabin Adventure',
    genre: 'Winter • Cozy • Adventure',
    text: `A gentle snowfall covers the pine trees in an alpine valley. The cheerful green plush rabbit with red boots steps out from a hollow cedar log, spotting tiny footprints in fresh powder. The rabbit follows the tracks to discover an old wooden cabin with smoke drifting from the chimney, where a friendly owl sits on the porch. Together by a warm outdoor campfire, the rabbit enjoys a steaming cup of hot cocoa before celebrating with joyful mid-air leaps in the snow.`,
  },
  {
    id: 'spring_butterfly',
    title: '🌸 Alpine Spring Butterfly Quest',
    genre: 'Spring • Joyful • Nature',
    text: `On a crisp, sunny spring morning, the alpine meadows burst into yellow buttercups and purple gentian flowers. The plush rabbit wakes up, kicks its shiny red rubber boots, and bounces through the meadow chasing a sparkling azure butterfly. The chase leads across a babbling brook on smooth stepping stones to a giant sun-warmed granite boulder overlooking the snow-capped mountain peaks, where the rabbit waves happily at the sky.`,
  },
  {
    id: 'autumn_sled',
    title: '🍂 Autumn Mystery Wooden Sled',
    genre: 'Autumn • Golden Light • Playful',
    text: `Golden amber and crimson leaves swirl in a brisk autumn breeze across the mountain trail. The green plush rabbit discovers a vintage handcrafted wooden alpine sled with curved steel runners resting near an ancient hollow oak. The rabbit hops eagerly onto the sled, glides smoothly down the leaf-covered slope with ears fluttering in the wind, and comes to a gentle stop in a bed of soft fallen leaves.`,
  },
  {
    id: 'rainy_rainbow',
    title: '🌧️ Rainy Day Raincoat & Rainbow',
    genre: 'Rain • Weather • Colorful',
    text: `Raindrops start pattering on the lush meadow grass as dark cozy storm clouds gather. The plush rabbit puts on a bright canary-yellow hooded rain slicker and splashes enthusiastically through huge puddle reflections. As the storm passes, golden sunlight breaks through the clouds, painting a vibrant double rainbow arching over the distant peaks while water droplets sparkle like diamonds.`,
  },
];

export const ScriptToStoryModal: React.FC<ScriptToStoryModalProps> = ({
  isOpen,
  onClose,
  onApplyScene,
  onAdoptPlan,
  activePlan,
}) => {
  const [scriptText, setScriptText] = useState<string>('');
  const [sceneCount, setSceneCount] = useState<number>(4);
  const [tone, setTone] = useState<string>('cinematic & playful');
  const [preferredSeason, setPreferredSeason] = useState<string>('any');
  const [preferredWeather, setPreferredWeather] = useState<string>('any');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<ScriptStoryboardPlan | null>(activePlan);
  const [copiedSceneIndex, setCopiedSceneIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!scriptText.trim()) {
      setErrorMessage('Please type or choose a story/script outline first.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setGenerationStep('Analyzing narrative arc & emotional beats...');

    try {
      const stepInterval = setInterval(() => {
        setGenerationStep((prev) => {
          if (prev.includes('Analyzing')) {
            return 'Deconstructing story into chronological video scenes...';
          } else if (prev.includes('Deconstructing')) {
            return 'Synthesizing camera angles, optical zooms & physics prompts with Gemini 3.8 Flash...';
          } else if (prev.includes('Synthesizing')) {
            return 'Harmonizing wardrobe, audio cues, and continuity for Gemini Omni Flash...';
          }
          return prev;
        });
      }, 1400);

      const response = await fetch('/api/script-to-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: scriptText.trim(),
          targetSceneCount: sceneCount,
          preferredSeason: preferredSeason !== 'any' ? preferredSeason : undefined,
          preferredWeather: preferredWeather !== 'any' ? preferredWeather : undefined,
          tone,
        }),
      });

      clearInterval(stepInterval);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate storyboard from script.');
      }

      const newPlan: ScriptStoryboardPlan = {
        storyTitle: data.storyTitle,
        storyLogline: data.storyLogline,
        totalDurationEstimate: data.totalDurationEstimate || `${data.scenes.length * 5}s`,
        scenes: data.scenes,
        directingSummary: data.directingSummary,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setGeneratedPlan(newPlan);
    } catch (err: any) {
      console.error('[ScriptToStoryModal] Error:', err);
      setErrorMessage(err.message || 'Error generating storyboard scenes.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleCopyPrompt = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedSceneIndex(idx);
    setTimeout(() => setCopiedSceneIndex(null), 2000);
  };

  const handleApplySingleScene = (scene: ScriptSceneSuggestion) => {
    onApplyScene(scene);
    onClose();
  };

  const handleAdoptAll = (plan: ScriptStoryboardPlan) => {
    onAdoptPlan(plan);
    if (plan.scenes.length > 0) {
      onApplyScene(plan.scenes[0]);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-600/30 border border-amber-500/40 text-amber-300 flex items-center justify-center shadow-inner">
              <ScrollText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Script & Story to Multi-Scene Storyboard
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                  GEMINI 3.8 SCREENPLAY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Paste your story or script — AI will breakdown the plot into connected, ready-to-animate video scenes.
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <span className="font-bold">Error:</span> {errorMessage}
            </div>
          )}

          {/* Mode 1: Input Script / Story (when no plan is generated or editing) */}
          {!generatedPlan || isGenerating ? (
            <div className="space-y-5">
              {/* Preset Story Suggestions */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Choose a Ready-to-FilmMini Story (or write your own below):</span>
                  <span className="text-[10px] text-amber-400 font-medium">1-Click Inspiration</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRESET_SCRIPTS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setScriptText(preset.text)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        scriptText === preset.text
                          ? 'bg-amber-950/40 border-amber-500/70 text-amber-100 shadow-sm'
                          : 'bg-slate-950/70 hover:bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                          {preset.title}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                          {preset.genre}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {preset.text}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Script / Story Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Your Story, Outline, or Screenplay:</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {scriptText.length} characters
                  </span>
                </div>
                <textarea
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  disabled={isGenerating}
                  rows={4}
                  placeholder="Paste your story here... e.g., 'The green plush rabbit gets lost in a winter pine forest, finds a cozy campfire with hot cocoa, and meets a wise owl who guides them home across sparkling snowdrifts.'"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors leading-relaxed resize-y"
                />
              </div>

              {/* Generation Controls: Scene count, Tone, Season */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                {/* Target Scene Count */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Target Scene Count
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[2, 3, 4, 5].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSceneCount(count)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          sceneCount === count
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {count} Scenes ({count * 5}s)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Story Atmosphere & Tone
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-1.5 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="cinematic & playful">Cinematic & Playful (Default)</option>
                    <option value="heartwarming & cozy">Heartwarming & Cozy</option>
                    <option value="action & energetic jump">High Energy & Leaping</option>
                    <option value="magical & fairy-tale">Magical & Fairy-tale Wonder</option>
                    <option value="epic nature documentary">Epic Alpine Nature</option>
                  </select>
                </div>

                {/* Primary Season Constraint */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Season Progression
                  </label>
                  <select
                    value={preferredSeason}
                    onChange={(e) => setPreferredSeason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-1.5 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="any">Auto (Follow Story Mood)</option>
                    <option value="winter">Winter (Snow & Frost)</option>
                    <option value="spring">Spring (Wildflowers & Bloom)</option>
                    <option value="summer">Summer (Sunbeams & Lakes)</option>
                    <option value="autumn">Autumn (Golden Foliage)</option>
                  </select>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !scriptText.trim()}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Wand2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>{generationStep || 'Analyzing screenplay...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      <span>Deconstruct Story into {sceneCount} Video Scenes</span>
                      <ArrowRight className="w-4 h-4 text-slate-950" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Mode 2: Review Generated Storyboard Plan */
            <div className="space-y-5">
              {/* Plan Header Card */}
              <div className="p-4 bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-900 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-300 font-mono uppercase tracking-wider">
                      🎬 Storyboard Roadmap
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                      {generatedPlan.scenes.length} Scenes • {generatedPlan.totalDurationEstimate || '20s Total'}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white mt-1">
                    {generatedPlan.storyTitle}
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5 italic">
                    "{generatedPlan.storyLogline}"
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setGeneratedPlan(null)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                    title="Write a different script"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Edit Script</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdoptAll(generatedPlan)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Adopt Full Storyboard</span>
                  </button>
                </div>
              </div>

              {/* Directing Summary if present */}
              {generatedPlan.directingSummary && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-300">Director's Overview: </span>
                    {generatedPlan.directingSummary}
                  </div>
                </div>
              )}

              {/* Sequential Scene Cards */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Suggested Video Scenes (Chronological Order):
                  </h5>
                  <span className="text-[10px] text-slate-500">
                    Click "Load Scene" on any scene to preview or animate
                  </span>
                </div>

                {generatedPlan.scenes.map((scene, idx) => (
                  <div
                    key={scene.sceneNumber || idx}
                    className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-all space-y-3 relative group"
                  >
                    {/* Scene Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold font-mono text-xs border border-amber-500/30">
                          Scene {scene.sceneNumber || idx + 1}
                        </span>
                        <h6 className="font-bold text-sm text-white">
                          {scene.title}
                        </h6>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyPrompt(scene.videoPrompt, idx)}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          title="Copy prompt to clipboard"
                        >
                          {copiedSceneIndex === idx ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplySingleScene(scene)}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-md text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-slate-950" />
                          <span>Load This Scene</span>
                        </button>
                      </div>
                    </div>

                    {/* Story Beat Narrative Context */}
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs">
                      <span className="font-semibold text-purple-300">Story Moment: </span>
                      <span className="text-slate-200">{scene.storyBeat}</span>
                    </div>

                    {/* Production Video Prompt */}
                    <div>
                      <label className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
                        Video Generation Prompt (Gemini Omni Flash):
                      </label>
                      <p className="p-2.5 rounded-lg bg-black/60 border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed select-text">
                        {scene.videoPrompt}
                      </p>
                    </div>

                    {/* Tags row: Camera, Zoom, Season, Weather, Wardrobe */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-amber-300 flex items-center gap-1">
                        <Camera className="w-3 h-3 text-amber-400" />
                        <span>{scene.cameraPerspective}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-teal-300 flex items-center gap-1">
                        <Compass className="w-3 h-3 text-teal-400" />
                        <span>{scene.cameraMotion}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-sky-300 capitalize">
                        {scene.season} • {scene.weather}
                      </span>

                      {scene.clothingTitle && (
                        <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/60 text-[11px] text-purple-200 flex items-center gap-1">
                          <Shirt className="w-3 h-3 text-purple-400" />
                          <span>{scene.clothingTitle}</span>
                        </span>
                      )}

                      {scene.soundDescription && (
                        <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-[11px] text-emerald-200 flex items-center gap-1">
                          <Volume2 className="w-3 h-3 text-emerald-400" />
                          <span className="truncate max-w-[200px]" title={scene.soundDescription}>
                            {scene.soundDescription}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Director tip */}
                    <div className="text-[11px] text-slate-400 flex items-start gap-1.5 italic pt-1 border-t border-slate-900">
                      <span className="text-amber-400 not-italic font-semibold shrink-0">💡 Director Note:</span>
                      <span>{scene.directorTip}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Footer Actions */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 backdrop-blur-md">
                <div className="text-xs text-slate-400">
                  Ready to film? Click <span className="text-white font-semibold">Adopt Full Storyboard</span> to queue the full roadmap into your storyboard sequence.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplySingleScene(generatedPlan.scenes[0])}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Load Scene 1 Only
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdoptAll(generatedPlan)}
                    className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Adopt Full Storyboard & Start Scene 1</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
