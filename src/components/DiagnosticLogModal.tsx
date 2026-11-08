import React, { useState } from 'react';

export interface ResolvedImageLogItem {
  index: number;
  filename: string;
  label?: string;
  role?: string;
  source?: string;
  url?: string;
  mimeType?: string;
  byteSize?: number;
  description?: string;
  previewUrl?: string;
}

export interface GenerationLogRecord {
  id: string;
  timestamp: string;
  operation: 'animate' | 'extend';
  status: 'success' | 'failed' | 'in_progress';
  durationMs?: number;
  clientPayloadSummary: {
    prompt: string;
    sanitizedPrompt?: string;
    aspectRatio?: string;
    duration?: string;
    resolution?: string;
    audioMode?: string;
    season?: string;
    weather?: string;
    customEmblemType?: string;
    customEmblemName?: string;
    customEmblemUrl?: string;
    disableMorph?: boolean;
    enableMorph?: boolean;
    referenceImagesCount?: number;
    clientReferenceImagesList?: Array<{
      label: string;
      category?: string;
      filename?: string;
      pathOrUrl?: string;
    }>;
    clothingDirectives?: string[];
    propDirectives?: string[];
    characterDirectives?: string[];
  };
  resolvedReferenceImages: ResolvedImageLogItem[];
  promptManifest?: string;
  characterDirectiveText?: string;
  productionDirectiveText?: string;
  finalPromptText?: string;
  geminiInteraction?: {
    interactionId?: string;
    model?: string;
    hasOutputVideo?: boolean;
    videoMimeType?: string;
    videoSizeKb?: number;
    videoUri?: string;
    error?: {
      message: string;
      status?: number;
      code?: string;
    };
  };
  formattedLog: string;
}

