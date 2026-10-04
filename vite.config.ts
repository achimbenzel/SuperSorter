import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Basis-Pfad der App.
 *
 * GitHub Pages hostet Projekt-Repos unter https://<user>.github.io/<repo>/.
 * Alle Asset-, Manifest- und Service-Worker-Pfade müssen deshalb mit /<repo>/
 * beginnen. Der Deploy-Workflow setzt BASE_PATH automatisch aus
 * actions/configure-pages; lokal (dev) läuft die App unter "/".
 */
const DEFAULT_BUILD_BASE = '/SuperSorter/';

function resolveBase(command: 'build' | 'serve'): string {
  const fromEnv = process.env.BASE_PATH;
  const base = fromEnv && fromEnv.length > 0 ? fromEnv : command === 'build' ? DEFAULT_BUILD_BASE : '/';
  return base.endsWith('/') ? base : `${base}/`;
}

export default defineConfig(({ command }) => ({
  base: resolveBase(command),
  plugins: [react()],
  // Gebündeltes JS/CSS getrennt von public/assets/ ablegen (übersichtlicheres dist/).
  build: { assetsDir: 'static' },
  server: { host: true },
  preview: { host: true },
}));
