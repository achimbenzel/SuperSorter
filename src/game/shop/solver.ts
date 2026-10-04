// Solver für den Versand-Modus: Gibt es (mit vollem Wissen über verdeckte Waren)
// eine Zugfolge, die alle Aufträge verschickt?
//
// Verfahren wie im Regal-Modus: Tiefensuche mit Gedächtnis für gescheiterte
// Zustände, Tiefen- und Knotenlimit. Jeder Zug bewegt eine Ware endgültig weiter
// (Karton -> Ablage -> Paket), daher gibt es keine Zyklen.
//
// Kompakte Darstellung:
//   Waren als Typ-Index 0..7, Positionen als Schlüssel:
//   Typ-Position = Typ-Index, Serien-Position = 100 + Serien-Index.
//   Eine Station ist nur noch die sortierte Liste ihrer offenen Schlüssel – welche
//   Kundin dahintersteht, ist für den weiteren Verlauf egal.
//
// Pruning: Zustände, in denen die restlichen Waren die restlichen Positionen nicht
// mehr decken können (siehe rules.findShortage), werden nicht betreten.

import { ITEM_TYPES, type ItemType } from '../items';
import { SERIES_IDS, SERIES_OF } from './theme';
import type { Requirement, ShopBoard, ShopMove } from './types';

export interface ShopSolveOptions {
  maxNodes?: number;
  maxDepth?: number;
}

export interface ShopSolveResult {
  /** true = Lösung gefunden, false = beweisbar unlösbar, null = Budget erschöpft */
  solvable: boolean | null;
  moves: ShopMove[];
  nodes: number;
}

const SERIES_KEY = 100;
const TYPE_INDEX = new Map<ItemType, number>(ITEM_TYPES.map((t, i) => [t, i]));
const SERIES_OF_TYPE: number[] = ITEM_TYPES.map((t) => SERIES_IDS.indexOf(SERIES_OF[t]));

interface Static {
  stackTypes: number[][];
  stackHidden: boolean[][];
  /** Offene Schlüssel der Aufträge in der Warteschlange (Reihenfolge = Ankunft). */
  queueKeys: number[][];
}

interface SState {
  heights: number[];
  cart: number[];
  /** Offene Schlüssel je Station (sortiert); null = Station ohne Auftrag. */
  stations: (number[] | null)[];
  next: number;
}

const reqKey = (r: Requirement) =>
  r.kind === 'type' ? TYPE_INDEX.get(r.type)! : SERIES_KEY + SERIES_IDS.indexOf(r.series);
const matches = (key: number, t: number) => key === t || key === SERIES_KEY + SERIES_OF_TYPE[t];

export function solveShop(board: ShopBoard, options: ShopSolveOptions = {}): ShopSolveResult {
  const st: Static = {
    stackTypes: board.stacks.map((s) => s.map((it) => TYPE_INDEX.get(it.type)!)),
    stackHidden: board.stacks.map((s) => s.map((it) => it.hidden)),
    queueKeys: board.queue.map((o) => o.needs.map(reqKey).sort((a, b) => a - b)),
  };
  const start: SState = {
    heights: board.stacks.map((s) => s.length),
    cart: board.cart.map((c) => (c ? TYPE_INDEX.get(c.type)! : -1)),
    stations: board.stations.map((s) =>
      s.order ? s.order.needs.filter((_, i) => !s.filled[i]).map(reqKey).sort((a, b) => a - b) : null,
    ),
    next: 0,
  };
  const items = start.heights.reduce((a, b) => a + b, 0) + start.cart.filter((c) => c >= 0).length;
  const maxDepth = options.maxDepth ?? items * 2 + 4;
  const maxNodes = options.maxNodes ?? 200_000;

  const failed = new Set<string>();
  const path: ShopMove[] = [];
  let nodes = 0;
  let budgetHit = false;

  if (hasShortage(st, start)) return { solvable: false, moves: [], nodes: 0 };

  const dfs = (s: SState, depth: number): boolean => {
    if (isDone(st, s)) return true;
    if (depth >= maxDepth || ++nodes > maxNodes) {
      budgetHit = true;
      return false;
    }
    const key = keyOf(s);
    if (failed.has(key)) return false;
    for (const mv of candidateMoves(st, s)) {
      const next = apply(st, s, mv);
      if (hasShortage(st, next)) continue;
      path.push(mv);
      if (dfs(next, depth + 1)) return true;
      path.pop();
      if (budgetHit) return false;
    }
    failed.add(key);
    return false;
  };

  const ok = dfs(start, 0);
  if (ok) return { solvable: true, moves: path.slice(), nodes };
  return { solvable: budgetHit ? null : false, moves: [], nodes };
}

