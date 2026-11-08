import React, { useState } from 'react';
import {
  X,
  Upload,
  Check,
  Eye,
  Sliders,
  Type,
  Image as ImageIcon,
  Shield,
  Sparkles,
  Move,
  Layers,
} from 'lucide-react';
import { WatermarkConfig, VideoWatermarkOverlay } from './VideoWatermarkOverlay';

interface WatermarkSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WatermarkConfig;
  onUpdateConfig: (newConfig: WatermarkConfig) => void;
  videoPreviewUrl?: string;
  sourceImageUrl?: string;
}

export const WatermarkSettingsModal: React.FC<WatermarkSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  videoPreviewUrl,
  sourceImageUrl,
}) => {
  const [localConfig, setLocalConfig] = useState<WatermarkConfig>(config);
  const [customLogoFile, setCustomLogoFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomLogoFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updated: WatermarkConfig = {
        ...localConfig,
        type: 'image',
        customImageUrl: dataUrl,
      };
      setLocalConfig(updated);
      onUpdateConfig(updated);
    };
    reader.readAsDataURL(file);
  };

  const updateSetting = <K extends keyof WatermarkConfig>(key: K, val: WatermarkConfig[K]) => {
    const updated = { ...localConfig, [key]: val };
    setLocalConfig(updated);
    onUpdateConfig(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Video Logo & Watermark Studio
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono font-semibold">
                  BRAND PROTECTION
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Overlay your custom logo, studio badge, or copyright watermark onto the video
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

        {/* Live Preview Box */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-col items-center">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 self-start">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Watermark Placement Preview:</span>
          </div>

          <div className="relative w-full max-w-sm h-48 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-inner flex items-center justify-center">
            {videoPreviewUrl ? (
              <video
                src={videoPreviewUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : sourceImageUrl ? (
              <img
                src={sourceImageUrl}
                alt="Preview Background"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-emerald-950 via-slate-900 to-purple-950 flex items-center justify-center text-slate-600 text-xs font-mono">
                [ Video Frame Background ]
              </div>
            )}

            {/* Render watermark overlay */}
            <VideoWatermarkOverlay config={localConfig} />
          </div>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Enable Watermark Toggle */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Enable Watermark on Video</span>
              </div>
              <p className="text-[11px] text-slate-400">
                When enabled, the logo or watermark appears on the video player and exports
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSetting('enabled', !localConfig.enabled)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                localConfig.enabled
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {localConfig.enabled ? '✓ Watermark ON' : 'Watermark OFF'}
            </button>
          </div>

          {/* Watermark Source Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              1. Choose Logo / Watermark Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => updateSetting('type', 'preset')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  localConfig.type === 'preset'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-sm font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs">Studio Badges</span>
              </button>

              <button
                type="button"
                onClick={() => updateSetting('type', 'image')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  localConfig.type === 'image'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-sm font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span className="text-xs">Custom Logo Photo</span>
              </button>

              <button
                type="button"
                onClick={() => updateSetting('type', 'text')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  localConfig.type === 'text'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-sm font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Type className="w-4 h-4 text-emerald-400" />
                <span className="text-xs">Custom Handle Text</span>
              </button>
            </div>
          </div>

          {/* Sub-Panel: Preset Logos */}
          {localConfig.type === 'preset' && (
            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Select Studio Preset Badge:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'rabbithop', title: 'RabbitHop Studio', icon: '🐇', color: 'text-emerald-300' },
                  { id: 'omni_flash', title: 'Gemini Omni Flash', icon: '✨', color: 'text-purple-300' },
                  { id: 'alpine_cinema', title: 'Alpine Cinema 4K', icon: '🎬', color: 'text-amber-300' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => updateSetting('presetId', preset.id as any)}
                    className={`p-2 rounded-lg border text-xs flex items-center gap-2 transition-all cursor-pointer ${
                      localConfig.presetId === preset.id
                        ? 'bg-slate-800 border-emerald-500 text-white font-bold shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{preset.icon}</span>
                    <span className="truncate">{preset.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Panel: Custom Upload Image */}
          {localConfig.type === 'image' && (
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Upload Custom Logo Image (PNG with transparency recommended):
                </label>
                {localConfig.customImageUrl && (
                  <span className="text-[10px] text-emerald-400 font-semibold">✓ Logo Loaded</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {localConfig.customImageUrl && (
                  <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 p-1 flex items-center justify-center shrink-0">
                    <img
                      src={localConfig.customImageUrl}
                      alt="Logo thumbnail"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
                <label className="flex-1 py-2 px-3 border border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl bg-slate-900/60 text-center cursor-pointer flex items-center justify-center gap-2 text-xs text-slate-300 hover:text-white transition-colors">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>{customLogoFile ? customLogoFile.name : 'Choose Logo Image (PNG / SVG / JPG)'}</span>
                  <input
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Sub-Panel: Custom Text */}
          {localConfig.type === 'text' && (
            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Watermark Text / Creator Handle:
              </label>
              <input
                type="text"
                placeholder="e.g. @MyChannel, Tor Arne Have, RabbitHop Pro..."
                value={localConfig.customText}
                onChange={(e) => updateSetting('customText', e.target.value)}
                className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Placement & Position Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              2. Watermark Screen Placement
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'top-left', label: 'Top Left' },
                { id: 'top-right', label: 'Top Right' },
                { id: 'center', label: 'Center' },
                { id: 'bottom-left', label: 'Bottom Left' },
                { id: 'bottom-right', label: 'Bottom Right' },
              ].map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => updateSetting('position', pos.id as any)}
                  className={`py-2 px-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                    localConfig.position === pos.id
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size & Opacity Row */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Scale */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                Scale / Size
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['small', 'medium', 'large'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateSetting('scale', s)}
                    className={`py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all cursor-pointer ${
                      localConfig.scale === s
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Opacity */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Opacity / Transparency
                </label>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {Math.round(localConfig.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={localConfig.opacity}
                onChange={(e) => updateSetting('opacity', parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Frosted Glass Pill Toggle */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-200">
                Frosted Glass Pill Backdrop
              </span>
              <p className="text-[11px] text-slate-400">
                Ensures the watermark is crisp and legible over both bright sunlit snow and dark forests
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSetting('showPillBackdrop', !localConfig.showPillBackdrop)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                localConfig.showPillBackdrop
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              {localConfig.showPillBackdrop ? '✓ Backing On' : 'No Backing'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Watermark is saved and active for playback and MP4 downloads
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
