import type { ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vite';
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
const THEME_COLOR = '#121317';
const BACKGROUND_COLOR = '#121317';

/** Hostnamen, unter denen Dev-Server und Preview zusätzlich erreichbar sein dürfen. */
const TAILSCALE_HOSTS = ['.ts.net'];

/**
 * Dev-Server: Bilder unter /assets/ eine Stunde cachen lassen.
 *
 * Vite schickt Dateien aus public/ im Dev-Modus mit "Cache-Control: no-cache". Das
 * Handy fragt dann jedes Bild erneut über WLAN an (ohne Service Worker, der läuft nur
 * im Build). Bei wackeligem WLAN fehlen dadurch mitten im Spiel Bilder. Nach dem
 * Austauschen von Assets einmal neu laden ohne Cache (oder Server neu starten).
 */
function devAssetCache(): Plugin {
  const CACHE = 'public, max-age=3600';
  return {
    name: 'super-sorter:dev-asset-cache',
    apply: 'serve',
    configureServer(server) {
      const prefix = `${server.config.base}assets/`;
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith(prefix)) {
          // sirv setzt den Header per writeHead(code, headers) -> dort überschreiben.
          const writeHead = res.writeHead.bind(res) as (...args: unknown[]) => ServerResponse;
          res.writeHead = ((code: number, ...rest: unknown[]) => {
            const headers = rest.find((r): r is Record<string, unknown> => typeof r === 'object' && r !== null);
            if (headers) headers['Cache-Control'] = CACHE;
            else res.setHeader('Cache-Control', CACHE);
            return writeHead(code, ...rest);
          }) as typeof res.writeHead;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ command, isPreview }) => {
  // `vite preview` läuft mit command "serve", muss aber den Build-Pfad verwenden.
  const base = resolveBase(command === 'build' || isPreview === true);
  return {
    base,
    // Build-Kennung für die Diagnose im Hauptmenü (zeigt, ob die Homescreen-App aktuell ist)
    define: { __BUILD_ID__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')) },
    plugins: [
      react(),
      devAssetCache(),
      VitePWA({
        // Neue Versionen werden im Hintergrund geladen und beim nächsten Start aktiv.
        registerType: 'autoUpdate',
        injectRegister: false, // Registrierung erfolgt in src/main.tsx (virtual:pwa-register)
        includeAssets: ['assets/**/*', '!assets/music/**'],
        manifest: {
          id: base,
          name: 'Super Sorter',
          short_name: 'Super Sorter',
          description: 'Card shop sorting puzzle: stock the shelves, ship orders and open booster packs!',
          lang: 'en',
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
          globPatterns: ['**/*.{js,css,html,webp,png,svg,webmanifest,mp3,woff2}'],
          // Musik (4,7 MB) nicht vorab cachen: wird gestreamt (src/audio/music.ts).
          // Zusätzlich in includeAssets ausgenommen, sonst käme sie darüber wieder hinein.
          globIgnores: ['**/assets/music/**'],
          cleanupOutdatedCaches: true,
          navigateFallback: `${base}index.html`,
        },
        devOptions: { enabled: false },
      }),
    ],
    // Gebündeltes JS/CSS getrennt von public/assets/ ablegen (übersichtlicheres dist/).
    // three.js (~600 kB, gzip ~150 kB) liegt in einem eigenen Chunk, der erst für die
    // 3D-Packs bzw. die 3D-Kartenansicht geladen wird -> Warnschwelle darüber.
    build: { assetsDir: 'static', chunkSizeWarningLimit: 700 },
    // host: true -> auch über LAN-/Tailscale-IP erreichbar.
    // allowedHosts: Vite blockt unbekannte Hostnamen (Schutz vor DNS-Rebinding).
    // ".ts.net" erlaubt Tailscale-MagicDNS-Namen, z. B. für `tailscale serve` (HTTPS aufs iPhone).
    server: { host: true, allowedHosts: TAILSCALE_HOSTS },
    preview: { host: true, allowedHosts: TAILSCALE_HOSTS },
  };
});
