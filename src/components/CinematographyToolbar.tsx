import React, { useState } from 'react';
import {
  Sparkles,
  Camera,
  ZoomIn,
  Compass,
  Sun,
  Wand2,
  RefreshCw,
  HelpCircle,
  Plus,
  Check,
  Clapperboard,
  ChevronDown,
  Info,
} from 'lucide-react';
import {
  CINEMA_PERSPECTIVES,
  CINEMA_ZOOM_AND_MOTIONS,
  CINEMA_LIGHTINGS,
  CinemaTerm,
} from '../data/cinematographyGuide';

interface CinematographyToolbarProps {
  currentPrompt: string;
  onUpdatePrompt: (newPrompt: string) => void;
  onOpenDirectorModal: () => void;
  onOpenGlossary: () => void;
  season?: string;
  weather?: string;
  isExtension?: boolean;
  previousPrompt?: string;
}

export const CinematographyToolbar: React.FC<CinematographyToolbarProps> = ({
  currentPrompt,
  onUpdatePrompt,
  onOpenDirectorModal,
  onOpenGlossary,
  season = 'spring',
  weather = 'sunny',
  isExtension = false,
  previousPrompt,
}) => {
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [enhancementFeedback, setEnhancementFeedback] = useState<string | null>(null);
  const [activeTooltipTerm, setActiveTooltipTerm] = useState<CinemaTerm | null>(null);
  const [activeCategory, setActiveCategory] = useState<'quick_terms' | 'more'>('quick_terms');

  const handleEnhancePrompt = async () => {
    setIsEnhancing(true);
    setEnhancementFeedback(null);
    try {
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawPrompt: currentPrompt.trim(),
          season,
          weather,
          isExtension,
          previousPrompt,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to enhance prompt.');
      }

      const data = await res.json();
      if (data.enhancedPrompt) {
        onUpdatePrompt(data.enhancedPrompt);
        setEnhancementFeedback(
          `✨ Enhanced with ${data.perspectiveUsed} & ${data.cameraMotionUsed}! ${data.directorInsight || ''}`
        );
        setTimeout(() => setEnhancementFeedback(null), 6000);
      }
    } catch (err: any) {
      console.error(err);
      setEnhancementFeedback('⚠️ Could not enhance prompt. Try adding a camera chip below.');
      setTimeout(() => setEnhancementFeedback(null), 4000);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleInsertTerm = (term: CinemaTerm) => {
    const snippet = term.promptSnippet;
    let updated = currentPrompt.trim();

    // If prompt is empty, start with snippet
    if (!updated) {
      updated = `The plush rabbit leaps high into the air. ${snippet}.`;
    } else {
      // Append if not already present
      if (!updated.toLowerCase().includes(term.label.toLowerCase())) {
        updated = `${updated} Shot with ${snippet}.`;
      }
    }

    onUpdatePrompt(updated);
    setEnhancementFeedback(`Added: "${term.label}" (${term.tagline})`);
    setTimeout(() => setEnhancementFeedback(null), 3000);
  };

  return (
    <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
      {/* Action Bar: AI Director + Enhance with Zoom + Cheat Sheet Link */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={onOpenDirectorModal}
            className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500 hover:from-purple-500 hover:to-indigo-400 text-white font-bold rounded-lg text-[11px] flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Suggest complete next video scene with camera angles & motion"
          >
            <Clapperboard className="w-3.5 h-3.5" />
            <span>AI Director Suggestions</span>
          </button>

          <button
            type="button"
            onClick={handleEnhancePrompt}
            disabled={isEnhancing}
            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            title="Add professional camera perspective and optical zoom terms to your current prompt"
          >
            {isEnhancing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Enhancing...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Enhance with Camera & Zoom</span>
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenGlossary}
          className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer ml-auto"
          title="Learn how perspective and optical zooming improve AI video quality"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Camera Terms Guide</span>
        </button>
      </div>

      {/* Enhancement feedback toast */}
      {enhancementFeedback && (
        <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-[11px] text-emerald-300 flex items-start gap-1.5 animate-fadeIn">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <span>{enhancementFeedback}</span>
        </div>
      )}

      {/* Quick Cinematography Terms Pills */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1">
            <Camera className="w-3 h-3 text-amber-400" /> Quick Camera Perspective & Zoom Chips:
          </span>
          <span className="text-[10px] text-slate-500">Click to add to prompt</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {/* Dedicated Reference Emblem Morph Chip */}
          <button
            type="button"
            onClick={() => {
              const snippet = "The blue threads on his fleece chest begin to glow with a soft azure light, smoothly unspooling into the exact eight-armed emblem design shown in the attached reference photo, settling as crisp blue embroidery.";
              let updated = currentPrompt.trim();
              if (!updated) {
                updated = snippet;
              } else if (!updated.toLowerCase().includes('reference photo') && !updated.toLowerCase().includes('reference image')) {
                updated = `${updated} ${snippet}`;
              }
              onUpdatePrompt(updated);
              setEnhancementFeedback("Added: Reference Emblem Transform Directive");
              setTimeout(() => setEnhancementFeedback(null), 3000);
            }}
            className="px-2 py-1 rounded-md bg-gradient-to-r from-cyan-950 to-blue-950 border border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-900/50 text-cyan-200 hover:text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
            title="Link scene action directly to the attached reference photo emblem"
          >
            <span>✨</span>
            <span>Morph to Reference Emblem</span>
            <Plus className="w-2.5 h-2.5 opacity-70" />
          </button>
          {CINEMA_ZOOM_AND_MOTIONS.filter((t) => t.id.startsWith('drone-shot')).map((term) => (
            <button
              key={term.id}
              type="button"
              onClick={() => handleInsertTerm(term)}
              onMouseEnter={() => setActiveTooltipTerm(term)}
              onMouseLeave={() => setActiveTooltipTerm(null)}
              className="px-2 py-1 rounded-md bg-gradient-to-r from-purple-950/80 to-slate-900 border border-purple-500/40 hover:border-purple-400 hover:bg-purple-900/40 text-purple-200 hover:text-white text-[10px] font-semibold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
            >
              <span>{term.icon}</span>
              <span>{term.label}</span>
              <Plus className="w-2.5 h-2.5 opacity-60" />
            </button>
          ))}

          {/* Top Perspective Chips */}
          {CINEMA_PERSPECTIVES.slice(0, 3).map((term) => (
            <button
              key={term.id}
              type="button"
              onClick={() => handleInsertTerm(term)}
              onMouseEnter={() => setActiveTooltipTerm(term)}
              onMouseLeave={() => setActiveTooltipTerm(null)}
              className="px-2 py-1 rounded-md bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-300 hover:text-amber-200 text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>{term.icon}</span>
              <span>{term.label}</span>
              <Plus className="w-2.5 h-2.5 opacity-50" />
            </button>
          ))}

          {/* Top Zoom & Motion Chips */}
          {CINEMA_ZOOM_AND_MOTIONS.filter((t) => !t.id.startsWith('drone-shot')).slice(0, 3).map((term) => (
            <button
              key={term.id}
              type="button"
              onClick={() => handleInsertTerm(term)}
              onMouseEnter={() => setActiveTooltipTerm(term)}
              onMouseLeave={() => setActiveTooltipTerm(null)}
              className="px-2 py-1 rounded-md bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 text-slate-300 hover:text-emerald-200 text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>{term.icon}</span>
              <span>{term.label}</span>
              <Plus className="w-2.5 h-2.5 opacity-50" />
            </button>
          ))}

          {/* Top Lighting Chip */}
          {CINEMA_LIGHTINGS.slice(0, 1).map((term) => (
            <button
              key={term.id}
              type="button"
              onClick={() => handleInsertTerm(term)}
              onMouseEnter={() => setActiveTooltipTerm(term)}
              onMouseLeave={() => setActiveTooltipTerm(null)}
              className="px-2 py-1 rounded-md bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-900 text-slate-300 hover:text-sky-200 text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>{term.icon}</span>
              <span>{term.label}</span>
              <Plus className="w-2.5 h-2.5 opacity-50" />
            </button>
          ))}
        </div>

        {/* Hover / Active Chip explanation tooltip */}
        {activeTooltipTerm && (
          <div className="p-2 rounded-lg bg-slate-900 border border-amber-500/30 text-[10px] text-slate-300 space-y-0.5">
            <span className="font-bold text-amber-300 flex items-center gap-1">
              <span>{activeTooltipTerm.icon}</span>
              <span>{activeTooltipTerm.label} ({activeTooltipTerm.tagline})</span>
            </span>
            <p className="text-slate-400">{activeTooltipTerm.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
};
