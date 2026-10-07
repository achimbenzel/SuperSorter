// Kompakte Board-Beschreibung für Packband-Tests.

import type { ItemType } from '../items';
import { item } from '../testUtils';
import { newSpot } from './rules';
import type { PackBoard, PackBox } from './types';

let nextBoxId = 900;

/** Paket in Kurzschreibweise: "pack-fire*3" (Sammelpaket) oder "deck-box,figure,sleeves" (gemischt). */
export function box(spec: string): PackBox {
  const needs = spec.includes('*')
    ? Array<ItemType>(Number(spec.split('*')[1])).fill(spec.split('*')[0] as ItemType)
    : (spec.split(',') as ItemType[]);
  return { id: nextBoxId++, customer: 'Test', avatar: '🏪', needs };
}

export interface PackBoardSpec {
  stacks?: string[][];
  /** Packtisch-Plätze (null = frei). */
  table?: (string | null)[];
  /** Aktive Pakete an den Packplätzen (null = kein Paket). */
  spots?: (string | null)[];
  queue?: string[];
}

export function packBoard(spec: PackBoardSpec): PackBoard {
  const spots = (spec.spots ?? []).map((s) => (s ? newSpot(box(s)) : null));
  const queue = (spec.queue ?? []).map(box);
  return {
    stacks: (spec.stacks ?? []).map((s) => s.map(item)),
    cart: (spec.table ?? []).map((t) => (t ? item(t) : null)),
    spots,
    queue,
    shipped: 0,
    totalBoxes: spots.filter(Boolean).length + queue.length,
  };
}
