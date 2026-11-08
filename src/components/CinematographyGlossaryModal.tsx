import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Camera,
  ZoomIn,
  Eye,
  Film,
  Sparkles,
  Lightbulb,
  Check,
  Compass,
  ArrowRight,
  Sun,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  CINEMA_PERSPECTIVES,
  CINEMA_ZOOM_AND_MOTIONS,
  CINEMA_LIGHTINGS,
  CINEMA_PHYSICS,
  CinemaTerm,
} from '../data/cinematographyGuide';

interface CinematographyGlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTerm?: (snippet: string, label: string) => void;
}

export const CinematographyGlossaryModal: React.FC<CinematographyGlossaryModalProps> = ({
  isOpen,
  onClose,
  onInsertTerm,
}) => {
  const [activeTab, setActiveTab] = useState<'perspective' | 'zoom_motion' | 'lighting' | 'physics' | 'guide'>('zoom_motion');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUseTerm = (term: CinemaTerm) => {
    if (onInsertTerm) {
      onInsertTerm(term.promptSnippet, term.label);
      setCopiedId(term.id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl relative flex flex-col gap-4 max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                  <span>AI Cinematographer’s Guide</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Omni Flash Directing
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  How perspective, optical zooming, and camera movement instruct AI video diffusion
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

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800/80 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('zoom_motion')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'zoom_motion'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Camera Zoom & Motion</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('perspective')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'perspective'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Perspective & Angles</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('lighting')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'lighting'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Lighting & Atmosphere</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('physics')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'physics'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Physics & Timing</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ml-auto ${
                activeTab === 'guide'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5 text-emerald-400" />
              <span>The Video Prompting Secret</span>
            </button>
          </div>

          {/* Content Body */}
          <div className="overflow-y-auto pr-1 flex-1 space-y-3">
            {activeTab === 'guide' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/30 text-xs text-slate-300 space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <Film className="w-4 h-4 text-amber-400" />
                    <span>Why Static Prompts Fail & How Camera Terms Fix Them</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Image generation models (like Imagen or Midjourney) only generate <strong>one single still frame</strong>. But video models like <strong>Gemini Omni Flash</strong> must synthesize <strong>150 to 300 sequential frames</strong> that stay physically consistent over 5 to 10 seconds.
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    If you write <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">"rabbit jumping in meadow"</code>, the AI has to invent both the rabbit’s trajectory AND where the camera is. This ambiguity causes <em>morphing, warping, and blurry artifacts</em>.
                  </p>
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 space-y-1">
                    <span className="font-bold block">The 3 Pillars of Professional AI Video Prompting:</span>
                    <ol className="list-decimal pl-4 space-y-1 text-[11px] text-emerald-300/90">
                      <li><strong>Camera Perspective:</strong> Tells the AI where to place the virtual camera (e.g., <em>Low-angle hero view</em>, <em>Eye-level close-up</em>).</li>
                      <li><strong>Camera Motion / Zooming:</strong> Gives the AI mathematical motion vectors (e.g., <em>Slow push-in zoom</em>, <em>Tracking pull-back</em>) so the background and subject move with coherent parallax.</li>
                      <li><strong>Tactile Physics & Lighting:</strong> Mentions physical materials (<em>fuzzy green plush texture</em>, <em>floppy secondary ear flutter</em>) and lighting (<em>volumetric golden sunbeams</em>) so surfaces stay stable across frames.</li>
                    </ol>
                  </div>
                </div>

                {/* Before & After comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 flex flex-col gap-2">
                    <span className="font-bold text-red-400 text-xs flex items-center gap-1.5">
                      <X className="w-3.5 h-3.5" /> Weak / Ambiguous Prompt
                    </span>
                    <p className="p-2.5 rounded-lg bg-slate-950/80 border border-red-900/30 text-slate-300 font-mono text-[11px]">
                      "Make the green rabbit jump in the grass."
                    </p>
                    <p className="text-[11px] text-slate-400">
                      <strong>Result:</strong> Flat perspective, jittery bounce, random camera cuts, and indistinct plush texture.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 flex flex-col gap-2">
                    <span className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Directed Cinematographic Prompt
                    </span>
                    <p className="p-2.5 rounded-lg bg-slate-950/80 border border-emerald-900/30 text-emerald-200 font-mono text-[11px]">
                      "Cinematic low-angle tracking shot: The green plush rabbit leaps high into the sky, kicking red boots. The camera executes a smooth slow push-in zoom on its cheerful face as golden hour sunbeams highlight its fuzzy green plush fur."
                    </p>
                    <p className="text-[11px] text-slate-300">
                      <strong>Result:</strong> Epic upward leap scale, stable plush fur texture, clear motion blur, and dramatic alpine scenery.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(activeTab === 'zoom_motion'
                  ? CINEMA_ZOOM_AND_MOTIONS
                  : activeTab === 'perspective'
                  ? CINEMA_PERSPECTIVES
                  : activeTab === 'lighting'
                  ? CINEMA_LIGHTINGS
                  : CINEMA_PHYSICS
                ).map((term) => {
                  const isCopied = copiedId === term.id;
                  return (
                    <div
                      key={term.id}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-2.5 text-xs group"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200 flex items-center gap-1.5">
                            <span className="text-base">{term.icon}</span>
                            <span>{term.label}</span>
                          </span>
                          <span className="text-[10px] text-amber-400 font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                            {term.tagline}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {term.explanation}
                        </p>
                        <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-amber-200/90 font-mono">
                          "{term.promptSnippet}"
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                        <span className="text-[10px] text-slate-500 italic">
                          💡 {term.exampleUse}
                        </span>
                        {onInsertTerm && (
                          <button
                            type="button"
                            onClick={() => handleUseTerm(term)}
                            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Inserted!</span>
                              </>
                            ) : (
                              <>
                                <ArrowRight className="w-3 h-3" />
                                <span>Insert to Prompt</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="pt-2 border-t border-slate-800 text-center text-[11px] text-slate-500 flex items-center justify-between">
            <span>Powered by Gemini Omni Flash Video Cinematography Engine</span>
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
