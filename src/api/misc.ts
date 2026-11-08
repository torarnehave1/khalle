/**
 * Session, health, quota, diagnostics and static-data routes — ported from server.ts.
 */
import { getApiToken } from '../lib/auth';
import { GEMINI_WORKER_BASE, GeminiApiError, getGeminiClient, verifySession } from './gemini';
import type { RouteHandler } from './http';
import { quotaState, recentGenerationLogs } from './logs';

// Who is signed in — AuthGate calls this on startup to confirm a stored login is still valid.
// Browser: the stored token is checked by the proxy worker (GET /v1/session). 401 → sign out;
// any other failure → 503 (AuthGate then lets the user in, and each call is still checked).
export const handleSession: RouteHandler = async (_req, res) => {
  try {
    const who = await verifySession();
    return res.json({ email: who.email, role: who.role });
  } catch (err: any) {
    if (err instanceof GeminiApiError && err.status === 401) {
      return res.status(401).json({ error: 'Your session has expired. Sign in again.' });
    }
    return res.status(503).json({ error: `Sign-in check unavailable (${err?.message || 'unreachable'}). Try again shortly.` });
  }
};

// Health check endpoint (not login-gated). The key now lives in the proxy worker, so `hasApiKey`
// reports whether this browser holds the sign-in token needed to reach it.
export const handleHealth: RouteHandler = (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!getApiToken(),
    geminiProxy: GEMINI_WORKER_BASE,
    time: new Date().toISOString(),
  });
};

// Test whether the project spend cap / quota has refreshed
export const handleTestQuota: RouteHandler = async (_req, res) => {
  try {
    const ai = getGeminiClient();
    await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'ping',
      config: { maxOutputTokens: 1 },
    });

    const isRecentVideoRateLimit =
      quotaState.lastVideoRateLimitInfo && Date.now() - quotaState.lastVideoRateLimitInfo.timestamp < 1000 * 60 * 90;

    if (isRecentVideoRateLimit) {
      return res.json({
        success: true,
        status: 'video_rate_limited',
        textQuotaActive: true,
        videoRateLimit: quotaState.lastVideoRateLimitInfo?.message,
        message: quotaState.lastVideoRateLimitInfo?.message || 'Daily video model limit reached.',
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
};

// Preset sample assets
// Diagnostic logging endpoints
export const handleLastGenerationLog: RouteHandler = (_req, res) => {
  const latest = recentGenerationLogs[0] || null;
  res.json({
    success: true,
    log: latest,
    formattedText: latest
      ? latest.formattedLog
      : 'No generation diagnostic log recorded yet. Please generate a video first.',
  });
};

export const handleGenerationLogs: RouteHandler = (_req, res) => {
  res.json({
    success: true,
    total: recentGenerationLogs.length,
    logs: recentGenerationLogs,
  });
};

export const handleDebugLog: RouteHandler = (_req, res) => {
  const latest = recentGenerationLogs[0] || null;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(
    latest
      ? latest.formattedLog
      : 'No generation diagnostic log recorded yet. Please generate a video first.'
  );
};

export const handleSamples: RouteHandler = (_req, res) => {
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
};

// Character Reference Kit endpoint returning multi-angle model sheet
export const handleCharacterKit: RouteHandler = (_req, res) => {
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
};
