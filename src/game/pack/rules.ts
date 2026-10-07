// Regeln des Packband-Modus als reine Funktionen.
//
// Ein Zug = ein Tap auf eine Lagerkiste. Was danach passiert, ist vollständig
// festgelegt (kein zweiter Tap):
//   1. Die oberste Ware wird genommen (darunter wird ggf. ausgepackt).
//   2. Routing: erstes aktives Paket (Platz 0, dann 1), das diese Ware noch braucht.
//      Sonst der erste freie Platz auf dem Packtisch. Gibt es beides nicht, ist der
//      Tap nicht erlaubt.
//   3. "Settle": Volle Pakete werden verschickt, das nächste Paket rückt an den
//      Platz, und Waren auf dem Packtisch, die jetzt gebraucht werden, springen
//      automatisch hinein. Das wiederholt sich, bis sich nichts mehr ändert
//      (Kettenreaktion / Kombo).
//
// Die einzige Entscheidung des Spielers ist also: Welche Kiste grabe ich als Nächstes auf?

import type { ItemType } from '../items';
import { takeFromSource } from '../sources';
import type { Item, PackBoard, PackBox, PackSpot } from './types';

export function newSpot(box: PackBox | undefined): PackSpot | null {
  return box ? { box, filled: box.needs.map(() => null) } : null;
}

/** Position einer offenen Stelle für diese Ware in einem Paket, sonst -1. */
export function openNeed(spot: PackSpot | null, type: ItemType): number {
  if (!spot) return -1;
  return spot.box.needs.findIndex((t, i) => t === type && !spot.filled[i]);
}

export type Route = { kind: 'spot'; index: number; pos: number } | { kind: 'table'; index: number };

/** Wohin ginge eine Ware dieses Typs? null = nirgends (Packtisch voll). */
export function routeOf(board: PackBoard, type: ItemType): Route | null {
  for (let i = 0; i < board.spots.length; i++) {
    const pos = openNeed(board.spots[i], type);
    if (pos >= 0) return { kind: 'spot', index: i, pos };
  }
  const free = board.cart.indexOf(null);
  return free >= 0 ? { kind: 'table', index: free } : null;
}

export function topItem(board: PackBoard, stack: number): Item | undefined {
  const s = board.stacks[stack];
  return s?.[s.length - 1];
}

export function canTap(board: PackBoard, stack: number): boolean {
  const top = topItem(board, stack);
  return !!top && routeOf(board, top.type) !== null;
}

export function listTaps(board: PackBoard): number[] {
  return board.stacks.map((_, i) => i).filter((i) => canTap(board, i));
}

export function hasAnyMove(board: PackBoard): boolean {
  return board.stacks.some((_, i) => canTap(board, i));
}

/** Alle Pakete verschickt (Kisten und Packtisch sind dann zwangsläufig leer). */
export function isWon(board: PackBoard): boolean {
  return board.queue.length === 0 && board.spots.every((s) => s === null);
}

export interface ShippedInfo {
  spot: number;
  box: PackBox;
  items: Item[];
  /** Wie viele Pakete in diesem Zug vorher schon verschickt wurden (0 = erstes). */
  chain: number;
}

export interface TapResult {
  board: PackBoard;
  item: Item;
  route: Route;
  revealed: Item | null;
  shipped: ShippedInfo[];
  /** Automatisch vom Packtisch ins Paket gesprungene Waren, gruppiert nach Kettenschritt. */
  fed: { itemIds: number[]; chain: number }[];
  /** Goldene Waren, die in diesem Zug in Pakete kamen (direkt oder per Kette). */
  goldPacked: number;
}

/** Führt einen Tap aus. Wirft, wenn der Tap nicht erlaubt ist. */
export function applyTap(board: PackBoard, stack: number): TapResult {
  const item = topItem(board, stack);
  const route = item ? routeOf(board, item.type) : null;
  if (!item || !route) throw new Error(`Invalid tap on crate ${stack}`);

  const taken = takeFromSource(board, { kind: 'stack', index: stack }, 1);
  const cart = taken.cart.slice();
  const spots = board.spots.slice();
  let goldPacked = 0;

  if (route.kind === 'spot') {
    spots[route.index] = place(spots[route.index]!, route.pos, item);
    if (item.gold) goldPacked++;
  } else {
    cart[route.index] = item;
  }

  const settled = settle({ ...board, stacks: taken.stacks, cart, spots });
  return {
    board: settled.board,
    item,
    route,
    revealed: taken.revealed,
    shipped: settled.shipped,
    fed: settled.fed,
    goldPacked: goldPacked + settled.goldFed,
  };
}

function place(spot: PackSpot, pos: number, item: Item): PackSpot {
  const filled = spot.filled.slice();
  filled[pos] = item;
  return { ...spot, filled };
}

/**
 * Verschickt volle Pakete, lässt Pakete nachrücken und füllt sie automatisch aus dem
 * Packtisch – so lange, bis sich nichts mehr ändert.
 */
export function settle(input: PackBoard): {
  board: PackBoard;
  shipped: ShippedInfo[];
  fed: { itemIds: number[]; chain: number }[];
  goldFed: number;
} {
  const spots = input.spots.slice();
  const cart = input.cart.slice();
  let queue = input.queue;
  let shippedCount = input.shipped;
  const shipped: ShippedInfo[] = [];
  const fed: { itemIds: number[]; chain: number }[] = [];
  let goldFed = 0;

  for (let guard = 0; guard < 100; guard++) {
    let changed = false;
    // 1) Volle Pakete verschicken, nächstes Paket rückt an denselben Platz.
    for (let i = 0; i < spots.length; i++) {
      const spot = spots[i];
      if (spot && spot.filled.every(Boolean)) {
        shipped.push({ spot: i, box: spot.box, items: spot.filled as Item[], chain: shipped.length });
        spots[i] = newSpot(queue[0]);
        queue = queue.slice(1);
        shippedCount++;
        changed = true;
      }
    }
    // 2) Gebrauchte Waren springen vom Packtisch ins Paket.
    const ids: number[] = [];
    for (let t = 0; t < cart.length; t++) {
      const it = cart[t];
      if (!it) continue;
      for (let i = 0; i < spots.length; i++) {
        const pos = openNeed(spots[i], it.type);
        if (pos < 0) continue;
        spots[i] = place(spots[i]!, pos, it);
        cart[t] = null;
        ids.push(it.id);
        if (it.gold) goldFed++;
        changed = true;
        break;
      }
    }
    if (ids.length > 0) fed.push({ itemIds: ids, chain: shipped.length });
    if (!changed) break;
  }

  return { board: { ...input, spots, cart, queue, shipped: shippedCount }, shipped, fed, goldFed };
}

export function countItems(board: PackBoard): number {
  return (
    board.stacks.reduce((n, s) => n + s.length, 0) +
    board.cart.reduce((n, c) => n + (c ? 1 : 0), 0) +
    board.spots.reduce((n, s) => n + (s ? s.filled.filter(Boolean).length : 0), 0)
  );
}

/** Noch offene Stellen in aktiven und wartenden Paketen. */
export function countOpenNeeds(board: PackBoard): number {
  return (
    board.spots.reduce((n, s) => n + (s ? s.filled.filter((f) => !f).length : 0), 0) +
    board.queue.reduce((n, b) => n + b.needs.length, 0)
  );
}
