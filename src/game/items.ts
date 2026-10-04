// Katalog aller Warentypen. Reine Daten ohne UI-Bezug (keine Bildpfade!):
// Bildpfade stehen in src/assets.ts, damit die Spiellogik ohne DOM testbar bleibt.

export const ITEM_TYPES = [
  'cola-can',
  'green-can',
  'orange-juice',
  'chips',
  'apple',
  'bread',
  'cheese',
  'milk',
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

/** Kategorien für den optionalen Hinweis-Modus (`hintMode`) auf verpackten Items. */
export type Category = 'drinks' | 'snacks' | 'fruit' | 'bakery' | 'dairy';

export const ITEM_CATEGORY: Record<ItemType, Category> = {
  'cola-can': 'drinks',
  'green-can': 'drinks',
  'orange-juice': 'drinks',
  chips: 'snacks',
  apple: 'fruit',
  bread: 'bakery',
  cheese: 'dairy',
  milk: 'dairy',
};

export const ITEM_LABEL: Record<ItemType, string> = {
  'cola-can': 'Cola',
  'green-can': 'Energy-Drink',
  'orange-juice': 'Orangensaft',
  chips: 'Chips',
  apple: 'Apfel',
  bread: 'Brot',
  cheese: 'Käse',
  milk: 'Milch',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  drinks: 'Getränke',
  snacks: 'Snacks',
  fruit: 'Obst',
  bakery: 'Backwaren',
  dairy: 'Milchprodukte',
};
