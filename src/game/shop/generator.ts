// Level-Generator für den Versand-Modus.
//
// Ablauf pro Tag (Level):
//   1. Seed aus der Level-Nummer (deterministisch, reproduzierbar).
//   2. Warensortiment wählen, dann Aufträge würfeln: Sammelbestellungen,
//      Serien-Sets, Wunschlisten – jeweils mit Kunde und Avatar.
//   3. Aus den Auftragspositionen die konkreten Waren ableiten (bei Serien-Positionen
//      eine zufällige Ware der Serie), mischen und auf die Karton-Stapel verteilen.
//   4. Solver prüft Lösbarkeit, Simulation schätzt die Schwierigkeit; der erste
//      Kandidat im Zielbereich gewinnt (wie im Regal-Modus, siehe ../generator.ts).

import { ITEM_TYPES, type ItemType } from '../items';
import { createRng, hashSeed, pick, randInt, shuffled, type Rng } from '../random';
import { applyMove, emptyStation, isWon } from './rules';
import { simulateShopWinRate, solveShop } from './solver';
import { BUSINESS_CUSTOMERS, PRIVATE_CUSTOMERS, SERIES, SERIES_IDS, SERIES_OF, type Customer, type SeriesId } from './theme';
import type { Item, Order, OrderKind, ShopBoard, ShopLevelConfig, ShopMove } from './types';

export const SHOP_SEED_SALT = 0x5409_2026;
export const SHOP_MAX_ATTEMPTS = 60;
export const SHOP_PLAYOUTS = 40;
const SOLVER_BUDGET = 60_000;
const MAX_STACK_HEIGHT = 7;

export interface GeneratedShopLevel {
  config: ShopLevelConfig;
  seed: number;
  board: ShopBoard;
  solution: ShopMove[];
  winRate: number;
  attempts: number;
  outOfBand: boolean;
}

export function shopLevelSeed(level: number): number {
  return hashSeed(SHOP_SEED_SALT, level);
}

export function totalShopOrders(config: ShopLevelConfig): number {
  return config.orders.bulk + config.orders.series + config.orders.list;
}

export function totalShopItems(config: ShopLevelConfig): number {
  return totalShopOrders(config) * config.orderSize;
}

export function generateShopLevel(config: ShopLevelConfig): GeneratedShopLevel {
  const seed = shopLevelSeed(config.level);
  const [lo, hi] = config.targetWinRate;
  let best: { board: ShopBoard; solution: ShopMove[]; winRate: number; distance: number } | null = null;
  let attempts = 0;

  for (let attempt = 0; attempt < SHOP_MAX_ATTEMPTS; attempt++) {
    attempts = attempt + 1;
    const board = buildShopCandidate(config, createRng(hashSeed(seed, attempt)));
    const res = solveShop(board, { maxNodes: SOLVER_BUDGET });
    if (res.solvable !== true) continue;
    const winRate = estimateShopWinRate(board, hashSeed(seed, attempt, 0xd1ff));
    const distance = winRate < lo ? lo - winRate : winRate > hi ? winRate - hi : 0;
    if (!best || distance < best.distance) best = { board, solution: res.moves, winRate, distance };
    if (distance === 0) break;
  }

  if (!best) {
    // Rückfallebene (praktisch nie nötig): Ablage so lange vergrößern, bis der Solver
    // eine Lösung findet. Mit einem Ablageplatz pro Ware ist jedes Board lösbar.
    let board = buildShopCandidate(config, createRng(seed));
    for (;;) {
      const res = solveShop(board);
      if (res.solvable === true) {
        return { config, seed, board, solution: res.moves, winRate: estimateShopWinRate(board, seed), attempts, outOfBand: true };
      }
      board = { ...board, cart: [...board.cart, null] };
    }
  }
  return { config, seed, board: best.board, solution: best.solution, winRate: best.winRate, attempts, outOfBand: best.distance > 0 };
}

/** Würfelt einen (noch ungeprüften) Kandidaten. */
export function buildShopCandidate(config: ShopLevelConfig, rng: Rng): ShopBoard {
  const pool = pickPool(config, rng);
  const orders = makeOrders(config, pool, rng);

  // Konkrete Waren aus den Positionen ableiten.
  const types: ItemType[] = [];
  orders.forEach((o) => {
    const concrete = concretize(o, pool, rng);
    types.push(...concrete);
  });
  const items: Item[] = shuffled(rng, types).map((type, id) => ({ id, type, hidden: false, gold: false }));

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

  const sequence = shuffled(rng, orders);
  return {
    stacks,
    cart: Array.from({ length: config.cart }, () => null),
    stations: Array.from({ length: config.stations }, (_, i) => emptyStation(sequence[i] ?? null)),
    queue: sequence.slice(config.stations),
    shipped: 0,
    totalOrders: orders.length,
  };
}

/** Sortiment: `types` Waren; bei Serien-Aufträgen muss eine Serie mind. 2 Waren haben. */
function pickPool(config: ShopLevelConfig, rng: Rng): ItemType[] {
  for (let tries = 0; tries < 30; tries++) {
    const pool = shuffled(rng, ITEM_TYPES).slice(0, config.types);
    if (config.orders.series === 0 || seriesInPool(pool).length > 0) return pool;
  }
  // Fallback: komplette Getränke-Serie + Rest zufällig
  const base = [...SERIES.drinks.members];
  const rest = shuffled(rng, ITEM_TYPES.filter((t) => !base.includes(t)));
  return [...base, ...rest].slice(0, Math.max(config.types, base.length));
}

