import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

function parsePort(): number {
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const val = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(val)) return val;
  }
  if (process.env.PORT) {
    const val = parseInt(process.env.PORT, 10);
    if (!isNaN(val)) return val;
  }
  return 3000;
}

function parseHost(): string {
  const hostArgIdx = process.argv.indexOf('--host');
  if (hostArgIdx !== -1 && process.argv[hostArgIdx + 1]) {
    return process.argv[hostArgIdx + 1];
  }
  return process.env.HOST || '0.0.0.0';
}

const PORT = parsePort();
const HOST = parseHost();

// High payload limits to support full image and video transfer
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ limit: '60mb', extended: true }));

// Serve static assets from public
app.use('/assets', express.static(path.resolve(__dirname, 'public/assets')));

// Helper to get or create Gemini client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString(),
  });
});

// Track recent video rate limit errors to give users crystal-clear quota diagnostics
let lastVideoRateLimitInfo: { message: string; timestamp: number } | null = null;

// Test whether the project spend cap / quota has refreshed
app.get('/api/test-quota', async (_req, res) => {
  try {
    const ai = getGeminiClient();
    await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'ping',
      config: { maxOutputTokens: 1 },
    });

    const isRecentVideoRateLimit =
      lastVideoRateLimitInfo && Date.now() - lastVideoRateLimitInfo.timestamp < 1000 * 60 * 90;

    if (isRecentVideoRateLimit) {
      return res.json({
        success: true,
        status: 'video_rate_limited',
        textQuotaActive: true,
        videoRateLimit: lastVideoRateLimitInfo?.message,
        message: lastVideoRateLimitInfo?.message || 'Daily video model limit reached.',
      });
    }

    return res.json({
      success: true,
      status: 'active',
      textQuotaActive: true,
      message: 'Your spend cap update is live and quota is active!',
    });
  } catch (err: any) {
    const status = err?.status || err?.statusCode || 500;
    const msg = err?.message || 'Error checking quota';
    const isSpendingCap =
      status === 429 ||
      msg.includes('spending cap') ||
      msg.includes('spend cap') ||
      msg.includes('quota') ||
      msg.includes('RESOURCE_EXHAUSTED');
    return res.json({
      success: false,
      status: isSpendingCap ? 'spend_cap_still_syncing' : 'error',
      isSpendingCap,
      error: msg,
    });
  }
});

// Dedicated reference image sets for character consistency
const ORIGINAL_MEDALLION_RABBIT_SET = [
  {
    path: 'public/assets/aistudio/image_07de772c.png',
    filename: 'image_07de772c.png',
    label: 'Original Chest Emblem: Authentic Oval White Felt Medallion with Blue Border & Two Interlocking Spiral Swirls',
  },
  {
    path: 'public/assets/aistudio/1790924612634-1_cd314286.jpg',
    filename: '1790924612634-1_cd314286.jpg',
    label: 'Master Action Jump (Character Wearing Original Chest Medallion)',
  },
  {
    path: 'public/assets/aistudio/rabbit_face_crop.jpg',
    filename: 'rabbit_face_crop.jpg',
    label: 'Character Facial Features: Single Buck Tooth & Upright Floppy Ears',
  },
];

const WAYFINDER_RABBIT_SET = [
  {
    path: 'public/assets/aistudio/image_07c026d1.png',
    filename: 'image_07c026d1.png',
    label: 'Authentic Eight-Spoke Blueprint: Asymmetrical Staves with Comb Teeth, Circular Glyphs, and Crossbars',
  },
  {
    path: 'public/assets/aistudio/rabbit_chest_emblem_clean.png',
    filename: 'rabbit_chest_emblem_clean.png',
    label: 'Primary Character Chest (Physical Blue Yarn Eight-Spoke Embroidery on Pink Fleece)',
  },
  {
    path: 'public/assets/aistudio/rabbit_wayfinder_jump.jpg',
    filename: 'rabbit_wayfinder_jump.jpg',
    label: 'Master Action Jump (Custom Chest Embroidery)',
  },
  {
    path: 'public/assets/aistudio/rabbit_face_crop.jpg',
    filename: 'rabbit_face_crop.jpg',
    label: 'Face Close-Up (Single Buck Tooth & Upright Ears)',
  },
];

const TRANSFORMATION_RABBIT_SET = [
  {
    path: 'public/assets/aistudio/image_07de772c.png',
    filename: 'image_07de772c.png',
    label: 'Reference Image 1: Start Chest Emblem - Original Oval White Felt Medallion with Blue Border & Interlocking Spiral Swirls (Initial State)',
  },
  {
    path: 'public/assets/aistudio/image_07c026d1.png',
    filename: 'image_07c026d1.png',
    label: 'Reference Image 2: End Chest Emblem - Authentic Eight-Spoke Runic Stave Blueprint with Asymmetrical Staves (Comb Teeth, Circular Glyph, Crossbars) (Final State)',
  },
  {
    path: 'public/assets/aistudio/rabbit_chest_emblem_clean.png',
    filename: 'rabbit_chest_emblem_clean.png',
    label: 'Reference Image 3: Real Blue Yarn Embroidery Texture on Pink Fleece',
  },
  {
    path: 'public/assets/aistudio/1790924612634-1_cd314286.jpg',
    filename: '1790924612634-1_cd314286.jpg',
    label: 'Reference Image 4: Full Character Action Leap & Body Silhouette Reference',
  },
  {
    path: 'public/assets/aistudio/rabbit_face_crop.jpg',
    filename: 'rabbit_face_crop.jpg',
    label: 'Reference Image 5: Character Face with Single Buck Tooth & Upright Floppy Ears',
  },
];

const DEFAULT_RABBIT_SET = TRANSFORMATION_RABBIT_SET;

function sanitizePromptToImageReference(rawPrompt: string, resolvedImages?: ResolvedImage[]): string {
  if (!rawPrompt || typeof rawPrompt !== 'string') return '';

  // Mask out URLs and filenames so they cannot be corrupted by keyword sanitization
  const maskedUrls: string[] = [];
  let masked = rawPrompt.replace(/https?:\/\/[^\s"'<>)\]]+/gi, (url) => {
    const idx = maskedUrls.length;
    maskedUrls.push(url);
    return `__URL_PLACEHOLDER_${idx}__`;
  });

  const maskedFiles: string[] = [];
  masked = masked.replace(/\b[a-zA-Z0-9_\-]+\.(?:png|jpe?g|webp|gif|svg)\b/gi, (file) => {
    const idx = maskedFiles.length;
    maskedFiles.push(file);
    return `__FILE_PLACEHOLDER_${idx}__`;
  });

  // Safety sanitization against banned/sensitive terms
  let sanitized = masked
    .replace(/\bthe vegv[io]s[ií]?r symbol\b/gi, 'the eight-spoke symbol shown in the reference blueprint')
    .replace(/\bvegv[io]s[ií]?r symbol\b/gi, 'the eight-spoke symbol shown in the reference blueprint')
    .replace(/\bfrom the vegv[io]s[ií]?r\b/gi, 'from the reference blueprint')
    .replace(/\bthe vegv[io]s[ií]?r\b/gi, 'the reference blueprint')
    .replace(/\bvegv[io]s[ií]?r\b/gi, 'the reference blueprint')
    .replace(/\bcloses his eyes and takes three slow breaths\b/gi, 'pauses peacefully in the soft grass')
    .replace(/\braises (his )?paws toward the sky\b/gi, 'gently lifts paws upward toward the morning light');

  // Restore placeholders
  maskedFiles.forEach((file, idx) => {
    sanitized = sanitized.replace(`__FILE_PLACEHOLDER_${idx}__`, file);
  });
  maskedUrls.forEach((url, idx) => {
    sanitized = sanitized.replace(`__URL_PLACEHOLDER_${idx}__`, url);
  });

  // Target Picture / Artwork Reference Binding
  if (resolvedImages && resolvedImages.length > 0) {
    const pictureImg = resolvedImages.find(
      (img) => img.role?.includes('TARGET PICTURE') || img.role?.includes('PICTURE')
    );

    const promptLower = sanitized.toLowerCase();
    if (pictureImg && (
      promptLower.includes('looking a picture') ||
      promptLower.includes('looking at a picture') ||
      promptLower.includes('look at a picture') ||
      promptLower.includes('looks at a picture') ||
      promptLower.includes('holding a picture') ||
      promptLower.includes('as the picture') ||
      promptLower.includes('as a picture') ||
      promptLower.includes('sodesign')
    )) {
      const targetTag = `Reference Image ${pictureImg.index} [Filename: "${pictureImg.filename}"]`;
      sanitized = sanitized
        .replace(/use\s+[a-zA-Z0-9_\-]+\s+reference\s+as\s+the\s+picture/gi, `faithfully and accurately displaying the exact graphic artwork shown in ${targetTag} on the face of the picture`)
        .replace(/use\s+[a-zA-Z0-9_\-]+\s+as\s+the\s+picture/gi, `faithfully and accurately displaying the exact graphic artwork shown in ${targetTag} on the face of the picture`)
        .replace(/looking\s+a\s+picture/gi, `holding and peacefully looking at a physical picture that clearly depicts ${targetTag}`)
        .replace(/looking\s+at\s+a\s+picture/gi, `holding and peacefully looking at a physical picture that clearly depicts ${targetTag}`);
    }

    // Companion Character / Friend Reference Binding
    const friendImg = resolvedImages.find(
      (img) => img.role?.includes('COMPANION') || img.role?.includes('FRIEND')
    );

    if (friendImg && (
      promptLower.includes('friend') ||
      promptLower.includes('companion') ||
      promptLower.includes('sidekick')
    )) {
      const friendTag = `Reference Image ${friendImg.index} [Filename: "${friendImg.filename}"]`;
      sanitized = sanitized
        .replace(/use\s+(?:the\s+)?[a-zA-Z0-9_\-]+\s+for\s+(?:the\s+)?image\s+of\s+(?:the\s+|his\s+)?friend/gi, `faithfully replicating the exact character appearance and face shown in ${friendTag} as his friend`)
        .replace(/use\s+(?:the\s+)?[a-zA-Z0-9_\-]+\s+as\s+(?:the\s+|his\s+)?friend/gi, `faithfully replicating the exact character appearance and face shown in ${friendTag} as his friend`)
        .replace(/use\s+(?:the\s+)?[a-zA-Z0-9_\-]+\s+for\s+(?:the\s+|his\s+)?friend/gi, `faithfully replicating the exact character appearance and face shown in ${friendTag} as his friend`);
    }
  }

  return sanitized;
}

