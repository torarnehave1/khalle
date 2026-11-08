/**
 * Video routes (/api/animate, /api/extend, /api/continue-scene) — ported from server.ts.
 * Manifests, directives, retry/auto-rephrase and error mapping are unchanged; the Interactions
 * call goes through the proxy worker (./gemini → POST /v1/interactions).
 */
import { generateSafePromptRephrase } from './assistant';
import { base64ByteLength } from './base64';
import { getGeminiClient } from './gemini';
import type { RouteHandler } from './http';
import { quotaState, recentGenerationLogs, recordGenerationLog, type GenerationLogRecord } from './logs';
import {
  formatProductionDirectives,
  getCharacterDirective,
  resolveReferenceImages,
  sanitizePromptToImageReference,
} from './references';

// Image-to-Video Animation endpoint using Gemini Omni Flash via Interactions API
export async function executeAnimateCore(body: any) {
  const startTime = Date.now();
  const logId = `gen-${startTime}-${Math.random().toString(36).substring(2, 7)}`;
  const {
    imageBase64,
    imageMimeType,
    imagePath,
    prompt,
    aspectRatio = '9:16',
    duration = '5s',
    resolution = '720p',
    season,
    weather,
    audioMode = 'with_sound',
  } = body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('A motion prompt is required.');
  }

  const validAspectRatios = ['16:9', '9:16'];
  const chosenAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '9:16';

  const validDurations = ['5s', '10s', '15s'];
  const chosenDuration = validDurations.includes(duration)
    ? duration
    : (duration === '20s' || duration === '30s')
    ? '10s'
    : '5s';

  const validResolutions = ['360p', '720p', '1080p'];
  const chosenResolution = validResolutions.includes(resolution) ? resolution : '720p';

  // Initialize diagnostic log record
  const logRecord: GenerationLogRecord = {
    id: logId,
    timestamp: new Date().toISOString(),
    operation: 'animate',
    status: 'in_progress',
    clientPayloadSummary: {
      prompt: prompt.trim(),
      sanitizedPrompt: '',
      aspectRatio: chosenAspectRatio,
      duration: chosenDuration,
      resolution: chosenResolution,
      audioMode,
      season,
      weather,
      customEmblemType: body.customEmblemType,
      customEmblemName: body.customEmblemName,
      customEmblemUrl: body.customEmblemUrl,
      disableMorph: body.disableMorph,
      enableMorph: body.enableMorph,
      referenceImagesCount: Array.isArray(body.referenceImages) ? body.referenceImages.length : 0,
      clientReferenceImagesList: Array.isArray(body.referenceImages)
        ? body.referenceImages.map((r: any) => ({
            label: r.label || 'Reference Item',
            category: r.category,
            filename: r.filename,
            pathOrUrl: r.imageUrl || r.imagePath,
          }))
        : [],
      clothingDirectives: Array.isArray(body.clothingDirectives)
        ? body.clothingDirectives.map((c: any) => (typeof c === 'string' ? c : c.directive || c.title))
        : [],
      propDirectives: Array.isArray(body.propDirectives)
        ? body.propDirectives.map((p: any) => (typeof p === 'string' ? p : p.directive || p.title))
        : [],
      characterDirectives: Array.isArray(body.characterDirectives)
        ? body.characterDirectives.map((ch: any) => (typeof ch === 'string' ? ch : ch.directive || ch.title))
        : [],
    },
    resolvedReferenceImages: [],
    formattedLog: '',
  };

  const resolvedImages = await resolveReferenceImages(body);
  if (resolvedImages.length === 0) {
    logRecord.status = 'failed';
    logRecord.geminiInteraction = {
      model: 'gemini-omni-1.2-flash',
      hasOutputVideo: false,
      error: { message: 'Please provide at least one reference image for the character.' },
    };
    recordGenerationLog(logRecord);
    throw new Error('Please provide at least one reference image for the character.');
  }

  const ai = getGeminiClient();

  // Build authoritative manifest directory mapping filenames and URLs to image positions
  let imageManifest = `=== REFERENCE IMAGE DIRECTORY & FILENAME MANIFEST ===
The following ${resolvedImages.length} reference images are attached in order in the input sequence. When the prompt or directives refer to an image by filename, URL, or position ("first attached image", "second attached image"), use this exact mapping:
`;

  resolvedImages.forEach((img, idx) => {
    const num = idx + 1;
    const name = img.filename || `image_${num}.png`;
    imageManifest += `\n- Reference Image ${num} [Filename: "${name}"]${img.url ? ` [URL: "${img.url}"]` : ''}:\n  Role: ${img.role || img.label || 'Reference Image'}\n  ${img.description ? `Visual Details: ${img.description}\n` : ''}`;
  });

  const inputParts: any[] = [];
  // Interleave descriptive text part before each image part so Gemini Omni Flash identifies each image by name
  for (let i = 0; i < resolvedImages.length; i++) {
    const img = resolvedImages[i];
    inputParts.push({
      type: 'text',
      text: `[REFERENCE IMAGE ${i + 1} | FILENAME: "${img.filename}" | ROLE: "${img.role || img.label || 'Reference'}"]:`
    });
    inputParts.push({
      type: 'image',
      mime_type: img.mimeType,
      data: img.base64,
    });
  }

  let fullDirectives = getCharacterDirective(body, resolvedImages);
  fullDirectives += formatProductionDirectives(body, resolvedImages);

  if (audioMode === 'silent' || prompt.toLowerCase().includes('silent') || prompt.toLowerCase().includes('no sound')) {
    fullDirectives += `\n\n[AUDIO DIRECTIVE - SILENT]:\nSilent cinematic video with pure visual elegance. Do not generate audio or sound effects.`;
  } else {
    fullDirectives += `\n\n[AUDIO DIRECTIVE - IMMERSIVE SOUND]:\nGenerate rich synchronized audio alongside the video: whistling alpine wind, rustling meadow grass, birdsong, and energetic playful cartoon bounce sound effects.`;
  }

  const sanitizedPrompt = sanitizePromptToImageReference(prompt.trim(), resolvedImages);
  const lockedPrompt = `${imageManifest}\n\n${fullDirectives}\n\n[ANIMATION SCENE ACTION DIRECTIVE]:\n${sanitizedPrompt}`;

  inputParts.push({
    type: 'text',
    text: lockedPrompt,
  });

  // Populate diagnostic record
  logRecord.resolvedReferenceImages = resolvedImages.map((img) => ({
    index: img.index || 0,
    filename: img.filename,
    label: img.label,
    role: img.role || img.label,
    source: img.source,
    url: img.url,
    mimeType: img.mimeType,
    byteSize: img.byteSize,
    description: img.description,
    previewUrl: img.previewUrl,
  }));
  logRecord.promptManifest = imageManifest;
  logRecord.characterDirectiveText = fullDirectives;
  logRecord.clientPayloadSummary.sanitizedPrompt = sanitizedPrompt;
  logRecord.finalPromptText = lockedPrompt;
  recordGenerationLog(logRecord);

  console.log(`[Animate] [${logId}] Requesting video from gemini-omni-1.2-flash with ${resolvedImages.length} reference images (filenames: ${resolvedImages.map(r => r.filename).join(', ')})`);
  console.log(`[Animate] [${logId}] Action prompt: ${sanitizedPrompt.slice(0, 100)}...`);

  let interaction;
  try {
    interaction = await ai.interactions.create(
      {
        model: 'gemini-omni-1.2-flash',
        input: inputParts,
        background: false,
        store: true,
        stream: false,
        response_format: {
          type: 'video',
          aspect_ratio: chosenAspectRatio,
          duration: chosenDuration,
          resolution: chosenResolution,
        },
      },
      { timeout: 300000 }
    );
  } catch (apiErr: any) {
    logRecord.status = 'failed';
    logRecord.durationMs = Date.now() - startTime;
    logRecord.geminiInteraction = {
      model: 'gemini-omni-1.2-flash',
      hasOutputVideo: false,
      error: {
        message: apiErr.message || 'Interactions API request failed.',
        status: apiErr.status || apiErr.statusCode,
        code: apiErr.code,
      },
    };
    recordGenerationLog(logRecord);
    throw apiErr;
  }

  const videoPart = interaction.output_video;
  let base64VideoData = videoPart?.data;
  let videoMime = videoPart?.mime_type || 'video/mp4';
  let videoUri = (videoPart as any)?.uri;

  if (!base64VideoData && !videoUri && interaction.steps) {
    for (const step of interaction.steps) {
      if (step.type === 'model_output' && (step as any).content) {
        const vid = (step as any).content.find((c: any) => c.type === 'video');
        if (vid) {
          if (vid.data) base64VideoData = vid.data;
          if (vid.mime_type) videoMime = vid.mime_type;
          if (vid.uri) videoUri = vid.uri;
        }
      }
    }
  }

  if (!base64VideoData && !videoUri) {
    logRecord.status = 'failed';
    logRecord.durationMs = Date.now() - startTime;
    logRecord.geminiInteraction = {
      interactionId: interaction.id,
      model: 'gemini-omni-1.2-flash',
      hasOutputVideo: false,
      error: { message: 'The model completed the request but did not return video data.' },
    };
    recordGenerationLog(logRecord);
    throw new Error('The model completed the request but did not return video data.');
  }

  const videoUrl = base64VideoData ? `data:${videoMime};base64,${base64VideoData}` : videoUri;

  // Mark successful log
  logRecord.status = 'success';
  logRecord.durationMs = Date.now() - startTime;
  logRecord.geminiInteraction = {
    interactionId: interaction.id,
    model: 'gemini-omni-1.2-flash',
    hasOutputVideo: true,
    videoMimeType: videoMime,
    videoSizeKb: base64VideoData ? Math.round(base64ByteLength(base64VideoData) / 1024) : undefined,
    videoUri,
  };
  recordGenerationLog(logRecord);


  rememberSceneContext(interaction.id, body); // browser port: lets /api/continue-scene inherit this scene's character setup
  return {
    success: true,
    videoUrl,
    videoUri,
    mimeType: videoMime,
    aspectRatio: chosenAspectRatio,
    duration: chosenDuration,
    prompt,
    season,
    weather,
    interactionId: interaction.id,
    logId,
    generationLog: logRecord,
  };
}

