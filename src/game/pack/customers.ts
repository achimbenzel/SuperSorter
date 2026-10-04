// Kunden des Packband-Modus (Story-Würze). Reine Daten, für andere Themen austauschbar.

export interface Customer {
  name: string;
  avatar: string;
}

/** Geschäftskunden bestellen Sammelpakete (mehrfach dieselbe Ware). */
export const BUSINESS_CUSTOMERS: Customer[] = [
  { name: 'Kiosk Ecke', avatar: '🏪' },
  { name: 'Café Morgenrot', avatar: '☕' },
  { name: 'Hotel Linde', avatar: '🏨' },
  { name: 'Sportverein', avatar: '⚽' },
  { name: 'Büro Schulz', avatar: '🏢' },
  { name: 'Kita Sonnenschein', avatar: '🧸' },
];

/** Privatkunden bestellen gemischte Pakete mit konkreten Waren. */
export const PRIVATE_CUSTOMERS: Customer[] = [
  { name: 'Lisa', avatar: '👩' },
  { name: 'Max (12)', avatar: '🧒' },
  { name: 'Oma Herta', avatar: '👵' },
  { name: 'Familie Yilmaz', avatar: '👨‍👩‍👧' },
  { name: 'Studi-WG', avatar: '🧑‍🎓' },
  { name: 'Herr Becker', avatar: '👨' },
  { name: 'Jana & Tom', avatar: '💑' },
];
