/**
 * Reference-image resolution, character directives and prompt sanitizers — ported from server.ts.
 * Prompt text and logic are unchanged. Browser replacements:
 * - local files (fs/path under public/) → fetch('/assets/...'); found only when the response is ok
 *   AND its Content-Type is image/* (Vite and Cloudflare Pages answer index.html with 200 for misses)
 * - remote images → the Gemini proxy worker's /v1/fetch-image (the browser can't fetch them cross-origin)
 * - Buffer → ./base64 helpers; resolveImageFile is now async, so every call is awaited.
 */
import { base64ByteLength, basename, bytesToBase64 } from './base64';
import { fetchRemoteImage } from './gemini';

// Dedicated reference image sets for character consistency
export const ORIGINAL_MEDALLION_RABBIT_SET = [
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

export const WAYFINDER_RABBIT_SET = [
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

export const TRANSFORMATION_RABBIT_SET = [
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

export const DEFAULT_RABBIT_SET = TRANSFORMATION_RABBIT_SET;

export function sanitizePromptToImageReference(rawPrompt: string, resolvedImages?: ResolvedImage[]): string {
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

export function isTransformationRequest(body: any): boolean {
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

export const isNoSymbolRequest = (body: any): boolean => body?.customEmblemType === 'none';

/** The story's approved main character (character card): keep exactly that look in every frame. */
/** Extra pictures the user gave for one scene: how the place and the characters around look. */
export function sceneReferenceDirective(body: any): string {
  const refs: string[] = Array.isArray(body?.sceneReferenceLabels) ? body.sceneReferenceLabels.filter((x: any) => typeof x === 'string') : [];
  if (!refs.length) return '';
  const list = refs.map((l, i) => `${i + 1}. ${l.trim() || 'The wider view of the scene'}`).join('\n');
  return `\n\n[SCENE REFERENCE PICTURES]:\nThe attached SCENE REFERENCE image(s) show the place and who is there, beyond what the start frame shows:\n${list}\nUse them only for the place, its layout, the light, and how each character looks. When the camera moves, turns or zooms out, these must match the pictures.\nDo NOT copy the poses, positions or actions in these pictures: what the characters do in this scene comes only from the scene text, even when the pictures show them doing something else (for example sitting while the text says they stand up).\nEach character appears only once: do not duplicate a character from these pictures, and do not give one character's look to another.\nThey are not the first frame: the video still starts where it is told to start.`;
}

export function castDirective(body: any): string {
  const d = typeof body?.castDescription === 'string' ? body.castDescription.trim() : '';
  if (!d) return '';
  const name = typeof body?.castName === 'string' && body.castName.trim() ? ` (${body.castName.trim()})` : '';
  return `\n\n[MAIN CHARACTER - APPROVED LOOK]:\nThe main character${name} must look exactly like the attached MAIN CHARACTER image in every frame: ${d}\nKeep the same face, colours, proportions, hair or fur, clothing and accessories as in that image and as in the scene before. Do not change the character's look.\nThere is only ONE main character in the scene. Do not draw a second copy of it, and do not give its look (face, beard, fur, ears, clothes) to any other character: the other characters keep their own looks.`;
}

/** The "Khalle in this scene" switch is off: no Khalle pictures, symbol or identity rule are sent. */
export const excludesKhalle = (body: any): boolean => body?.includeKhalle === false;

export function getCharacterDirective(body: any, resolvedImages?: ResolvedImage[]): string {
  if (excludesKhalle(body)) {
    // The green rabbit is not named here: naming a character in a prohibition tends to summon it.
    return `[CHARACTERS IN THIS SCENE]:
Show only the characters seen in the start frame, in any SCENE REFERENCE pictures, and the characters the scene text describes.
Do NOT add any other character at any moment, not even small, distant or in the background.`;
  }
  if (isNoSymbolRequest(body)) {
    return `[STRICT CHARACTER IDENTITY & PLAIN BELLY]:
The subject MUST be the green plush rabbit doll shown in the reference images.
1. FACE & HEAD: Apple-green fleece; tall upright floppy ears; open wide grin with single white buck tooth; light-pink snout; pink scarf; red boots.
2. PLAIN BELLY: The oval light-pink fleece belly patch is completely plain soft pink fleece throughout the ENTIRE video clip, exactly as in the reference images.
3. ABSOLUTE PROHIBITION: DO NOT draw, stitch or add any emblem, badge, patch, embroidery, spiral, rune, compass, logo, letter or symbol on the belly or chest at any moment.`;
  }
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

export interface ResolvedImage {
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

// Fetch any remote image from http/https URL, with proper headers and error handling
// (browser: the proxy worker fetches it — GET /v1/fetch-image — because of CORS)
export async function fetchImageFromUrl(
  rawUrl: string,
  customLabel?: string,
  customSource = 'web_url'
): Promise<ResolvedImage | null> {
  try {
    const url = rawUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) return null;

    console.log(`[FetchUrlImage] Fetching remote reference image from: ${url}`);
    // fetchRemoteImage applies the same 15s timeout and throws on a non-2xx answer (caught below → null)
    const response = await fetchRemoteImage(url, 15000);

    if (!response.ok) {
      console.warn(`[FetchUrlImage] Failed to fetch ${url}: HTTP ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
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
      const base = basename(parsed.pathname);
      if (base && base.length > 2 && base.includes('.')) {
        filename = base;
      } else {
        filename = `${parsed.hostname.replace(/[^a-zA-Z0-9]/g, '_')}_emblem.png`;
      }
    } catch {
      filename = 'url_reference.png';
    }

    const base64 = bytesToBase64(buffer);
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

// Same-origin static files already loaded this page session (positive results only).
const localAssetCache = new Map<string, { base64: string; byteSize: number }>();

/**
 * Loads one same-origin static file. Counts as found only when the response is ok AND its
 * Content-Type is image/* — Vite and Cloudflare Pages return index.html with 200 for a missing file.
 */
async function loadLocalAsset(urlPath: string): Promise<{ base64: string; byteSize: number } | null> {
  let url: URL;
  try {
    url = new URL(urlPath, window.location.origin);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  const key = url.pathname;
  const cached = localAssetCache.get(key);
  if (cached) return cached;
  try {
    const res = await fetch(url.href);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!res.ok || !ct.startsWith('image/')) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0) return null;
    const entry = { base64: bytesToBase64(bytes), byteSize: bytes.length };
    localAssetCache.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

// Clean resolver that ONLY resolves the requested file without accidental fallbacks to unrelated images
// (browser: files under public/ are served from the site root, so each disk location maps to a URL)
export async function resolveImageFile(
  imagePathOrRel: string,
  customLabel?: string,
  overrideFilename?: string,
  customSource = 'local_asset'
): Promise<ResolvedImage | null> {
  const relativeClean = imagePathOrRel.replace(/^\/+/, '');
  const base = basename(relativeClean);
  if (!relativeClean || !base || /^[a-z][a-z0-9+.-]*:/i.test(relativeClean)) return null;

  // Search strictly for the requested file and direct path aliases — same order as the disk lookup:
  //   public/<rel>, public/assets/aistudio/<base>, public/assets/<base>, public/<base>, <repo>/<rel>
  // Only public/ is served, so <repo>/<rel> resolves only when <rel> itself starts with public/.
  const possibleLocations = [
    `/${relativeClean}`,
    `/assets/aistudio/${base}`,
    `/assets/${base}`,
    `/${base}`,
    ...(relativeClean.startsWith('public/') ? [`/${relativeClean.slice('public/'.length)}`] : []),
  ].filter((loc, i, all) => all.indexOf(loc) === i && !loc.startsWith('/public/'));

  for (const loc of possibleLocations) {
    const file = await loadLocalAsset(loc);
    if (file) {
      let mime = 'image/jpeg';
      if (loc.endsWith('.png')) mime = 'image/png';
      else if (loc.endsWith('.webp')) mime = 'image/webp';
      else if (loc.endsWith('.gif')) mime = 'image/gif';

      const fname = overrideFilename || basename(loc);
      return {
        mimeType: mime,
        base64: file.base64,
        filename: fname,
        label: customLabel || fname,
        role: customLabel || fname,
        source: customSource,
        byteSize: file.byteSize,
        previewUrl: `/assets/aistudio/${basename(loc)}`,
      };
    }
  }
  return null;
}

export function extractUrlsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const urlRegex = /https?:\/\/[^\s"'<>)\]]+/gi;
  const matches = text.match(urlRegex) || [];
  return Array.from(new Set(matches));
}

export function extractLocalFilenamesFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(/\b([a-zA-Z0-9_\-]+\.(?:png|jpe?g|webp))\b/gi) || [];
  return Array.from(new Set(matches));
}

export async function resolveReferenceImages(body: any): Promise<ResolvedImage[]> {
  const results: ResolvedImage[] = [];
  const addedKeys = new Set<string>();

  const addUnique = (img: ResolvedImage | null) => {
    if (!img) return;
    const key = (img.url || img.filename).toLowerCase();
    if (key && addedKeys.has(key)) return;
    // Same picture under another name (e.g. a locked likeness picture that is also a preset): send it once.
    const contentKey = img.base64 ? `bytes:${img.base64.length}:${img.base64.slice(0, 96)}:${img.base64.slice(-96)}` : '';
    if (contentKey && addedKeys.has(contentKey)) return;
    if (key) addedKeys.add(key);
    if (contentKey) addedKeys.add(contentKey);
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

  const isMorphActive = !isNoSymbolRequest(body) && (isTransformationRequest(body) || promptDescribesDualEmblems);

  // =========================================================================
  // PRIORITY 1: USER-SPECIFIED TARGET ASSETS (PROMPT-NAMED, CUSTOM PICTURES, UPLOADS)
  // When the user specifies an image by name in the prompt (e.g. "sodesign", "image_735d6c29")
  // or uploads a custom picture/prop, that image MUST BE Reference Image 1!
  // =========================================================================
  const clientRefs: any[] = Array.isArray(body.referenceImages) ? body.referenceImages : [];

  // The start picture the user uploaded goes first: the video opens on it.
  // (The built-in start rabbit is not sent here; the locked likeness pictures already show it.)
  // A new scene made from the previous scene's last frame already sends that frame as
  // scene_start_frame (named in the prompt), so it isn't added a second time here.
  const hasContinuityStart = clientRefs.some((r) => r?.category === 'continuity_frame' && r?.label === 'scene_start_frame');
  if (typeof body.imageBase64 === 'string' && !hasContinuityStart) {
    const m = body.imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (m) {
      addUnique({
        mimeType: body.imageMimeType && /^image\//.test(body.imageMimeType) ? body.imageMimeType : m[1],
        base64: m[2],
        filename: 'start_picture.' + (m[1].split('/')[1] || 'jpg').replace('jpeg', 'jpg'),
        label: 'Start Picture (chosen by the user)',
        role: 'START FRAME: the user\'s chosen start picture. The video opens on this picture',
        description:
          'The first frame of the video must match this picture: the same rabbit, pose, setting, framing and lighting. The scene action then continues from here.',
        source: 'start_picture',
        byteSize: base64ByteLength(m[2]),
        previewUrl: body.imageBase64,
      });
    }
  }

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
          byteSize: base64ByteLength(match[2]),
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
      const resolved = await resolveImageFile(targetUri, role, ref.filename || `${cleanName}.png`, 'client_multiref_file');
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
    // Continuity frames grabbed from neighbouring scenes (added with the scene edit list): the
    // client states the role, e.g. "the video must start on this frame".
    if (ref.category === 'continuity_frame') {
      return { role: ref.role || ref.label || 'Continuity frame', desc: ref.description || '', isFriend: false, isPicture: false };
    }
    // A picture the user added for this one scene (the wider view, the place, the others around).
    if (ref.category === 'scene_reference') {
      return {
        role: `SCENE REFERENCE: ${ref.label || 'the wider view of the scene'}`,
        desc: 'The place, the light and how the characters around look. Match it when the camera moves or zooms out. Do not copy the poses or actions in it: the scene text decides what the characters do.',
        isFriend: false,
        isPicture: false,
      };
    }
    // The story's approved character card (set by the user with "Save this character").
    if (ref.category === 'main_character') {
      return {
        role: 'MAIN CHARACTER of this story (approved look): draw exactly this character, once only',
        desc: ref.description || '',
        isFriend: false,
        isPicture: false,
      };
    }
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

    const resolved = await resolveImageFile(fn, role, fn, 'prompt_filename');
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
  const showsSymbol = (ref: any) =>
    /emblem|medallion|embroider|chest|07de772c|07c026d1|1790924612634|rabbit_wayfinder_jump\.jpg|rabbit_face_crop\.jpg/i.test(
      `${ref.label || ''} ${ref.filename || ''} ${ref.imagePath || ''} ${ref.imageUrl || ''}`
    );
  // A locked picture that shows a different belly symbol than the one chosen contradicts the
  // instructions (e.g. the Wayfinder jump picture sent with the spiral symbol): leave it out.
  const chosenIsWayfinder =
    body.customEmblemType === 'vegvisir' ||
    !!body.customEmblemName?.toLowerCase().includes('wayfinder') ||
    !!body.customEmblemName?.toLowerCase().includes('eight');
  const chosenIsSpiral = !chosenIsWayfinder && (body.customEmblemType === 'original_s' || body.customEmblemType === 'default');
  const showsWrongSymbol = (ref: any) => {
    if (isMorphActive) return false;
    const text = `${ref.label || ''} ${ref.filename || ''} ${ref.imagePath || ''} ${ref.imageUrl || ''}`;
    if (chosenIsSpiral) return /rabbit_wayfinder_jump\.jpg|rabbit_chest_emblem_clean|07c026d1/i.test(text);
    if (chosenIsWayfinder) return /1790924612634|rabbit_original_emblem_medallion|07de772c/i.test(text);
    return false;
  };
  const noKhalle = excludesKhalle(body);
  for (const ref of clientRefs) {
    if (!ref || ref.enabled === false) continue;
    // Khalle switched off: leave out the locked pictures of him (and any symbol picture).
    if (noKhalle && (isHeroRabbitAsset(ref) || showsSymbol(ref) || /silhouette|medallion/i.test(ref.label || ''))) continue;
    if (isNoSymbolRequest(body) && showsSymbol(ref)) continue;
    if (showsWrongSymbol(ref)) continue;
    if (promptMentionedClientRefs.includes(ref)) continue;
    const { role, desc } = getAssetRoleAndDesc(ref);
    const resolved = await resolveAnyRefAsset(ref, role, desc);
    if (resolved) addUnique(resolved);
  }

  // Without Khalle there is no belly symbol and no hero picture: stop before 1D and priority 2.
  if (noKhalle) {
    const own = results.slice(0, 6);
    own.forEach((img, idx) => {
      img.index = idx + 1;
    });
    return own;
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
            byteSize: base64ByteLength(match[2]),
            previewUrl: body.customEmblemStartImage,
          };
        }
      } else {
        startResolved = await resolveImageFile(body.customEmblemStartImage, 'Starting Chest Emblem', 'custom_start_emblem.png', 'custom_emblem_file');
      }
    }
    if (!startResolved) {
      startResolved = await resolveImageFile('public/assets/aistudio/image_07de772c.png', 'Start Chest Emblem: Original Oval White Felt Medallion with Blue Spirals', 'image_07de772c.png', 'preset_start_emblem');
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
            byteSize: base64ByteLength(match[2]),
            previewUrl: body.customEmblemEndImage,
          };
        }
      } else {
        endResolved = await resolveImageFile(body.customEmblemEndImage, 'Ending Chest Emblem', 'custom_end_emblem.png', 'custom_emblem_file');
      }
    }
    if (!endResolved) {
      endResolved = await resolveImageFile('public/assets/aistudio/image_07c026d1.png', 'End Chest Emblem: Authentic Eight-Spoke Blueprint with Asymmetrical Staves', 'image_07c026d1.png', 'preset_end_emblem');
    }
    if (endResolved) {
      endResolved.role = 'End Chest Emblem: Authentic Eight-Spoke Runic Stave Blueprint with Asymmetrical Staves (Comb Teeth, Circular Glyph, Crossbars)';
      endResolved.description = 'Authentic eight-armed symbol with distinct asymmetrical staves: comb teeth on right arm, circular ring glyph on left arm, crossbars on vertical arms. NOT eight identical trident pitchforks.';
      addUnique(endResolved);
    }

    // Hero Action Leap & Facial Features
    const leapPose = await resolveImageFile('public/assets/aistudio/1790924612634-1_cd314286.jpg', 'Hero Character: Full Action Leap & Body Silhouette', '1790924612634-1_cd314286.jpg', 'preset_character_master');
    if (leapPose) {
      leapPose.role = 'Hero Character: Full Action Leap & Green Fleece Doll Silhouette';
      addUnique(leapPose);
    }
    const faceRef = await resolveImageFile('public/assets/aistudio/rabbit_face_crop.jpg', 'Character Facial Features: Single Buck Tooth & Tall Upright Floppy Ears', 'rabbit_face_crop.jpg', 'preset_face');
    if (faceRef) {
      faceRef.role = 'Character Facial Features: Single Buck Tooth & Tall Upright Floppy Ears';
      addUnique(faceRef);
    }
  } else if (isNoSymbolRequest(body)) {
    // No symbol: only the one plain-belly picture of the rabbit, and no emblem reference at all.
    // Skip any the client already sent, so the same picture isn't attached twice.
    const alreadySent = (name: string) => results.some((r) => (r.previewUrl || '').includes(name));
    const plainBody = await resolveImageFile('public/assets/aistudio/rabbit_wayfinder_jump_no_symbol.jpg', 'Hero Character: Green Plush Rabbit Doll Body with Plain Pink Belly', 'rabbit_wayfinder_jump_no_symbol.jpg', 'preset_character_master');
    if (plainBody && !alreadySent('rabbit_wayfinder_jump_no_symbol')) {
      plainBody.role = 'Hero Character: Green Plush Rabbit Doll Body & Plain Pink Belly (no symbol)';
      addUnique(plainBody);
    }
  } else {
    // Static Mode (Morphing completely disabled)
    // Always provide Hero Character Action Leap & Face Crop for visual consistency.
    // The leap picture must show the chosen symbol: Wayfinder jump for Wayfinder, spiral jump otherwise.
    const leapFile = chosenIsWayfinder ? 'rabbit_wayfinder_jump.jpg' : '1790924612634-1_cd314286.jpg';
    const leapPose = await resolveImageFile(`public/assets/aistudio/${leapFile}`, 'Hero Character: Green Plush Rabbit Doll Body & Proportions', leapFile, 'preset_character_master');
    if (leapPose) {
      leapPose.role = 'Hero Character: Green Plush Rabbit Doll Body & Apple-Green Fleece Proportions';
      addUnique(leapPose);
    }
    const faceRef = await resolveImageFile('public/assets/aistudio/rabbit_face_crop.jpg', 'Character Facial Features: Single White Buck Tooth & Upright Floppy Ears', 'rabbit_face_crop.jpg', 'preset_face');
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
      const blueprint = await resolveImageFile('public/assets/aistudio/image_07c026d1.png', 'Static Chest Emblem: Authentic Eight-Spoke Blueprint with Asymmetrical Staves', 'image_07c026d1.png', 'preset_emblem_blueprint');
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
              byteSize: base64ByteLength(match[2]),
              previewUrl: body.customEmblemImage,
            });
          }
        } else if (body.customEmblemImage.startsWith('http')) {
          const fetched = await fetchImageFromUrl(body.customEmblemImage, 'Custom Static Chest Emblem', 'custom_emblem_url');
          if (fetched) addUnique(fetched);
        } else {
          const resolved = await resolveImageFile(body.customEmblemImage, 'Custom Static Chest Emblem', undefined, 'custom_file');
          if (resolved) addUnique(resolved);
        }
      }
    } else {
      // Default: Original Spiral Medallion
      const origEmblem = await resolveImageFile('public/assets/aistudio/image_07de772c.png', 'Static Chest Emblem: Original Oval White Felt Medallion with Blue Spirals', 'image_07de772c.png', 'original_medallion');
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

export function formatProductionDirectives(body: any, resolvedImages?: ResolvedImage[]): string {
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

  // Khalle switched off: these directives are written about him; point them at the scene's own character.
  if (excludesKhalle(body)) {
    text = text
      .replace(/the primary hero green plush rabbit/gi, 'the main character')
      .replace(/the green plush rabbit character/gi, 'the main character')
      .replace(/the green plush rabbit/gi, 'the main character')
      .replace(/the rabbit's paws/gi, "the main character's paws")
      .replace(/by the rabbit/gi, 'by the main character')
      .replace(/with the rabbit/gi, 'with the main character')
      .replace(/the rabbit as the central hero/gi, 'the main character')
      .replace(/alongside him/gi, 'alongside them')
      .replace(/his companion friend/gi, 'a companion friend');
  }

  return text;
}