export const handleAnimate: RouteHandler = async (req, res) => {
  try {
    let result;
    try {
      result = await executeAnimateCore(req.body);
    } catch (firstError: any) {
      const status = firstError?.status || firstError?.statusCode || 500;
      const errMsg = firstError?.message || '';
      const isInputBlocked =
        status === 400 ||
        errMsg.includes('Input blocked') ||
        errMsg.includes('could not be processed') ||
        errMsg.includes('rephrasing the prompt');

      // Seamless Auto-Healing: If blocked by overzealous safety filter, silently rewrite into camera-safe visual prompt and retry!
      if (isInputBlocked && req.body?.prompt && !req.body?._isRetry) {
        console.log('[Animate] Input blocked by safety filter. Auto-healing prompt into camera-safe visual language...');
        const safePrompt = await generateSafePromptRephrase(req.body.prompt);
        if (safePrompt) {
          console.log(`[Animate] Retrying with auto-healed prompt: "${safePrompt.slice(0, 80)}..."`);
          result = await executeAnimateCore({
            ...req.body,
            prompt: safePrompt,
            _isRetry: true,
          });
          return res.json({
            ...result,
            autoRephrased: true,
            originalPrompt: req.body.prompt,
            activePrompt: safePrompt,
            generationLog: recentGenerationLogs[0],
            logId: recentGenerationLogs[0]?.id,
          });
        }
      }
      throw firstError;
    }

    return res.json(result);
  } catch (error: any) {
    console.error('[Animate] Error generating video:', error);
    const status = error?.status || error?.statusCode || 500;
    const errorMessage = error?.message || 'An unexpected error occurred during video generation.';
    const isSpendingCap =
      status === 429 ||
      status === 402 ||
      errorMessage.includes('402') ||
      errorMessage.includes('Payment Required') ||
      errorMessage.includes('spending cap') ||
      errorMessage.includes('spend cap') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('RESOURCE_EXHAUSTED') ||
      errorMessage.includes('429');

    const isInputBlocked =
      status === 400 ||
      errorMessage.includes('Input blocked') ||
      errorMessage.includes('could not be processed') ||
      errorMessage.includes('rephrasing the prompt');

    let suggestedPrompt: string | null = null;
    if (isInputBlocked && req.body?.prompt) {
      suggestedPrompt = await generateSafePromptRephrase(req.body.prompt);
    }

    if (isSpendingCap) {
      quotaState.lastVideoRateLimitInfo = { message: errorMessage, timestamp: Date.now() };
    }

    return res.status(isSpendingCap ? 429 : isInputBlocked ? 400 : 500).json({
      error: errorMessage,
      isSpendingCap,
      isInputBlocked,
      suggestedPrompt,
      blockedReason: isInputBlocked
        ? "Google's video moderation filter flagged abstract, ritual, or symbolic phrasing. Relying directly on the attached reference image with descriptive optical and camera directions ensures smooth generation."
        : undefined,
      spendUrl: 'https://ai.studio/spend',
      rateLimitUrl: 'https://ai.dev/rate-limit',
      details: error?.statusText || error?.code,
      logId: recentGenerationLogs[0]?.id,
      generationLog: recentGenerationLogs[0],
    });
  }
};

