/**
 * Vegvisr magic-link login — same flow as Agent-Builder (src/App.tsx + src/lib/auth.ts there).
 *
 * 1. sendMagicLink(email) → cookie.vegvisr.org emails a link back to this page with ?magic=<token>.
 * 2. verifyMagicToken(token) → resolves email, then role + emailVerificationToken from dashboard.
 * 3. The user is stored in localStorage 'user' and the token in the `vegvisr_token` cookie,
 *    so a login on any *.vegvisr.org app carries over.
 *
 * Login is only accepted when it yields an emailVerificationToken: the Gemini proxy worker
 * (gemini.vegvisr.org) checks that token on every call, so a user without one could open the app
 * but every call would fail.
 *
 * Hosts outside *.vegvisr.org: the magic-link service lets in only Superadmins, system owners
 * and that domain's World founders (email-worker isLoginAllowed).
 */

import { handleLocalApi } from '../api/router';

export type AuthUser = {
  userId: string;
  email: string;
  role: string | null;
  token: string;
};

const MAGIC_BASE = 'https://cookie.vegvisr.org';
const DASHBOARD_BASE = 'https://dashboard.vegvisr.org';
const STORAGE_KEY = 'user';
const COOKIE_NAME = 'vegvisr_token';

export const readStoredUser = (): AuthUser | null => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    const userId = parsed?.user_id || parsed?.oauth_id;
    const email = parsed?.email;
    const token = parsed?.emailVerificationToken;
    if (!userId || !email || !token) return null;
    return { userId, email, role: parsed.role || null, token };
  } catch {
    return null;
  }
};

export const getApiToken = (): string => readStoredUser()?.token || '';

const cookieDomain = () =>
  window.location.hostname.endsWith('.vegvisr.org') || window.location.hostname === 'vegvisr.org'
    ? '; Domain=.vegvisr.org'
    : '';

const setAuthCookie = (token: string) => {
  const maxAge = 60 * 60 * 24 * 30;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}${cookieDomain()}`;
};

const clearAuthCookie = () => {
  const base = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = base;
  const domain = cookieDomain();
  if (domain) document.cookie = `${base}${domain}`;
};

export const clearStoredUser = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem('email_session_verified');
  } catch {
    // storage unavailable — nothing to clear
  }
  clearAuthCookie();
};

const fetchUserContext = async (email: string) => {
  const roleRes = await fetch(`${DASHBOARD_BASE}/get-role?email=${encodeURIComponent(email)}`);
  if (!roleRes.ok) throw new Error(`Could not load your role (status ${roleRes.status}).`);
  const roleData = await roleRes.json();
  if (!roleData?.role) throw new Error('Could not load your role.');

  const dataRes = await fetch(`${DASHBOARD_BASE}/userdata?email=${encodeURIComponent(email)}`);
  if (!dataRes.ok) throw new Error(`Could not load your account (status ${dataRes.status}).`);
  const userData = await dataRes.json();

  return {
    email,
    role: roleData.role as string,
    user_id: userData.user_id as string | null,
    oauth_id: (userData.oauth_id as string | null) || null,
    emailVerificationToken: userData.emailVerificationToken as string | null,
    phone: userData.phone || null,
    phoneVerifiedAt: userData.phoneVerifiedAt || null,
    branding: userData.branding || { mySite: null, myLogo: null },
    profileimage: userData.profileimage || null,
  };
};

export const verifyMagicToken = async (magicToken: string): Promise<AuthUser> => {
  const res = await fetch(`${MAGIC_BASE}/login/magic/verify?token=${encodeURIComponent(magicToken)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success || !data.email) {
    throw new Error(data.error || 'This sign-in link is invalid or has expired. Request a new one.');
  }

  const ctx = await fetchUserContext(data.email);
  if (!ctx.emailVerificationToken) {
    throw new Error('Your account has no session token yet. Sign in once at vegvisr.org, then try again.');
  }

  const payload = { ...ctx, oauth_id: ctx.oauth_id || ctx.user_id || null };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  sessionStorage.setItem('email_session_verified', '1');
  setAuthCookie(ctx.emailVerificationToken);

  const user = readStoredUser();
  if (!user) throw new Error('Sign-in could not be saved in this browser.');
  return user;
};

export const sendMagicLink = async (email: string) => {
  const redirectUrl = `${window.location.origin}${window.location.pathname}`;
  const res = await fetch(`${MAGIC_BASE}/login/magic/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), redirectUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'The sign-in link could not be sent. Try again.');
  }
};

/**
 * Answers every same-origin /api/* request in the browser through the local router
 * (src/api/router.ts — the handlers ported from server.ts, calling the Gemini proxy worker), and
 * reports a 401 so the app can return to the sign-in screen. Installed once, before the app
 * renders, so every existing and future fetch('/api/...') call is covered without editing each one.
 * Everything else (including the worker calls themselves) goes to the network unchanged.
 */
export const installApiAuth = (onUnauthorized: () => void) => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const resolved = new URL(url, window.location.href);
    const isOwnApi = resolved.origin === window.location.origin && resolved.pathname.startsWith('/api/');
    if (!isOwnApi) return originalFetch(input, init);

    const request = new Request(input instanceof Request ? input : resolved.href, init);
    const res = await handleLocalApi(request);
    if (res.status === 401) onUnauthorized();
    return res;
  };
};
