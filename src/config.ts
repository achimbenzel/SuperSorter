// UI-Konstanten (Zeiten, Schwellen). Spielregeln/Level-Parameter liegen in src/game/.

/** Animationsdauern in ms. Werden als CSS-Variablen (--t-*) auf <html> gespiegelt. */
export const TIMING = {
  /** Flug einer Ware vom Stapel ins Fach. */
  hop: 380,
  /** Aufreißen des Packpapiers. */
  reveal: 520,
  /** Shake bei ungültigem Ziel. */
  shake: 340,
  /** Glow + Sterne beim Lösen eines Fachs. */
  solved: 1100,
  /** Anheben der Auswahl. */
  select: 160,
  /** Wie lange die Lupe ein verpacktes Item zeigt. */
  peek: 2600,
  /** Packband: neues Paket fährt vom Band an den Packplatz. */
  boxArrive: 420,
  /** Packband: Abstand zweier Versände in einer Kettenreaktion (siehe components/pack/timeline.ts). */
  chainStep: 1150,
  /** Verzögerung bis Win/Lose-Screen erscheint (Animationen sollen erst fertig sein). */
  endScreenDelay: 750,
} as const;

/** Spiegelt TIMING als CSS-Variablen, damit CSS-Keyframes dieselben Werte nutzen. */
export function applyTimingCssVars(root: HTMLElement = document.documentElement): void {
  root.style.setProperty('--t-hop', `${TIMING.hop}ms`);
  root.style.setProperty('--t-reveal', `${TIMING.reveal}ms`);
  root.style.setProperty('--t-shake', `${TIMING.shake}ms`);
  root.style.setProperty('--t-solved', `${TIMING.solved}ms`);
  root.style.setProperty('--t-select', `${TIMING.select}ms`);
  root.style.setProperty('--t-box', `${TIMING.boxArrive}ms`);
}

/** localStorage-Schlüssel (versioniert, damit spätere Formatänderungen sauber migrierbar sind). */
export const STORAGE_KEY = 'super-sorter/progress/v1';

/** Debug-Modus über URL-Parameter ?debug=1 */
export const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
