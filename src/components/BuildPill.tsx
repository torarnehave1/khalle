// Which build am I looking at? The commit and build time are baked into the bundle by
// vite.config.ts, so the pill can only describe the bundle it ships inside. A pushed commit
// is what production runs; a stale tab shows the old sha: reload to get the latest deploy.
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
  const built = new Date(__BUILD_TIME__);
  const builtLabel = Number.isNaN(built.getTime()) ? __BUILD_TIME__ : built.toLocaleString();
  const since = ago(__BUILD_TIME__);
  const title = [
    `commit ${__BUILD_SHA__}`,
    `branch ${__BUILD_BRANCH__}`,
    `built ${builtLabel}${since ? ` (${since})` : ''}`,
    'Click to open the commit on GitHub',
  ].join('\n');

  return (
    <a
      href={`${REPO_URL}/commit/${__BUILD_SHA__}`}
      target="_blank"
      rel="noreferrer"
      title={title}
      aria-label={`Build ${SHORT_SHA}`}
      className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 font-mono text-[10px] tracking-normal text-white/60 transition hover:bg-white/10"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      <span>{SHORT_SHA}</span>
    </a>
  );
}
