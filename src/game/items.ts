// Katalog aller Warentypen (Card-Shop-Thema). Reine Daten ohne UI-Bezug (keine
// Bildpfade!): Bildpfade stehen in src/assets.ts, damit die Spiellogik ohne DOM
// testbar bleibt. Die Reihenfolge bestimmt die Level (Seeds) – nicht umsortieren.

export const ITEM_TYPES = [
  'pack-fire',
  'pack-leaf',
  'pack-bolt',
  'pack-water',
  'dice',
  'deck-box',
  'figure',
  'sleeves',
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

/** Kategorien für den optionalen Hinweis-Modus (`hintMode`) auf verpackten Items. */
export type Category = 'boosters' | 'games' | 'accessories' | 'collectibles';

export const ITEM_CATEGORY: Record<ItemType, Category> = {
  'pack-fire': 'boosters',
  'pack-leaf': 'boosters',
  'pack-bolt': 'boosters',
  'pack-water': 'boosters',
  dice: 'games',
  'deck-box': 'accessories',
  figure: 'collectibles',
  sleeves: 'accessories',
};

export const ITEM_LABEL: Record<ItemType, string> = {
  'pack-fire': 'Fire booster pack',
  'pack-leaf': 'Leaf booster pack',
  'pack-bolt': 'Bolt booster pack',
  'pack-water': 'Water booster pack',
  dice: 'D20 die',
  'deck-box': 'Deck box',
  figure: 'Collectible figure',
  sleeves: 'Card sleeves',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  boosters: 'Booster packs',
  games: 'Games',
  accessories: 'Accessories',
  collectibles: 'Collectibles',
};