// Extend an existing video by continuing the scene using previous_interaction_id
export async function executeExtendCore(body: any) {
  const startTime = Date.now();
  const logId = `ext-${startTime}-${Math.random().toString(36).substring(2, 7)}`;
  const {
    previousInteractionId,
    prompt,
    aspectRatio = '9:16',
    duration = '5s',
    resolution = '720p',
    season,
    weather,
    clothingDirective,
    shootGuideDirective,
    audioMode = 'with_sound',
  } = body;

  if (!previousInteractionId) {
    throw new Error('previousInteractionId is required to extend a video.');
  }

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('A continuation prompt is required.');
  }

  const validAspectRatios = ['16:9', '9:16'];
  const chosenAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '9:16';

  const validDurations = ['5s', '10s', '15s'];
  const chosenDuration = validDurations.includes(duration) ? duration : '10s';

  const validResolutions = ['360p', '720p', '1080p'];
  const chosenResolution = validResolutions.includes(resolution) ? resolution : '720p';

  const continuationPrompt =
    prompt.toLowerCase().includes('continue') || prompt.toLowerCase().includes('extend')
      ? prompt
      : `Continue the scene seamlessly from the previous video: ${prompt}`;

  // Initialize diagnostic log record
  const logRecord: GenerationLogRecord = {
    id: logId,
    timestamp: new Date().toISOString(),
    operation: 'extend',
    status: 'in_progress',
    clientPayloadSummary: {
      prompt: continuationPrompt.trim(),
      sanitizedPrompt: '',
      aspectRatio: chosenAspectRatio,
      duration: chosenDuration,
      resolution: chosenResolution,
      audioMode,
      season,
      weather,
      customEmblemType: body.customEmblemType,
      customEmblemName: body.customEmblemName,
      customEmblemUrl: body.customEmblemUrl,
      disableMorph: body.disableMorph,
      enableMorph: body.enableMorph,
      referenceImagesCount: Array.isArray(body.referenceImages) ? body.referenceImages.length : 0,
      clientReferenceImagesList: Array.isArray(body.referenceImages)
        ? body.referenceImages.map((r: any) => ({
            label: r.label || 'Reference Item',
            category: r.category,
            filename: r.filename,
            pathOrUrl: r.imageUrl || r.imagePath,
          }))
        : [],
      clothingDirectives: Array.isArray(body.clothingDirectives)
        ? body.clothingDirectives.map((c: any) => (typeof c === 'string' ? c : c.directive || c.title))
        : [],
      propDirectives: Array.isArray(body.propDirectives)
        ? body.propDirectives.map((p: any) => (typeof p === 'string' ? p : p.directive || p.title))
        : [],
      characterDirectives: Array.isArray(body.characterDirectives)
        ? body.characterDirectives.map((ch: any) => (typeof ch === 'string' ? ch : ch.directive || ch.title))
        : [],
    },
    resolvedReferenceImages: [],
    formattedLog: '',
  };

  const resolvedImages = await resolveReferenceImages(body);

  let imageManifest = `=== REFERENCE IMAGE DIRECTORY & FILENAME MANIFEST ===
The following ${resolvedImages.length} reference images are attached in order in the input sequence. When the prompt or directives refer to an image by filename, URL, or position ("first attached image", "second attached image"), use this exact mapping:
`;

  resolvedImages.forEach((img, idx) => {
    const num = idx + 1;
    const name = img.filename || `image_${num}.png`;
    imageManifest += `\n- Reference Image ${num} [Filename: "${name}"]${img.url ? ` [URL: "${img.url}"]` : ''}:\n  Role: ${img.role || img.label || 'Reference Image'}\n  ${img.description ? `Visual Details: ${img.description}\n` : ''}`;
  });

  const inputParts: any[] = [];
  for (let i = 0; i < resolvedImages.length; i++) {
    const img = resolvedImages[i];
    inputParts.push({
      type: 'text',
      text: `[REFERENCE IMAGE ${i + 1} | FILENAME: "${img.filename}" | ROLE: "${img.role || img.label || 'Reference'}"]:`
    });
    inputParts.push({
      type: 'image',
      mime_type: img.mimeType,
      data: img.base64,
    });
  }

  let fullDirectives = getCharacterDirective(body, resolvedImages);
  fullDirectives += formatProductionDirectives(body, resolvedImages);

  if (audioMode === 'silent' || continuationPrompt.toLowerCase().includes('silent') || continuationPrompt.toLowerCase().includes('no sound')) {
    fullDirectives += `\n\n[AUDIO DIRECTIVE - SILENT]:\nSilent cinematic video with pure visual elegance. Do not generate audio or sound effects.`;
  } else {
    fullDirectives += `\n\n[AUDIO DIRECTIVE - IMMERSIVE SOUND]:\nGenerate rich synchronized audio alongside the continuation: whistling alpine wind, rustling meadow grass, birdsong, and energetic playful cartoon bounce sound effects.`;
  }

  const sanitizedContinuationPrompt = sanitizePromptToImageReference(continuationPrompt.trim(), resolvedImages);
  const lockedContinuationPrompt = `${imageManifest}\n\n${fullDirectives}\n\n[SCENE CONTINUATION DIRECTIVE]:\n${sanitizedContinuationPrompt}`;
  inputParts.push({
    type: 'text',
    text: lockedContinuationPrompt,
  });

  // Populate diagnostic record
  logRecord.resolvedReferenceImages = resolvedImages.map((img) => ({
    index: img.index || 0,
    filename: img.filename,
    label: img.label,
    role: img.role || img.label,
    source: img.source,
    url: img.url,
    mimeType: img.mimeType,
    byteSize: img.byteSize,
    description: img.description,
    previewUrl: img.previewUrl,
  }));
  logRecord.promptManifest = imageManifest;
  logRecord.characterDirectiveText = fullDirectives;
  logRecord.clientPayloadSummary.sanitizedPrompt = sanitizedContinuationPrompt;
  logRecord.finalPromptText = lockedContinuationPrompt;
  recordGenerationLog(logRecord);

  console.log(`[Extend] [${logId}] Extending video from interaction ${previousInteractionId} with ${resolvedImages.length} reference images`);
  console.log(`[Extend] [${logId}] Continuation prompt: ${sanitizedContinuationPrompt.slice(0, 100)}...`);

  const ai = getGeminiClient();
  let interaction;
  try {
    interaction = await ai.interactions.create(
      {
        model: 'gemini-omni-1.2-flash',
        previous_interaction_id: previousInteractionId,
        input: inputParts,
        background: false,
        store: true,
        stream: false,
        response_format: {
          type: 'video',
          aspect_ratio: chosenAspectRatio,
          duration: chosenDuration,
          resolution: chosenResolution,
        },
      },
      { timeout: 300000 }
    );
  } catch (apiErr: any) {
    logRecord.status = 'failed';
    logRecord.durationMs = Date.now() - startTime;
    logRecord.geminiInteraction = {
      interactionId: previousInteractionId,
      model: 'gemini-omni-1.2-flash',
      hasOutputVideo: false,
      error: {
        message: apiErr.message || 'Interactions API extension request failed.',
        status: apiErr.status || apiErr.statusCode,
        code: apiErr.code,
      },
    };
    recordGenerationLog(logRecord);
    throw apiErr;
  }

  const videoPart = interaction.output_video;
  let base64VideoData = videoPart?.data;
  let videoMime = videoPart?.mime_type || 'video/mp4';
  let videoUri = (videoPart as any)?.uri;

  if (!base64VideoData && !videoUri && interaction.steps) {
    for (const step of interaction.steps) {
      if (step.type === 'model_output' && (step as any).content) {
        const vid = (step as any).content.find((c: any) => c.type === 'video');
        if (vid) {
          if (vid.data) base64VideoData = vid.data;
          if (vid.mime_type) videoMime = vid.mime_type;
          if (vid.uri) videoUri = vid.uri;
        }
      }
    }
  }

  if (!base64VideoData && !videoUri) {
    logRecord.status = 'failed';
    logRecord.durationMs = Date.now() - startTime;
    logRecord.geminiInteraction = {
      interactionId: interaction.id,
      model: 'gemini-omni-1.2-flash',
      hasOutputVideo: false,
      error: { message: 'The model completed the extension request but did not return video data.' },
    };
    recordGenerationLog(logRecord);
    throw new Error('The model completed the extension request but did not return video data.');
  }

  const videoUrl = base64VideoData ? `data:${videoMime};base64,${base64VideoData}` : videoUri;

  // Mark successful log
  logRecord.status = 'success';
  logRecord.durationMs = Date.now() - startTime;
  logRecord.geminiInteraction = {
    interactionId: interaction.id,
    model: 'gemini-omni-1.2-flash',
    hasOutputVideo: true,
    videoMimeType: videoMime,
    videoSizeKb: base64VideoData ? Math.round(base64ByteLength(base64VideoData) / 1024) : undefined,
    videoUri,
  };
  recordGenerationLog(logRecord);


  rememberSceneContext(interaction.id, body); // browser port: lets /api/continue-scene inherit this scene's character setup
  return {
    success: true,
    videoUrl,
    videoUri,
    mimeType: videoMime,
    aspectRatio: chosenAspectRatio,
    duration: chosenDuration,
    prompt: continuationPrompt,
    season,
    weather,
    interactionId: interaction.id,
    previousInteractionId,
    isExtension: true,
    logId,
    generationLog: logRecord,
  };
}