function isTransformationRequest(body: any): boolean {
  // 1. Explicit disable flag completely shuts off morphing
  if (body.disableMorph === true || body.enableMorph === false) {
    return false;
  }

  // 2. Only activate morphing if the user explicitly selected the morph emblem type or enabled morphing
  if (body.customEmblemType === 'morph' || body.customEmblemType === 'transformation') {
    return true;
  }

  if (body.enableMorph === true) {
    return true;
  }

  // 3. Otherwise, do NOT guess or force morphing onto normal user prompts
  return false;
}

function getCharacterDirective(body: any, resolvedImages?: ResolvedImage[]): string {
  const isMorph = isTransformationRequest(body);

  if (isMorph) {
    const startImg = resolvedImages?.find(
      (img) =>
        img.role?.includes('Start Chest Emblem') ||
        img.role?.includes('Starting Chest Emblem') ||
        img.filename.includes('07de772c')
    ) || resolvedImages?.[0];
    const endImg = resolvedImages?.find(
      (img) =>
        img.role?.includes('End Chest Emblem') ||
        img.role?.includes('Ending Chest Emblem') ||
        img.filename.includes('07c026d1')
    ) || resolvedImages?.[1];

    const startTag = startImg ? `Reference Image ${startImg.index} [${startImg.filename}]` : 'Reference Image 1';
    const endTag = endImg ? `Reference Image ${endImg.index} [${endImg.filename}]` : 'Reference Image 2';

    return `[STRICT CHARACTER IDENTITY & OPTIONAL EMBROIDERY METAMORPHOSIS]:
The subject in this video MUST be the EXACT green plush rabbit doll shown in the reference images.
CRITICAL PHYSICAL CHARACTERISTICS:
1. FACE & HEAD: Apple-green textured fuzzy fleece/plush; TALL UPRIGHT floppy bunny ears extending upwards (NEVER draw drooping or lop ears); open, cheerful, wide grinning mouth with a single white buck tooth centered; light-pink muzzle snout with embroidered smile lines and blue eyes; bright magenta/pink fleece scarf.
2. CHEST EMBROIDERY TRANSFORMATION (METAMORPHOSIS EFFECT):
   - START OF SCENE: The oval light-pink fleece belly patch begins with his starting chest emblem (shown in ${startTag}): an oval white felt patch with a stitched dark-blue outer border and two interlocking blue spirals.
   - TRANSITION: During the scene action, the blue threads glow with a calm azure light, smoothly untangling and stretching outward to form the eight-armed symbol shown in ${endTag}.
   - END OF SCENE: The glow softly fades, leaving the crisp permanent eight-armed symbol centered on his chest.
   - PROMPT PRIORITY: Do NOT override or cancel the user's requested action or setting in [ANIMATION SCENE ACTION DIRECTIVE]; the rabbit must perform the user's scene while the emblem transitions.
3. RUNE FIDELITY MANDATE (NO RADIAL SYMMETRY / NO IDENTICAL FORKS):
   ${endTag} is strictly ASYMMETRICAL:
   - Left horizontal stave features a distinct CIRCULAR RING / GLYPH and crossbars.
   - Right horizontal stave ends with a THREE-TOOTH COMB / RAKE and crossbars.
   - Vertical and diagonal staves have unique branchings and perpendicular ticks.
   CRITICAL: DO NOT draw eight identical trident pitchforks or generic symmetrical stars.`;
  }

  const isWayfinder =
    body.customEmblemType === 'vegvisir' ||
    body.customEmblemName?.toLowerCase().includes('wayfinder') ||
    body.customEmblemName?.toLowerCase().includes('eight') ||
    (typeof body.customEmblemImage === 'string' &&
      (body.customEmblemImage.includes('image_07c026d1') ||
        body.customEmblemImage.includes('rabbit_chest') ||
        body.customEmblemImage.includes('emblem_blue')));

  if (isWayfinder) {
    const wayImg = resolvedImages?.find(
      (img) => img.filename.includes('07c026d1') || img.role?.includes('Eight-Spoke') || img.role?.includes('Wayfinder')
    );
    const wayTag = wayImg ? `Reference Image ${wayImg.index} [${wayImg.filename}]` : 'Reference Image 1';

    return `[STRICT CHARACTER IDENTITY & STATIC EIGHT-SPOKE EMBLEM FIDELITY]:
The subject MUST be the green plush rabbit doll shown in the reference images.
1. FACE & HEAD: Apple-green fleece; tall upright floppy ears; open wide grin with single white buck tooth; light-pink snout; pink scarf.
2. STATIC CHEST EMBLEM (NO MORPHING / NO GLOW): The oval light-pink fleece belly patch displays the STATIC blue embroidered eight-armed symbol shown in ${wayTag} throughout the ENTIRE video clip from start to finish.
3. ABSOLUTE PROHIBITION: DO NOT MORPH, TRANSFORM, UNTANGLE, OR GLOW. The symbol stays completely static and constant.
4. RUNE ASYMMETRY FIDELITY: Replicate the distinct asymmetrical staves (circular glyph on left arm, comb teeth on right arm, crossbars on vertical arms) shown in ${wayTag}. DO NOT draw eight identical trident pitchforks.`;
  }

  // Original Spiral Medallion (Static Default)
  const origImg = resolvedImages?.find(
    (img) =>
      img.filename.includes('07de772c') ||
      img.role?.includes('Original Chest Emblem') ||
      img.role?.includes('Static Chest Emblem') ||
      img.role?.includes('Spiral')
  );
  const origTag = origImg ? `Reference Image ${origImg.index} [${origImg.filename}]` : 'the reference image';

  return `[STRICT CHARACTER IDENTITY & STATIC ORIGINAL SPIRAL MEDALLION FIDELITY]:
The subject MUST be the green plush rabbit doll shown in the reference images.
1. FACE & HEAD: Apple-green textured fuzzy fleece; tall upright floppy ears; open wide grin with single white buck tooth centered; light-pink snout; pink scarf.
2. STATIC CHEST EMBLEM (NO MORPHING / NO GLOW): The oval light-pink fleece belly patch features his original chest emblem shown in ${origTag}: an oval white felt badge with a stitched dark-blue outer border, containing two interlocking blue spiral swirls meeting at a central vortex.
3. ABSOLUTE PROHIBITIONS: DO NOT MORPH, TRANSFORM, UNTANGLE, GLOW, OR DRAW RUNES. The symbol remains the static oval spiral medallion throughout the entire video.`;
}

