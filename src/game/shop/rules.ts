// Regeln des Versand-Modus als reine Funktionen.
//
// - Quellen: oberstes Item eines Karton-Stapels (Multi-Move wie im Regal-Modus) und
//   Items auf der Ablage. Geteilt mit dem Regal-Modus über ../sources.ts.
// - Ziele: Packstationen und freie Ablageplätze.
// - Eine Station nimmt ein Item, wenn eine noch offene Position ihres Auftrags passt
//   (genau diese Ware bzw. irgendeine Ware dieser Serie). Die Reihenfolge im Paket
//   spielt keine Rolle.
// - Ist jede Position erfüllt, wird das Paket sofort verschickt: Die Station bekommt
//   den nächsten Auftrag aus der Warteschlange (oder bleibt leer, wenn keiner mehr kommt).

import type { ItemType } from '../items';
import { listSources, pickableItems, takeFromSource } from '../sources';
import { SERIES_IDS, SERIES_OF, type SeriesId } from './theme';
import type { Item, Order, Requirement, ShopBoard, ShopMove, ShopTarget, SourceRef, Station } from './types';

export { pickableItems, listSources } from '../sources';

export function requirementMatches(req: Requirement, type: ItemType): boolean {
  return req.kind === 'type' ? req.type === type : SERIES_OF[type] === req.series;
}

/** Indizes der noch offenen Positionen, die diese Ware erfüllen könnte. */
export function openPositions(station: Station, type: ItemType): number[] {
  if (!station.order) return [];
  const out: number[] = [];
  station.order.needs.forEach((req, i) => {
    if (!station.filled[i] && requirementMatches(req, type)) out.push(i);
  });
  return out;
}

export function emptyStation(order: Order | null): Station {
  return { order, filled: order ? order.needs.map(() => null) : [] };
}

/** Anzahl Items, die dieser Zug bewegen würde. 0 = ungültig. */
export function moveCount(board: ShopBoard, move: ShopMove): number {
  const items = pickableItems(board, move.from);
  if (items.length === 0) return 0;
  if (move.to.kind === 'cart') {
    if (move.from.kind === 'cart') return 0; // Ablage -> Ablage ist sinnlos
    return board.cart[move.to.index] === null ? 1 : 0;
  }
  const station = board.stations[move.to.index];
  if (!station) return 0;
  return Math.min(items.length, openPositions(station, items[0].type).length);
}

export interface ShippedInfo {
  station: number;
  order: Order;
  items: Item[];
}

export interface ShopMoveResult {
  board: ShopBoard;
  moved: Item[];
  revealed: Item | null;
  shipped: ShippedInfo | null;
  goldPlaced: number;
}

/** Führt einen Zug aus und liefert ein neues Board. Wirft bei ungültigen Zügen. */
export function applyMove(board: ShopBoard, move: ShopMove): ShopMoveResult {
  const count = moveCount(board, move);
  if (count === 0) throw new Error(`Ungültiger Zug: ${JSON.stringify(move)}`);
  const moved = pickableItems(board, move.from).slice(0, count);
  const taken = takeFromSource(board, move.from, count);
  let { cart } = taken;
  let stations = board.stations;
  let queue = board.queue;
  let shipped = board.shipped;
  let shippedInfo: ShippedInfo | null = null;
  let goldPlaced = 0;

  if (move.to.kind === 'cart') {
    const i = move.to.index;
    cart = cart.map((c, idx) => (idx === i ? moved[0] : c));
  } else {
    const s = move.to.index;
    const station = stations[s];
    const filled = station.filled.slice();
    const positions = openPositions(station, moved[0].type);
    moved.forEach((item, k) => {
      filled[positions[k]] = item;
    });
    goldPlaced = moved.filter((m) => m.gold).length;
    let updated: Station = { ...station, filled };
    if (filled.every(Boolean)) {
      // Paket komplett -> verschicken, nächster Auftrag rückt nach.
      shippedInfo = { station: s, order: station.order!, items: filled as Item[] };
      updated = emptyStation(queue[0] ?? null);
      queue = queue.slice(1);
      shipped += 1;
    }
    stations = stations.map((st, idx) => (idx === s ? updated : st));
  }

  return {
    board: { ...board, stacks: taken.stacks, cart, stations, queue, shipped },
    moved,
    revealed: taken.revealed,
    shipped: shippedInfo,
    goldPlaced,
  };
}

