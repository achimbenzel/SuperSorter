// Level-Generator des Packband-Modus.
//
//   1. Seed aus der Tagesnummer (deterministisch).
//   2. Sortiment wählen, Pakete würfeln (Sammelpakete n × Ware, gemischte Pakete mit
//      verschiedenen konkreten Waren), Kunden zuordnen, Band-Reihenfolge mischen.
//   3. Waren = alle Paketinhalte, gemischt auf die Lagerkisten verteilt
//      (Mystery-Verpackung, Gold).
//   4. Solver prüft Lösbarkeit, Simulation schätzt die Schwierigkeit; der erste
//      Kandidat im Zielbereich gewinnt (Prinzip wie in ../generator.ts).

import { ITEM_TYPES, type ItemType } from '../items';
import { createRng, hashSeed, randInt, shuffled, type Rng } from '../random';
import { BUSINESS_CUSTOMERS, PRIVATE_CUSTOMERS } from './customers';
import { applyTap, isWon, listTaps, newSpot, routeOf, topItem } from './rules';
import { solvePack } from './solver';
import type { Item, PackBoard, PackBox, PackLevelConfig } from './types';

export const PACK_SEED_SALT = 0xba0d_2026;
export const PACK_MAX_ATTEMPTS = 60;
export const PACK_PLAYOUTS = 40;
const SOLVER_BUDGET = 40_000;
const MAX_STACK_HEIGHT = 7;

export interface GeneratedPackLevel {
  config: PackLevelConfig;
  seed: number;
  board: PackBoard;
  solution: number[];
  winRate: number;
  attempts: number;
  outOfBand: boolean;
}

export const packLevelSeed = (level: number) => hashSeed(PACK_SEED_SALT, level);
export const totalPackBoxes = (c: PackLevelConfig) => c.boxes.bulk + c.boxes.mixed;
export const totalPackItems = (c: PackLevelConfig) => totalPackBoxes(c) * c.boxSize;

export function generatePackLevel(config: PackLevelConfig): GeneratedPackLevel {
  const seed = packLevelSeed(config.level);
  const [lo, hi] = config.targetWinRate;
  let best: { board: PackBoard; solution: number[]; winRate: number; distance: number } | null = null;
  let attempts = 0;

  for (let attempt = 0; attempt < PACK_MAX_ATTEMPTS; attempt++) {
    attempts = attempt + 1;
    const board = buildPackCandidate(config, createRng(hashSeed(seed, attempt)));
    const res = solvePack(board, { maxNodes: SOLVER_BUDGET });
    if (res.solvable !== true) continue;
    const winRate = estimatePackWinRate(board, hashSeed(seed, attempt, 0xd1ff));
    const distance = winRate < lo ? lo - winRate : winRate > hi ? winRate - hi : 0;
    if (!best || distance < best.distance) best = { board, solution: res.moves, winRate, distance };
    if (distance === 0) break;
  }

  if (!best) {
    // Rückfallebene (praktisch nie nötig): Packtisch vergrößern, bis es lösbar ist.
    // Mit einem Platz pro Ware ist jedes Board lösbar.
    let board = buildPackCandidate(config, createRng(seed));
    for (;;) {
      const res = solvePack(board);
      if (res.solvable === true) {
        return { config, seed, board, solution: res.moves, winRate: estimatePackWinRate(board, seed), attempts, outOfBand: true };
      }
      board = { ...board, cart: [...board.cart, null] };
    }
  }
  return { config, seed, board: best.board, solution: best.solution, winRate: best.winRate, attempts, outOfBand: best.distance > 0 };
}

export function buildPackCandidate(config: PackLevelConfig, rng: Rng): PackBoard {
  const pool = shuffled(rng, ITEM_TYPES).slice(0, config.types);
  const boxes = makeBoxes(config, pool, rng);
  const items: Item[] = shuffled(
    rng,
    boxes.flatMap((b) => b.needs),
  ).map((type, id) => ({ id, type, hidden: false, gold: false }));

  const heights = stackHeights(items.length, config.stacks, rng);
  const stacks: Item[][] = [];
  let cursor = 0;
  for (const h of heights) {
    stacks.push(items.slice(cursor, cursor + h));
    cursor += h;
  }
  if (config.mystery) {
    for (const s of stacks) for (let j = 0; j < s.length - 1; j++) s[j] = { ...s[j], hidden: true };
    const hidden = stacks.flatMap((s, si) => s.map((it, j) => ({ si, j, it }))).filter((r) => r.it.hidden);
    for (const r of shuffled(rng, hidden).slice(0, config.gold)) stacks[r.si][r.j] = { ...r.it, gold: true };
  }

  const sequence = shuffled(rng, boxes);
  return {
    stacks,
    cart: Array.from({ length: config.table }, () => null),
    spots: Array.from({ length: config.spots }, (_, i) => newSpot(sequence[i])),
    queue: sequence.slice(config.spots),
    shipped: 0,
    totalBoxes: boxes.length,
  };
}

