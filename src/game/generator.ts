// Level-Generator: Aus einer LevelConfig wird ein konkretes, garantiert lösbares Board.
//
// Ablauf pro Level:
//   1. Seed aus der Level-Nummer ableiten (deterministisch -> Level reproduzierbar).
//   2. Kandidat würfeln: Warentypen wählen, Items mischen, auf Stapel verteilen,
//      Mystery-/Gold-Verpackungen vergeben.
//   3. Solver fragen. Unlösbare Kandidaten werden verworfen.
//   4. Schwierigkeit schätzen (Gewinnquote simulierter Spieler) und den Kandidaten
//      wählen, der im Zielbereich der Config liegt (bzw. am nächsten dran ist).
//
// Warum Schwierigkeit simulieren? "Lösbar" heißt nur: Mit perfektem Wissen gibt es
// einen Weg. Ein Mensch sieht die verdeckten Items aber nicht. Die Simulation spielt
// das Level viele Male mit einer plausiblen, aber unwissenden Strategie und misst,
// wie oft das gutgeht. So lässt sich die Progressionskurve über `targetWinRate` steuern.

import { ITEM_TYPES } from './items';
import { createRng, hashSeed, randInt, shuffled, type Rng } from './random';
import { applyMove, isWon, listSources, pickableItems } from './rules';
import { solve } from './solver';
import type { Board, Item, LevelConfig, Move, Slot } from './types';

/** Ändern, um alle Level neu zu würfeln (z. B. nach Regeländerungen). */
export const SEED_SALT = 0x5eed_2026;
/** Maximale Kandidaten pro Level. Danach wird der beste lösbare Kandidat genommen. */
export const MAX_ATTEMPTS = 60;
/** Simulierte Spiele pro Kandidat für die Schwierigkeitsschätzung. */
export const PLAYOUTS = 48;
/** Höchster Stapel im Karton (Layout ist dafür ausgelegt). */
export const MAX_STACK_HEIGHT = 7;

export interface GeneratedLevel {
  config: LevelConfig;
  seed: number;
  board: Board;
  /** Lösung des Solvers (Beweis der Lösbarkeit, Debug-Hinweis). */
  solution: Move[];
  /** Geschätzte Gewinnquote eines unwissenden Spielers (0..1). */
  winRate: number;
  attempts: number;
  /** true, wenn kein Kandidat im Zielbereich lag und der nächstbeste genommen wurde. */
  outOfBand: boolean;
}

export function levelSeed(level: number): number {
  return hashSeed(SEED_SALT, level);
}

export function generateLevel(config: LevelConfig): GeneratedLevel {
  const seed = levelSeed(config.level);
  let best: { board: Board; solution: Move[]; winRate: number; distance: number } | null = null;
  let attempts = 0;
  const [lo, hi] = config.targetWinRate;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    attempts = attempt + 1;
    const rng = createRng(hashSeed(seed, attempt));
    const board = buildCandidate(config, rng);
    const result = solve(board);
    if (result.solvable !== true) continue;

    const winRate = estimateWinRate(board, hashSeed(seed, attempt, 0xd1ff));
    const distance = winRate < lo ? lo - winRate : winRate > hi ? winRate - hi : 0;
    if (!best || distance < best.distance) best = { board, solution: result.moves, winRate, distance };
    if (distance === 0) break;
  }

  if (!best) {
    // Rückfallebene, praktisch nie nötig: Sind alle Fächer offen, ist jedes Board
    // lösbar (jeder Typ hat sein eigenes Fach). Damit ist Lösbarkeit garantiert.
    const relaxed: LevelConfig = { ...config, openSlots: config.types + config.doubleTypes };
    const board = buildCandidate(relaxed, createRng(seed));
    const result = solve(board);
    return {
      config,
      seed,
      board,
      solution: result.moves,
      winRate: estimateWinRate(board, seed),
      attempts,
      outOfBand: true,
    };
  }
  return {
    config,
    seed,
    board: best.board,
    solution: best.solution,
    winRate: best.winRate,
    attempts,
    outOfBand: best.distance > 0,
  };
}