interface ResolvedImage {
  index?: number;
  mimeType: string;
  base64: string;
  filename: string;
  label?: string;
  role?: string;
  url?: string;
  source?: string;
  description?: string;
  byteSize?: number;
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
const recentGenerationLogs: GenerationLogRecord[] = [];

function recordGenerationLog(record: GenerationLogRecord) {
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

function formatDiagnosticLogText(record: GenerationLogRecord): string {
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

// Fetch any remote image from http/https URL, with proper headers and error handling
async function fetchImageFromUrl(
  rawUrl: string,
  customLabel?: string,
  customSource = 'web_url'
): Promise<ResolvedImage | null> {
  try {
    const url = rawUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) return null;

    console.log(`[FetchUrlImage] Fetching remote reference image from: ${url}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[FetchUrlImage] Failed to fetch ${url}: HTTP ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length === 0) return null;

    let mimeType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
    if (!mimeType || !mimeType.startsWith('image/')) {
      if (url.match(/\.png(\?.*)?$/i)) mimeType = 'image/png';
      else if (url.match(/\.jpe?g(\?.*)?$/i)) mimeType = 'image/jpeg';
      else if (url.match(/\.webp(\?.*)?$/i)) mimeType = 'image/webp';
      else if (url.match(/\.gif(\?.*)?$/i)) mimeType = 'image/gif';
      else mimeType = 'image/png';
    }

    let filename = 'reference_image.png';
    try {
      const parsed = new URL(url);
      const base = path.basename(parsed.pathname);
      if (base && base.length > 2 && base.includes('.')) {
        filename = base;
      } else {
        filename = `${parsed.hostname.replace(/[^a-zA-Z0-9]/g, '_')}_emblem.png`;
      }
    } catch {
      filename = 'url_reference.png';
    }

    const base64 = buffer.toString('base64');
    return {
      mimeType,
      base64,
      filename,
      url,
      source: customSource,
      byteSize: buffer.length,
      previewUrl: url,
      label: customLabel || `Reference Image from URL: ${url}`,
      role: customLabel || `Web Reference Image (${filename})`,
      description: `User-provided reference image fetched from web URL: ${url}`,
    };
  } catch (err: any) {
    console.error(`[FetchUrlImage] Error fetching ${rawUrl}:`, err.message);
    return null;
  }
}

// Clean resolver that ONLY resolves the requested file without accidental fallbacks to unrelated images
function resolveImageFile(
  imagePathOrRel: string,
  customLabel?: string,
  overrideFilename?: string,
  customSource = 'local_asset'
): ResolvedImage | null {
  const relativeClean = imagePathOrRel.replace(/^\/+/, '');
  const basename = path.basename(relativeClean);

  // Search strictly for the requested file and direct path aliases
  const possibleLocations = [
    path.resolve(__dirname, 'public', relativeClean),
    path.resolve(__dirname, 'public/assets/aistudio', basename),
    path.resolve(__dirname, 'public/assets', basename),
    path.resolve(__dirname, 'public', basename),
    path.resolve(__dirname, relativeClean),
  ];

  for (const loc of possibleLocations) {
    if (fs.existsSync(loc) && fs.statSync(loc).isFile()) {
      const fileBuffer = fs.readFileSync(loc);
      let mime = 'image/jpeg';
      if (loc.endsWith('.png')) mime = 'image/png';
      else if (loc.endsWith('.webp')) mime = 'image/webp';
      else if (loc.endsWith('.gif')) mime = 'image/gif';

      const fname = overrideFilename || path.basename(loc);
      return {
        mimeType: mime,
        base64: fileBuffer.toString('base64'),
        filename: fname,
        label: customLabel || fname,
        role: customLabel || fname,
        source: customSource,
        byteSize: fileBuffer.length,
        previewUrl: `/assets/aistudio/${path.basename(loc)}`,
      };
    }
  }
  return null;
}

function extractUrlsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const urlRegex = /https?:\/\/[^\s"'<>)\]]+/gi;
  const matches = text.match(urlRegex) || [];
  return Array.from(new Set(matches));
}

function extractLocalFilenamesFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(/\b([a-zA-Z0-9_\-]+\.(?:png|jpe?g|webp))\b/gi) || [];
  return Array.from(new Set(matches));
}

async function resolveReferenceImages(body: any): Promise<ResolvedImage[]> {
  const results: ResolvedImage[] = [];
  const addedKeys = new Set<string>();

  const addUnique = (img: ResolvedImage | null) => {
    if (!img) return;
    const key = (img.url || img.filename).toLowerCase();
    if (key && addedKeys.has(key)) return;
    if (key) addedKeys.add(key);
    results.push(img);
  };

  const rawPrompt = body.prompt || '';
  const promptText = rawPrompt.toLowerCase();

  // Detect in-scene picture/artwork intent in prompt
  const isPictureInPrompt =
    promptText.includes('picture') ||
    promptText.includes('photo') ||
    promptText.includes('artwork') ||
    promptText.includes('drawing') ||
    promptText.includes('graphic') ||
    promptText.includes('card') ||
    promptText.includes('poster') ||
    promptText.includes('canvas') ||
    promptText.includes('holding') ||
    promptText.includes('looking at') ||
    promptText.includes('looking a');

  // Detect dual-emblem transition in prompt
  const promptDescribesDualEmblems =
    (promptText.includes('first attached image') && promptText.includes('second attached image')) ||
    (promptText.includes('first reference image') && promptText.includes('second reference image')) ||
    (promptText.includes('image_07de772c') && promptText.includes('image_07c026d1'));

  const isMorphActive = isTransformationRequest(body) || promptDescribesDualEmblems;

  // =========================================================================
  // PRIORITY 1: USER-SPECIFIED TARGET ASSETS (PROMPT-NAMED, CUSTOM PICTURES, UPLOADS)
  // When the user specifies an image by name in the prompt (e.g. "sodesign", "image_735d6c29")
  // or uploads a custom picture/prop, that image MUST BE Reference Image 1!
  // =========================================================================
  const clientRefs: any[] = Array.isArray(body.referenceImages) ? body.referenceImages : [];

  // Universal helper to resolve any reference asset (base64, remote URL in imageUrl/imagePath, or local file)
  const resolveAnyRefAsset = async (ref: any, role: string, desc?: string): Promise<ResolvedImage | null> => {
    if (!ref) return null;
    const targetUri = ref.imageUrl || ref.imagePath || ref.url || '';
    const cleanName = (ref.label || ref.filename || 'item')
      .replace(/\s*\([^)]*\)/g, '')
      .trim()
      .replace(/[^a-zA-Z0-9_\-]/g, '_');

    if (ref.imageBase64 && typeof ref.imageBase64 === 'string') {
      const match = ref.imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return {
          mimeType: match[1],
          base64: match[2],
          filename: ref.filename || `${cleanName}.png`,
          label: ref.label,
          role,
          source: 'client_multiref_base64',
          byteSize: Buffer.from(match[2], 'base64').length,
          previewUrl: ref.imageBase64,
          description: desc,
        };
      }
    }

    if (typeof targetUri === 'string' && (targetUri.startsWith('http://') || targetUri.startsWith('https://'))) {
      const fetched = await fetchImageFromUrl(targetUri, role, 'client_multiref_url');
      if (fetched) {
        if (ref.filename) fetched.filename = ref.filename;
        fetched.description = desc;
        fetched.role = role;
        return fetched;
      }
      return null;
    }

    if (typeof targetUri === 'string' && targetUri.trim()) {
      const resolved = resolveImageFile(targetUri, role, ref.filename || `${cleanName}.png`, 'client_multiref_file');
      if (resolved) {
        resolved.description = desc;
        resolved.role = role;
        return resolved;
      }
    }

    return null;
  };

  // Helper to determine if an asset is the primary hero rabbit himself
  const isHeroRabbitAsset = (refOrImg: any): boolean => {
    if (!refOrImg) return false;
    const label = (refOrImg.label || '').toLowerCase();
    const filename = (refOrImg.filename || '').toLowerCase();
    const role = (refOrImg.role || '').toLowerCase();
    const uri = (refOrImg.imagePath || refOrImg.imageUrl || refOrImg.url || '').toLowerCase();

    return (
      label.includes('master action jump') ||
      label.includes('face close-up') ||
      label.includes('buck tooth') ||
      label.includes('chest embroidery') ||
      label.includes('hero character') ||
      label.includes('green plush rabbit') ||
      filename.includes('rabbit_wayfinder_jump') ||
      filename.includes('rabbit_face_crop') ||
      filename.includes('rabbit_chest') ||
      filename.includes('1790924612634-1') ||
      filename.includes('07de772c') ||
      filename.includes('07c026d1') ||
      uri.includes('rabbit_wayfinder_jump') ||
      uri.includes('rabbit_face_crop') ||
      uri.includes('rabbit_chest') ||
      uri.includes('1790924612634-1') ||
      role.includes('hero character') ||
      role.includes('plush rabbit doll')
    );
  };

  // Helper to determine intent and role for an asset based on prompt context
  const getAssetRoleAndDesc = (ref: any): { role: string; desc: string; isFriend: boolean; isPicture: boolean } => {
    const label = (ref.label || '').toLowerCase();
    const cleanLabel = label.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
    const filename = (ref.filename || '').toLowerCase().replace(/\.[^.]+$/, '');
    const isNamedInPrompt =
      (cleanLabel && cleanLabel.length >= 3 && promptText.includes(cleanLabel)) ||
      (filename && filename.length >= 3 && promptText.includes(filename));

    // 1. If this is the primary hero rabbit, preserve authentic hero rabbit identity
    if (isHeroRabbitAsset(ref)) {
      return {
        role: `HERO CHARACTER: ${ref.label || cleanLabel}`,
        desc: `Authentic primary hero character: Green plush rabbit doll body, apple-green fleece proportions, tall upright floppy ears, single white buck tooth, and magenta scarf.`,
        isFriend: false,
        isPicture: false,
      };
    }

    // 2. Check if this is a companion / friend (explicitly categorized or named in a friend context)
    const isFriendInPrompt =
      (isNamedInPrompt &&
        (promptText.includes('friend') ||
          promptText.includes('companion') ||
          promptText.includes('sidekick') ||
          promptText.includes('buddy') ||
          promptText.includes('dancing with'))) ||
      ref.category === 'companion' ||
      cleanLabel.includes('friend') ||
      cleanLabel.includes('companion');

    if (isFriendInPrompt) {
      return {
        role: `CRITICAL HERO COMPANION CHARACTER: Visual Appearance & Identity of Rabbit's Friend`,
        desc: `The companion character/friend celebrating and interacting alongside the green plush rabbit MUST EXACTLY REPRODUCE the character shown in this reference image (${ref.filename || cleanLabel}). Replicate this exact character faithfully into the scene. Do NOT invent a different or generic character.`,
        isFriend: true,
        isPicture: false,
      };
    }

    // 3. Check if this is an in-scene picture / artwork held in paws
    const isPictureInPrompt =
      (isNamedInPrompt &&
        (promptText.includes('picture') ||
          promptText.includes('photo') ||
          promptText.includes('artwork') ||
          promptText.includes('drawing') ||
          promptText.includes('graphic') ||
          promptText.includes('holding') ||
          promptText.includes('looking at') ||
          promptText.includes('looking a') ||
          promptText.includes('as the picture') ||
          promptText.includes('as a picture'))) ||
      ref.category === 'picture' ||
      cleanLabel.includes('picture') ||
      cleanLabel.includes('artwork');

    if (isPictureInPrompt) {
      return {
        role: `CRITICAL IN-SCENE TARGET PICTURE / ARTWORK: Exact graphic image to be held and viewed by the rabbit in the scene`,
        desc: `Authentic graphic reproduction mandate: The physical picture/card held in the rabbit's paws MUST clearly and faithfully display this exact artwork with matching colors, symbols, staves, and composition. The rabbit is holding this picture; DO NOT treat this as clothing.`,
        isFriend: false,
        isPicture: true,
      };
    }

    // 4. Scenery or equipment prop
    if (ref.category === 'prop') {
      return {
        role: `PROP / SCENERY: ${ref.label || cleanLabel}`,
        desc: `Physical prop and environment object placed into the scene alongside the rabbit.`,
        isFriend: false,
        isPicture: false,
      };
    }

    const refCat = (ref.category || 'reference').toUpperCase();
    return {
      role: `${refCat}: ${ref.label || cleanLabel}`,
      desc: ref.tagline || ref.directiveText || '',
      isFriend: false,
      isPicture: false,
    };
  };

  // 1A. Prompt-Mentioned Client References (e.g. user prompt says "use 1794087089723-1 for the image of the friend")
  const promptMentionedClientRefs = clientRefs.filter((r) => {
    if (!r || r.enabled === false) return false;
    const label = (r.label || '').toLowerCase();
    const cleanLabel = label.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
    const filename = (r.filename || '').toLowerCase().replace(/\.[^.]+$/, '');
    return (
      (cleanLabel && cleanLabel.length >= 3 && promptText.includes(cleanLabel)) ||
      (filename && filename.length >= 3 && promptText.includes(filename))
    );
  });

  for (const ref of promptMentionedClientRefs) {
    const { role, desc } = getAssetRoleAndDesc(ref);
    const resolved = await resolveAnyRefAsset(ref, role, desc);
    if (resolved) addUnique(resolved);
  }

  // 1B. Prompt-Mentioned Local Filenames & Web URLs
  const promptFilenames = extractLocalFilenamesFromText(rawPrompt);
  for (const fn of promptFilenames) {
    const isFriendInPrompt =
      promptText.includes('friend') ||
      promptText.includes('companion') ||
      promptText.includes('sidekick') ||
      promptText.includes('dancing with');

    const role = isFriendInPrompt
      ? `CRITICAL HERO COMPANION CHARACTER: Exact Visual Appearance of Rabbit's Friend from ${fn}`
      : `CRITICAL IN-SCENE TARGET PICTURE / ARTWORK: Exact graphic artwork from ${fn}`;
    const desc = isFriendInPrompt
      ? `The companion friend in the scene must faithfully match the character shown in ${fn}. Do not invent an alternate character.`
      : `The physical picture viewed in the scene must replicate the visual details of ${fn}.`;

    const resolved = resolveImageFile(fn, role, fn, 'prompt_filename');
    if (resolved) {
      resolved.description = desc;
      addUnique(resolved);
    }
  }

  const promptUrls = extractUrlsFromText(rawPrompt);
  for (const pUrl of promptUrls) {
    const fetched = await fetchImageFromUrl(pUrl, `Prompt URL Asset: ${pUrl}`, 'prompt_url');
    if (fetched) addUnique(fetched);
  }

  // 1C. Other Client Multi-Reference Assets (Custom uploads, props, clothing, companions)
  for (const ref of clientRefs) {
    if (!ref || ref.enabled === false) continue;
    if (promptMentionedClientRefs.includes(ref)) continue;
    const { role, desc } = getAssetRoleAndDesc(ref);
    const resolved = await resolveAnyRefAsset(ref, role, desc);
    if (resolved) addUnique(resolved);
  }

  // 1D. Explicit Custom Emblem URLs or Custom Emblem Image if user explicitly configured custom emblem
  if (body.customEmblemUrl && typeof body.customEmblemUrl === 'string' && body.customEmblemUrl.trim()) {
    const fetched = await fetchImageFromUrl(body.customEmblemUrl.trim(), 'Custom Emblem Reference (from URL)', 'custom_emblem_url');
    if (fetched) addUnique(fetched);
  }

  // =========================================================================
  // PRIORITY 2: HERO CHARACTER IDENTITY & BASE EMBLEM PRESETS
  // Deduplicated: provide the core hero character leap + face + emblem
  // =========================================================================
  if (isMorphActive) {
    // Reference: Start Emblem
    let startResolved: ResolvedImage | null = null;
    if (body.customEmblemStartUrl) {
      startResolved = await fetchImageFromUrl(body.customEmblemStartUrl, 'Starting Chest Emblem (Custom URL)', 'custom_emblem_url');
    } else if (body.customEmblemStartImage) {
      if (typeof body.customEmblemStartImage === 'string' && body.customEmblemStartImage.startsWith('http')) {
        startResolved = await fetchImageFromUrl(body.customEmblemStartImage, 'Starting Chest Emblem (Custom URL)', 'custom_emblem_url');
      } else if (typeof body.customEmblemStartImage === 'string' && body.customEmblemStartImage.startsWith('data:')) {
        const match = body.customEmblemStartImage.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          startResolved = {
            mimeType: match[1],
            base64: match[2],
            filename: 'custom_start_emblem.png',
            label: 'Starting Chest Emblem (User Upload)',
            role: 'Starting Chest Emblem (User Upload)',
            source: 'custom_upload',
            byteSize: Buffer.from(match[2], 'base64').length,
            previewUrl: body.customEmblemStartImage,
          };
        }
      } else {
        startResolved = resolveImageFile(body.customEmblemStartImage, 'Starting Chest Emblem', 'custom_start_emblem.png', 'custom_emblem_file');
      }
    }
    if (!startResolved) {
      startResolved = resolveImageFile('public/assets/aistudio/image_07de772c.png', 'Start Chest Emblem: Original Oval White Felt Medallion with Blue Spirals', 'image_07de772c.png', 'preset_start_emblem');
    }
    if (startResolved) {
      startResolved.role = 'Start Chest Emblem: Original Oval White Felt Medallion with Blue Border & Two Interlocking Spiral Swirls';
      startResolved.description = 'Oval white felt patch with stitched dark blue outer border ring and two interlocking blue spirals meeting at a central vortex.';
      addUnique(startResolved);
    }

    // Reference: End Emblem
    let endResolved: ResolvedImage | null = null;
    if (body.customEmblemEndUrl) {
      endResolved = await fetchImageFromUrl(body.customEmblemEndUrl, 'Ending Chest Emblem (Custom URL)', 'custom_emblem_url');
    } else if (body.customEmblemEndImage) {
      if (typeof body.customEmblemEndImage === 'string' && body.customEmblemEndImage.startsWith('http')) {
        endResolved = await fetchImageFromUrl(body.customEmblemEndImage, 'Ending Chest Emblem (Custom URL)', 'custom_emblem_url');
      } else if (typeof body.customEmblemEndImage === 'string' && body.customEmblemEndImage.startsWith('data:')) {
        const match = body.customEmblemEndImage.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          endResolved = {
            mimeType: match[1],
            base64: match[2],
            filename: 'custom_end_emblem.png',
            label: 'Ending Chest Emblem (User Upload)',
            role: 'Ending Chest Emblem (User Upload)',
            source: 'custom_upload',
            byteSize: Buffer.from(match[2], 'base64').length,
            previewUrl: body.customEmblemEndImage,
          };
        }
      } else {
        endResolved = resolveImageFile(body.customEmblemEndImage, 'Ending Chest Emblem', 'custom_end_emblem.png', 'custom_emblem_file');
      }
    }
    if (!endResolved) {
      endResolved = resolveImageFile('public/assets/aistudio/image_07c026d1.png', 'End Chest Emblem: Authentic Eight-Spoke Blueprint with Asymmetrical Staves', 'image_07c026d1.png', 'preset_end_emblem');
    }
    if (endResolved) {
      endResolved.role = 'End Chest Emblem: Authentic Eight-Spoke Runic Stave Blueprint with Asymmetrical Staves (Comb Teeth, Circular Glyph, Crossbars)';
      endResolved.description = 'Authentic eight-armed symbol with distinct asymmetrical staves: comb teeth on right arm, circular ring glyph on left arm, crossbars on vertical arms. NOT eight identical trident pitchforks.';
      addUnique(endResolved);
    }

