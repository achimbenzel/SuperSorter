// Zustandsmodell des Versand-Modus ("Onlineshop").
//
// Statt Regalfächer gibt es Packstationen. Jede Station hat einen Auftrag mit
// 2-4 Positionen. Ist das Paket komplett, wird es verschickt: Die Station wird frei
// und bekommt den nächsten Auftrag aus der Warteschlange. Das Level ist geschafft,
// wenn alle Aufträge verschickt sind.

import type { ItemType } from '../items';
import type { BoosterCounts, GameStatus, Item, SourceRef } from '../types';
import type { SeriesId } from './theme';

export type { Item, SourceRef } from '../types';

/** Eine Auftragsposition: genau diese Ware ODER irgendeine Ware dieser Serie. */
export type Requirement = { kind: 'type'; type: ItemType } | { kind: 'series'; series: SeriesId };

/**
 * Auftragsarten:
 * - bulk:   Sammelbestellung eines Geschäftskunden, n × dieselbe Ware
 * - series: Serien-Set, n Waren derselben Serie (verschiedene Waren erlaubt)
 * - list:   Wunschliste, genau diese Waren
 * Innerhalb eines Auftrags sind die Positionen immer gleichartig (nur type ODER nur series).
 */
export type OrderKind = 'bulk' | 'series' | 'list';

export interface Order {
  id: number;
  kind: OrderKind;
  customer: string;
  avatar: string;
  needs: Requirement[];
}

export interface Station {
  order: Order | null;
  /** Parallel zu order.needs: welches Item die jeweilige Position erfüllt. */
  filled: (Item | null)[];
}

export interface ShopBoard {
  stacks: Item[][];
  /** Ablage auf dem Packtisch (Puffer). Heißt "cart", damit Quellen-Regeln geteilt werden. */
  cart: (Item | null)[];
  stations: Station[];
  /** Aufträge, die noch auf eine freie Station warten (vorne = als Nächstes). */
  queue: Order[];
  shipped: number;
  totalOrders: number;
}

export type ShopTarget = { kind: 'station'; index: number } | { kind: 'cart'; index: number };

export interface ShopMove {
  from: SourceRef;
  to: ShopTarget;
}

export interface ShopLevelConfig {
  level: number;
  /** Anzahl Packstationen (gleichzeitig offene Aufträge). */
  stations: number;
  /** Plätze auf der Ablage. */
  cart: number;
  stacks: 3 | 4;
  /** Wie viele verschiedene Waren im Level vorkommen. */
  types: number;
  orders: { bulk: number; series: number; list: number };
  /** Positionen pro Auftrag. */
  orderSize: 2 | 3 | 4;
  mystery: boolean;
  gold: number;
  /** Verpackte Waren zeigen ihr Serien-Symbol. */
  hintMode: boolean;
  reward: boolean;
  boosters: BoosterCounts;
  targetWinRate: [number, number];
}

export type ShopLoseReason = 'deadlock' | 'shortage';

export type ShopFx =
  | { seq: number; kind: 'invalid'; target: ShopTarget }
  | { seq: number; kind: 'revealed'; itemId: number }
  | { seq: number; kind: 'shipped'; station: number; order: Order; items: Item[] }
  | { seq: number; kind: 'coins'; coinTarget: string; amount: number }
  | { seq: number; kind: 'shuffled' }
  | { seq: number; kind: 'denied'; booster: keyof BoosterCounts };

export interface ShopHistoryEntry {
  board: ShopBoard;
  levelCoins: number;
}

export interface ShopGameState {
  config: ShopLevelConfig;
  initialBoard: ShopBoard;
  board: ShopBoard;
  history: ShopHistoryEntry[];
  selection: SourceRef | null;
  boosters: BoosterCounts;
  boostersUsed: number;
  levelCoins: number;
  moves: number;
  status: GameStatus;
  loseReason: ShopLoseReason | null;
  peekArmed: boolean;
  peekItemId: number | null;
  shuffleCount: number;
  fx: ShopFx[];
  fxSeq: number;
}
