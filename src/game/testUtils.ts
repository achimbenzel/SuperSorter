// Hilfsfunktionen, um in Tests Boards kompakt zu beschreiben.

import type { Board, Item, ItemType, Slot } from './types';

let nextId = 1000;

/** Item-Kurzschreibweise: "cola-can" (offen), "?cola-can" (verdeckt), "$cola-can" (verdeckt + Gold). */
export function item(spec: string): Item {
  const gold = spec.startsWith('$');
  const hidden = gold || spec.startsWith('?');
  const type = spec.replace(/^[?$]/, '') as ItemType;
  return { id: nextId++, type, hidden, gold };
}

export interface BoardSpec {
  /** Stapel von unten nach oben. */
  stacks?: string[][];
  cart?: (string | null)[];
  /** Fächer: Inhalt (Einfüge-Reihenfolge); "closed" als Inhalt = geschlossenes leeres Fach. */
  slots?: (string[] | 'closed')[];
  capacity?: number;
}

export function board(spec: BoardSpec): Board {
  const capacity = spec.capacity ?? 3;
  return {
    stacks: (spec.stacks ?? []).map((s) => s.map(item)),
    cart: (spec.cart ?? []).map((c) => (c ? item(c) : null)),
    slots: (spec.slots ?? []).map(
      (s): Slot => (s === 'closed' ? { capacity, items: [], closed: true } : { capacity, items: s.map(item), closed: false }),
    ),
  };
}

export function types(items: Item[]): ItemType[] {
  return items.map((i) => i.type);
}