    // Hero Action Leap & Facial Features
    const leapPose = resolveImageFile('public/assets/aistudio/1790924612634-1_cd314286.jpg', 'Hero Character: Full Action Leap & Body Silhouette', '1790924612634-1_cd314286.jpg', 'preset_character_master');
    if (leapPose) {
      leapPose.role = 'Hero Character: Full Action Leap & Green Fleece Doll Silhouette';
      addUnique(leapPose);
    }
    const faceRef = resolveImageFile('public/assets/aistudio/rabbit_face_crop.jpg', 'Character Facial Features: Single Buck Tooth & Tall Upright Floppy Ears', 'rabbit_face_crop.jpg', 'preset_face');
    if (faceRef) {
      faceRef.role = 'Character Facial Features: Single Buck Tooth & Tall Upright Floppy Ears';
      addUnique(faceRef);
    }
  } else {
    // Static Mode (Morphing completely disabled)
    // Always provide Hero Character Action Leap & Face Crop for visual consistency
    const leapPose = resolveImageFile('public/assets/aistudio/1790924612634-1_cd314286.jpg', 'Hero Character: Green Plush Rabbit Doll Body & Proportions', '1790924612634-1_cd314286.jpg', 'preset_character_master');
    if (leapPose) {
      leapPose.role = 'Hero Character: Green Plush Rabbit Doll Body & Apple-Green Fleece Proportions';
      addUnique(leapPose);
    }
    const faceRef = resolveImageFile('public/assets/aistudio/rabbit_face_crop.jpg', 'Character Facial Features: Single White Buck Tooth & Upright Floppy Ears', 'rabbit_face_crop.jpg', 'preset_face');
    if (faceRef) {
      faceRef.role = 'Character Facial Features: Single White Buck Tooth & Tall Upright Floppy Ears';
      addUnique(faceRef);
    }

    // Static Emblem (Original Spiral vs Wayfinder vs Custom)
    const isWayfinder =
      body.customEmblemType === 'vegvisir' ||
      body.customEmblemName?.toLowerCase().includes('wayfinder') ||
      body.customEmblemName?.toLowerCase().includes('eight') ||
      (typeof body.customEmblemImage === 'string' &&
        (body.customEmblemImage.includes('image_07c026d1') ||
          body.customEmblemImage.includes('rabbit_chest') ||
          body.customEmblemImage.includes('emblem_blue')));

    if (isWayfinder) {
      const blueprint = resolveImageFile('public/assets/aistudio/image_07c026d1.png', 'Static Chest Emblem: Authentic Eight-Spoke Blueprint with Asymmetrical Staves', 'image_07c026d1.png', 'preset_emblem_blueprint');
      if (blueprint) {
        blueprint.role = 'Static Chest Emblem: Authentic Eight-Spoke Blueprint with Asymmetrical Staves (Circle, Comb, Crossbars)';
        blueprint.description = 'Asymmetrical eight-armed symbol with circular glyph on left, comb teeth on right, and crossbars. Do NOT draw eight identical pitchforks.';
        addUnique(blueprint);
      }
    } else if (body.customEmblemType === 'custom' && body.customEmblemImage) {
      if (typeof body.customEmblemImage === 'string') {
        if (body.customEmblemImage.startsWith('data:')) {
          const match = body.customEmblemImage.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            addUnique({
              mimeType: match[1],
              base64: match[2],
              filename: 'custom_chest_emblem.png',
              label: 'Custom Static Chest Emblem',
              role: 'Static Chest Emblem: Custom User Design',
              source: 'custom_upload',
              byteSize: Buffer.from(match[2], 'base64').length,
              previewUrl: body.customEmblemImage,
            });
          }
        } else if (body.customEmblemImage.startsWith('http')) {
          const fetched = await fetchImageFromUrl(body.customEmblemImage, 'Custom Static Chest Emblem', 'custom_emblem_url');
          if (fetched) addUnique(fetched);
        } else {
          const resolved = resolveImageFile(body.customEmblemImage, 'Custom Static Chest Emblem', undefined, 'custom_file');
          if (resolved) addUnique(resolved);
        }
      }
    } else {
      // Default: Original Spiral Medallion
      const origEmblem = resolveImageFile('public/assets/aistudio/image_07de772c.png', 'Static Chest Emblem: Original Oval White Felt Medallion with Blue Spirals', 'image_07de772c.png', 'original_medallion');
      if (origEmblem) {
        origEmblem.role = 'Static Chest Emblem: Original Oval White Felt Medallion with Blue Border & Two Interlocking Spiral Swirls';
        origEmblem.description = 'Authentic oval white felt badge with dark blue stitched border and two interlocking blue spirals.';
        addUnique(origEmblem);
      }
    }
  }

  // Cap total references to 6 so model focus remains sharp, and assign exact 1-based index
  const finalResults = results.slice(0, 6);
  finalResults.forEach((img, idx) => {
    img.index = idx + 1;
  });

  return finalResults;
}