/** Anzahl Fächer = ein Fach pro Typ, doppelte Typen brauchen zwei. */
export function totalSlots(config: LevelConfig): number {
  return config.types + config.doubleTypes;
}

export function totalItems(config: LevelConfig): number {
  return totalSlots(config) * config.capacity;
}

/** Baut einen zufälligen (noch ungeprüften) Kandidaten. */
export function buildCandidate(config: LevelConfig, rng: Rng): Board {
  const types = shuffled(rng, ITEM_TYPES).slice(0, config.types);
  const pool: Item['type'][] = [];
  types.forEach((t, i) => {
    const copies = (i < config.doubleTypes ? 2 : 1) * config.capacity;
    for (let k = 0; k < copies; k++) pool.push(t);
  });
  const items: Item[] = shuffled(rng, pool).map((type, id) => ({ id, type, hidden: false, gold: false }));

  // Auf Stapel verteilen: möglichst gleich hoch, mit etwas Varianz für Abwechslung.
  const heights = stackHeights(items.length, config.stacks, rng);
  const stacks: Item[][] = [];
  let cursor = 0;
  for (const h of heights) {
    stacks.push(items.slice(cursor, cursor + h));
    cursor += h;
  }

  if (config.mystery) {
    // Alles außer dem obersten Item jedes Stapels wird verpackt.
    for (const s of stacks) for (let j = 0; j < s.length - 1; j++) s[j] = { ...s[j], hidden: true };
    // Gold-Verpackungen nur auf verdeckten Items (sonst wäre es keine Überraschung).
    const hiddenRefs = stacks.flatMap((s, si) => s.map((it, j) => ({ si, j, it }))).filter((r) => r.it.hidden);
    for (const r of shuffled(rng, hiddenRefs).slice(0, config.gold)) {
      stacks[r.si][r.j] = { ...r.it, gold: true };
    }
  }

  const slots: Slot[] = Array.from({ length: totalSlots(config) }, (_, i) => ({
    capacity: config.capacity,
    items: [],
    closed: i >= config.openSlots,
  }));
  return { stacks, cart: Array.from({ length: config.cart }, () => null), slots };
}

function stackHeights(total: number, count: number, rng: Rng): number[] {
  const base = Math.floor(total / count);
  const heights = Array.from({ length: count }, (_, i) => base + (i < total % count ? 1 : 0));
  // Leichte Varianz: zweimal ein Item von einem Stapel auf einen anderen verschieben.
  for (let k = 0; k < 2; k++) {
    const a = randInt(rng, count);
    const b = randInt(rng, count);
    if (a !== b && heights[a] > 2 && heights[b] < MAX_STACK_HEIGHT) {
      heights[a]--;
      heights[b]++;
    }
  }
  return shuffled(rng, heights);
}

// ---------------------------------------------------------------------------
// Schwierigkeitsschätzung

/**
 * Spielt das Level `PLAYOUTS`-mal mit einer plausiblen, aber unwissenden Strategie
 * und liefert die Gewinnquote. Die Strategie sieht nur offene Items:
 *  - Passt ein Item in ein angefangenes Fach seines Typs, wird das sofort gemacht.
 *  - Sonst zufällig: neues Fach anfangen (bevorzugt) oder in den Wagen parken.
 *  - Ein Typ wird nie absichtlich auf ein zweites Fach verteilt, wenn das hoffnungslos ist.
 */
export function estimateWinRate(board: Board, seed: number, playouts = PLAYOUTS): number {
  const rng = createRng(seed);
  let wins = 0;
  for (let p = 0; p < playouts; p++) {
    if (playout(board, rng)) wins++;
  }
  return wins / playouts;
}

