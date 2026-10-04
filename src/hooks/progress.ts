// Gemeinsamer Spielstand beider Modi in localStorage.
//
// Münzen sind eine gemeinsame Geldbörse; jeder Modus hat seinen eigenen Fortschritt.
// Immer nur ein Spielmodus ist gemountet und schreibt den Stand, daher reicht ein
// gemeinsamer Schlüssel. Der gewählte Modus liegt bewusst unter einem eigenen
// Schlüssel, damit App und Spielmodus sich nicht gegenseitig überschreiben.

export interface Progress {
  /** Regal-Modus: Level, das als Nächstes gespielt wird. */
  level: number;
  /** Höchstes erreichtes Regal-Level. */
  highest: number;
  /** Packband-Modus: Versand-Tag, der als Nächstes gespielt wird. */
  packDay: number;
  packHighest: number;
  /** Gemeinsame Geldbörse. */
  coins: number;
}

export const DEFAULT_PROGRESS: Progress = { level: 1, highest: 1, packDay: 1, packHighest: 1, coins: 0 };

export type GameMode = 'pack' | 'shelf';
export const MODE_KEY = 'super-sorter/mode/v1';
export const DEFAULT_MODE: { mode: GameMode } = { mode: 'pack' };

/** Gespeicherter Modus -> gültiger Modus (alte Stände kennen noch 'shop'). */
export const normalizeMode = (mode: unknown): GameMode => (mode === 'shelf' ? 'shelf' : 'pack');

/** Liest den Stand direkt aus localStorage (für das Menü, ohne eigenen State). */
export function readProgress(key: string): Progress {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return { ...DEFAULT_PROGRESS, ...(JSON.parse(raw) as Partial<Progress>) };
  } catch {
    /* ignorieren */
  }
  return DEFAULT_PROGRESS;
}
