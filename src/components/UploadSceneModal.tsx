import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Film,
  ArrowLeft,
  ArrowRight,
  PlusCircle,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { GeneratedVideo } from '../App';

interface UploadSceneModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStoryScenes: GeneratedVideo[];
  activeScene: GeneratedVideo | null;
  onInsertVideo: (
    file: File,
    position: 'before' | 'after' | 'append',
    targetSceneId: string,
    customTitle?: string
  ) => void;
  initialPosition?: 'before' | 'after' | 'append';
}

export const UploadSceneModal: React.FC<UploadSceneModalProps> = ({
  isOpen,
  onClose,
  currentStoryScenes,
  activeScene,
  onInsertVideo,
  initialPosition = 'after',
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [sceneTitle, setSceneTitle] = useState<string>('');
  const [position, setPosition] = useState<'before' | 'after' | 'append'>(initialPosition);
  const [targetSceneId, setTargetSceneId] = useState<string>(
    activeScene?.id || (currentStoryScenes[0]?.id ?? '')
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file (MP4, WebM, or MOV).');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setSceneTitle(file.name.replace(/\.[^/.]+$/, '').slice(0, 40));

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.onloadedmetadata = () => {
      setVideoDuration(Math.round(tempVideo.duration) || 5);
    };
    tempVideo.src = url;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a video file to upload.');
      return;
    }

    setIsProcessing(true);
    try {
      const chosenTargetId = targetSceneId || currentStoryScenes[0]?.id || 'root';
      onInsertVideo(selectedFile, position, chosenTargetId, sceneTitle);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to insert video scene.');
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setVideoDuration(null);
    setSceneTitle('');
    setError(null);
    setIsProcessing(false);
    onClose();
  };

  const targetSceneObj = currentStoryScenes.find((s) => s.id === targetSceneId) || currentStoryScenes[0];
  const targetSceneNum = targetSceneObj?.sceneNumber || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center shadow-inner">
              <Upload className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Upload Video to Storyboard Sequence
              </h3>
              <p className="text-xs text-slate-400">
                Insert an existing video clip before or after any scene in your sequence
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Video File Picker / Drop Zone */}
          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-950/60 hover:bg-emerald-950/10 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-800 group-hover:bg-emerald-500/20 text-slate-400 group-hover:text-emerald-400 flex items-center justify-center transition-colors">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200 group-hover:text-white">
                  Click to select video file (MP4, WebM, MOV)
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Upload custom intro clips, B-roll, animations, or live footage
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Selected Video File:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="text-amber-400 hover:underline cursor-pointer"
                >
                  Change Video
                </button>
              </div>

              {/* Video Player Preview */}
              <div className="relative aspect-video max-h-48 w-full rounded-xl overflow-hidden bg-black border border-slate-800 mx-auto flex items-center justify-center">
                {previewUrl && (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
                <span className="truncate max-w-[280px]">{selectedFile.name}</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-emerald-300 font-semibold">
                  ~{videoDuration ? `${videoDuration}s` : '5s'} • {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>
            </div>
          )}

          {/* Scene Title Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Scene Label / Directing Note:
            </label>
            <input
              type="text"
              value={sceneTitle}
              onChange={(e) => setSceneTitle(e.target.value)}
              placeholder="e.g., Intro: Arrival at Mountain Cabin, drone flyover..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Placement Position Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Placement in Storyboard Sequence:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Insert Before */}
              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-1 text-left ${
                  position === 'before'
                    ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-100">
                    <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Insert BEFORE</span>
                  </div>
                  <input
                    type="radio"
                    name="placement"
                    checked={position === 'before'}
                    onChange={() => setPosition('before')}
                    className="accent-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Becomes new Scene {targetSceneNum}, shifts current to Scene {targetSceneNum + 1}
                </p>
              </label>

              {/* Insert After */}
              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-1 text-left ${
                  position === 'after'
                    ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-100">
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Insert AFTER</span>
                  </div>
                  <input
                    type="radio"
                    name="placement"
                    checked={position === 'after'}
                    onChange={() => setPosition('after')}
                    className="accent-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Becomes Scene {targetSceneNum + 1}, directly following Scene {targetSceneNum}
                </p>
              </label>

              {/* Append as End of Movie */}
              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-1 text-left ${
                  position === 'append'
                    ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-100">
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Append to End</span>
                  </div>
                  <input
                    type="radio"
                    name="placement"
                    checked={position === 'append'}
                    onChange={() => setPosition('append')}
                    className="accent-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Becomes final Scene {currentStoryScenes.length + 1} of movie
                </p>
              </label>
            </div>
          </div>

          {/* Reference Target Scene Dropdown (if multiple scenes exist) */}
          {currentStoryScenes.length > 0 && position !== 'append' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Target Reference Scene:
              </label>
              <select
                value={targetSceneId}
                onChange={(e) => setTargetSceneId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {currentStoryScenes.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    Scene {s.sceneNumber || idx + 1}: {s.prompt?.slice(0, 50)}... ({s.duration || '5s'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!selectedFile || isProcessing}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>
                Insert Video as Scene{' '}
                {position === 'before'
                  ? targetSceneNum
                  : position === 'after'
                  ? targetSceneNum + 1
                  : currentStoryScenes.length + 1}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
