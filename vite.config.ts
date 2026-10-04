import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Basis-Pfad der App.
 *
 * GitHub Pages hostet Projekt-Repos unter https://<user>.github.io/<repo>/.
 * Alle Asset-, Manifest- und Service-Worker-Pfade müssen deshalb mit /<repo>/
 * beginnen. Der Deploy-Workflow setzt BASE_PATH aus actions/configure-pages
 * (bei eigener Domain ist der Wert leer -> "/"). Ohne BASE_PATH gilt:
 * Build und Preview -> /SuperSorter/, Dev-Server -> /.
 */
const DEFAULT_BUILD_BASE = '/SuperSorter/';

function resolveBase(useBuildBase: boolean): string {
  const fromEnv = process.env.BASE_PATH;
  const base = fromEnv !== undefined ? fromEnv : useBuildBase ? DEFAULT_BUILD_BASE : '/';
  const withLeading = base.startsWith('/') ? base : `/${base}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

/** Farben für Manifest/Statusleiste (identisch mit --c-statusbar / --c-bg-wall-top in tokens.css). */
const THEME_COLOR = '#1d5d94';
const BACKGROUND_COLOR = '#fff4dc';

export default defineConfig(({ command, isPreview }) => {
  // `vite preview` läuft mit command "serve", muss aber den Build-Pfad verwenden.
  const base = resolveBase(command === 'build' || isPreview === true);
  return {
    base,
    plugins: [
      react(),
      VitePWA({
        // Neue Versionen werden im Hintergrund geladen und beim nächsten Start aktiv.
        registerType: 'autoUpdate',
        injectRegister: false, // Registrierung erfolgt in src/main.tsx (virtual:pwa-register)
        includeAssets: ['assets/**/*'],
        manifest: {
          id: base,
          name: 'Super Sorter',
          short_name: 'Super Sorter',
          description: 'Sortier-Puzzle im Supermarkt: Räume die Lieferung ins Regal!',
          lang: 'de',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'portrait',
          theme_color: THEME_COLOR,
          background_color: BACKGROUND_COLOR,
          icons: [
            { src: 'assets/icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'assets/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'assets/icons/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Alles vorab cachen: Das Spiel funktioniert danach komplett offline.
          globPatterns: ['**/*.{js,css,html,webp,png,svg,webmanifest}'],
          cleanupOutdatedCaches: true,
          navigateFallback: `${base}index.html`,
        },
        devOptions: { enabled: false },
      }),
    ],
    // Gebündeltes JS/CSS getrennt von public/assets/ ablegen (übersichtlicheres dist/).
    build: { assetsDir: 'static' },
    server: { host: true },
    preview: { host: true },
  };
});