export const handleExtend: RouteHandler = async (req, res) => {
  try {
    let result;
    try {
      result = await executeExtendCore(req.body);
    } catch (firstError: any) {
      const status = firstError?.status || firstError?.statusCode || 500;
      const errMsg = firstError?.message || '';
      const isInputBlocked =
        status === 400 ||
        errMsg.includes('Input blocked') ||
        errMsg.includes('could not be processed') ||
        errMsg.includes('rephrasing the prompt');

      if (isInputBlocked && req.body?.prompt && !req.body?._isRetry) {
        console.log('[Extend] Input blocked by safety filter. Auto-healing continuation prompt...');
        const safePrompt = await generateSafePromptRephrase(req.body.prompt);
        if (safePrompt) {
          console.log(`[Extend] Retrying with auto-healed prompt: "${safePrompt.slice(0, 80)}..."`);
          result = await executeExtendCore({
            ...req.body,
            prompt: safePrompt,
            _isRetry: true,
          });
          return res.json({
            ...result,
            autoRephrased: true,
            originalPrompt: req.body.prompt,
            activePrompt: safePrompt,
            generationLog: recentGenerationLogs[0],
            logId: recentGenerationLogs[0]?.id,
          });
        }
      }
      throw firstError;
    }

    return res.json(result);
  } catch (error: any) {
    console.error('[Extend] Error extending video:', error);
    const status = error?.status || error?.statusCode || 500;
    const errorMessage = error?.message || 'An unexpected error occurred during video extension.';
    const isSpendingCap =
      status === 429 ||
      errorMessage.includes('spending cap') ||
      errorMessage.includes('spend cap') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('RESOURCE_EXHAUSTED') ||
      errorMessage.includes('429');

    const isInputBlocked =
      status === 400 ||
      errorMessage.includes('Input blocked') ||
      errorMessage.includes('could not be processed') ||
      errorMessage.includes('rephrasing the prompt');

    let suggestedPrompt: string | null = null;
    if (isInputBlocked && req.body?.prompt) {
      suggestedPrompt = await generateSafePromptRephrase(req.body.prompt);
    }

    if (isSpendingCap) {
      quotaState.lastVideoRateLimitInfo = { message: errorMessage, timestamp: Date.now() };
    }

    return res.status(isSpendingCap ? 429 : isInputBlocked ? 400 : 500).json({
      error: errorMessage,
      isSpendingCap,
      isInputBlocked,
      suggestedPrompt,
      blockedReason: isInputBlocked
        ? "Google's video moderation filter flagged abstract, ritual, or symbolic phrasing. Relying directly on the attached reference image with descriptive optical and camera directions ensures smooth generation."
        : undefined,
      spendUrl: 'https://ai.studio/spend',
      rateLimitUrl: 'https://ai.dev/rate-limit',
      details: error?.statusText || error?.code,
      logId: recentGenerationLogs[0]?.id,
      generationLog: recentGenerationLogs[0],
    });
  }
};


