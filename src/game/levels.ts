// Progressionskurve: eine Zeile pro Level. Der Generator (generator.ts) macht aus
// jeder Zeile ein konkretes, lösbares Board. Hier wird nur *was* festgelegt, nicht *wie*.
//
// Spalten (siehe LevelConfig in types.ts):
//   types   Warentypen          cap     Fachkapazität       dbl   Typen mit doppelter Menge
//   stacks  Karton-Stapel       cart    Wagen-/Pufferplätze open  anfangs offene Fächer
//   mys     Mystery-Verpackung  gold    Gold-Pakete         hint  Kategorie-Hinweis
//   reward  Belohnungslevel     win     Ziel-Gewinnquote (Simulation), höher = leichter
//
// Kurve:
//   1-3   nur Basisregeln, alles offen sichtbar, wenige Typen
//   4     Mystery-Verpackung (mit Kategorie-Hinweis als Einstieg)
//   6     erstes geschlossenes Fach (öffnet sich, wenn ein Fach gelöst ist)
//   7     ein Typ mehr (5), 8: ein Pufferplatz weniger
//   10    goldene Pakete
//   5, 9, 13, 17  Belohnungslevel (leichter, mehr Münzen)
//   ab 21 Endlos: Level 14-20 rotieren mit neuen Seeds

import type { BoosterCounts, LevelConfig } from './types';

/** Münzen für einen Sieg. */
export const COINS_PER_WIN = 10;
/** Zusätzliche Münzen in Belohnungsleveln. */
export const REWARD_LEVEL_BONUS = 20;
/** Bonus pro goldenem Item, das in ein Fach gelegt wird. */
export const GOLD_BONUS = 5;

export const DEFAULT_BOOSTERS: BoosterCounts = { undo: 3, extra: 1, peek: 2, shuffle: 1 };

type Row = [
  types: number,
  cap: 3 | 4,
  dbl: number,
  stacks: 3 | 4,
  cart: number,
  open: number,
  mys: boolean,
  gold: number,
  hint: boolean,
  reward: boolean,
  win: [number, number],
];

// prettier-ignore
const TABLE: Row[] = [
  //  types cap dbl stk cart open mys    gold hint   reward  win
  /*  1 */ [3, 3, 0, 3, 2, 3, false, 0, false, false, [0.9, 1]],
  /*  2 */ [3, 4, 0, 3, 2, 3, false, 0, false, false, [0.9, 1]],
  /*  3 */ [4, 3, 0, 4, 2, 4, false, 0, false, false, [0.9, 1]],
  /*  4 */ [4, 3, 0, 4, 2, 4, true,  0, true,  false, [0.9, 1]],
  /*  5 */ [3, 4, 0, 3, 2, 3, true,  0, false, true,  [0.9, 1]],
  /*  6 */ [4, 3, 0, 3, 2, 3, true,  0, false, false, [0.8, 0.95]],
  /*  7 */ [5, 3, 0, 4, 2, 3, true,  0, false, false, [0.7, 0.9]],
  /*  8 */ [4, 4, 0, 4, 1, 3, true,  0, false, false, [0.6, 0.8]],
  /*  9 */ [4, 3, 0, 4, 2, 4, true,  0, false, true,  [0.9, 1]],
  /* 10 */ [5, 3, 0, 4, 1, 3, true,  2, false, false, [0.55, 0.75]],
  /* 11 */ [5, 3, 1, 4, 1, 3, true,  2, false, false, [0.5, 0.7]],
  /* 12 */ [5, 4, 0, 4, 2, 3, true,  2, false, false, [0.4, 0.6]],
  /* 13 */ [3, 4, 1, 4, 2, 4, true,  4, false, true,  [0.9, 1]],
  /* 14 */ [4, 4, 0, 4, 2, 2, true,  2, false, false, [0.35, 0.55]],
  /* 15 */ [5, 3, 0, 4, 2, 2, true,  3, false, false, [0.3, 0.5]],
  /* 16 */ [5, 4, 0, 4, 1, 3, true,  3, false, false, [0.3, 0.5]],
  /* 17 */ [4, 4, 0, 4, 2, 4, true,  4, false, true,  [0.85, 1]],
  /* 18 */ [5, 3, 1, 4, 1, 3, true,  3, false, false, [0.25, 0.45]],
  /* 19 */ [5, 4, 0, 4, 2, 3, true,  3, false, false, [0.2, 0.4]],
  /* 20 */ [5, 4, 0, 4, 1, 3, true,  4, false, false, [0.15, 0.35]],
];

export const LEVEL_COUNT = TABLE.length;
/** Ab hier rotieren die Configs dieser Level im Endlosmodus. */
const ENDLESS_FROM = 14;

function fromRow(level: number, row: Row): LevelConfig {
  const [types, capacity, doubleTypes, stacks, cart, openSlots, mystery, gold, hintMode, reward, targetWinRate] = row;
  return {
    level,
    types,
    capacity,
    doubleTypes,
    stacks,
    cart,
    openSlots,
    mystery,
    gold: mystery ? gold : 0,
    hintMode,
    reward,
    targetWinRate,
    boosters: { ...DEFAULT_BOOSTERS, peek: mystery ? DEFAULT_BOOSTERS.peek : 0 },
  };
}

/** Config für eine Level-Nummer (1-basiert). Über 20 hinaus endlos weiter. */
export function getLevelConfig(level: number): LevelConfig {
  const n = Math.max(1, Math.floor(level));
  if (n <= TABLE.length) return fromRow(n, TABLE[n - 1]);
  const cycle = TABLE.length - ENDLESS_FROM + 1;
  const row = TABLE[ENDLESS_FROM - 1 + ((n - TABLE.length - 1) % cycle)];
  return fromRow(n, row);
}

/** Münzen, die ein Sieg in diesem Level bringt (ohne Gold-Bonus). */
export function winCoins(config: LevelConfig): number {
  return COINS_PER_WIN + (config.reward ? REWARD_LEVEL_BONUS : 0);
}

/** Kurze Einführungstexte für neue Mechaniken (werden bis zum ersten Zug angezeigt). */
export const LEVEL_TIPS: Record<number, string> = {
  1: 'Tippe auf eine Ware im Karton und dann auf ein Regalfach.',
  2: 'Gleiche Waren oben auf einem Stapel wandern gemeinsam ins Fach.',
  3: 'Ein volles Fach mit nur einer Sorte ist fertig. Der Wagen ist dein Zwischenlager.',
  4: 'Neu: Verpackte Waren! Das Symbol verrät die Kategorie.',
  5: 'Bonus-Level: Hier gibt es extra Münzen.',
  6: 'Neu: Geschlossene Fächer öffnen sich, sobald ein anderes Fach voll ist.',
  7: 'Mehr Sorten: Überlege, welches Fach du zuerst anfängst.',
  8: 'Nur noch ein Wagenplatz. Die Lupe zeigt, was in einem Paket steckt.',
  9: 'Bonus-Level: Durchatmen und Münzen sammeln.',
  10: 'Neu: Goldene Pakete bringen Bonus-Münzen, sobald sie im Regal liegen.',
};

export const PEEK_TIP = 'Lupe: Tippe auf ein verpacktes Paket.';
