// Kompakte Board-Beschreibung für Tests des Versand-Modus.

import type { ItemType } from '../items';
import { item } from '../testUtils';
import { emptyStation } from './rules';
import type { SeriesId } from './theme';
import type { Order, ShopBoard } from './types';

let nextOrderId = 500;

/**
 * Auftrag in Kurzschreibweise:
 *   "bulk:milk:3"            3 × Milch
 *   "series:drinks:3"        3 × irgendein Getränk
 *   "list:bread,cheese,milk" genau diese Waren
 */
export function order(spec: string): Order {
  const [kind, what, n] = spec.split(':');
  const id = nextOrderId++;
  if (kind === 'bulk') {
    return { id, kind, customer: 'Test', avatar: '🏪', needs: Array.from({ length: Number(n) }, () => ({ kind: 'type' as const, type: what as ItemType })) };
  }
  if (kind === 'series') {
    return { id, kind, customer: 'Test', avatar: '👩', needs: Array.from({ length: Number(n) }, () => ({ kind: 'series' as const, series: what as SeriesId })) };
  }
  return { id, kind: 'list', customer: 'Test', avatar: '👩', needs: what.split(',').map((t) => ({ kind: 'type' as const, type: t as ItemType })) };
}

export interface ShopBoardSpec {
  stacks?: string[][];
  cart?: (string | null)[];
  /** Aufträge an den Stationen (null = Station ohne Auftrag). */
  stations?: (string | null)[];
  queue?: string[];
}

export function shopBoard(spec: ShopBoardSpec): ShopBoard {
  const stations = (spec.stations ?? []).map((s) => emptyStation(s ? order(s) : null));
  const queue = (spec.queue ?? []).map(order);
  return {
    stacks: (spec.stacks ?? []).map((s) => s.map(item)),
    cart: (spec.cart ?? []).map((c) => (c ? item(c) : null)),
    stations,
    queue,
    shipped: 0,
    totalOrders: stations.filter((s) => s.order).length + queue.length,
  };
}
