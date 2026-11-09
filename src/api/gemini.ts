/**
 * Browser client for the shared Gemini proxy worker (gemini.vegvisr.org).
 *
 * The Gemini API key lives only in that worker. Every call here carries the signed-in user's
 * Vegvisr token (X-API-Token); the worker answers 401 when it is missing or invalid.
 *
 * Errors are thrown as GeminiApiError with `.status` (HTTP status) and a `.message` shaped like
 * the @google/genai SDK's, so the quota / safety checks ported from server.ts (status 429/400,
 * message substrings 'RESOURCE_EXHAUSTED', 'quota', 'Input blocked', …) behave as before.
 */
import { getApiToken } from '../lib/auth';

// Dev builds only: localStorage 'khalle:geminiBase' points the app at a local worker (wrangler dev).
const devBase = (() => {
  try {
    return import.meta.env.DEV ? localStorage.getItem('khalle:geminiBase') || '' : '';
  } catch {
    return '';
  }
})();
export const GEMINI_WORKER_BASE = devBase || 'https://gemini.vegvisr.org';

/** Same string values as the SDK's `Type` enum; the REST API accepts them as-is. */
export const Type = {
  TYPE_UNSPECIFIED: 'TYPE_UNSPECIFIED',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  ARRAY: 'ARRAY',
  OBJECT: 'OBJECT',
  NULL: 'NULL',
} as const;

export class GeminiApiError extends Error {
  status: number;
  statusCode: number;
  code?: string;
  statusText?: string;
  body?: unknown;
  constructor(message: string, status: number, code?: string, body?: unknown) {
    super(message);
    this.name = 'GeminiApiError';
    this.status = status;
    this.statusCode = status;
    this.code = code;
    this.statusText = code;
    this.body = body;
  }
}

/**
 * Incremented whenever the worker answers 401. The local /api router compares it before and after
 * a handler runs, so a handler that swallowed the error still surfaces 401 and the app signs out.
 */
let unauthorizedEpoch = 0;
export const getUnauthorizedEpoch = () => unauthorizedEpoch;

type Mode = 'generate' | 'interactions' | 'plain';

async function toError(res: Response, mode: Mode): Promise<GeminiApiError> {
  const status = res.status;
  if (status === 401) unauthorizedEpoch++;
  let parsed: any = null;
  let rawText = '';
  try {
    rawText = await res.text();
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = null;
  }

  // Worker shape: { error: <google error object | string> }. Google's own shape: { error: { code, message, status } }.
  let googleErr: any = parsed && typeof parsed === 'object' && 'error' in parsed ? parsed.error : parsed;
  if (googleErr && typeof googleErr === 'object' && googleErr.error) googleErr = googleErr.error;

  const innerMessage =
    typeof googleErr === 'string'
      ? googleErr
      : typeof googleErr?.message === 'string'
      ? googleErr.message
      : rawText || res.statusText || `HTTP ${status}`;
  const code = typeof googleErr === 'object' && typeof googleErr?.status === 'string' ? googleErr.status : undefined;

  let message: string;
  if (mode === 'generate') {
    // @google/genai ApiError: message = JSON.stringify(error body)
    const body =
      googleErr && typeof googleErr === 'object'
        ? { error: googleErr }
        : { error: { message: innerMessage, code: status, status: res.statusText } };
    message = JSON.stringify(body);
  } else if (mode === 'interactions') {
    // @google/genai Interactions APIError: message = `${status} ${error.message}`
    message = `${status} ${innerMessage}`;
  } else {
    message = innerMessage;
  }
  return new GeminiApiError(message, status, code, parsed ?? rawText);
}