export function listTargets(board: ShopBoard, from: SourceRef): ShopTarget[] {
  const out: ShopTarget[] = [];
  board.stations.forEach((_, index) => {
    if (moveCount(board, { from, to: { kind: 'station', index } }) > 0) out.push({ kind: 'station', index });
  });
  if (from.kind === 'stack') {
    board.cart.forEach((c, index) => {
      if (c === null) out.push({ kind: 'cart', index });
    });
  }
  return out;
}

export function listMoves(board: ShopBoard): ShopMove[] {
  return listSources(board).flatMap((from) => listTargets(board, from).map((to) => ({ from, to })));
}

export function hasAnyMove(board: ShopBoard): boolean {
  return listSources(board).some((from) => listTargets(board, from).length > 0);
}

/** Geschafft: alle Aufträge verschickt (dann sind Karton und Ablage automatisch leer). */
export function isWon(board: ShopBoard): boolean {
  return board.queue.length === 0 && board.stations.every((s) => s.order === null);
}

export type Shortage = { type: ItemType } | { series: SeriesId };

/**
 * Prüft, ob die restlichen Waren die restlichen Auftragspositionen überhaupt noch
 * decken können. Wenn nicht, ist der Sieg unmöglich ("Engpass"), auch wenn noch
 * Züge gingen – z. B. weil das letzte Brot in ein Serien-Set gepackt wurde, eine
 * Wunschliste aber genau Brot verlangt.
 *
 * Warum diese zwei Prüfungen genügen: Jede Ware gehört zu genau einer Serie, und
 * Positionen verlangen entweder eine bestimmte Ware oder eine Serie. Pro Serie muss
 * also (a) jede bestimmte Ware oft genug vorhanden sein und (b) danach noch genug
 * Waren der Serie für die Serien-Positionen übrig bleiben (Heiratssatz von Hall für
 * diese verschachtelte Struktur).
 */
export function findShortage(board: ShopBoard): Shortage | null {
  const have = new Map<ItemType, number>();
  const add = (t: ItemType) => have.set(t, (have.get(t) ?? 0) + 1);
  board.stacks.forEach((s) => s.forEach((it) => add(it.type)));
  board.cart.forEach((c) => c && add(c.type));

  const needType = new Map<ItemType, number>();
  const needSeries = new Map<SeriesId, number>();
  const countNeeds = (needs: Requirement[], filled?: (Item | null)[]) =>
    needs.forEach((req, i) => {
      if (filled?.[i]) return;
      if (req.kind === 'type') needType.set(req.type, (needType.get(req.type) ?? 0) + 1);
      else needSeries.set(req.series, (needSeries.get(req.series) ?? 0) + 1);
    });
  board.stations.forEach((st) => st.order && countNeeds(st.order.needs, st.filled));
  board.queue.forEach((o) => countNeeds(o.needs));

  for (const [type, n] of needType) {
    if ((have.get(type) ?? 0) < n) return { type };
  }
  for (const series of SERIES_IDS) {
    let spare = 0;
    for (const [type, n] of have) if (SERIES_OF[type] === series) spare += n - (needType.get(type) ?? 0);
    if (spare < (needSeries.get(series) ?? 0)) return { series };
  }
  return null;
}

export function countItems(board: ShopBoard): number {
  return (
    board.stacks.reduce((n, s) => n + s.length, 0) +
    board.cart.reduce((n, c) => n + (c ? 1 : 0), 0) +
    board.stations.reduce((n, s) => n + s.filled.filter(Boolean).length, 0)
  );
}

/** Alle noch offenen Positionen (aktive Stationen + Warteschlange). */
export function countOpenNeeds(board: ShopBoard): number {
  return (
    board.stations.reduce((n, s) => n + s.filled.filter((f) => !f).length, 0) +
    board.queue.reduce((n, o) => n + o.needs.length, 0)
  );
}
