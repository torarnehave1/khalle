/**
 * In-memory generation diagnostics — ported from server.ts. Module-level state in the browser,
 * so the log lives for the page session (it was per server process before).
 */
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
    silentTalk?: boolean;
    season?: string;
    weather?: string;
    customEmblemType?: string;
    customEmblemName?: string;
    customEmblemUrl?: string;
    disableMorph?: boolean;
    includeKhalle?: boolean;
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
  resolvedReferenceImages: Array<{
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
  }>;
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

// In-memory buffer storing recent generation diagnostic records
export const recentGenerationLogs: GenerationLogRecord[] = [];

export function recordGenerationLog(record: GenerationLogRecord) {
  record.formattedLog = formatDiagnosticLogText(record);
  const existingIdx = recentGenerationLogs.findIndex((r) => r.id === record.id);
  if (existingIdx !== -1) {
    recentGenerationLogs[existingIdx] = record;
  } else {
    recentGenerationLogs.unshift(record);
    if (recentGenerationLogs.length > 25) {
      recentGenerationLogs.pop();
    }
  }
}

export function formatDiagnosticLogText(record: GenerationLogRecord): string {
  const p = record.clientPayloadSummary;
  const refs = record.resolvedReferenceImages || [];
  const g = record.geminiInteraction;

  return `================================================================================
GEMINI OMNI FLASH GENERATION DIAGNOSTIC LOG
================================================================================
ID:        ${record.id}
Timestamp: ${record.timestamp}
Operation: ${record.operation.toUpperCase()}
Status:    ${record.status.toUpperCase()}
Duration:  ${record.durationMs ? (record.durationMs / 1000).toFixed(1) + 's' : 'N/A'}
Model:     ${g?.model || 'gemini-omni-1.2-flash'}
${g?.interactionId ? `Interaction ID: ${g.interactionId}` : ''}

--------------------------------------------------------------------------------
1. CLIENT REQUEST PAYLOAD SUMMARY
--------------------------------------------------------------------------------
Original Prompt:
"${p.prompt || ''}"

${p.sanitizedPrompt && p.sanitizedPrompt !== p.prompt ? `Sanitized Action Prompt:\n"${p.sanitizedPrompt}"\n` : ''}
Video Settings:
- Resolution:   ${p.resolution || '720p'}
- Aspect Ratio: ${p.aspectRatio || '9:16'}
- Duration:     ${p.duration || '5s'}
- Audio Mode:   ${p.audioMode || 'with_sound'}
- Talks without words: ${p.silentTalk ? 'YES (mouth moves, no voice)' : 'no'}
- Khalle:       ${p.includeKhalle === false ? 'OFF (no Khalle pictures, symbol or identity rule sent)' : 'on'}
- Atmosphere:   Season=${p.season || 'spring'}, Weather=${p.weather || 'sunny'}

Emblem & Metamorphosis Settings:
- Type:           ${p.customEmblemType || 'default'}
- Name:           ${p.customEmblemName || 'Original Medallion'}
- Morphing Active:${p.enableMorph ? ' YES (Morphing Effect Activated)' : ' NO (Static Emblem Displayed)'}
- disableMorph:   ${p.disableMorph ? 'true' : 'false'}
${p.customEmblemUrl ? `- Custom Emblem URL: ${p.customEmblemUrl}` : ''}

Client Reference Assets Passed: ${p.referenceImagesCount || 0} items
${(p.clientReferenceImagesList || [])
  .map(
    (c, i) =>
      `  [${i + 1}] ${c.label} (${c.category || 'ref'}) -> ${c.filename || c.pathOrUrl || 'inline base64'}`
  )
  .join('\n')}

Directives:
- Clothing items:    ${p.clothingDirectives?.length || 0}
- Prop items:        ${p.propDirectives?.length || 0}
- Companion items:   ${p.characterDirectives?.length || 0}

--------------------------------------------------------------------------------
2. RESOLVED REFERENCE IMAGES SENT TO GEMINI (EXACT ORDER & MAPPING)
--------------------------------------------------------------------------------
Total Reference Images Attached: ${refs.length}

${refs
  .map(
    (img) => `[REFERENCE IMAGE ${img.index}]
  Filename:    "${img.filename}"
  Role:        ${img.role || img.label || 'Reference Image'}
  Source:      ${img.source || 'preset'}
  MIME Type:   ${img.mimeType || 'image/png'}
  File Size:   ${img.byteSize ? (img.byteSize / 1024).toFixed(1) + ' KB' : 'N/A'}${img.url ? `\n  Source URL:  ${img.url}` : ''}${img.description ? `\n  Description: ${img.description}` : ''}`
  )
  .join('\n\n')}

--------------------------------------------------------------------------------
3. IMAGE DIRECTORY MANIFEST (PREPENDED TO PROMPT)
--------------------------------------------------------------------------------
${record.promptManifest || 'None'}

--------------------------------------------------------------------------------
4. FULL FINAL PROMPT SENT TO GEMINI OMNI FLASH
--------------------------------------------------------------------------------
${record.finalPromptText || 'None'}

--------------------------------------------------------------------------------
5. GEMINI API EXECUTION OUTCOME
--------------------------------------------------------------------------------
Status: ${record.status.toUpperCase()}
${g?.interactionId ? `Interaction ID: ${g.interactionId}` : ''}
${g?.hasOutputVideo ? `Output Video: Generated (${g.videoMimeType || 'video/mp4'}, ${g.videoSizeKb ? g.videoSizeKb.toFixed(1) + ' KB' : 'inline base64'})` : ''}
${g?.videoUri ? `Video URI: ${g.videoUri}` : ''}
${g?.error ? `Error Message: ${g.error.message}\nError Status: ${g.error.status || 'N/A'}\nError Code: ${g.error.code || 'N/A'}` : ''}
================================================================================
`;
}

// Track recent video rate limit errors to give users crystal-clear quota diagnostics
export const quotaState: { lastVideoRateLimitInfo: { message: string; timestamp: number } | null } = {
  lastVideoRateLimitInfo: null,
};
