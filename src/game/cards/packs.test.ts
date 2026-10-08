import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRng, hashSeed } from '../random';
import { CARD_SET, getCard, SET_SIZE, type CardElement, type Rarity } from './cards';
import { addPack, EMPTY_COLLECTION, HOLO_CHANCE, openCardPack, ownedCount, PACK_SIZE } from './packs';

describe('Kartenset', () => {
  it('hat 32 Karten mit eindeutigen IDs und fortlaufenden Nummern', () => {
    expect(SET_SIZE).toBe(32);
    expect(new Set(CARD_SET.map((c) => c.id)).size).toBe(SET_SIZE);
    expect(CARD_SET.map((c) => c.no)).toEqual(Array.from({ length: SET_SIZE }, (_, i) => i + 1));
    expect(getCard('bs-08')?.name).toBe('Solar Dragon');
  });

  it('jede Karte hat Bild und Vorschau, jede Holo Rare ihre Holo-Maske (scripts/cards-import.py)', () => {
    const exists = (p: string) => fs.existsSync(new URL(`../../../public/assets/cards/${p}`, import.meta.url));
    for (const card of CARD_SET) {
      const nn = String(card.no).padStart(2, '0');
      expect(exists(`${nn}.webp`), `${nn}.webp`).toBe(true);
      expect(exists(`thumbs/${nn}.webp`), `thumbs/${nn}.webp`).toBe(true);
      expect(exists(`${nn}-holo.webp`), `${nn}-holo.webp`).toBe(card.rarity === 'holo');
    }
  });

  it('jedes Element hat 4 Common, 2 Uncommon, 1 Rare und 1 Holo Rare', () => {
    const elements: CardElement[] = ['fire', 'water', 'leaf', 'bolt'];
    for (const el of elements) {
      const count = (r: Rarity) => CARD_SET.filter((c) => c.element === el && c.rarity === r).length;
      expect([count('common'), count('uncommon'), count('rare'), count('holo')]).toEqual([4, 2, 1, 1]);
    }
  });
});

describe('Booster-Pack', () => {
  it('5 Karten: 3 verschiedene Commons, 1 Uncommon, Rare-Platz zuletzt', () => {
    for (let i = 0; i < 200; i++) {
      const pack = openCardPack(createRng(hashSeed(7, i)));
      expect(pack).toHaveLength(PACK_SIZE);
      expect(pack.slice(0, 3).every((c) => c.rarity === 'common')).toBe(true);
      expect(new Set(pack.slice(0, 3).map((c) => c.id)).size).toBe(3);
      expect(pack[3].rarity).toBe('uncommon');
      expect(['rare', 'holo']).toContain(pack[4].rarity);
    }
  });

  it('ist mit gleichem Seed deterministisch', () => {
    expect(openCardPack(createRng(42))).toEqual(openCardPack(createRng(42)));
  });

  it('Holo Rare kommt in etwa jedem vierten Pack', () => {
    const n = 4000;
    let holo = 0;
    for (let i = 0; i < n; i++) if (openCardPack(createRng(hashSeed(3, i)))[4].rarity === 'holo') holo++;
    expect(holo / n).toBeGreaterThan(HOLO_CHANCE - 0.03);
    expect(holo / n).toBeLessThan(HOLO_CHANCE + 0.03);
  });
});

describe('Sammlung', () => {
  it('zählt Karten, erkennt neue und merkt sie als ungesehen', () => {
    const a = openCardPack(createRng(1));
    const first = addPack(EMPTY_COLLECTION, a);
    expect(first.newIds).toEqual(a.map((c) => c.id));
    expect(first.collection.packsOpened).toBe(1);
    expect(ownedCount(first.collection)).toBe(5);
    expect(first.collection.unseen).toHaveLength(5);

    const again = addPack(first.collection, a);
    expect(again.newIds).toEqual([]);
    expect(again.collection.counts[a[0].id]).toBe(2);
    expect(ownedCount(again.collection)).toBe(5);
    expect(again.collection.unseen).toHaveLength(5);
  });
});
