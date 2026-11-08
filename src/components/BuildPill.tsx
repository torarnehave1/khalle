// Which build am I looking at? The commit and build time are baked into the bundle by
// vite.config.ts (same pattern as Agent-Builder), so the pill can only describe the bundle it
// ships inside. A stale tab shows the old sha: reload to get the latest deploy.
const SHORT_SHA = __BUILD_SHA__.slice(0, 7);
const REPO_URL = 'https://github.com/torarnehave1/khalle';

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export default function BuildPill() {
  const local = __BUILD_ENV__ === 'local';
  const built = new Date(__BUILD_TIME__);
  const builtLabel = Number.isNaN(built.getTime()) ? __BUILD_TIME__ : built.toLocaleString();
  const since = ago(__BUILD_TIME__);
  const title = [
    local ? 'Local development build (not deployed)' : 'Deployed build',
    `commit ${__BUILD_SHA__}`,
    `branch ${__BUILD_BRANCH__}`,
    `built ${builtLabel}${since ? ` (${since})` : ''}`,
    'Click to open the commit on GitHub',
  ].join('\n');

  const tone = local
    ? 'border-amber-400/50 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25'
    : 'border-white/20 bg-white/5 text-white/60 hover:bg-white/10';

  return (
    <a
      href={`${REPO_URL}/commit/${__BUILD_SHA__}`}
      target="_blank"
      rel="noreferrer"
      title={title}
      aria-label={`Build ${SHORT_SHA}${local ? ' (local)' : ''}`}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-normal transition ${tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${local ? 'bg-amber-400' : 'bg-emerald-400'}`} />
      <span>{local ? `dev ${SHORT_SHA}` : SHORT_SHA}</span>
    </a>
  );
}
