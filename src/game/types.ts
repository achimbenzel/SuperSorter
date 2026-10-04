// Zustandsmodell der Spiellogik. Alles hier ist reine Daten (serialisierbar, ohne
// Klassen), damit Reducer, Solver und Tests mit einfachen Objekten arbeiten können.

import type { ItemType } from './items';

export type { ItemType } from './items';

/** Eine einzelne Ware. `id` ist stabil über das ganze Level (wichtig für Animationen). */
export interface Item {
  id: number;
  type: ItemType;
  /** In Packpapier gewickelt (Mystery). Nur das oberste Item eines Stapels ist offen. */
  hidden: boolean;
  /** Gold-Verpackung: bringt Bonus-Münzen, sobald das Item in ein Fach gelegt wird. */
  gold: boolean;
}

/** Regalfach. Items liegen in Einfüge-Reihenfolge: index 0 = zuerst eingeräumt, letztes = "oberstes". */
export interface Slot {
  capacity: number;
  items: Item[];
  /** Geschlossene Fächer nehmen nichts an. Jedes gelöste Fach öffnet das nächste geschlossene. */
  closed: boolean;
}

/**
 * Das Spielfeld. Wird bei jedem Zug unveränderlich ersetzt (immutable),
 * dadurch ist die Undo-History einfach eine Liste alter Boards.
 */
export interface Board {
  /** Karton-Stapel: index 0 = unten, letztes Element = oben (sichtbar). */
  stacks: Item[][];
  /** Einkaufswagen (Puffer): je Platz höchstens ein Item. */
  cart: (Item | null)[];
  slots: Slot[];
}

export type SourceRef = { kind: 'stack'; index: number } | { kind: 'cart'; index: number };
export type TargetRef = { kind: 'slot'; index: number } | { kind: 'cart'; index: number };

export interface Move {
  from: SourceRef;
  to: TargetRef;
}

export interface BoosterCounts {
  undo: number;
  extra: number;
  peek: number;
  shuffle: number;
}

/**
 * Konfiguration eines Levels (eine Zeile der Progressionstabelle in levels.ts).
 * Der Generator macht daraus ein konkretes, garantiert lösbares Board.
 */
export interface LevelConfig {
  level: number;
  /** Anzahl verschiedener Warentypen. */
  types: number;
  /** Fachkapazität (für alle Fächer des Levels gleich). */
  capacity: 3 | 4;
  /** Wie viele der Typen doppelt vorkommen (2 × capacity Items, belegen 2 Fächer). */
  doubleTypes: number;
  /** Anzahl Stapel im Lieferkarton. */
  stacks: 3 | 4;
  /** Puffer-Plätze im Einkaufswagen. */
  cart: number;
  /** Zu Beginn geöffnete Fächer (Rest ist geschlossen und öffnet sich nach und nach). */
  openSlots: number;
  /** Verdeckte Items (Packpapier) unter dem obersten Item jedes Stapels. */
  mystery: boolean;
  /** Anzahl goldener Verpackungen (nur wirksam mit mystery). */
  gold: number;
  /** Verpackte Items zeigen ihre Kategorie (z. B. 🥤 Getränke). */
  hintMode: boolean;
  /** Leichteres Belohnungslevel mit mehr Münzen. */
  reward: boolean;
  /** Booster-Kontingent für dieses Level. */
  boosters: BoosterCounts;
  /**
   * Zielbereich der geschätzten Gewinnquote eines zufällig (aber nicht dumm) spielenden
   * Spielers, siehe generator.ts. Höher = leichter. Steuert die Schwierigkeitskurve.
   */
  targetWinRate: [number, number];
}

export type GameStatus = 'playing' | 'won' | 'lost';
export type LoseReason = 'deadlock' | 'hopeless';

/** Kurzlebige Ereignisse für die UI (Shake, Münzflug, ...). Die UI erkennt neue Events an `seq`. */
export type FxEvent =
  | { seq: number; kind: 'invalid'; target: TargetRef | SourceRef }
  | { seq: number; kind: 'gold'; slot: number; amount: number }
  | { seq: number; kind: 'solved'; slot: number }
  | { seq: number; kind: 'opened'; slot: number }
  | { seq: number; kind: 'shuffled' }
  | { seq: number; kind: 'denied'; booster: keyof BoosterCounts };

export interface HistoryEntry {
  board: Board;
  levelCoins: number;
}

export interface GameState {
  config: LevelConfig;
  /** Startaufstellung (für "Nochmal"). */
  initialBoard: Board;
  board: Board;
  history: HistoryEntry[];
  selection: SourceRef | null;
  /** Restliche Booster in diesem Versuch. */
  boosters: BoosterCounts;
  boostersUsed: number;
  /** In diesem Versuch verdiente Gold-Münzen (werden erst beim Sieg gutgeschrieben). */
  levelCoins: number;
  moves: number;
  status: GameStatus;
  loseReason: LoseReason | null;
  /** Lupe ist aktiv und wartet auf Tap auf ein verpacktes Item. */
  peekArmed: boolean;
  /** Gerade per Lupe angezeigtes Item. */
  peekItemId: number | null;
  /** Zähler für Mischen (macht Mischen deterministisch und trotzdem jedes Mal anders). */
  shuffleCount: number;
  fx: FxEvent[];
  fxSeq: number;
}