// Preset sample assets
// Diagnostic logging endpoints
app.get('/api/last-generation-log', (_req, res) => {
  const latest = recentGenerationLogs[0] || null;
  res.json({
    success: true,
    log: latest,
    formattedText: latest
      ? latest.formattedLog
      : 'No generation diagnostic log recorded yet. Please generate a video first.',
  });
});

app.get('/api/generation-logs', (_req, res) => {
  res.json({
    success: true,
    total: recentGenerationLogs.length,
    logs: recentGenerationLogs,
  });
});

app.get('/api/debug-log', (_req, res) => {
  const latest = recentGenerationLogs[0] || null;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(
    latest
      ? latest.formattedLog
      : 'No generation diagnostic log recorded yet. Please generate a video first.'
  );
});

app.get('/api/samples', (_req, res) => {
  res.json({
    samples: [
      {
        id: 'rabbit-jump',
        title: 'Alpine Plush Rabbit',
        subtitle: 'Green fuzzy bunny in blooming alpine meadow',
        imagePath: '/assets/aistudio/1790924612634-1_cd314286.jpg',
        defaultPrompt: 'The plush rabbit leaps high into the air with joy, kicking its red boots, floppy green ears bouncing playfully, surrounded by sunny meadow wildflowers and mountains.',
        aspectRatio: '9:16',
      },
    ],
  });
});

// Character Reference Kit endpoint returning multi-angle model sheet
app.get('/api/character-kit', (_req, res) => {
  res.json({
    characterName: 'Alpine Plush Rabbit',
    identityLocked: true,
    referenceAngles: [
      {
        id: 'ref-master-jump',
        label: 'Master Action Jump',
        description: 'Full body leap posture in alpine meadow',
        imagePath: '/assets/aistudio/1790924612634-1_cd314286.jpg',
        isDefault: true,
        tag: 'Full Silhouette',
      },
      {
        id: 'ref-face-grin',
        label: 'Face Close-Up & Grin',
        description: 'Upright ears, single buck tooth, open smile, pink snout',
        imagePath: '/assets/aistudio/rabbit_face_crop.jpg',
        isDefault: true,
        tag: 'Facial Features',
      },
      {
        id: 'ref-emblem-boots',
        label: 'Torso Emblem & Red Boots',
        description: 'Oval pink patch with blue spiral "S", red athletic boots',
        imagePath: '/assets/aistudio/rabbit_body_boots_crop.jpg',
        isDefault: true,
        tag: 'Costume & Textures',
      },
    ],
    lockedTraits: [
      'Apple-green textured fuzzy fleece plush fabric',
      'Tall upright floppy bunny ears (never lop ears)',
      'Open cheerful smiling mouth with single white buck tooth',
      'Light pink snout and muzzle with embroidered eyelashes',
      'Blue spiral "S" emblem on oval pink belly patch',
      'Bright red fleece boots with white athletic stripes',
      'Handmade plush doll physics (soft bounce, weighted fabric)',
    ],
  });
});

