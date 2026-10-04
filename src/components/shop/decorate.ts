import type { ItemType } from '../../game/items';
import { SERIES, SERIES_OF } from '../../game/shop/theme';
import type { ItemBadge, ItemDecorator } from '../Item';

/** Serien-Aufkleber einer Ware (Farbe + Symbol aus dem Theme). */
export function seriesBadge(type: ItemType): ItemBadge {
  const s = SERIES[SERIES_OF[type]];
  return { icon: s.icon, color: s.color, label: s.label };
}

/** Offene Waren tragen ihren Serien-Aufkleber; mit hintMode zeigen auch Verpackungen das Symbol. */
export function makeShopDecorator(hintMode: boolean): ItemDecorator {
  return (item) => ({
    badge: seriesBadge(item.type),
    hintIcon: hintMode ? SERIES[SERIES_OF[item.type]].icon : undefined,
  });
}
