// Kunden des Packband-Modus (Card-Shop-Thema). Reine Daten, für andere Themen austauschbar.

export interface Customer {
  name: string;
  avatar: string;
}

/** Händler und Clubs bestellen Sammelpakete (mehrfach dieselbe Ware). */
export const BUSINESS_CUSTOMERS: Customer[] = [
  { name: 'Comic Corner', avatar: '🏪' },
  { name: 'Game Night Club', avatar: '🎲' },
  { name: 'Tournament Hall', avatar: '🏆' },
  { name: 'Hobby Haven', avatar: '🏬' },
  { name: 'Retro Arcade', avatar: '🕹️' },
  { name: 'School Card Club', avatar: '🏫' },
];

/** Sammler bestellen gemischte Pakete (konkrete, verschiedene Waren). */
export const PRIVATE_CUSTOMERS: Customer[] = [
  { name: 'Mia', avatar: '👩' },
  { name: 'Max (12)', avatar: '🧒' },
  { name: 'Grandpa Joe', avatar: '👴' },
  { name: 'The Lee Family', avatar: '👨‍👩‍👧' },
  { name: 'Dorm Room 4B', avatar: '🧑‍🎓' },
  { name: 'Collector Kim', avatar: '🧑‍🦰' },
  { name: 'Sam & Alex', avatar: '💑' },
];