// AI Cinematographer: Suggest Next Video Scene based on previous video or user input
app.post('/api/suggest-scene', async (req, res) => {
  try {
    const {
      previousPrompt,
      userInput,
      sceneNumber = 2,
      season = 'spring',
      weather = 'sunny',
      aspectRatio = '9:16',
      stylePreference,
    } = req.body;

    const ai = getGeminiClient();

    const systemPrompt = `You are a master cinematic director and AI video prompting specialist for Gemini Omni Flash (video diffusion model).
Your mission is to help creators who do not know how to prompt for video generation or technical cinematography terms (perspective, camera movement, optical zooming, framing, lighting, depth of field).

When generating video with diffusion models like Gemini Omni Flash:
1. Verbs of camera movement ('slow push-in zoom', 'dynamic low-angle tracking shot', 'pull-back reveal', 'orbital arc') create clear optical flow and motion vectors.
2. Perspective & Angles ('ground-level worm's eye', 'heroic low angle', 'close-up portrait') define spatial depth and character presence.
3. Optical Zooming ('slow zoom in on facial expression', 'zoom out to reveal breathtaking alpine peaks') directs visual focus.
4. Lighting and environmental dynamics ('golden hour volumetric sunbeams', 'swirling pollen particles', 'crisp morning backlighting') bring textures to life.
5. Secondary motion ('floppy ears bouncing in the breeze', 'kicking red boots with motion blur') grounds physics for the cute green plush rabbit.

Context:
- Subject: A cute bright green fuzzy plush rabbit with floppy ears, pink nose, and red boots in an alpine meadow with mountains and wildflowers.
- Current Season: ${season}
- Current Weather: ${weather}
- Aspect Ratio: ${aspectRatio}
- Scene Number: ${sceneNumber}
${previousPrompt ? `- Previous Scene Action: "${previousPrompt}"` : ''}
${userInput ? `- Creator's Initial Idea / Request: "${userInput}"` : ''}
${stylePreference ? `- Style Preference: "${stylePreference}"` : ''}

Provide 3 diverse, vividly directed cinematic continuation suggestions that advance the story naturally, along with a director's tip explaining why these camera perspective and zoom techniques create superior AI video results.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Generate 3 cinematic scene suggestions with professional camera perspectives, zooming, and motion directives for the next video scene.',
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            directorNote: {
              type: Type.STRING,
              description: "Director's helpful commentary explaining how to shoot this next scene with optical continuity and cinematography terms.",
            },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING, description: 'Evocative scene title' },
                  conceptSummary: { type: Type.STRING, description: 'One-line summary of what happens' },
                  prompt: {
                    type: Type.STRING,
                    description: 'Complete, optimized prompt ready to feed into Gemini Omni Flash, rich with camera motion, perspective, zooming, and rabbit action.',
                  },
                  cinematography: {
                    type: Type.OBJECT,
                    properties: {
                      perspective: { type: Type.STRING, description: "e.g., 'Low-Angle Hero View', 'Eye-Level Close-Up'" },
                      cameraMotion: { type: Type.STRING, description: "e.g., 'Slow Push-In / Zoom In', 'Tracking Pull-Back'" },
                      lighting: { type: Type.STRING, description: "e.g., 'Volumetric Golden Hour Sunbeams', 'Crisp Rim Light'" },
                      pacing: { type: Type.STRING, description: "e.g., 'Slow-motion apex float into snappy landing'" },
                    },
                    required: ['perspective', 'cameraMotion', 'lighting'],
                  },
                  whyItWorks: {
                    type: Type.STRING,
                    description: 'Educational tip explaining why this combination of perspective, zooming, and movement terms helps the AI generate a better video.',
                  },
                },
                required: ['id', 'title', 'conceptSummary', 'prompt', 'cinematography', 'whyItWorks'],
              },
            },
            termsGuide: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  category: { type: Type.STRING, description: "'perspective' | 'motion' | 'lighting'" },
                  explanation: { type: Type.STRING },
                },
                required: ['term', 'category', 'explanation'],
              },
            },
          },
          required: ['directorNote', 'suggestions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('[SuggestScene] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate scene suggestions.' });
  }
});

// AI Cinematographer: Enhance user's raw prompt with professional camera & zoom terms
app.post('/api/enhance-prompt', async (req, res) => {
  try {
    const {
      rawPrompt,
      perspective,
      cameraMotion,
      lighting,
      season = 'spring',
      weather = 'sunny',
      isExtension = false,
      previousPrompt,
    } = req.body;

    const ai = getGeminiClient();

    const systemPrompt = `You are an expert AI video prompt cinematographer for Gemini Omni Flash.
A user has written a draft prompt for a plush rabbit video, but needs your cinematography expertise to add professional perspective, camera movement, optical zooming, framing, and tactile physics details.

Draft input: "${rawPrompt || 'The plush rabbit jumps and looks around'}"
Selected perspective: "${perspective || 'Dramatic Low-Angle'}"
Selected camera movement/zoom: "${cameraMotion || 'Slow Push-In Zoom'}"
Selected lighting/atmosphere: "${lighting || 'Golden Hour Sunbeams'}"
Season: ${season}, Weather: ${weather}
${isExtension && previousPrompt ? `Previous Scene: "${previousPrompt}". This is a continuous sequel scene.` : ''}

Enhance this draft into a single cohesive, production-grade video generation prompt. Make sure the prompt instructs the model on:
1. Camera Angle & Perspective (e.g. low angle heroic shot, eye-level intimate framing).
2. Camera Motion & Zooming (e.g. slow push-in zoom into the rabbit's joyful face, smooth tracking arc).
3. Subject action & tactile physics (green fuzzy plush texture, red boot kick, floppy ears reacting with secondary motion).
4. Environment & Lighting (wildflowers, majestic mountain peaks, atmospheric light).

Return a JSON with the enhanced prompt, the key terms used, and a brief explanation of how those terms transform the video outcome.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Enhance this video prompt with camera perspective and zoom techniques.',
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enhancedPrompt: { type: Type.STRING },
            perspectiveUsed: { type: Type.STRING },
            cameraMotionUsed: { type: Type.STRING },
            lightingUsed: { type: Type.STRING },
            directorInsight: {
              type: Type.STRING,
              description: 'Clear, encouraging explanation of how the added perspective and camera zooming terms will improve the resulting AI video.',
            },
          },
          required: ['enhancedPrompt', 'perspectiveUsed', 'cameraMotionUsed', 'directorInsight'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('[EnhancePrompt] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to enhance prompt.' });
  }
});

// AI Stylist: Suggest Clothing / Costume Guides and Shoot References
app.post('/api/suggest-clothing-guide', async (req, res) => {
  try {
    const { season = 'spring', weather = 'sunny', currentPrompt = '', theme } = req.body;
    const ai = getGeminiClient();

    const systemPrompt = `You are an expert costume designer, production stylist, and character companion creator for AI video generation with Gemini Omni Flash.
The creator is filming a cute green plush rabbit character and wants creative clothing/costumes, physical props/scenery guides, and companion characters (wildlife/plush friends) to enrich the shoot.

Current Scene Context:
- Season: ${season}
- Weather: ${weather}
- Action / Story: "${currentPrompt}"
${theme ? `- Creator's Desired Theme: "${theme}"` : ''}

Generate:
1. 3 diverse wardrobe/costume ideas tailored to the season and rabbit's plush aesthetic (e.g., knitted wool cable sweaters, rain slickers, aviator goggles, floral crowns, explorer backpacks).
2. 2 physical prop & scenery photo guide concepts (e.g. vintage wooden sled, alpine picnic basket, flying dandelion fluff, macro wildflower knoll, stone campfire).
3. 2 companion character ideas (e.g. wise little horned owl with spectacles, plush fox pup, tiny hedgehog holding a buttercup, companion white bunny).
4. A stylist tip on how combining multiple clothing items, props, and companion characters enriches the scene while keeping the green plush rabbit as the central star.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Suggest multiple clothing items, props, and companion characters for this scene.',
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stylistTip: { type: Type.STRING },
            clothingSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  category: { type: Type.STRING, description: "'knitwear' | 'outerwear' | 'accessory' | 'costume'" },
                  icon: { type: Type.STRING },
                  description: { type: Type.STRING },
                  promptDirective: {
                    type: Type.STRING,
                    description: 'Detailed physical clothing instruction to inject into the Gemini Omni Flash prompt',
                  },
                  stylingReason: { type: Type.STRING },
                },
                required: ['id', 'title', 'category', 'icon', 'description', 'promptDirective', 'stylingReason'],
              },
            },
            shootGuideSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  icon: { type: Type.STRING },
                  description: { type: Type.STRING },
                  promptDirective: {
                    type: Type.STRING,
                    description: 'Detailed prop/environment instruction to guide the shoot',
                  },
                },
                required: ['id', 'title', 'icon', 'description', 'promptDirective'],
              },
            },
            characterSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  icon: { type: Type.STRING },
                  description: { type: Type.STRING },
                  promptDirective: {
                    type: Type.STRING,
                    description: 'Detailed companion character directive for Gemini Omni Flash',
                  },
                  stylingReason: { type: Type.STRING },
                },
                required: ['id', 'title', 'icon', 'description', 'promptDirective'],
              },
            },
          },
          required: ['stylistTip', 'clothingSuggestions', 'shootGuideSuggestions', 'characterSuggestions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('[SuggestClothingGuide] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to suggest clothing guide.' });
  }
});

