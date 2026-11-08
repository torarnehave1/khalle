import React from 'react';

export interface WatermarkConfig {
  enabled: boolean;
  type: 'preset' | 'image' | 'text';
  presetId: 'rabbithop' | 'omni_flash' | 'alpine_cinema' | 'custom_text';
  customImageUrl?: string;
  customText: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number; // 0.2 to 1.0
  scale: 'small' | 'medium' | 'large';
  showPillBackdrop: boolean;
}

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  enabled: true,
  type: 'preset',
  presetId: 'rabbithop',
  customText: '@RabbitHopStudio',
  position: 'bottom-right',
  opacity: 0.85,
  scale: 'medium',
  showPillBackdrop: true,
};

interface VideoWatermarkOverlayProps {
  config: WatermarkConfig;
}

export const VideoWatermarkOverlay: React.FC<VideoWatermarkOverlayProps> = ({ config }) => {
  if (!config.enabled) return null;

  // Position classes
  const positionClasses = {
    'top-left': 'top-3.5 left-3.5',
    'top-right': 'top-3.5 right-3.5',
    'bottom-left': 'bottom-3.5 left-3.5',
    'bottom-right': 'bottom-3.5 right-3.5',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  }[config.position];

  // Scale classes
  const scaleClasses = {
    small: 'text-[10px] py-1 px-2 gap-1.5',
    medium: 'text-xs py-1.5 px-3 gap-2',
    large: 'text-sm py-2 px-4 gap-2.5',
  }[config.scale];

  const imageScaleClasses = {
    small: 'max-h-6 max-w-[90px]',
    medium: 'max-h-9 max-w-[130px]',
    large: 'max-h-14 max-w-[180px]',
  }[config.scale];

  // Backdrop classes
  const backdropClasses = config.showPillBackdrop
    ? 'bg-slate-950/80 backdrop-blur-md border border-slate-700/60 shadow-lg rounded-full'
    : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]';

  return (
    <div
      className={`absolute ${positionClasses} pointer-events-none select-none z-30 transition-all duration-200 flex items-center justify-center`}
      style={{ opacity: config.opacity }}
    >
      <div className={`flex items-center ${scaleClasses} ${backdropClasses}`}>
        {/* Custom Uploaded Image Logo */}
        {config.type === 'image' && config.customImageUrl ? (
          <img
            src={config.customImageUrl}
            alt="Watermark Logo"
            className={`${imageScaleClasses} object-contain`}
          />
        ) : config.type === 'text' ? (
          /* Custom Text Watermark */
          <span className="font-bold tracking-wide text-white drop-shadow-sm font-sans flex items-center gap-1">
            <span className="text-emerald-400">●</span> {config.customText || '@Creator'}
          </span>
        ) : (
          /* Presets */
          <>
            {config.presetId === 'rabbithop' && (
              <div className="flex items-center gap-1.5 font-bold tracking-tight text-white whitespace-nowrap">
                <span className="text-base leading-none">🐇</span>
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-lime-300 bg-clip-text text-transparent font-extrabold">
                  RabbitHop
                </span>
                <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  STUDIO
                </span>
              </div>
            )}

            {config.presetId === 'omni_flash' && (
              <div className="flex items-center gap-1.5 font-bold tracking-tight text-white whitespace-nowrap">
                <span className="text-base leading-none">✨</span>
                <span className="bg-gradient-to-r from-purple-300 via-pink-200 to-indigo-300 bg-clip-text text-transparent font-extrabold">
                  Gemini Omni Flash
                </span>
                <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                  AI
                </span>
              </div>
            )}

            {config.presetId === 'alpine_cinema' && (
              <div className="flex items-center gap-1.5 font-bold tracking-tight text-white whitespace-nowrap">
                <span className="text-base leading-none">🎬</span>
                <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-300 bg-clip-text text-transparent font-extrabold">
                  Alpine Cinema
                </span>
                <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                  4K
                </span>
              </div>
            )}

            {config.presetId === 'custom_text' && (
              <span className="font-bold tracking-wide text-white drop-shadow-sm whitespace-nowrap">
                {config.customText || '@RabbitHopStudio'}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};
