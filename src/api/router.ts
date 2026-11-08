/**
 * Local /api router. The app's existing fetch('/api/...') calls are answered here, in the browser,
 * by the handlers ported from server.ts (the static Cloudflare Pages site has no server). Installed
 * through installApiAuth in src/lib/auth.ts.
 *
 * Login gate (was server.ts middleware): every route except /api/health needs a stored Vegvisr
 * login, else 401. The token itself is verified by the Gemini proxy worker on each call; when the
 * worker answers 401 during a request, the route answers 401 too, so the app signs out.
 */
import { readStoredUser } from '../lib/auth';
import {
  handleEnhancePrompt,
  handleFetchUrlImage,
  handleSafeRephrase,
  handleScriptToScenes,
  handleSuggestClothingGuide,
  handleSuggestScene,
} from './assistant';
import { getUnauthorizedEpoch } from './gemini';
import { LocalResponse, type LocalRequest, type RouteHandler } from './http';
import {
  handleCharacterKit,
  handleDebugLog,
  handleGenerationLogs,
  handleHealth,
  handleLastGenerationLog,
  handleSamples,
  handleSession,
  handleTestQuota,
} from './misc';
import { handleAnimate, handleContinueScene, handleExtend } from './video';

const routes: Record<string, RouteHandler> = {
  'GET /api/session': handleSession,
  'GET /api/health': handleHealth,
  'GET /api/test-quota': handleTestQuota,
  'GET /api/last-generation-log': handleLastGenerationLog,
  'GET /api/generation-logs': handleGenerationLogs,
  'GET /api/debug-log': handleDebugLog,
  'GET /api/samples': handleSamples,
  'GET /api/character-kit': handleCharacterKit,
  'POST /api/suggest-scene': handleSuggestScene,
  'POST /api/enhance-prompt': handleEnhancePrompt,
  'POST /api/suggest-clothing-guide': handleSuggestClothingGuide,
  'POST /api/script-to-scenes': handleScriptToScenes,
  'POST /api/safe-rephrase': handleSafeRephrase,
  'POST /api/fetch-url-image': handleFetchUrlImage,
  'POST /api/animate': handleAnimate,
  'POST /api/extend': handleExtend,
  'POST /api/continue-scene': handleContinueScene,
};

const PUBLIC_ROUTES = new Set(['GET /api/health']);

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export async function handleLocalApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const routeKey = `${method === 'HEAD' ? 'GET' : method} ${url.pathname.replace(/\/+$/, '') || '/'}`;
  const handler = routes[routeKey];

  if (!handler) {
    // Express answered unknown routes with its 404 page; keep a 404, as JSON.
    return json(404, { error: `Cannot ${method} ${url.pathname}` });
  }

  if (!PUBLIC_ROUTES.has(routeKey) && !readStoredUser()) {
    return json(401, { error: 'Sign in to use RabbitHop.' });
  }

  // express.json(): JSON bodies are parsed, anything else leaves req.body = {}.
  let body: any = {};
  if (method !== 'GET' && method !== 'HEAD') {
    const text = await request.text();
    const type = request.headers.get('content-type') || '';
    if (text && (type.includes('json') || !type)) {
      try {
        body = JSON.parse(text);
      } catch {
        return json(400, { error: 'Request body is not valid JSON.' });
      }
    }
  }

  const req: LocalRequest = {
    method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    headers: request.headers,
    body,
  };
  const res = new LocalResponse();
  const epochBefore = getUnauthorizedEpoch();

  try {
    await handler(req, res);
  } catch (err: any) {
    console.error(`[LocalApi] ${routeKey} failed:`, err);
    if (getUnauthorizedEpoch() !== epochBefore) {
      return json(401, { error: 'Your session has expired. Sign in again.' });
    }
    return json(500, { error: err?.message || 'Internal error.' });
  }

  if (getUnauthorizedEpoch() !== epochBefore) {
    return json(401, { error: 'Your session has expired. Sign in again.' });
  }
  if (!res.finished) return json(500, { error: 'The route did not produce a response.' });
  return res.toResponse();
}