/** Nächster Zug einer Lösung (Debug-Hinweis). */
export function nextShopHint(board: ShopBoard, options?: ShopSolveOptions): ShopMove | null {
  const res = solveShop(board, options);
  return res.solvable ? (res.moves[0] ?? null) : null;
}

// ---------------------------------------------------------------------------

function keyOf(s: SState): string {
  const cart = s.cart.filter((c) => c >= 0).sort((a, b) => a - b);
  const stations = s.stations.map((r) => (r ? r.join('.') : '-')).sort();
  return `${s.heights.join(',')}|${cart.join(',')}|${stations.join('/')}|${s.next}`;
}

function isDone(st: Static, s: SState): boolean {
  return s.next >= st.queueKeys.length && s.stations.every((r) => r === null);
}

function topType(st: Static, s: SState, i: number): number {
  return st.stackTypes[i][s.heights[i] - 1];
}

function runLength(st: Static, s: SState, i: number): number {
  const h = s.heights[i];
  const top = st.stackTypes[i][h - 1];
  let run = 1;
  for (let j = h - 2; j >= 0; j--) {
    if (st.stackHidden[i][j] || st.stackTypes[i][j] !== top) break;
    run++;
  }
  return run;
}

function hasShortage(st: Static, s: SState): boolean {
  const have = new Array<number>(ITEM_TYPES.length).fill(0);
  for (let i = 0; i < s.heights.length; i++) for (let j = 0; j < s.heights[i]; j++) have[st.stackTypes[i][j]]++;
  for (const c of s.cart) if (c >= 0) have[c]++;
  const needType = new Array<number>(ITEM_TYPES.length).fill(0);
  const needSeries = new Array<number>(SERIES_IDS.length).fill(0);
  const count = (keys: number[]) => {
    for (const k of keys) {
      if (k >= SERIES_KEY) needSeries[k - SERIES_KEY]++;
      else needType[k]++;
    }
  };
  for (const r of s.stations) if (r) count(r);
  for (let q = s.next; q < st.queueKeys.length; q++) count(st.queueKeys[q]);

  const spare = new Array<number>(SERIES_IDS.length).fill(0);
  for (let t = 0; t < have.length; t++) {
    if (have[t] < needType[t]) return true;
    spare[SERIES_OF_TYPE[t]] += have[t] - needType[t];
  }
  for (let ser = 0; ser < needSeries.length; ser++) if (spare[ser] < needSeries[ser]) return true;
  return false;
}

function stationAccepts(r: number[] | null, t: number): number {
  if (!r) return 0;
  let n = 0;
  for (const k of r) if (matches(k, t)) n++;
  return n;
}

function candidateMoves(st: Static, s: SState): ShopMove[] {
  const moves: ShopMove[] = [];
  const seenStation = new Set<string>();
  const stationOrder: number[] = [];
  s.stations.forEach((r, i) => {
    // Stationen mit identischen offenen Positionen sind austauschbar.
    const sig = r ? r.join('.') : '-';
    if (!seenStation.has(sig)) {
      seenStation.add(sig);
      stationOrder.push(i);
    }
  });

  // 1) Aus der Ablage ins Paket (macht Platz), gleiche Waren auf der Ablage nur einmal.
  const cartTypes = new Set<number>();
  s.cart.forEach((t, c) => {
    if (t < 0 || cartTypes.has(t)) return;
    cartTypes.add(t);
    for (const i of stationOrder) {
      if (stationAccepts(s.stations[i], t) > 0) moves.push({ from: { kind: 'cart', index: c }, to: { kind: 'station', index: i } });
    }
  });
  // 2) Vom Stapel ins Paket.
  for (let k = 0; k < s.heights.length; k++) {
    if (s.heights[k] === 0) continue;
    const t = topType(st, s, k);
    for (const i of stationOrder) {
      if (stationAccepts(s.stations[i], t) > 0) moves.push({ from: { kind: 'stack', index: k }, to: { kind: 'station', index: i } });
    }
  }
  // 3) Vom Stapel auf die Ablage.
  const free = s.cart.indexOf(-1);
  if (free >= 0) {
    for (let k = 0; k < s.heights.length; k++) {
      if (s.heights[k] > 0) moves.push({ from: { kind: 'stack', index: k }, to: { kind: 'cart', index: free } });
    }
  }
  return moves;
}

