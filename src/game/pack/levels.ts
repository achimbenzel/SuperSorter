// Progressionskurve des Packband-Modus ("Versand-Tage").
//
// Spalten:
//   stk    Lagerkisten         table  Plätze auf dem Packtisch   spots  aktive Pakete (1-2)
//   typ    Waren im Sortiment  bulk   Sammelpakete (n × Ware)    mix    gemischte Pakete
//   size   Waren pro Paket     mys    verpackte Waren            gold   Gold-Waren
//   reward Belohnungstag       win    Ziel-Gewinnquote der Simulation (höher = leichter)
//
// Kurve:
//   1-3  Grundprinzip, alles sichtbar      4   verpackte Waren (Mystery)
//   6    zwei Packplätze                    8   gemischte Pakete
//   10   Gold                               5, 9, 13, 17  Belohnungstage; ab 21 rotieren 14-20

import { DEFAULT_BOOSTERS } from '../levels';
import type { PackLevelConfig } from './types';

/** Münzen pro verschicktem Paket. */
export const COINS_PER_BOX = 3;
/** Kombo: jedes weitere Paket im selben Zug bringt zusätzlich so viel (2., 3. … Paket). */
export const COMBO_BONUS = 2;
/** Gold-Ware im Paket. */
export const PACK_GOLD_BONUS = 5;
/** Geschaffter Tag / Belohnungstag extra. */
export const COINS_PER_PACK_DAY = 10;
export const REWARD_PACK_DAY_BONUS = 20;

type Row = [
  stk: 3 | 4,
  table: number,
  spots: 1 | 2,
  typ: number,
  bulk: number,
  mix: number,
  size: 2 | 3 | 4,
  mys: boolean,
  gold: number,
  reward: boolean,
  win: [number, number],
];

// prettier-ignore
const TABLE: Row[] = [
  //        stk tbl spot typ bulk mix size mys    gold reward win
  /*  1 */ [3, 5, 1, 3, 3, 0, 3, false, 0, false, [0.9, 1]],
  /*  2 */ [3, 5, 1, 4, 4, 0, 3, false, 0, false, [0.85, 1]],
  /*  3 */ [4, 4, 1, 4, 4, 0, 3, false, 0, false, [0.75, 1]],
  /*  4 */ [4, 5, 1, 5, 5, 0, 3, true,  0, false, [0.8, 1]],
  /*  5 */ [3, 5, 1, 3, 4, 0, 3, true,  0, true,  [0.85, 1]],
  /*  6 */ [4, 5, 2, 5, 5, 0, 3, true,  0, false, [0.6, 0.85]],
  /*  7 */ [4, 4, 1, 5, 5, 0, 3, true,  0, false, [0.5, 0.8]],
  /*  8 */ [4, 5, 1, 6, 3, 2, 3, true,  0, false, [0.5, 0.75]],
  /*  9 */ [3, 5, 1, 4, 4, 0, 3, true,  0, true,  [0.85, 1]],
  /* 10 */ [4, 5, 2, 6, 4, 2, 3, true,  2, false, [0.45, 0.7]],
  /* 11 */ [4, 4, 1, 6, 4, 2, 3, true,  2, false, [0.4, 0.65]],
  /* 12 */ [4, 4, 2, 6, 4, 3, 3, true,  2, false, [0.35, 0.6]],
  /* 13 */ [4, 5, 1, 4, 5, 0, 3, true,  4, true,  [0.85, 1]],
  /* 14 */ [4, 4, 1, 6, 3, 2, 4, true,  3, false, [0.3, 0.55]],
  /* 15 */ [4, 3, 1, 6, 4, 1, 3, true,  3, false, [0.3, 0.55]],
  /* 16 */ [4, 4, 2, 7, 3, 3, 3, true,  3, false, [0.25, 0.5]],
  /* 17 */ [4, 5, 1, 5, 4, 1, 3, true,  4, true,  [0.8, 1]],
  /* 18 */ [4, 3, 1, 7, 4, 2, 3, true,  3, false, [0.2, 0.45]],
  /* 19 */ [4, 4, 1, 7, 2, 3, 4, true,  3, false, [0.2, 0.45]],
  /* 20 */ [4, 3, 2, 7, 4, 3, 3, true,  4, false, [0.15, 0.4]],
];

export const PACK_LEVEL_COUNT = TABLE.length;
const ENDLESS_FROM = 14;

function fromRow(level: number, row: Row): PackLevelConfig {
  const [stacks, table, spots, types, bulk, mixed, boxSize, mystery, gold, reward, targetWinRate] = row;
  return {
    level,
    stacks,
    table,
    spots,
    types,
    boxes: { bulk, mixed },
    boxSize,
    mystery,
    gold: mystery ? gold : 0,
    reward,
    targetWinRate,
    boosters: { ...DEFAULT_BOOSTERS, peek: mystery ? DEFAULT_BOOSTERS.peek : 0 },
  };
}

export function getPackLevelConfig(level: number): PackLevelConfig {
  const n = Math.max(1, Math.floor(level));
  if (n <= TABLE.length) return fromRow(n, TABLE[n - 1]);
  const cycle = TABLE.length - ENDLESS_FROM + 1;
  return fromRow(n, TABLE[ENDLESS_FROM - 1 + ((n - TABLE.length - 1) % cycle)]);
}

export function packWinCoins(config: PackLevelConfig): number {
  return COINS_PER_PACK_DAY + (config.reward ? REWARD_PACK_DAY_BONUS : 0);
}

/** Einführungstexte (bis zum ersten Zug sichtbar). */
export const PACK_TIPS: Record<number, string> = {
  1: 'Tap a crate: if the item fits the parcel on the conveyor, it flies right in.',
  2: 'If it does not fit, it waits on the table – and jumps into a matching parcel later.',
  3: 'Smaller table: think about which crate to dig into first.',
  4: 'The distributor now ships wrapped items. What is underneath?',
  5: 'Quiet day – time for some extra coins.',
  6: 'New: two packing spots! Items go to the first parcel that needs them.',
  7: 'Ship several parcels with one tap for combo coins.',
  8: 'New: mixed parcels from collectors – exactly the items shown.',
  10: 'New: golden rarities give bonus coins once they are packed.',
};

export const PACK_PEEK_TIP = 'Peek: tap a wrapped item.';