/** Serien, von denen mindestens zwei verschiedene Waren im Sortiment sind. */
function seriesInPool(pool: ItemType[]): SeriesId[] {
  return SERIES_IDS.filter((id) => pool.filter((t) => SERIES_OF[t] === id).length >= 2);
}

function makeOrders(config: ShopLevelConfig, pool: ItemType[], rng: Rng): Order[] {
  const size = config.orderSize;
  const business = shuffled(rng, BUSINESS_CUSTOMERS);
  const people = shuffled(rng, PRIVATE_CUSTOMERS);
  let b = 0;
  let p = 0;
  const nextCustomer = (kind: OrderKind): Customer =>
    kind === 'bulk' ? business[b++ % business.length] : people[p++ % people.length];

  const kinds: OrderKind[] = [
    ...Array<OrderKind>(config.orders.bulk).fill('bulk'),
    ...Array<OrderKind>(config.orders.series).fill('series'),
    ...Array<OrderKind>(config.orders.list).fill('list'),
  ];
  const bulkTypes = shuffled(rng, pool);
  const seriesChoices = shuffled(rng, seriesInPool(pool));
  let bulkIdx = 0;
  let seriesIdx = 0;

  return kinds.map((kind, id) => {
    const c = nextCustomer(kind);
    if (kind === 'bulk') {
      const type = bulkTypes[bulkIdx++ % bulkTypes.length];
      return { id, kind, customer: c.name, avatar: c.avatar, needs: Array.from({ length: size }, () => ({ kind: 'type' as const, type })) };
    }
    if (kind === 'series') {
      const series = seriesChoices[seriesIdx++ % seriesChoices.length];
      return { id, kind, customer: c.name, avatar: c.avatar, needs: Array.from({ length: size }, () => ({ kind: 'series' as const, series })) };
    }
    // Wunschliste: möglichst verschiedene Waren
    const picks = shuffled(rng, pool);
    const list = Array.from({ length: size }, (_, k) => picks[k % picks.length]);
    return { id, kind, customer: c.name, avatar: c.avatar, needs: list.map((type) => ({ kind: 'type' as const, type })) };
  });
}

/** Konkrete Waren für einen Auftrag. Serien-Sets bekommen mindestens zwei verschiedene Waren. */
function concretize(order: Order, pool: ItemType[], rng: Rng): ItemType[] {
  const out = order.needs.map((req) => {
    if (req.kind === 'type') return req.type;
    return pick(rng, pool.filter((t) => SERIES_OF[t] === req.series));
  });
  if (order.kind === 'series' && out.length >= 2 && out.every((t) => t === out[0])) {
    const series = SERIES_OF[out[0]];
    const other = pool.find((t) => SERIES_OF[t] === series && t !== out[0]);
    if (other) out[out.length - 1] = other;
  }
  return out;
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
 * Simuliert einen aufmerksamen, aber unwissenden Spieler: Er packt, wann immer eine
 * Ware irgendwo passt (zufällig welche, aber nie so, dass ein Engpass entsteht),
 * und parkt sonst ein zufälliges Item auf der Ablage. Die Simulation läuft auf der
 * kompakten Solver-Darstellung (solver.ts), weil sie pro Kandidat hunderte Partien spielt.
 */
export function estimateShopWinRate(board: ShopBoard, seed: number, playouts = SHOP_PLAYOUTS): number {
  return simulateShopWinRate(board, createRng(seed), playouts);
}

/** Mischen-Booster: Waren im Karton neu verteilen, nur lösbare Mischungen. */
export function shuffleShopBox(board: ShopBoard, config: ShopLevelConfig, shuffleCount: number): ShopBoard | null {
  const heights = board.stacks.map((s) => s.length);
  const items = board.stacks.flat();
  if (items.length < 2) return null;
  const rng = createRng(hashSeed(shopLevelSeed(config.level), 0x5a, shuffleCount, items.length));
  for (let attempt = 0; attempt < 40; attempt++) {
    const mixed = shuffled(rng, items);
    let cursor = 0;
    const stacks = heights.map((h) => {
      const stack = mixed.slice(cursor, cursor + h).map((it, j) => ({ ...it, hidden: config.mystery ? j < h - 1 : false }));
      cursor += h;
      return stack;
    });
    if (stacks.every((s, i) => s.every((it, j) => it.id === board.stacks[i][j].id))) continue;
    const candidate: ShopBoard = { ...board, stacks };
    if (solveShop(candidate, { maxNodes: SOLVER_BUDGET }).solvable === true) return candidate;
  }
  return null;
}

/** Spielt eine Zugfolge ab und prüft, ob sie gewinnt (Tests/Debug). */
export function replayShopWins(board: ShopBoard, moves: ShopMove[]): boolean {
  let b = board;
  for (const m of moves) {
    try {
      b = applyMove(b, m).board;
    } catch {
      return false;
    }
  }
  return isWon(b);
}