function apply(st: Static, s: SState, mv: ShopMove): SState {
  const next: SState = { heights: s.heights.slice(), cart: s.cart.slice(), stations: s.stations, next: s.next };
  const t = mv.from.kind === 'stack' ? topType(st, s, mv.from.index) : s.cart[mv.from.index];
  const available = mv.from.kind === 'stack' ? runLength(st, s, mv.from.index) : 1;

  let n = 1;
  if (mv.to.kind === 'cart') {
    next.cart[mv.to.index] = t;
  } else {
    const i = mv.to.index;
    const rem = s.stations[i]!.slice();
    n = Math.min(available, stationAccepts(rem, t));
    for (let k = 0; k < n; k++) rem.splice(rem.findIndex((key) => matches(key, t)), 1);
    next.stations = s.stations.slice();
    if (rem.length === 0) {
      // Verschickt: nächster Auftrag aus der Warteschlange.
      next.stations[i] = next.next < st.queueKeys.length ? st.queueKeys[next.next].slice() : null;
      next.next += 1;
      if (next.stations[i] === null) next.next = Math.min(next.next, st.queueKeys.length);
    } else {
      next.stations[i] = rem;
    }
  }
  if (mv.from.kind === 'stack') next.heights[mv.from.index] -= n;
  else next.cart[mv.from.index] = -1;
  return next;
}

// ---------------------------------------------------------------------------
// Schnelle Simulation für die Schwierigkeitsschätzung (siehe generator.ts).
// Läuft auf derselben kompakten Darstellung wie der Solver – um Größenordnungen
// schneller als über die unveränderlichen Board-Objekte.

/**
 * Spielt `playouts` Partien mit einem aufmerksamen, aber unwissenden Spieler:
 * Passt eine sichtbare Ware in ein Paket (ohne sichtbaren Engpass), packt er sie
 * (zufällig welche); sonst parkt er ein zufälliges Item auf der Ablage.
 * Liefert die Gewinnquote 0..1.
 */
export function simulateShopWinRate(board: ShopBoard, rng: () => number, playouts: number): number {
  const st: Static = {
    stackTypes: board.stacks.map((s) => s.map((it) => TYPE_INDEX.get(it.type)!)),
    stackHidden: board.stacks.map((s) => s.map((it) => it.hidden)),
    queueKeys: board.queue.map((o) => o.needs.map(reqKey).sort((a, b) => a - b)),
  };
  const start: SState = {
    heights: board.stacks.map((s) => s.length),
    cart: board.cart.map((c) => (c ? TYPE_INDEX.get(c.type)! : -1)),
    stations: board.stations.map((s) =>
      s.order ? s.order.needs.filter((_, i) => !s.filled[i]).map(reqKey).sort((a, b) => a - b) : null,
    ),
    next: 0,
  };
  let wins = 0;
  for (let p = 0; p < playouts; p++) {
    let s = start;
    for (let guard = 0; guard < 200; guard++) {
      if (isDone(st, s)) {
        wins++;
        break;
      }
      const moves = candidateMoves(st, s);
      const place: SState[] = [];
      const park: SState[] = [];
      for (const mv of moves) {
        const next = apply(st, s, mv);
        if (mv.to.kind === 'station') {
          if (!hasShortage(st, next)) place.push(next);
        } else park.push(next);
      }
      const pool = place.length > 0 ? place : park;
      if (pool.length === 0) break;
      s = pool[Math.floor(rng() * pool.length)];
    }
  }
  return wins / playouts;
}