function makeBoxes(config: PackLevelConfig, pool: ItemType[], rng: Rng): PackBox[] {
  const business = shuffled(rng, BUSINESS_CUSTOMERS);
  const people = shuffled(rng, PRIVATE_CUSTOMERS);
  const bulkTypes = shuffled(rng, pool);
  const boxes: PackBox[] = [];
  for (let k = 0; k < config.boxes.bulk; k++) {
    const c = business[k % business.length];
    const type = bulkTypes[k % bulkTypes.length];
    boxes.push({ id: boxes.length, customer: c.name, avatar: c.avatar, needs: Array(config.boxSize).fill(type) });
  }
  for (let k = 0; k < config.boxes.mixed; k++) {
    const c = people[k % people.length];
    // Gemischtes Paket: verschiedene konkrete Waren (so weit das Sortiment reicht).
    const picks = shuffled(rng, pool);
    const needs = Array.from({ length: config.boxSize }, (_, i) => picks[i % picks.length]);
    boxes.push({ id: boxes.length, customer: c.name, avatar: c.avatar, needs });
  }
  return boxes;
}

function stackHeights(total: number, count: number, rng: Rng): number[] {
  const base = Math.floor(total / count);
  const heights = Array.from({ length: count }, (_, i) => base + (i < total % count ? 1 : 0));
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
 * Simulierter Gelegenheitsspieler (sieht nur oberste Waren und das Band):
 * - Passt eine sichtbare Ware in ein aktives Paket, tippt er eine davon.
 * - Sonst parkt er bevorzugt Ware, die eines der nächsten zwei Pakete braucht (60 %),
 *   ansonsten eine zufällige Kiste.
 */
export function estimatePackWinRate(board: PackBoard, seed: number, playouts = PACK_PLAYOUTS): number {
  const rng = createRng(seed);
  let wins = 0;
  for (let p = 0; p < playouts; p++) if (playout(board, rng)) wins++;
  return wins / playouts;
}

function playout(start: PackBoard, rng: Rng): boolean {
  let b = start;
  for (let guard = 0; guard < 200; guard++) {
    if (isWon(b)) return true;
    const taps = listTaps(b);
    if (taps.length === 0) return false;
    const direct = taps.filter((t) => routeOf(b, topItem(b, t)!.type)?.kind === 'spot');
    let pool = direct;
    if (pool.length === 0) {
      const soon = new Set(b.queue.slice(0, 2).flatMap((box) => box.needs));
      const useful = taps.filter((t) => soon.has(topItem(b, t)!.type));
      pool = useful.length > 0 && rng() < 0.6 ? useful : taps;
    }
    b = applyTap(b, pool[randInt(rng, pool.length)]).board;
  }
  return false;
}

/** Mischen-Booster: Waren in den Kisten neu verteilen (nur lösbare Mischungen). */
export function shufflePackBox(board: PackBoard, config: PackLevelConfig, shuffleCount: number): PackBoard | null {
  const heights = board.stacks.map((s) => s.length);
  const items = board.stacks.flat();
  if (items.length < 2) return null;
  const rng = createRng(hashSeed(packLevelSeed(config.level), 0x5a, shuffleCount, items.length));
  for (let attempt = 0; attempt < 40; attempt++) {
    const mixed = shuffled(rng, items);
    let cursor = 0;
    const stacks = heights.map((h) => {
      const s = mixed.slice(cursor, cursor + h).map((it, j) => ({ ...it, hidden: config.mystery ? j < h - 1 : false }));
      cursor += h;
      return s;
    });
    if (stacks.every((s, i) => s.every((it, j) => it.id === board.stacks[i][j].id))) continue;
    const candidate: PackBoard = { ...board, stacks };
    if (solvePack(candidate, { maxNodes: SOLVER_BUDGET }).solvable === true) return candidate;
  }
  return null;
}

/** Spielt eine Tap-Folge ab und prüft, ob sie gewinnt (Tests/Debug). */
export function replayPackWins(board: PackBoard, taps: number[]): boolean {
  let b = board;
  for (const t of taps) {
    try {
      b = applyTap(b, t).board;
    } catch {
      return false;
    }
  }
  return isWon(b);
}