// AI Storyboard Screenplay Director: Transform a user's script or story into sequential video scenes
app.post('/api/script-to-scenes', async (req, res) => {
  try {
    const {
      script,
      targetSceneCount = 4,
      characterDescription = 'green plush bunny rabbit with long floppy ears, joyful smile, red rubber boots, and swirl tummy badge',
      preferredSeason,
      preferredWeather,
      tone = 'cinematic & playful',
    } = req.body;

    if (!script || typeof script !== 'string' || !script.trim()) {
      return res.status(400).json({ error: 'Please provide a story, script, or narrative outline.' });
    }

    const ai = getGeminiClient();

    const systemPrompt = `You are an elite Hollywood director, screenwriter, and AI cinematographer specializing in translating written stories/scripts into a multi-scene video storyboard for Gemini Omni Flash.
The protagonist of the video is: "${characterDescription}".

The creator has provided this story or script:
"""
${script.trim()}
"""

Target scene count: ${targetSceneCount} sequential scenes (each ~5 seconds).
Tone: ${tone}.
${preferredSeason && preferredSeason !== 'any' ? `Preferred Season: ${preferredSeason}` : ''}
${preferredWeather && preferredWeather !== 'any' ? `Preferred Weather: ${preferredWeather}` : ''}

Your task:
1. Deconstruct the user's narrative arc chronologically into ${targetSceneCount} connected, highly visual cinematic scenes.
2. For each scene, create:
   - A compelling Scene Title (e.g. "Scene 1: Snowbound Discovery", "Scene 2: Meeting the Wise Owl", "Scene 3: The Glowing Cabin Campfire")
   - Story Beat: 1-2 sentence explanation of which part of the user's story is being shown.
   - Production Video Prompt: A rich, photorealistic, physics-aware motion prompt tailored for Gemini Omni Flash (instructing camera angle, perspective, optical zoom, subject action, secondary plush ear/fur physics, environment, lighting, and wardrobe).
   - Recommended Camera Perspective: (e.g., "Low-Angle Hero Shot", "Ground-Level Worm's Eye", "Drone Fly-Over (With Sound)", "Eye-Level Medium Close-Up")
   - Recommended Camera Motion & Zoom: (e.g., "Slow Push-In Zoom", "Dramatic Pull-Back Zoom Out", "Dynamic Tracking Pan", "Orbital Arc", "Crane Shot Lift-Up")
   - Season: ('spring', 'summer', 'autumn', 'winter') matching the story's progression.
   - Weather: ('sunny', 'snow', 'rain', 'sunset', 'mist', 'rainbow') matching the scene mood.
   - Clothing Title & Directive: (e.g., "Wool Cable Sweater", "The plush rabbit is wearing a chunky cream-colored wool sweater with snowflake patterns")
   - Audio Mode: ('with_sound' or 'silent') with a description of the sound design (e.g. "Crisp snow crunching under boots, soft winter wind, joyful bunny chuckle").
   - Director Tip: A practical directing tip explaining why this framing and camera movement makes this narrative moment dramatic and cohesive.

Make the narrative flow seamlessly from Scene 1 to Scene ${targetSceneCount}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Break down this script or story into sequential storyboard scenes.',
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            storyTitle: { type: Type.STRING },
            storyLogline: { type: Type.STRING },
            totalDurationEstimate: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sceneNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  storyBeat: { type: Type.STRING },
                  videoPrompt: { type: Type.STRING },
                  cameraPerspective: { type: Type.STRING },
                  cameraMotion: { type: Type.STRING },
                  season: { type: Type.STRING },
                  weather: { type: Type.STRING },
                  clothingTitle: { type: Type.STRING },
                  clothingDirective: { type: Type.STRING },
                  audioMode: { type: Type.STRING },
                  soundDescription: { type: Type.STRING },
                  directorTip: { type: Type.STRING },
                },
                required: [
                  'sceneNumber',
                  'title',
                  'storyBeat',
                  'videoPrompt',
                  'cameraPerspective',
                  'cameraMotion',
                  'season',
                  'weather',
                  'directorTip',
                ],
              },
            },
            directingSummary: { type: Type.STRING },
          },
          required: ['storyTitle', 'storyLogline', 'scenes'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('[ScriptToScenes] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate storyboard from script.' });
  }
});

// Helper to rewrite blocked prompts into 100% policy-compliant, cinematic visual descriptions
async function generateSafePromptRephrase(promptText: string): Promise<string | null> {
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are an expert AI video prompt safety director for Google Gemini Omni Flash video generation.
The creator submitted a prompt that was rejected by Google's automated video safety filter:
"400 Input blocked: The prompt could not be processed. Please try rephrasing the prompt or using different input."

WHY IT WAS BLOCKED:
Google's automated video safety classifiers screen out:
1. Ancient Norse runic/occult keywords (e.g., "vegvisr", "vegvisir", "rune", "stave", "occult symbol", "incantation").
2. Mystical ritual / religious gestures (e.g., "closes eyes and takes three slow breaths", "raises paws toward the sky", "magic spell").

YOUR TASK:
Rewrite the creator's exact prompt into an evocative, 100% policy-compliant, cinematic video prompt that:
1. Keeps the EXACT same visual action, transformation, emotion, and storyline.
2. Replaces any symbols or glyphs with: "the custom embroidered eight-armed symbol shown in the reference image". CRITICAL: DO NOT output words like "compass", "starburst", "nautical", "trident", or "fork", because diffusion models confuse them with a maritime compass rose.
3. Replaces ritual gestures with natural, peaceful character acting (e.g. "pauses peacefully in the meadow", "gently clasps fuzzy paws in wonder").
4. Replaces abstract "magic" with physical optical and lighting effects (e.g. "soft azure bioluminescent glow", "smooth visual metamorphosis as the glowing embroidery thread unspools into the eight radiating arms of the symbol shown in the reference image across his fleece tummy").
5. Enhances with clear camera movement & framing (e.g. "calm, cinematic gentle push-in shot").

Original Blocked Prompt:
"""${promptText}"""

Output ONLY the rewritten prompt text without explanations, intro, or quotes.`,
    });
    return response.text?.trim() || null;
  } catch (err) {
    console.warn('[SafeRephrase] Failed to auto-rephrase:', err);
    return null;
  }
}

// Endpoint to automatically rewrite any blocked or sensitive prompt into safe cinematic video language
app.post('/api/safe-rephrase', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }
    const rephrased = await generateSafePromptRephrase(prompt.trim());
    return res.json({
      success: true,
      rephrasedPrompt: rephrased || prompt.trim(),
    });
  } catch (err: any) {
    console.error('[SafeRephrase] Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to rephrase prompt.' });
  }
});

// Endpoint to fetch and preview an image from a web URL (bypassing browser CORS)
app.post('/api/fetch-url-image', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'Please provide a valid image URL.' });
    }
    const resolved = await fetchImageFromUrl(url.trim());
    if (!resolved) {
      return res.status(400).json({
        error:
          'Could not load image from the provided URL. Please verify the URL is public and points directly to an image file (PNG, JPG, WebP).',
      });
    }
    return res.json({
      success: true,
      url: resolved.url,
      filename: resolved.filename,
      mimeType: resolved.mimeType,
      dataUrl: `data:${resolved.mimeType};base64,${resolved.base64}`,
      base64: resolved.base64,
      label: resolved.label,
    });
  } catch (err: any) {
    console.error('[FetchUrlImage] Route Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch image from URL.' });
  }
});