// ---------------------------------------------------------------------------
// /api/continue-scene — called by the 20s / 30s auto-chaining in App.tsx, never implemented in
// server.ts (those calls 404'd). It is /api/extend: same body shape (previousInteractionId,
// prompt, aspectRatio, duration, resolution, season, weather, audioMode), same response shape
// (success, videoUrl, interactionId, …), same auto-rephrase retry and error mapping. The chaining
// call sends no emblem / wardrobe / reference fields, so on its own extend would fall back to the
// default spiral-medallion references and could contradict scene 1. The browser still holds the
// request that produced `previousInteractionId`, so those character fields are inherited from it;
// anything the client does send wins.
// ---------------------------------------------------------------------------

const sceneContexts = new Map<string, Record<string, any>>();
const MAX_SCENE_CONTEXTS = 20;
const NON_INHERITED_FIELDS = [
  'prompt',
  'previousInteractionId',
  'parentSceneNumber',
  '_isRetry',
  'imageBase64',
  'imageMimeType',
  'imagePath',
];

function rememberSceneContext(interactionId: string | undefined, body: any) {
  if (!interactionId || !body || typeof body !== 'object') return;
  const ctx: Record<string, any> = { ...body };
  for (const k of NON_INHERITED_FIELDS) delete ctx[k];
  sceneContexts.delete(interactionId);
  sceneContexts.set(interactionId, ctx);
  while (sceneContexts.size > MAX_SCENE_CONTEXTS) {
    const oldest = sceneContexts.keys().next().value;
    if (oldest === undefined) break;
    sceneContexts.delete(oldest);
  }
}

export const handleContinueScene: RouteHandler = async (req, res) => {
  const body = req.body || {};
  const inherited = (body.previousInteractionId && sceneContexts.get(body.previousInteractionId)) || {};
  const merged: Record<string, any> = { ...inherited };
  for (const [k, v] of Object.entries(body)) {
    if (k === 'parentSceneNumber') continue;
    if (v !== undefined && v !== null) merged[k] = v;
  }
  return handleExtend({ ...req, body: merged }, res);
};
