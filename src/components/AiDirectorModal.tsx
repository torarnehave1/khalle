import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Clapperboard,
  Film,
  Camera,
  ZoomIn,
  Compass,
  Sun,
  Wand2,
  RefreshCw,
  ArrowRight,
  Play,
  Check,
  Lightbulb,
  Layers,
  HelpCircle,
} from 'lucide-react';

export interface SceneSuggestion {
  id: string;
  title: string;
  conceptSummary: string;
  prompt: string;
  cinematography: {
    perspective: string;
    cameraMotion: string;
    lighting: string;
    pacing?: string;
  };
  whyItWorks: string;
}

interface AiDirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSceneNumber: number;
  previousPrompt?: string;
  currentSeason: string;
  currentWeather: string;
  aspectRatio: string;
  onApplyPrompt: (promptText: string, andGenerate?: boolean) => void;
  onOpenGlossary: () => void;
}

export const AiDirectorModal: React.FC<AiDirectorModalProps> = ({
  isOpen,
  onClose,
  targetSceneNumber,
  previousPrompt,
  currentSeason,
  currentWeather,
  aspectRatio,
  onApplyPrompt,
  onOpenGlossary,
}) => {
  const [sourceMode, setSourceMode] = useState<'previous' | 'user_input'>(
    previousPrompt ? 'previous' : 'user_input'
  );
  const [userIdea, setUserIdea] = useState<string>('');
  const [stylePreference, setStylePreference] = useState<string>('Cinematic & Dramatic');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [directorNote, setDirectorNote] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SceneSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const styleOptions = [
    { id: 'Cinematic & Dramatic', label: 'Cinematic & Dramatic', icon: '🎬' },
    { id: 'Joyful & Playful', label: 'Joyful & Playful', icon: '🌸' },
    { id: 'High-Flying Aerial', label: 'High-Flying Aerial', icon: '🦅' },
    { id: 'Macro & Whimsical', label: 'Macro & Whimsical', icon: '🔍' },
  ];

  const handleGenerateSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/suggest-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previousPrompt: sourceMode === 'previous' ? previousPrompt : undefined,
          userInput: userIdea.trim() || undefined,
          sceneNumber: targetSceneNumber,
          season: currentSeason,
          weather: currentWeather,
          aspectRatio,
          stylePreference,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch suggestions from AI Director.');
      }

      const data = await res.json();
      setDirectorNote(data.directorNote || null);
      setSuggestions(data.suggestions || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error communicating with AI Director.');
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-load suggestions on first open if empty
  React.useEffect(() => {
    if (isOpen && suggestions.length === 0 && !isLoading) {
      handleGenerateSuggestions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl relative flex flex-col gap-4 max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-amber-500/20 border border-purple-500/30 text-purple-300">
                <Clapperboard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                  <span>AI Video Director</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Scene {targetSceneNumber} Continuation
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Intelligent scene suggestions with professional camera angles, zooming, and optical flow
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

          {/* Director Controls Bar */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-3 text-xs">
            {/* Mode Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSourceMode('previous')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    sourceMode === 'previous'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Based on Previous Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode('user_input')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    sourceMode === 'user_input'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>From My Idea / Input</span>
                </button>
              </div>

              {/* Glossary helper link */}
              <button
                type="button"
                onClick={onOpenGlossary}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Camera Terms & Zoom Guide</span>
              </button>
            </div>

            {/* Context display or user input */}
            {sourceMode === 'previous' ? (
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[11px] text-slate-300">
                <span className="text-slate-400 font-semibold block mb-0.5">
                  Analyzing Previous Scene Continuity:
                </span>
                <p className="line-clamp-2 italic text-slate-300 font-mono">
                  "{previousPrompt || 'Scene 1: Plush rabbit leaps high in alpine meadow with kicking red boots.'}"
                </p>
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                  Describe what you want to happen in your own words (or leave blank for pure AI creativity):
                </label>
                <input
                  type="text"
                  value={userIdea}
                  onChange={(e) => setUserIdea(e.target.value)}
                  placeholder="e.g. rabbit lands on a boulder, does a funny celebratory dance, camera zooms in close..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            )}

            {/* Style preference + Re-generate button */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Directing Mood:</span>
                <div className="flex items-center gap-1">
                  {styleOptions.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStylePreference(st.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer flex items-center gap-1 ${
                        stylePreference === st.id
                          ? 'bg-purple-950/60 border-purple-500 text-purple-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{st.icon}</span>
                      <span>{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateSuggestions}
                disabled={isLoading}
                className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Directing Scenes...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Re-Roll Scene Ideas</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Director Commentary Banner */}
          {directorNote && !isLoading && (
            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 flex items-start gap-2.5">
              <span className="text-base shrink-0">🎬</span>
              <div>
                <strong className="text-purple-300 font-semibold block text-[11px] uppercase tracking-wider mb-0.5">
                  Director's Continuity Note
                </strong>
                <p className="text-[11px] text-purple-200/90 leading-relaxed">
                  {directorNote}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Suggestions List */}
          <div className="overflow-y-auto pr-1 flex-1 space-y-3">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
                <span>The AI Director is designing 3 continuous camera angles & zoom sequences...</span>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Click "Re-Roll Scene Ideas" above to generate scene suggestions.
              </div>
            ) : (
              suggestions.map((sugg, idx) => (
                <div
                  key={sugg.id || idx}
                  className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col gap-3 group text-xs shadow-lg"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs font-mono">
                        {idx + 1}
                      </span>
                      <h4 className="font-bold text-white text-sm">
                        {sugg.title}
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-400 italic">
                      {sugg.conceptSummary}
                    </span>
                  </div>

                  {/* Cinematography Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="px-2 py-0.5 rounded-md bg-slate-900 border border-amber-500/30 text-amber-300 text-[10px] font-medium flex items-center gap-1">
                      <Compass className="w-3 h-3 text-amber-400" />
                      <span>{sugg.cinematography.perspective}</span>
                    </div>
                    <div className="px-2 py-0.5 rounded-md bg-slate-900 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium flex items-center gap-1">
                      <ZoomIn className="w-3 h-3 text-emerald-400" />
                      <span>{sugg.cinematography.cameraMotion}</span>
                    </div>
                    <div className="px-2 py-0.5 rounded-md bg-slate-900 border border-sky-500/30 text-sky-300 text-[10px] font-medium flex items-center gap-1">
                      <Sun className="w-3 h-3 text-sky-400" />
                      <span>{sugg.cinematography.lighting}</span>
                    </div>
                    {sugg.cinematography.pacing && (
                      <div className="px-2 py-0.5 rounded-md bg-slate-900 border border-purple-500/30 text-purple-300 text-[10px] font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span>{sugg.cinematography.pacing}</span>
                      </div>
                    )}
                  </div>

                  {/* Prompt Text Preview */}
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/90 text-slate-200 font-mono text-[11px] leading-relaxed select-all">
                    "{sugg.prompt}"
                  </div>

                  {/* Why it works educational pill */}
                  <div className="flex items-start gap-1.5 text-[11px] text-slate-400 bg-slate-900/50 p-2 rounded-lg border border-slate-800/60">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Why this works:</strong> {sugg.whyItWorks}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => {
                        onApplyPrompt(sugg.prompt, false);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Load into Prompt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onApplyPrompt(sugg.prompt, true);
                        onClose();
                      }}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Use & Synthesize Video</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Powered by Gemini Omni Flash Scene Continuity Engine</span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