function playout(start: Board, rng: Rng): boolean {
  let board = start;
  // Jeder Zug bewegt ein Item endgültig weiter -> nach spätestens 2 × Items Zügen ist Schluss.
  for (let guard = 0; guard < 200; guard++) {
    if (isWon(board)) return true;
    const emptySlot = board.slots.findIndex((s) => !s.closed && s.items.length === 0);
    const freeCart = board.cart.indexOf(null);
    const obvious: Move[] = [];
    const fresh: Move[] = [];
    const park: Move[] = [];

    for (const from of listSources(board)) {
      const type = pickableItems(board, from)[0].type;
      const partial = board.slots.findIndex(
        (s) => s.items.length > 0 && s.items.length < s.capacity && s.items[0].type === type,
      );
      if (partial >= 0) {
        obvious.push({ from, to: { kind: 'slot', index: partial } });
        continue;
      }
      // Kein angefangenes Fach für diesen Typ: Ein neues Fach anzufangen ist nie
      // hoffnungslos (der Typ braucht ja noch mindestens eins). Ein Typ *mit*
      // angefangenem Fach landet immer dort (obvious) – so verteilt der simulierte
      // Spieler nie absichtlich einen Typ auf zwei Fächer.
      if (emptySlot >= 0) fresh.push({ from, to: { kind: 'slot', index: emptySlot } });
      if (from.kind === 'stack' && freeCart >= 0) park.push({ from, to: { kind: 'cart', index: freeCart } });
    }

    let pool: Move[];
    if (obvious.length > 0) pool = obvious;
    // Gelegenheitsspieler legen lieber direkt ins Regal als in den Wagen (70/30).
    else if (fresh.length > 0 && (park.length === 0 || rng() < 0.7)) pool = fresh;
    else pool = park;
    if (pool.length === 0) return false;
    board = applyMove(board, pool[randInt(rng, pool.length)]).board;
  }
  return false;
}

/** Hilfsfunktion für Tests/Debug: Spielt eine Zugfolge ab und prüft, ob sie gewinnt. */
export function replayWins(board: Board, moves: Move[]): boolean {
  let b = board;
  for (const m of moves) {
    if (pickableItems(b, m.from).length === 0) return false;
    try {
      b = applyMove(b, m).board;
    } catch {
      return false;
    }
  }
  return isWon(b);
}

/** Versuche, eine lösbare Mischung zu finden, bevor der Mischen-Booster aufgibt. */
export const SHUFFLE_ATTEMPTS = 40;

/**
 * Mischen-Booster: verteilt die Items im Karton neu (Stapelhöhen bleiben gleich).
 * Bei Mystery-Leveln wird danach wieder alles außer den obersten Items verpackt.
 * Es werden nur Mischungen akzeptiert, die der Solver als lösbar bestätigt –
 * ein Booster darf ein lösbares Level nie unlösbar machen. Gibt `null` zurück,
 * wenn keine lösbare Mischung existiert (dann wird der Booster nicht verbraucht).
 */
export function shuffleBox(board: Board, config: LevelConfig, shuffleCount: number): Board | null {
  const heights = board.stacks.map((s) => s.length);
  const items = board.stacks.flat();
  if (items.length < 2) return null;
  const rng = createRng(hashSeed(levelSeed(config.level), 0x5a, shuffleCount, items.length));

  for (let attempt = 0; attempt < SHUFFLE_ATTEMPTS; attempt++) {
    const mixed = shuffled(rng, items);
    let cursor = 0;
    const stacks = heights.map((h) => {
      const stack = mixed.slice(cursor, cursor + h).map((it, j) => ({
        ...it,
        hidden: config.mystery ? j < h - 1 : false,
      }));
      cursor += h;
      return stack;
    });
    // Identische Anordnung wäre ein "Mischen ohne Wirkung" -> verwerfen.
    if (stacks.every((s, i) => s.every((it, j) => it.id === board.stacks[i][j].id))) continue;
    const candidate: Board = { ...board, stacks };
    if (solve(candidate, { maxNodes: 50_000 }).solvable === true) return candidate;
  }
  return null;
}
