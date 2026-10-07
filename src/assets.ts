// Zentrales Asset-Mapping: Spiel-IDs -> Bildpfade.
// Komponenten importieren Pfade ausschließlich von hier. Neue Assets siehe docs/ASSETS.md.

import type { SfxName } from './audio/sfx';
import type { Category, ItemType } from './game/items';

/** Vite setzt BASE_URL auf den konfigurierten Basis-Pfad (z. B. "/SuperSorter/"). */
const BASE = import.meta.env.BASE_URL;
const asset = (path: string) => `${BASE}assets/${path}`;

/** Card-Shop-Waren: Vektorgrafiken aus scripts/cardshop-art.mjs. */
export const ITEM_IMAGE: Record<ItemType, string> = {
  'pack-fire': asset('items/pack-fire.webp'),
  'pack-leaf': asset('items/pack-leaf.webp'),
  'pack-bolt': asset('items/pack-bolt.webp'),
  'pack-water': asset('items/pack-water.webp'),
  dice: asset('items/dice.webp'),
  'deck-box': asset('items/deck-box.webp'),
  figure: asset('items/figure.webp'),
  sleeves: asset('items/sleeves.webp'),
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
  boosters: '🎴',
  games: '🎲',
  accessories: '🛡️',
  collectibles: '⭐',
};

/** Platzhalter (kein Asset vorhanden): Einkaufswagen-Symbol. */
export const CART_ICON = '🛒';

/** Sounds (CC0, aus "UI SFX" von uisfx.com – Zuordnung siehe docs/ASSETS.md). */
export const SFX_FILE: Record<SfxName, string> = {
  tap: asset('sfx/tap.mp3'),
  select: asset('sfx/select.mp3'),
  place: asset('sfx/place.mp3'),
  invalid: asset('sfx/invalid.mp3'),
  reveal: asset('sfx/reveal.mp3'),
  solved: asset('sfx/solved.mp3'),
  ship: asset('sfx/ship.mp3'),
  gold: asset('sfx/gold.mp3'),
  win: asset('sfx/win.mp3'),
  lose: asset('sfx/lose.mp3'),
  booster: asset('sfx/booster.mp3'),
  tab: asset('sfx/tab.mp3'),
  button: asset('sfx/button.mp3'),
  'pack-tear': asset('sfx/pack-tear.mp3'),
  'card-flip': asset('sfx/card-flip.mp3'),
  'card-rare': asset('sfx/card-rare.mp3'),
  'card-holo': asset('sfx/card-holo.mp3'),
};

/** Alle Bilder, die vor dem ersten Level vorgeladen werden (verhindert Flackern beim Reveal). */
export const PRELOAD_IMAGES: string[] = [
  ...Object.values(ITEM_IMAGE),
  ...Object.values(MYSTERY_IMAGE),
  ...Object.values(BOARD_IMAGE),
  ...Object.values(UI_IMAGE),
  ...Object.values(BOOSTER_IMAGE),
];
