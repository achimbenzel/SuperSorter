// Spielregeln als reine Funktionen auf dem Board.
//
// Grundprinzip (siehe docs/GAME_DESIGN.md):
// - Quellen sind die obersten Items der Karton-Stapel und Items im Einkaufswagen.
// - Ziele sind offene, ungelöste Regalfächer und freie Wagenplätze.
// - Ein Fach nimmt ein Item nur, wenn es leer ist oder das oberste Item denselben
//   Typ hat und noch Platz ist. Dadurch ist jedes Fach jederzeit sortenrein.
// - Ein volles Fach ist gelöst und gesperrt; dabei öffnet sich das nächste geschlossene Fach.

import type { Board, Item, ItemType, Move, Slot, SourceRef, TargetRef } from './types';

export function topOf<T>(list: readonly T[]): T | undefined {
  return list[list.length - 1];
}

export function isSlotSolved(slot: Slot): boolean {
  if (slot.items.length !== slot.capacity) return false;
  const t = slot.items[0].type;
  return slot.items.every((i) => i.type === t);
}

/**
 * Wie viele Items des Typs passen in dieses Fach? 0 = Fach nimmt den Typ nicht.
 * Gelöste Fächer sind immer voll, daher reicht der Platz-Check für "gesperrt".
 */
export function slotSpaceFor(slot: Slot, type: ItemType): number {
  if (slot.closed) return 0;
  const top = topOf(slot.items);
  if (top && top.type !== type) return 0;
  return slot.capacity - slot.items.length;
}

/**
 * Die Items, die von einer Quelle mitgenommen würden, oberstes zuerst.
 *
 * Multi-Move: Liegen oben im Stapel mehrere gleiche, *sichtbare* Items, wandern sie
 * zusammen. Verdeckte Items zählen nie dazu – der Spieler kann sie ja nicht sehen.
 */
export function pickableItems(board: Board, from: SourceRef): Item[] {
  if (from.kind === 'cart') {
    const item = board.cart[from.index];
    return item ? [item] : [];
  }
  const stack = board.stacks[from.index];
  if (!stack || stack.length === 0) return [];
  const top = stack[stack.length - 1];
  const run: Item[] = [top];
  for (let i = stack.length - 2; i >= 0; i--) {
    const it = stack[i];
    if (it.hidden || it.type !== top.type) break;
    run.push(it);
  }
  return run;
}

/** Anzahl Items, die dieser Zug bewegen würde. 0 bedeutet: ungültiger Zug. */
export function moveCount(board: Board, move: Move): number {
  const items = pickableItems(board, move.from);
  if (items.length === 0) return 0;
  const type = items[0].type;
  if (move.to.kind === 'cart') {
    // Wagen -> Wagen ist sinnlos und würde dem Solver Endlosschleifen erlauben.
    if (move.from.kind === 'cart') return 0;
    const spot = board.cart[move.to.index];
    return spot === null ? 1 : 0;
  }
  const slot = board.slots[move.to.index];
  if (!slot) return 0;
  return Math.min(items.length, slotSpaceFor(slot, type));
}

export interface MoveResult {
  board: Board;
  moved: Item[];
  /** Item, dessen Packpapier durch den Zug aufgerissen wurde. */
  revealed: Item | null;
  /** Fach, das durch den Zug gelöst wurde. */
  solvedSlot: number | null;
  /** Fach, das sich dadurch geöffnet hat. */
  openedSlot: number | null;
  /** Anzahl goldener Items, die in ein Fach gelegt wurden. */
  goldPlaced: number;
}

/**
 * Führt einen Zug aus und liefert ein *neues* Board (das alte bleibt unverändert,
 * damit es in der Undo-History liegen kann). Wirft bei ungültigen Zügen.
 */
