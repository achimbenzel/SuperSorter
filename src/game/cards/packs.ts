// Booster-Packs des Kartensets und die Sammlung des Spielers. Reine Logik, testbar.
//
// Ein Pack enthält 5 Karten: 3 verschiedene Commons, 1 Uncommon und einen
// Rare-Platz, der mit HOLO_CHANCE eine Holo Rare ist (sonst eine Rare). Die Rare
// kommt zuletzt, damit das Aufdecken spannend bleibt.

import { pick, shuffled, type Rng } from '../random';
import { cardsOfRarity, type CardDef } from './cards';

export const PACK_SIZE = 5;
export const HOLO_CHANCE = 0.25;
/** Preis eines Packs in Münzen. 0 = zum Testen kostenlos (später kostenpflichtig). */
export const PACK_PRICE = 0;

export function openCardPack(rng: Rng): CardDef[] {
  const commons = shuffled(rng, cardsOfRarity('common')).slice(0, 3);
  const uncommon = pick(rng, cardsOfRarity('uncommon'));
  const rare = pick(rng, cardsOfRarity(rng() < HOLO_CHANCE ? 'holo' : 'rare'));
  return [...commons, uncommon, rare];
}

export interface Collection {
  /** Anzahl je Karten-ID. */
  counts: Record<string, number>;
  packsOpened: number;
  /** Karten, die seit dem letzten Blick in die Sammlung neu dazugekommen sind. */
  unseen: string[];
}

export const EMPTY_COLLECTION: Collection = { counts: {}, packsOpened: 0, unseen: [] };

/** Fügt ein geöffnetes Pack hinzu. `newIds`: Karten, die vorher noch nicht im Besitz waren. */
export function addPack(collection: Collection, cards: CardDef[]): { collection: Collection; newIds: string[] } {
  const counts = { ...collection.counts };
  const newIds: string[] = [];
  for (const card of cards) {
    if (!counts[card.id] && !newIds.includes(card.id)) newIds.push(card.id);
    counts[card.id] = (counts[card.id] ?? 0) + 1;
  }
  const unseen = [...collection.unseen, ...newIds.filter((id) => !collection.unseen.includes(id))];
  return { collection: { counts, packsOpened: collection.packsOpened + 1, unseen }, newIds };
}

export const ownedCount = (collection: Collection) => Object.values(collection.counts).filter((n) => n > 0).length;
