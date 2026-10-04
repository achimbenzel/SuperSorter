import { defineConfig } from 'vitest/config';

// Eigene Test-Konfiguration ohne React-/PWA-Plugins: Die Tests prüfen nur die
// reine Spiellogik in src/game/ und brauchen weder DOM noch Service Worker.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
  },
});