interface DiagnosticLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: GenerationLogRecord | null;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const DiagnosticLogModal: React.FC<DiagnosticLogModalProps> = ({
  isOpen,
  onClose,
  log,
  onRefresh,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'manifest' | 'prompt' | 'payload' | 'raw'>('manifest');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyFullLog = async () => {
    if (!log) return;
    try {
      await navigator.clipboard.writeText(log.formattedLog);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = log.formattedLog;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyText = async (text: string, identifier: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSnippet(identifier);
      setTimeout(() => setCopiedSnippet(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadLog = () => {
    if (!log) return;
    const blob = new Blob([log.formattedLog], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-generation-log-${log.id || Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Generation Diagnostic & Reference Inspector
                </h2>
                {log && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      log.status === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : log.status === 'failed'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {log.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Inspect exact reference images, prompt manifest, and API payload sent to Gemini Omni Flash
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                title="Refresh latest log"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60 disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}

            <button
              onClick={handleCopyFullLog}
              disabled={!log}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-xs transition-all shadow-md ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>Copy Generation Log</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadLog}
              disabled={!log}
              title="Download as .txt file"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick summary bar */}
        {log ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-6 py-2.5 bg-slate-950/40 border-b border-slate-800 text-xs">
            <div>
              <span className="text-slate-500">Operation:</span>{' '}
              <span className="font-semibold text-slate-300 uppercase">{log.operation}</span>
            </div>
            <div>
              <span className="text-slate-500">Duration:</span>{' '}
              <span className="font-semibold text-slate-300">
                {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Ref Images:</span>{' '}
              <span className="font-semibold text-indigo-400 font-mono">
                {log.resolvedReferenceImages?.length || 0} attached
              </span>
            </div>
            <div>
              <span className="text-slate-500">Timestamp:</span>{' '}
              <span className="font-semibold text-slate-300">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ) : null}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('manifest')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'manifest'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <span>🖼️ Reference Images ({log?.resolvedReferenceImages?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('prompt')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'prompt'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <span>📜 Final Prompt & Directives</span>
          </button>
          <button
            onClick={() => setActiveTab('payload')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'payload'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <span>⚙️ Request Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'raw'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <span>📋 Full Text Log</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!log ? (
            <div className="py-16 text-center text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium">No generation logs recorded yet.</p>
              <p className="text-xs text-slate-500 mt-1">Generate a video clip first, and its complete reference breakdown will appear here.</p>
            </div>
          ) : activeTab === 'manifest' ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                <span className="text-indigo-400 text-base">ℹ️</span>
                <div>
                  <strong className="text-white">Multimodal Reference Ordering:</strong> These exact images are attached in sequence (1, 2, 3...) to Gemini Omni Flash. When the prompt refers to "first attached image" or "second attached image", Gemini resolves them strictly by this position.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {log.resolvedReferenceImages?.map((img, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative w-16 h-16 rounded-lg bg-slate-800 border border-slate-700/60 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {img.previewUrl ? (
                          <img
                            src={img.previewUrl}
                            alt={img.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl">🖼️</span>
                        )}
                        <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-indigo-600/90 text-[10px] font-bold text-white shadow">
                          #{img.index || idx + 1}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-indigo-300 truncate">
                            Reference Image {img.index || idx + 1}
                          </span>
                          <button
                            onClick={() => handleCopyText(img.filename, `fn-${idx}`)}
                            title="Copy filename"
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                          >
                            <span>{copiedSnippet === `fn-${idx}` ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>

                        <div className="font-mono text-xs text-slate-200 font-semibold truncate mt-0.5">
                          {img.filename}
                        </div>

                        <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {img.role || img.label || 'Reference Image'}
                        </div>
                      </div>
                    </div>

                    {img.description && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 leading-normal">
                        <strong className="text-slate-300">Model Directive:</strong> {img.description}
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/50">
                      <span>Source: <span className="text-slate-400">{img.source || 'preset'}</span></span>
                      <span>
                        {img.mimeType || 'image/png'}{' '}
                        {img.byteSize ? `• ${(img.byteSize / 1024).toFixed(1)} KB` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'prompt' ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Image Manifest Directory Sent to Gemini
                  </label>
                  <button
                    onClick={() => handleCopyText(log.promptManifest || '', 'manifest-text')}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {copiedSnippet === 'manifest-text' ? 'Copied!' : 'Copy Manifest'}
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-400/90 font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                  {log.promptManifest || 'No manifest directory recorded.'}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Complete Final Prompt (Including All Directives)
                  </label>
                  <button
                    onClick={() => handleCopyText(log.finalPromptText || '', 'final-prompt')}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {copiedSnippet === 'final-prompt' ? 'Copied!' : 'Copy Full Prompt'}
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                  {log.finalPromptText || 'No final prompt text recorded.'}
                </pre>
              </div>
            </div>
          ) : activeTab === 'payload' ? (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h3 className="font-bold text-slate-200 text-sm">Client Request Summary</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-slate-500 block">Raw Prompt:</span>
                    <span className="text-slate-300 font-medium whitespace-pre-wrap">
                      {log.clientPayloadSummary?.prompt}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Emblem Selection:</span>
                    <span className="text-indigo-300 font-medium">
                      Type: {log.clientPayloadSummary?.customEmblemType || 'default'} (
                      {log.clientPayloadSummary?.customEmblemName || 'Original Medallion'})
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-1">
                      Morph Status: {log.clientPayloadSummary?.enableMorph ? 'Enabled' : 'Disabled (Static)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Video Format:</span>
                    <span className="text-slate-300">
                      {log.clientPayloadSummary?.aspectRatio} • {log.clientPayloadSummary?.duration} •{' '}
                      {log.clientPayloadSummary?.resolution}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Audio & Atmosphere:</span>
                    <span className="text-slate-300">
                      Audio: {log.clientPayloadSummary?.audioMode} • Season:{' '}
                      {log.clientPayloadSummary?.season} • Weather:{' '}
                      {log.clientPayloadSummary?.weather}
                    </span>
                  </div>
                </div>

                {log.clientPayloadSummary?.clientReferenceImagesList &&
                  log.clientPayloadSummary.clientReferenceImagesList.length > 0 && (
                    <div className="pt-3 border-t border-slate-800">
                      <span className="text-slate-400 font-semibold block mb-2">
                        Client References Sent ({log.clientPayloadSummary.clientReferenceImagesList.length}):
                      </span>
                      <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                        {log.clientPayloadSummary.clientReferenceImagesList.map((ref, i) => (
                          <li key={i}>
                            <strong className="text-slate-200">{ref.label}</strong>{' '}
                            <span className="text-slate-500 font-mono text-[11px]">
                              ({ref.category || 'ref'} - {ref.filename || ref.pathOrUrl})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>

              {log.geminiInteraction && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h3 className="font-bold text-slate-200 text-sm">Gemini Omni Flash Interaction</h3>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-500 block">Model:</span>
                      <span>{log.geminiInteraction.model || 'gemini-omni-1.2-flash'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Interaction ID:</span>
                      <span className="font-mono text-indigo-300">
                        {log.geminiInteraction.interactionId || 'N/A'}
                      </span>
                    </div>
                    {log.geminiInteraction.error && (
                      <div className="col-span-2 p-2 rounded bg-rose-950/50 border border-rose-800/80 text-rose-300">
                        <strong>Error:</strong> {log.geminiInteraction.error.message}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Full raw log formatted for sharing directly with the engineer:
                </span>
                <button
                  onClick={handleCopyFullLog}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  {copied ? 'Copied!' : 'Copy Everything'}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed select-all">
                {log.formattedLog}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/80">
          <span className="text-xs text-slate-500">
            Paste this log into chat so the engineer can inspect the exact payload and reference mapping.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyFullLog}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {copied ? '✓ Copied to Clipboard!' : 'Copy Generation Log'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
