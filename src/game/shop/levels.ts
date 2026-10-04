// Progressionskurve des Versand-Modus ("Tage" im eigenen Onlineshop).
//
// Spalten:
//   st    Packstationen (gleichzeitig offene Aufträge)   cart  Ablageplätze
//   stk   Karton-Stapel                                  typ   Waren im Sortiment
//   bulk/ser/list  Anzahl Sammel-, Serien- und Wunschlisten-Aufträge
//   size  Positionen pro Auftrag                          mys   verpackte Waren
//   gold  Gold-Raritäten   hint  Serien-Symbol auf Verpackung   reward  Belohnungstag
//   win   Ziel-Gewinnquote der Simulation (höher = leichter)
//
// Kurve:
//   1-2  nur Sammelbestellungen, offen sichtbar
//   3    Serien-Sets (verschiedene Waren mit gleichem Aufkleber)
//   4    verpackte Waren (Mystery) mit Serien-Hinweis
//   6    Wunschlisten
//   10   Gold-Raritäten
//   5, 9, 13, 17  Belohnungstage; ab 21 rotieren Tag 14-20

import { DEFAULT_BOOSTERS } from '../levels';
import type { ShopLevelConfig } from './types';

/** Münzen pro verschicktem Paket. */
export const COINS_PER_ORDER = 3;
/** Münzen für einen geschafften Tag. */
export const COINS_PER_DAY = 10;
/** Extra in Belohnungstagen. */
export const REWARD_DAY_BONUS = 20;
/** Bonus pro Gold-Rarität im Paket. */
export const SHOP_GOLD_BONUS = 5;

type Row = [
  st: number,
  cart: number,
  stk: 3 | 4,
  typ: number,
  bulk: number,
  ser: number,
  list: number,
  size: 2 | 3 | 4,
  mys: boolean,
  gold: number,
  hint: boolean,
  reward: boolean,
  win: [number, number],
];

// prettier-ignore
const TABLE: Row[] = [
  //        st cart stk typ bulk ser list size mys    gold hint   reward  win
  /*  1 */ [2, 2, 3, 3, 3, 0, 0, 3, false, 0, false, false, [0.9, 1]],
  /*  2 */ [3, 2, 3, 4, 4, 0, 0, 3, false, 0, false, false, [0.85, 1]],
  /*  3 */ [3, 2, 4, 5, 2, 2, 0, 3, false, 0, false, false, [0.8, 1]],
  /*  4 */ [3, 2, 4, 5, 2, 2, 0, 3, true,  0, true,  false, [0.75, 1]],
  /*  5 */ [3, 2, 3, 4, 3, 1, 0, 3, true,  0, false, true,  [0.85, 1]],
  /*  6 */ [3, 2, 4, 6, 1, 2, 2, 3, true,  0, false, false, [0.6, 0.85]],
  /*  7 */ [3, 1, 4, 6, 2, 2, 1, 3, true,  0, false, false, [0.55, 0.8]],
  /*  8 */ [2, 2, 4, 6, 2, 2, 2, 3, true,  0, false, false, [0.5, 0.75]],
  /*  9 */ [3, 2, 4, 5, 3, 2, 0, 3, true,  0, false, true,  [0.85, 1]],
  /* 10 */ [3, 2, 4, 6, 2, 2, 2, 3, true,  2, false, false, [0.45, 0.7]],
  /* 11 */ [3, 1, 4, 7, 2, 2, 2, 3, true,  2, false, false, [0.4, 0.65]],
  /* 12 */ [3, 2, 4, 7, 1, 3, 3, 3, true,  2, false, false, [0.35, 0.6]],
  /* 13 */ [3, 2, 4, 5, 3, 2, 1, 3, true,  4, false, true,  [0.85, 1]],
  /* 14 */ [2, 2, 4, 6, 2, 2, 2, 3, true,  3, false, false, [0.3, 0.55]],
  /* 15 */ [3, 1, 4, 7, 2, 3, 2, 3, true,  3, false, false, [0.3, 0.55]],
  /* 16 */ [3, 2, 4, 7, 1, 2, 2, 4, true,  3, false, false, [0.25, 0.5]],
  /* 17 */ [3, 2, 4, 6, 2, 2, 2, 3, true,  4, false, true,  [0.8, 1]],
  /* 18 */ [2, 2, 4, 7, 2, 2, 3, 3, true,  3, false, false, [0.2, 0.45]],
  /* 19 */ [3, 1, 4, 8, 1, 3, 3, 3, true,  3, false, false, [0.2, 0.45]],
  /* 20 */ [3, 1, 4, 8, 1, 2, 2, 4, true,  4, false, false, [0.15, 0.4]],
];

export const SHOP_LEVEL_COUNT = TABLE.length;
const ENDLESS_FROM = 14;

function fromRow(level: number, row: Row): ShopLevelConfig {
  const [stations, cart, stacks, types, bulk, series, list, orderSize, mystery, gold, hintMode, reward, targetWinRate] = row;
  return {
    level,
    stations,
    cart,
    stacks,
    types,
    orders: { bulk, series, list },
    orderSize,
    mystery,
    gold: mystery ? gold : 0,
    hintMode,
    reward,
    targetWinRate,
    boosters: { ...DEFAULT_BOOSTERS, peek: mystery ? DEFAULT_BOOSTERS.peek : 0 },
  };
}

/** Config für einen Tag (1-basiert), über 20 hinaus endlos. */
export function getShopLevelConfig(level: number): ShopLevelConfig {
  const n = Math.max(1, Math.floor(level));
  if (n <= TABLE.length) return fromRow(n, TABLE[n - 1]);
  const cycle = TABLE.length - ENDLESS_FROM + 1;
  return fromRow(n, TABLE[ENDLESS_FROM - 1 + ((n - TABLE.length - 1) % cycle)]);
}

export function shopWinCoins(config: ShopLevelConfig): number {
  return COINS_PER_DAY + (config.reward ? REWARD_DAY_BONUS : 0);
}

/** Einführungstexte (bis zum ersten Zug sichtbar) – erzählen nebenbei die kleine Story. */
export const SHOP_TIPS: Record<number, string> = {
  1: 'Dein Onlineshop ist eröffnet! Tippe eine Ware im Großhandelskarton an, dann das passende Paket.',
  2: 'Ist ein Paket voll, wird es verschickt – und der nächste Auftrag rückt nach.',
  3: 'Neu: Serien-Sets! Jede Ware mit dem passenden Farb-Aufkleber zählt.',
  4: 'Der Großhändler liefert jetzt verpackt. Das Symbol verrät die Serie.',
  5: 'Ruhiger Tag – Zeit für ein paar extra Münzen.',
  6: 'Neu: Wunschlisten! Hier zählen genau die abgebildeten Waren.',
  7: 'Nur noch ein Ablageplatz. Plane, was du zwischenparkst.',
  8: 'Zwei Packtische heute – behalte die Warteschlange im Blick.',
  10: 'Neu: Goldene Raritäten bringen Bonus-Münzen, sobald sie verschickt werden.',
};

export const SHOP_PEEK_TIP = 'Lupe: Tippe auf eine verpackte Ware.';
