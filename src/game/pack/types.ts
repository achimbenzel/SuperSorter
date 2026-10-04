// Zustandsmodell des Packband-Modus ("Versand").
//
// Kundenpakete laufen auf einem Band an 1-2 Packplätzen vorbei. Jedes Paket verlangt
// konkrete Waren (z. B. 3 × Cola). Ein Tap auf eine Lagerkiste nimmt deren oberste
// Ware: Passt sie in ein aktives Paket, fliegt sie hinein, sonst landet sie auf dem
// Packtisch. Volle Pakete werden verschickt, das nächste rückt nach, und passende
// Waren springen automatisch vom Packtisch hinein (Kettenreaktion).

import type { ItemType } from '../items';
import type { BoosterCounts, GameStatus, Item } from '../types';

export type { Item } from '../types';

export interface PackBox {
  id: number;
  customer: string;
  avatar: string;
  /** Konkrete Waren, die ins Paket gehören (Sammelpaket = n × dieselbe Ware). */
  needs: ItemType[];
}

/** Ein Packplatz am Bandende. `filled` ist parallel zu `box.needs`. */
export interface PackSpot {
  box: PackBox;
  filled: (Item | null)[];
}

export interface PackBoard {
  /** Lagerkisten: index 0 = unten, letztes = oben (antippbar). */
  stacks: Item[][];
  /** Packtisch (Puffer). Heißt "cart", damit die Quellen-Regeln (sources.ts) geteilt werden. */
  cart: (Item | null)[];
  /** Feste Packplätze; null = kein Paket mehr für diesen Platz. */
  spots: (PackSpot | null)[];
  /** Wartende Pakete in Band-Reihenfolge (alle sichtbar). */
  queue: PackBox[];
  shipped: number;
  totalBoxes: number;
}

export interface PackLevelConfig {
  level: number;
  /** Lagerkisten (Quellen). */
  stacks: 3 | 4;
  /** Plätze auf dem Packtisch. */
  table: number;
  /** Gleichzeitig aktive Pakete (Packplätze). */
  spots: 1 | 2;
  /** Verschiedene Waren im Level. */
  types: number;
  /** Sammelpakete (n × gleiche Ware) und gemischte Pakete (verschiedene konkrete Waren). */
  boxes: { bulk: number; mixed: number };
  boxSize: 2 | 3 | 4;
  mystery: boolean;
  gold: number;
  reward: boolean;
  boosters: BoosterCounts;
  targetWinRate: [number, number];
}

export type PackFx =
  /** Tap ging nicht (Packtisch voll und Ware passt nirgends). */
  | { seq: number; kind: 'invalid'; stack: number }
  | { seq: number; kind: 'revealed'; itemId: number }
  /** Paket verschickt; `chain` = wie viele Pakete im selben Zug vorher verschickt wurden. */
  | { seq: number; kind: 'shipped'; spot: number; box: PackBox; items: Item[]; chain: number }
  /** Waren sprangen automatisch vom Packtisch ins Paket (nach `chain` Versänden). */
  | { seq: number; kind: 'fed'; itemIds: number[]; chain: number }
  | { seq: number; kind: 'coins'; coinTarget: string; amount: number }
  | { seq: number; kind: 'combo'; spot: number; count: number; bonus: number }
  | { seq: number; kind: 'shuffled' }
  | { seq: number; kind: 'denied'; booster: keyof BoosterCounts };

export interface PackHistoryEntry {
  board: PackBoard;
  levelCoins: number;
}

export interface PackGameState {
  config: PackLevelConfig;
  initialBoard: PackBoard;
  board: PackBoard;
  history: PackHistoryEntry[];
  boosters: BoosterCounts;
  boostersUsed: number;
  levelCoins: number;
  moves: number;
  status: GameStatus;
  peekArmed: boolean;
  peekItemId: number | null;
  shuffleCount: number;
  fx: PackFx[];
  fxSeq: number;
}
