// Zentrales Asset-Mapping: Spiel-IDs -> Bildpfade.
// Komponenten importieren Pfade ausschließlich von hier. Neue Assets siehe docs/ASSETS.md.

import type { Category, ItemType } from './game/items';

/** Vite setzt BASE_URL auf den konfigurierten Basis-Pfad (z. B. "/SuperSorter/"). */
const BASE = import.meta.env.BASE_URL;
const asset = (path: string) => `${BASE}assets/${path}`;

export const ITEM_IMAGE: Record<ItemType, string> = {
  'cola-can': asset('items/cola-can.webp'),
  'green-can': asset('items/green-can.webp'),
  'orange-juice': asset('items/orange-juice.webp'),
  chips: asset('items/chips.webp'),
  apple: asset('items/apple.webp'),
  bread: asset('items/bread.webp'),
  cheese: asset('items/cheese.webp'),
  milk: asset('items/milk.webp'),
};

export const MYSTERY_IMAGE = {
  paper: asset('mystery/paper-wrap.webp'),
  gold: asset('mystery/paper-gold.webp'),
  shreds: asset('mystery/paper-shreds.webp'),
} as const;

export const BOARD_IMAGE = {
  box: asset('board/delivery-box.webp'),
  boxFront: asset('board/delivery-box-front.webp'),
  boxShadow: asset('board/delivery-box-mask.webp'),
  shelf: asset('board/shelf.webp'),
  shelfSlot: asset('board/shelf-slot.webp'),
} as const;

export const UI_IMAGE = {
  lock: asset('ui/lock.webp'),
  coin: asset('ui/coin.webp'),
  star: asset('ui/star.webp'),
  confetti: asset('ui/confetti.webp'),
  panel: asset('ui/panel.webp'),
  buttonGreen: asset('ui/button-wide-green.webp'),
  buttonRed: asset('ui/button-wide-red.webp'),
  buttonSquareGreen: asset('ui/button-square-green.webp'),
  buttonSquareRed: asset('ui/button-square-red.webp'),
  check: asset('ui/icon-check.webp'),
  cross: asset('ui/icon-cross.webp'),
} as const;

export type BoosterId = 'undo' | 'extra' | 'peek' | 'shuffle';

export const BOOSTER_IMAGE: Record<BoosterId, string> = {
  undo: asset('ui/booster-undo.webp'),
  extra: asset('ui/booster-extra-slot.webp'),
  peek: asset('ui/booster-peek.webp'),
  shuffle: asset('ui/booster-shuffle.webp'),
};

/** Platzhalter (kein Asset vorhanden): Kategorie-Hinweis auf verpackten Items. */
export const CATEGORY_ICON: Record<Category, string> = {
  drinks: '🥤',
  snacks: '🍿',
  fruit: '🍎',
  bakery: '🥖',
  dairy: '🧀',
};

/** Platzhalter (kein Asset vorhanden): Einkaufswagen-Symbol. */
export const CART_ICON = '🛒';

/** Alle Bilder, die vor dem ersten Level vorgeladen werden (verhindert Flackern beim Reveal). */
export const PRELOAD_IMAGES: string[] = [
  ...Object.values(ITEM_IMAGE),
  ...Object.values(MYSTERY_IMAGE),
  ...Object.values(BOARD_IMAGE),
  ...Object.values(UI_IMAGE),
  ...Object.values(BOOSTER_IMAGE),
];
