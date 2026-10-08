// Kartenset des Card Shops ("Base Set"): 32 Karten in 4 Elementen.
//
// Pro Element: 4 Common, 2 Uncommon, 1 Rare, 1 Holo Rare. Die Illustrationen sind
// eigene Vektorzeichnungen (scripts/card-art.mjs -> public/assets/cards/). Reine Daten.

export type CardElement = 'fire' | 'water' | 'leaf' | 'bolt';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'holo';

export interface CardDef {
  /** Stabile ID für den Spielstand, z. B. "bs-07". */
  id: string;
  /** Sammelnummer im Set (1–32). */
  no: number;
  name: string;
  element: CardElement;
  rarity: Rarity;
  hp: number;
  /** Name der Illustration (public/assets/cards/<art>.svg|.webp), aus dem Kartennamen. */
  art: string;
  attack: { name: string; damage: number };
}

export const SET_NAME = 'Base Set';

export const ELEMENT_LABEL: Record<CardElement, string> = {
  fire: 'Fire',
  water: 'Water',
  leaf: 'Leaf',
  bolt: 'Bolt',
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  holo: 'Holo Rare',
};

/** Seltenheitssymbol unten rechts auf der Karte. */
export const RARITY_SYMBOL: Record<Rarity, string> = {
  common: '●',
  uncommon: '◆',
  rare: '★',
  holo: '★',
};

type Row = [name: string, hp: number, attack: string, damage: number];

// Reihenfolge je Element: 4 × Common, 2 × Uncommon, Rare, Holo Rare.
const RARITY_BY_SLOT: Rarity[] = ['common', 'common', 'common', 'common', 'uncommon', 'uncommon', 'rare', 'holo'];

// prettier-ignore
const ROWS: Record<CardElement, Row[]> = {
  fire: [
    ['Ember Fox', 50, 'Tail Flick', 10],
    ['Flare Gecko', 40, 'Hot Lick', 10],
    ['Lava Boar', 60, 'Charge', 20],
    ['Blaze Rooster', 50, 'Peck', 10],
    ['Cinder Pup', 70, 'Fire Fang', 30],
    ['Magma Scorpion', 80, 'Molten Sting', 40],
    ['Inferno Lion', 100, 'Roaring Blaze', 60],
    ['Solar Dragon', 130, 'Sunburst', 90],
  ],
  water: [
    ['Bubble Fish', 40, 'Bubble', 10],
    ['Tide Crab', 60, 'Pinch', 20],
    ['Puddle Frog', 50, 'Splash', 10],
    ['Splash Seal', 60, 'Belly Slide', 20],
    ['Ink Octopus', 70, 'Ink Cloud', 30],
    ['Reef Shark', 90, 'Bite', 40],
    ['Wave Dolphin', 100, 'Tidal Leap', 60],
    ['Abyss Whale', 150, 'Deep Surge', 90],
  ],
  leaf: [
    ['Leaf Larva', 40, 'String Shot', 10],
    ['Moss Snail', 60, 'Slime', 10],
    ['Thorn Hedgehog', 50, 'Spike Roll', 20],
    ['Clover Bunny', 50, 'Lucky Hop', 20],
    ['Bloom Butterfly', 70, 'Pollen Dust', 30],
    ['Grove Turtle', 90, 'Shell Bash', 40],
    ['Forest Stag', 110, 'Antler Rush', 60],
    ['Jade Peacock', 120, 'Emerald Fan', 90],
  ],
  bolt: [
    ['Spark Mouse', 40, 'Zap', 10],
    ['Buzz Bee', 40, 'Buzz Sting', 20],
    ['Static Hamster', 50, 'Fluff Shock', 10],
    ['Volt Chick', 40, 'Spark Peep', 10],
    ['Thunder Bat', 70, 'Sonic Bolt', 30],
    ['Storm Cheetah', 80, 'Lightning Dash', 40],
    ['Thunder Eagle', 100, 'Sky Strike', 60],
    ['Plasma Unicorn', 130, 'Plasma Horn', 90],
  ],
};

const ELEMENT_ORDER: CardElement[] = ['fire', 'water', 'leaf', 'bolt'];

export const CARD_SET: CardDef[] = ELEMENT_ORDER.flatMap((element, e) =>
  ROWS[element].map(([name, hp, attack, damage], i): CardDef => {
    const no = e * ROWS[element].length + i + 1;
    return {
      id: `bs-${String(no).padStart(2, '0')}`,
      no,
      name,
      element,
      rarity: RARITY_BY_SLOT[i],
      hp,
      art: name.toLowerCase().replace(/\s+/g, '-'),
      attack: { name: attack, damage },
    };
  }),
);

export const SET_SIZE = CARD_SET.length;

const BY_ID = new Map(CARD_SET.map((c) => [c.id, c]));
export const getCard = (id: string): CardDef | undefined => BY_ID.get(id);

export const cardsOfRarity = (rarity: Rarity) => CARD_SET.filter((c) => c.rarity === rarity);
