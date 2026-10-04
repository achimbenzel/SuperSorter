// Thema "Feinkost-Onlineshop": Serien (Aufkleber auf den Waren) und Kunden.
//
// Ein Thema ist reine Konfiguration. Ein späterer "Card Shop" ersetzt nur diese
// Datei (plus Bilder): andere Waren, andere Serien (z. B. Drachen-Edition),
// andere Kunden. Regeln, Solver und Generator bleiben gleich.

import type { ItemType } from '../items';

export type SeriesId = 'drinks' | 'breakfast' | 'snacks';

export interface SeriesDef {
  id: SeriesId;
  label: string;
  /** Symbol auf dem Aufkleber (Platzhalter-Emoji, bis es eigene Grafiken gibt). */
  icon: string;
  /** Aufkleberfarbe. */
  color: string;
  members: ItemType[];
}

export const SERIES: Record<SeriesId, SeriesDef> = {
  drinks: { id: 'drinks', label: 'Getränke', icon: '🥤', color: '#2f8fd0', members: ['cola-can', 'green-can', 'orange-juice'] },
  breakfast: { id: 'breakfast', label: 'Frühstück', icon: '☀️', color: '#3d9a3d', members: ['bread', 'cheese', 'milk'] },
  snacks: { id: 'snacks', label: 'Snacks', icon: '🍿', color: '#d6264b', members: ['chips', 'apple'] },
};

export const SERIES_IDS = Object.keys(SERIES) as SeriesId[];

export const SERIES_OF: Record<ItemType, SeriesId> = Object.fromEntries(
  SERIES_IDS.flatMap((id) => SERIES[id].members.map((t) => [t, id])),
) as Record<ItemType, SeriesId>;

export interface Customer {
  name: string;
  avatar: string;
}

/** Geschäftskunden bestellen Sammelware (mehrfach dieselbe Ware). */
export const BUSINESS_CUSTOMERS: Customer[] = [
  { name: 'Kiosk Ecke', avatar: '🏪' },
  { name: 'Café Morgenrot', avatar: '☕' },
  { name: 'Sportverein', avatar: '⚽' },
  { name: 'Büro Schulz', avatar: '🏢' },
  { name: 'Hotel Linde', avatar: '🏨' },
];

/** Privatkunden bestellen Serien-Sets und Wunschlisten. */
export const PRIVATE_CUSTOMERS: Customer[] = [
  { name: 'Lisa', avatar: '👩' },
  { name: 'Max (12)', avatar: '🧒' },
  { name: 'Oma Herta', avatar: '👵' },
  { name: 'Familie Yilmaz', avatar: '👨‍👩‍👧' },
  { name: 'Studi-WG', avatar: '🧑‍🎓' },
  { name: 'Herr Becker', avatar: '👨' },
  { name: 'Jana & Tom', avatar: '💑' },
];
