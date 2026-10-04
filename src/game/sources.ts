// Gemeinsame Quellen-Regeln für beide Spielmodi (Regal und Versand):
// Karton-Stapel (oberstes Item sichtbar, darunter evtl. verpackt) und Ablage/Wagen.

import type { Item, SourceRef } from './types';

/** Alles, was eine Quelle haben kann: Stapel im Karton und Plätze im Wagen/auf der Ablage. */
export interface SourceBoard {
  stacks: Item[][];
  cart: (Item | null)[];
}

/**
 * Die Items, die von einer Quelle mitgenommen würden, oberstes zuerst.
 *
 * Multi-Move: Liegen oben im Stapel mehrere gleiche, *sichtbare* Items, wandern sie
 * zusammen. Verdeckte Items zählen nie dazu – der Spieler kann sie ja nicht sehen.
 */
export function pickableItems(board: SourceBoard, from: SourceRef): Item[] {
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

/**
 * Entfernt `count` Items von der Quelle und liefert neue Stapel/Wagen (unveränderlich).
 * Mystery: Das danach oberste Item eines Stapels wird ausgepackt (`revealed`).
 */
export function takeFromSource(
  board: SourceBoard,
  from: SourceRef,
  count: number,
): { stacks: Item[][]; cart: (Item | null)[]; revealed: Item | null } {
  if (from.kind === 'cart') {
    return { stacks: board.stacks, cart: board.cart.map((c, i) => (i === from.index ? null : c)), revealed: null };
  }
  const i = from.index;
  const rest = board.stacks[i].slice(0, board.stacks[i].length - count);
  let revealed: Item | null = null;
  const newTop = rest[rest.length - 1];
  if (newTop && newTop.hidden) {
    revealed = { ...newTop, hidden: false };
    rest[rest.length - 1] = revealed;
  }
  return { stacks: board.stacks.map((s, idx) => (idx === i ? rest : s)), cart: board.cart, revealed };
}

/** Alle Quellen, aus denen gerade etwas genommen werden kann. */
export function listSources(board: SourceBoard): SourceRef[] {
  const out: SourceRef[] = [];
  board.stacks.forEach((s, index) => {
    if (s.length > 0) out.push({ kind: 'stack', index });
  });
  board.cart.forEach((c, index) => {
    if (c) out.push({ kind: 'cart', index });
  });
  return out;
}

export function hasHiddenItems(board: SourceBoard): boolean {
  return board.stacks.some((s) => s.some((it) => it.hidden));
}