export function applyMove(board: Board, move: Move): MoveResult {
  const count = moveCount(board, move);
  if (count === 0) throw new Error(`Ungültiger Zug: ${JSON.stringify(move)}`);

  const moved = pickableItems(board, move.from).slice(0, count);
  let stacks = board.stacks;
  let cart = board.cart;
  let slots = board.slots;
  let revealed: Item | null = null;

  // 1) Aus der Quelle entfernen
  if (move.from.kind === 'stack') {
    const i = move.from.index;
    const rest = board.stacks[i].slice(0, board.stacks[i].length - count);
    // Mystery: Das neue oberste Item wird ausgepackt.
    const newTop = rest[rest.length - 1];
    if (newTop && newTop.hidden) {
      revealed = { ...newTop, hidden: false };
      rest[rest.length - 1] = revealed;
    }
    stacks = board.stacks.map((s, idx) => (idx === i ? rest : s));
  } else {
    const i = move.from.index;
    cart = board.cart.map((c, idx) => (idx === i ? null : c));
  }

  // 2) Ins Ziel legen
  let solvedSlot: number | null = null;
  let openedSlot: number | null = null;
  let goldPlaced = 0;
  if (move.to.kind === 'cart') {
    const i = move.to.index;
    cart = cart.map((c, idx) => (idx === i ? moved[0] : c));
  } else {
    const i = move.to.index;
    const target = slots[i];
    const updated: Slot = { ...target, items: [...target.items, ...moved] };
    goldPlaced = moved.filter((m) => m.gold).length;
    slots = slots.map((s, idx) => (idx === i ? updated : s));
    if (isSlotSolved(updated)) {
      solvedSlot = i;
      // Belohnung für ein gelöstes Fach: das nächste geschlossene Fach öffnet sich.
      const next = slots.findIndex((s) => s.closed);
      if (next >= 0) {
        openedSlot = next;
        slots = slots.map((s, idx) => (idx === next ? { ...s, closed: false } : s));
      }
    }
  }

  return { board: { stacks, cart, slots }, moved, revealed, solvedSlot, openedSlot, goldPlaced };
}

/** Alle Quellen, aus denen gerade etwas genommen werden kann. */
export function listSources(board: Board): SourceRef[] {
  const out: SourceRef[] = [];
  board.stacks.forEach((s, index) => {
    if (s.length > 0) out.push({ kind: 'stack', index });
  });
  board.cart.forEach((c, index) => {
    if (c) out.push({ kind: 'cart', index });
  });
  return out;
}

/** Alle gültigen Ziele für eine Quelle. */
export function listTargets(board: Board, from: SourceRef): TargetRef[] {
  const out: TargetRef[] = [];
  board.slots.forEach((_, index) => {
    if (moveCount(board, { from, to: { kind: 'slot', index } }) > 0) out.push({ kind: 'slot', index });
  });
  if (from.kind === 'stack') {
    board.cart.forEach((c, index) => {
      if (c === null) out.push({ kind: 'cart', index });
    });
  }
  return out;
}

/** Alle gültigen Züge (unkanonisch, für UI, Deadlock-Erkennung und Tests). */
export function listMoves(board: Board): Move[] {
  return listSources(board).flatMap((from) => listTargets(board, from).map((to) => ({ from, to })));
}

export function hasAnyMove(board: Board): boolean {
  return listSources(board).some((from) => listTargets(board, from).length > 0);
}

/** Gewonnen: Karton und Wagen leer, jedes belegte Fach gelöst. */
export function isWon(board: Board): boolean {
  if (board.stacks.some((s) => s.length > 0)) return false;
  if (board.cart.some((c) => c !== null)) return false;
  return board.slots.every((s) => s.items.length === 0 || isSlotSolved(s));
}

export function countItems(board: Board): number {
  return (
    board.stacks.reduce((n, s) => n + s.length, 0) +
    board.cart.reduce((n, c) => n + (c ? 1 : 0), 0) +
    board.slots.reduce((n, s) => n + s.items.length, 0)
  );
}

/**
 * Findet einen Warentyp, der nachweislich nicht mehr vollständig einsortiert werden kann.
 *
 * Warum das genügt: Items verlassen ein Fach nie wieder. Hat ein Typ T insgesamt
 * k·capacity Items, braucht er genau k volle Fächer. Liegt T bereits in mehr
 * ungelösten Fächern als er noch Fächer füllen kann (m > k - gelöst), bleibt
 * mindestens eines dieser Fächer für immer unvollständig -> Level verloren,
 * auch wenn formal noch Züge möglich sind. Das erspart dem Spieler sinnloses
 * Weiterspielen und dient dem Solver als Pruning.
 */
export function findHopelessType(board: Board): ItemType | null {
  const capacity = board.slots[0]?.capacity ?? 1;
  const total = new Map<ItemType, number>();
  const solved = new Map<ItemType, number>();
  const partial = new Map<ItemType, number>();
  const add = (m: Map<ItemType, number>, t: ItemType, n = 1) => m.set(t, (m.get(t) ?? 0) + n);

  for (const s of board.stacks) for (const it of s) add(total, it.type);
  for (const c of board.cart) if (c) add(total, c.type);
  for (const slot of board.slots) {
    for (const it of slot.items) add(total, it.type);
    if (slot.items.length === 0) continue;
    if (isSlotSolved(slot)) add(solved, slot.items[0].type);
    else add(partial, slot.items[0].type);
  }
  for (const [type, n] of total) {
    const needed = Math.ceil(n / capacity) - (solved.get(type) ?? 0);
    if ((partial.get(type) ?? 0) > needed) return type;
  }
  return null;
}

export function sameSource(a: SourceRef | null, b: SourceRef | null): boolean {
  return !!a && !!b && a.kind === b.kind && a.index === b.index;
}
