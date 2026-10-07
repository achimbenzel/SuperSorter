import { useCallback } from 'react';
import type { CardDef } from '../game/cards/cards';
import { addPack, EMPTY_COLLECTION, type Collection } from '../game/cards/packs';
import { usePersistedState } from './usePersistedState';

export const COLLECTION_KEY = 'super-sorter/collection/v1';

/** Kartensammlung in localStorage (eigener Schlüssel, unabhängig vom Spielstand). */
export function useCollection() {
  const [collection, setCollection] = usePersistedState<Collection>(COLLECTION_KEY, EMPTY_COLLECTION);

  /** Geöffnetes Pack speichern; liefert die Karten, die neu in der Sammlung sind. */
  // Bewusst vom aktuellen Stand aus (kein Updater): Die neuen Karten werden sofort
  // gebraucht, und Packs werden ohnehin eins nach dem anderen geöffnet.
  const addOpenedPack = useCallback(
    (cards: CardDef[]): string[] => {
      const r = addPack(collection, cards);
      setCollection(r.collection);
      return r.newIds;
    },
    [collection, setCollection],
  );

  const markAllSeen = useCallback(() => setCollection((c) => (c.unseen.length ? { ...c, unseen: [] } : c)), [setCollection]);

  return { collection, addOpenedPack, markAllSeen };
}
