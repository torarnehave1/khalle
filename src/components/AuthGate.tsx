import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { AuthBar } from 'vegvisr-ui-kit';
import { Mail, RefreshCw } from 'lucide-react';
import {
  clearStoredUser,
  installApiAuth,
  readStoredUser,
  sendMagicLink,
  verifyMagicToken,
  type AuthUser,
} from '../lib/auth';

type Status = 'checking' | 'authed' | 'anonymous';

// Installed at module load so the app's very first /api call already carries the token.
let notifyUnauthorized: () => void = () => {};
installApiAuth(() => notifyUnauthorized());

/** Vegvisr magic-link sign-in in front of the app — same flow as Agent-Builder. */
export default function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<Status>('checking');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');

  const signOut = (reason = '') => {
    clearStoredUser();
    setUser(null);
    setSentTo('');
    setError(reason);
    setStatus('anonymous');
  };

  useEffect(() => {
    notifyUnauthorized = () => signOut('Your session has expired. Sign in again to continue.');

    const url = new URL(window.location.href);
    const magic = url.searchParams.get('magic');
    if (!magic) {
      const stored = readStoredUser();
      if (!stored) {
        setStatus('anonymous');
        return;
      }
      // Confirm the stored login with the server before opening the app. A 401 is handled by
      // installApiAuth → signOut. If the check itself can't run, let the user in; each /api
      // call is still checked by the server.
      fetch('/api/session')
        .then((res) => {
          if (res.status === 401) return;
          setUser(stored);
          setStatus('authed');
        })
        .catch(() => {
          setUser(stored);
          setStatus('authed');
        });
      return;
    }

    verifyMagicToken(magic)
      .then((verified) => {
        setUser(verified);
        setStatus('authed');
      })
      .catch((err) => {
        clearStoredUser();
        setError(err instanceof Error ? err.message : 'Sign-in failed. Request a new link.');
        setStatus('anonymous');
      })
      .finally(() => {
        url.searchParams.delete('magic');
        window.history.replaceState({}, '', url.toString());
      });
  }, []);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setError('');
    setSentTo('');
    setSending(true);
    try {
      await sendMagicLink(email);
      setSentTo(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The sign-in link could not be sent. Try again.');
    } finally {
      setSending(false);
    }
  };

  if (status === 'authed' && user) {
    return (
      <>
        <div className="flex items-center justify-end gap-3 px-4 lg:px-8 py-2 border-b border-slate-800/80 bg-slate-950 text-white">
          <AuthBar
            userEmail={user.email}
            badgeLabel={user.role || 'User'}
            logoutLabel="Log out"
            onLogout={() => signOut()}
          />
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(20,184,166,0.14),_transparent_55%)]" />
      <div className="relative min-h-screen flex flex-col px-4 sm:px-8 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-lime-400 p-0.5">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-xl">🐇</div>
            </div>
            <span className="font-bold text-lg text-white tracking-tight">RabbitHop</span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            {status === 'checking' ? (
              <p className="flex items-center gap-2 text-sm text-slate-300">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Signing you in…
              </p>
            ) : (
              <>
                <h1 className="text-xl font-bold text-white">Sign in to RabbitHop</h1>
                <p className="mt-1 text-sm text-slate-400">
                  Enter your email and we'll send you a sign-in link. No password needed.
                </p>

                <form onSubmit={handleSend} className="mt-5 flex flex-col gap-3">
                  <label htmlFor="login-email" className="text-xs font-semibold text-slate-300">
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-6 py-3 text-sm font-semibold text-slate-950 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    {sending ? 'Sending link…' : 'Send sign-in link'}
                  </button>
                </form>

                <div aria-live="polite">
                  {sentTo && (
                    <p className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
                      Check your email. We sent a link to <strong>{sentTo}</strong>. It expires in 30 minutes.
                    </p>
                  )}
                  {error && (
                    <p role="alert" className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
                      {error}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