async function workerFetch(path: string, init: RequestInit, mode: Mode, timeoutMs?: number): Promise<Response> {
  const token = getApiToken();
  if (!token) {
    unauthorizedEpoch++;
    throw new GeminiApiError('Sign in to use Khalle.', 401);
  }
  const headers = new Headers(init.headers);
  headers.set('X-API-Token', token);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let res: Response;
  try {
    res = await fetch(`${GEMINI_WORKER_BASE}${path}`, { ...init, headers, signal: controller?.signal ?? init.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new GeminiApiError(`Request to the Gemini proxy timed out after ${Math.round((timeoutMs || 0) / 1000)}s.`, 504);
    }
    throw new GeminiApiError(`Could not reach the Gemini proxy: ${err?.message || err}`, 503);
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (!res.ok) throw await toError(res, mode);
  return res;
}

// ---------------------------------------------------------------------------
// generateContent
// ---------------------------------------------------------------------------

type GenerateConfig = Record<string, any> & {
  systemInstruction?: string | { parts?: any[]; role?: string } | any[];
  safetySettings?: any[];
  tools?: any[];
  toolConfig?: any;
  cachedContent?: string;
};

function toContents(contents: any): any[] {
  if (typeof contents === 'string') return [{ role: 'user', parts: [{ text: contents }] }];
  if (Array.isArray(contents)) {
    if (contents.length === 0) return [];
    // Array of Content objects ({ role, parts }) → as-is; array of strings/parts → one user turn.
    if (contents.every((c) => c && typeof c === 'object' && Array.isArray(c.parts))) return contents;
    return [{ role: 'user', parts: contents.map((p) => (typeof p === 'string' ? { text: p } : p)) }];
  }
  if (contents && typeof contents === 'object') {
    if (Array.isArray(contents.parts)) return [contents];
    return [{ role: 'user', parts: [contents] }];
  }
  return [];
}

function toSystemInstruction(si: GenerateConfig['systemInstruction']) {
  if (si === undefined || si === null) return undefined;
  if (typeof si === 'string') return { parts: [{ text: si }] };
  if (Array.isArray(si)) return { parts: si.map((p) => (typeof p === 'string' ? { text: p } : p)) };
  return si;
}

/** Mirrors the SDK's `response.text` getter: concatenated non-thought text parts of candidate 0. */
function extractText(raw: any): string | undefined {
  const parts: any[] | undefined = raw?.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) return undefined;
  let text = '';
  let any = false;
  for (const part of parts) {
    if (typeof part?.text === 'string') {
      if (part.thought === true) continue;
      any = true;
      text += part.text;
    }
  }
  return any ? text : undefined;
}

export type GenerateContentResult = { text: string | undefined; raw: any; candidates?: any[] };

export async function generateContent({
  model,
  contents,
  config = {},
}: {
  model: string;
  contents: any;
  config?: GenerateConfig;
}): Promise<GenerateContentResult> {
  const { systemInstruction, safetySettings, tools, toolConfig, cachedContent, httpOptions: _h, abortSignal: _a, ...generationConfig } =
    config as GenerateConfig & { httpOptions?: unknown; abortSignal?: unknown };
  const body: Record<string, any> = { model, contents: toContents(contents) };
  const si = toSystemInstruction(systemInstruction);
  if (si) body.systemInstruction = si;
  if (Object.keys(generationConfig).length > 0) body.generationConfig = generationConfig;
  if (safetySettings) body.safetySettings = safetySettings;
  if (tools) body.tools = tools;
  if (toolConfig) body.toolConfig = toolConfig;
  if (cachedContent) body.cachedContent = cachedContent;

  const res = await workerFetch('/v1/generate', { method: 'POST', body: JSON.stringify(body) }, 'generate');
  const raw = await res.json();
  return { text: extractText(raw), raw, candidates: raw?.candidates };
}

// ---------------------------------------------------------------------------
// Interactions (video)
// ---------------------------------------------------------------------------

const MAX_CONTINUATION_HOPS = 8;

/**
 * POST /v1/interactions with the exact body server.ts gave ai.interactions.create(). Returns Google's
 * raw interaction JSON. Like the SDK's default automatic continuation for unary, non-background
 * calls: while the interaction stops at status 'requires_continuation' with a continuation_token,
 * it is resumed (previous_interaction_id = that hop, no input) within the same timeout budget;
 * the steps of every hop are merged and the last hop's id is returned.
 */
export async function createInteraction(body: Record<string, any>, options: { timeout?: number } = {}): Promise<any> {
  const deadline = options.timeout ? Date.now() + options.timeout : undefined;
  const remaining = () => (deadline ? Math.max(1, deadline - Date.now()) : undefined);

  const send = async (b: Record<string, any>) => {
    const res = await workerFetch('/v1/interactions', { method: 'POST', body: JSON.stringify(b) }, 'interactions', remaining());
    return res.json();
  };

  // Video takes minutes, longer than Cloudflare keeps a silent connection open (~100 s → error 524).
  // So start it in the background (Google answers at once with an id) and check back every few seconds.
  const isVideo = body?.response_format?.type === 'video';
  if (isVideo && body.stream !== true && body.background !== true && body.store !== false) {
    let started: any = null;
    try {
      started = await send({ ...body, background: true });
    } catch (e: any) {
      // A 400 that names `background` means this request can't run in the background: run it the old way.
      if (!(e instanceof GeminiApiError && e.status === 400 && /background/i.test(e.message))) throw e;
    }
    if (started) {
      if (started.status === 'in_progress' || started.status === 'queued') {
        return await waitForInteraction(started.id, Math.max(options.timeout || 0, VIDEO_WAIT_MS));
      }
      return finishedOrThrow(started);
    }
  }

  let hop = await send(body);
  if (body.background === true || body.stream === true) return hop;

  const hops = [hop];
  let sentToken: string | undefined;
  while (
    hops.length < MAX_CONTINUATION_HOPS &&
    hop?.status === 'requires_continuation' &&
    typeof hop?.continuation_token === 'string' &&
    hop.continuation_token &&
    hop.continuation_token !== sentToken
  ) {
    if (deadline && Date.now() >= deadline) {
      throw new GeminiApiError(`interactions.create() timed out after ${options.timeout} ms before automatic continuation finished.`, 504);
    }
    sentToken = hop.continuation_token;
    const stateful = body.store !== false && !!hop.id;
    const { input, ...rest } = body;
    const next = stateful
      ? { ...rest, continuation_token: sentToken, previous_interaction_id: hop.id }
      : { ...body, continuation_token: sentToken };
    void input;
    hop = await send(next);
    hops.push(hop);
  }

  if (hops.length === 1) return hop;
  const steps = hops.flatMap((h) => (Array.isArray(h?.steps) ? h.steps : []));
  return { ...hop, steps };
}

const VIDEO_WAIT_MS = 15 * 60 * 1000;
const POLL_EVERY_MS = 5000;

/** A finished interaction, or a GeminiApiError shaped like the old synchronous errors (status 400/429/500). */
function finishedOrThrow(it: any): any {
  if (!it || it.status === 'completed' || it.status === undefined) return it;
  const err = it.error || {};
  const message: string = err.message || `The video generation ended with status "${it.status}".`;
  const code = String(err.code ?? err.status ?? '');
  let status = Number(err.code) >= 400 && Number(err.code) < 600 ? Number(err.code) : 500;
  if (/RESOURCE_EXHAUSTED|quota|spend/i.test(`${code} ${message}`)) status = 429;
  else if (/INVALID_ARGUMENT|FAILED_PRECONDITION|blocked|safety|could not be processed/i.test(`${code} ${message}`)) status = 400;
  throw new GeminiApiError(message, status, code || it.status, it);
}

/** Check a background interaction every few seconds until it is done. A short network hiccup is retried. */
async function waitForInteraction(id: string, timeoutMs: number): Promise<any> {
  const deadline = Date.now() + timeoutMs;
  let networkFailures = 0;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_EVERY_MS));
    let it: any;
    try {
      it = await getInteraction(id);
      networkFailures = 0;
    } catch (e: any) {
      const transient = !(e instanceof GeminiApiError) || e.status >= 500 || e.status === 429;
      if (transient && ++networkFailures <= 5) continue;
      throw e;
    }
    if (it?.status === 'in_progress' || it?.status === 'queued') continue;
    return finishedOrThrow(it);
  }
  throw new GeminiApiError(
    `The video was still being made after ${Math.round(timeoutMs / 60000)} minutes (interaction ${id}).`,
    504,
    'TIMEOUT',
    { id }
  );
}

export async function getInteraction(id: string): Promise<any> {
  const res = await workerFetch(`/v1/interactions/${encodeURIComponent(id)}`, { method: 'GET' }, 'interactions');
  return res.json();
}

// ---------------------------------------------------------------------------
// Remote images + session
// ---------------------------------------------------------------------------

/** GET /v1/fetch-image — the worker fetches an http(s) image the browser can't (CORS). */
export async function fetchRemoteImage(url: string, timeoutMs = 15000): Promise<Response> {
  return workerFetch(`/v1/fetch-image?url=${encodeURIComponent(url)}`, { method: 'GET' }, 'plain', timeoutMs);
}

/** GET /v1/session — verifies the stored token; resolves { email, role } or throws (401 on a bad token). */
export async function verifySession(): Promise<{ email: string | null; role: string | null }> {
  const res = await workerFetch('/v1/session', { method: 'GET' }, 'plain', 15000);
  const data = await res.json().catch(() => ({}));
  return { email: data?.email ?? null, role: data?.role ?? null };
}

/** Drop-in for the `ai` object server.ts got from getGeminiClient(), so ported calls read the same. */
export function getGeminiClient() {
  return {
    models: { generateContent },
    interactions: { create: createInteraction, get: getInteraction },
  };
}
