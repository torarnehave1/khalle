import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {execSync} from 'node:child_process';

// Build stamp for the version pill (src/components/BuildPill.tsx). On Cloudflare Pages the
// commit and branch come from the build environment; locally they come from git.
function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, {encoding: 'utf8'}).trim();
  } catch {
    return '';
  }
}
const BUILD_SHA = process.env.CF_PAGES_COMMIT_SHA || process.env.WORKERS_CI_COMMIT_SHA || git('rev-parse HEAD') || 'unknown';
const BUILD_BRANCH = process.env.CF_PAGES_BRANCH || process.env.WORKERS_CI_BRANCH || git('rev-parse --abbrev-ref HEAD') || 'unknown';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // ffmpeg.wasm spawns its own worker; pre-bundling breaks that (same setting as VEmotion).
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    define: {
      __BUILD_SHA__: JSON.stringify(BUILD_SHA),
      __BUILD_BRANCH__: JSON.stringify(BUILD_BRANCH),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