function formatProductionDirectives(body: any, resolvedImages?: ResolvedImage[]): string {
  let text = '';
  const promptLower = (body.prompt || '').toLowerCase();

  // Find target picture image if user prompt or client references designate an in-scene picture/artwork
  const isPictureInPrompt =
    promptLower.includes('picture') ||
    promptLower.includes('photo') ||
    promptLower.includes('artwork') ||
    promptLower.includes('drawing') ||
    promptLower.includes('graphic') ||
    promptLower.includes('card') ||
    promptLower.includes('poster') ||
    promptLower.includes('canvas') ||
    promptLower.includes('holding') ||
    promptLower.includes('looking at') ||
    promptLower.includes('looking a');

  // Find if any resolved image is marked as in-scene picture / artwork
  const pictureImg = resolvedImages?.find(
    (img) =>
      img.role?.includes('TARGET PICTURE') ||
      img.role?.includes('PICTURE') ||
      (isPictureInPrompt &&
        ((body.customEmblemName && img.filename.toLowerCase().includes(body.customEmblemName.toLowerCase())) ||
          (img.label && promptLower.includes(img.label.toLowerCase().replace(/[^a-z0-9]/g, ''))) ||
          (img.filename && promptLower.includes(img.filename.toLowerCase().replace(/\.[^.]+$/, ''))) ||
          (promptLower.includes('sodesign') && img.filename.toLowerCase().includes('sodesign'))))
  );

  if (pictureImg) {
    text += `\n\n[CRITICAL IN-SCENE PICTURE & ARTWORK REPRODUCTION MANDATE]:\nThe green plush rabbit character is holding and looking directly at a physical picture (a photo, printed card, or canvas) in its soft paws.\nThe face of the physical picture MUST CLEARLY, ACCURATELY, AND FAITHFULLY REPRODUCE the artwork shown in Reference Image ${pictureImg.index} [Filename: "${pictureImg.filename}"].\nReplicate every line, symbol, color palette, staves, and composition from Reference Image ${pictureImg.index} onto the physical picture held in the rabbit's paws.\nCRITICAL PROHIBITION: The character is NOT dressed in this image; this image is an in-scene physical picture being held and viewed by the rabbit.`;
  }

  // Find target friend / companion character image if user prompt or client references designate a companion
  const isHeroRabbitImg = (img: any): boolean => {
    if (!img) return false;
    const l = (img.label || '').toLowerCase();
    const f = (img.filename || '').toLowerCase();
    const r = (img.role || '').toLowerCase();
    return (
      l.includes('master action') ||
      l.includes('buck tooth') ||
      l.includes('chest embroidery') ||
      f.includes('rabbit_') ||
      f.includes('1790924612634') ||
      f.includes('07de772c') ||
      f.includes('07c026d1') ||
      r.includes('hero character') ||
      r.includes('original chest')
    );
  };

  const promptMentionsFriend =
    promptLower.includes('friend') ||
    promptLower.includes('companion') ||
    promptLower.includes('sidekick') ||
    promptLower.includes('buddy') ||
    promptLower.includes('partner') ||
    promptLower.includes('dancing with');

  const friendImg = resolvedImages?.find(
    (img) => (img.role?.includes('COMPANION') || img.role?.includes('FRIEND')) && !isHeroRabbitImg(img)
  );

  if (friendImg && (promptMentionsFriend || friendImg.role?.includes('COMPANION'))) {
    text += `\n\n[CRITICAL HERO COMPANION CHARACTER FIDELITY MANDATE]:\nIn addition to the primary hero green plush rabbit, the video features his companion friend celebrating and interacting happily alongside him in the scene.\nThe companion friend's visual appearance, face, body, species/design, and colors MUST EXACTLY AND FAITHFULLY REPRODUCE Reference Image ${friendImg.index} [Filename: "${friendImg.filename}"].\nCRITICAL PROHIBITION: DO NOT invent a generic or random character. Faithfully replicate the exact character from Reference Image ${friendImg.index} as the friend celebrating with the rabbit.`;
  }

  // 1. Multiple Clothing & Costumes (Filter out anything being used as a picture, prop, or companion)
  const allClothing: string[] = [];
  const checkIsNotPictureOrFriend = (itemStr: string) => {
    const s = itemStr.toLowerCase();
    if (pictureImg) {
      if (pictureImg.filename && s.includes(pictureImg.filename.toLowerCase().replace(/\.[^.]+$/, ''))) return false;
      if (pictureImg.label && s.includes(pictureImg.label.toLowerCase())) return false;
      if (s.includes('sodesign') && promptLower.includes('sodesign')) return false;
    }
    if (friendImg) {
      if (friendImg.filename && s.includes(friendImg.filename.toLowerCase().replace(/\.[^.]+$/, ''))) return false;
      if (friendImg.label && s.includes(friendImg.label.toLowerCase())) return false;
      if (s.includes('1794087089723-1') && promptLower.includes('1794087089723-1')) return false;
    }
    if (isPictureInPrompt && (s.includes('sodesign') || s.includes('picture') || s.includes('photo') || s.includes('drawing'))) {
      return false;
    }
    return true;
  };

  if (body.clothingDirective && typeof body.clothingDirective === 'string' && body.clothingDirective.trim()) {
    if (checkIsNotPictureOrFriend(body.clothingDirective)) {
      allClothing.push(body.clothingDirective.trim());
    }
  }
  if (Array.isArray(body.clothingDirectives)) {
    for (const d of body.clothingDirectives) {
      const dStr = typeof d === 'string' ? d : d.directive || d.title || '';
      if (dStr.trim() && !allClothing.includes(dStr.trim()) && checkIsNotPictureOrFriend(dStr)) {
        allClothing.push(dStr.trim());
      }
    }
  }
  if (allClothing.length > 0) {
    text += `\n\n[WARDROBE & MULTIPLE CLOTHING ITEMS (${allClothing.length} ACTIVE ITEM${allClothing.length > 1 ? 'S' : ''})]:\nThe green plush rabbit character is dressed in the following item(s) simultaneously:\n${allClothing.map((d, i) => `${i + 1}. ${d}`).join('\n')}`;
  }

  // 2. Multiple Props & Scenery (Filter out companion friends and pictures)
  const allProps: string[] = [];
  const checkIsNotFriendProp = (itemStr: string) => {
    const s = itemStr.toLowerCase();
    if (friendImg) {
      if (friendImg.filename && s.includes(friendImg.filename.toLowerCase().replace(/\.[^.]+$/, ''))) return false;
      if (friendImg.label && s.includes(friendImg.label.toLowerCase())) return false;
      if (s.includes('1794087089723-1')) return false;
    }
    if (promptLower.includes('friend') && s.includes('1794087089723-1')) return false;
    return true;
  };

  if (body.shootGuideDirective && typeof body.shootGuideDirective === 'string' && body.shootGuideDirective.trim()) {
    if (checkIsNotFriendProp(body.shootGuideDirective)) {
      allProps.push(body.shootGuideDirective.trim());
    }
  }
  if (Array.isArray(body.propDirectives)) {
    for (const d of body.propDirectives) {
      const dStr = typeof d === 'string' ? d : d.directive || d.title || '';
      if (dStr.trim() && !allProps.includes(dStr.trim()) && checkIsNotFriendProp(dStr)) {
        allProps.push(dStr.trim());
      }
    }
  }
  if (allProps.length > 0) {
    text += `\n\n[INTERACTIVE SCENE PROPS & SCENERY GUIDES (${allProps.length} ACTIVE PROP${allProps.length > 1 ? 'S' : ''})]:\nThe scene includes the following interactive physical prop(s) and scenery objects:\n${allProps.map((d, i) => `${i + 1}. ${d}`).join('\n')}`;
  }

  // 3. Multiple Companion Characters
  const allCharacters: string[] = [];
  if (body.characterDirective && typeof body.characterDirective === 'string' && body.characterDirective.trim()) {
    allCharacters.push(body.characterDirective.trim());
  }
  if (Array.isArray(body.characterDirectives)) {
    for (const d of body.characterDirectives) {
      const dStr = typeof d === 'string' ? d : d.directive || d.title || '';
      if (dStr.trim() && !allCharacters.includes(dStr.trim())) {
        allCharacters.push(dStr.trim());
      }
    }
  }
  if (allCharacters.length > 0) {
    text += `\n\n[CAST ENSEMBLE & COMPANION CHARACTERS (${allCharacters.length} COMPANION${allCharacters.length > 1 ? 'S' : ''})]:\nIn addition to the primary hero green plush rabbit, the video features the following companion character(s):\n${allCharacters.map((d, i) => `${i + 1}. ${d}`).join('\n')}\nEnsure all companion characters share the same adorable plush/felt toy visual style, interact happily and harmoniously with the green plush rabbit, and do not overshadow the rabbit as the central hero.`;
  }

  return text;
}

// Image-to-Video Animation endpoint using Gemini Omni Flash via Interactions API
async function executeAnimateCore(body: any) {
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
    videoSizeKb: base64VideoData ? Math.round(Buffer.from(base64VideoData, 'base64').length / 1024) : undefined,
    videoUri,
  };
  recordGenerationLog(logRecord);

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

app.post('/api/animate', async (req, res) => {
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
      lastVideoRateLimitInfo = { message: errorMessage, timestamp: Date.now() };
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
});

// Extend an existing video by continuing the scene using previous_interaction_id
async function executeExtendCore(body: any) {
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
    videoSizeKb: base64VideoData ? Math.round(Buffer.from(base64VideoData, 'base64').length / 1024) : undefined,
    videoUri,
  };
  recordGenerationLog(logRecord);

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

app.post('/api/extend', async (req, res) => {
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
      lastVideoRateLimitInfo = { message: errorMessage, timestamp: Date.now() };
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
});

// Serve frontend in dev (Vite middleware) or production (dist static files)
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, host: HOST, port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Explicit fallback for SPA routes to ensure index.html with Vite transforms is always served
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        if (vite && vite.ssrFixStacktrace) {
          vite.ssrFixStacktrace(e);
        }
        next(e);
      }
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Rabbit Hop Video Animator server running at http://${HOST}:${PORT}`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://${HOST}:${PORT}/`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
