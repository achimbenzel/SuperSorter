import { describe, expect, it } from 'vitest';
import {
  applyMove,
  findHopelessType,
  hasAnyMove,
  isSlotSolved,
  isWon,
  listMoves,
  moveCount,
  pickableItems,
  slotSpaceFor,
} from './rules';
import { board, types } from './testUtils';

const stack = (index: number) => ({ kind: 'stack' as const, index });
const cart = (index: number) => ({ kind: 'cart' as const, index });
const slot = (index: number) => ({ kind: 'slot' as const, index });

describe('Regelprüfung: Was darf in ein Fach?', () => {
  it('leeres Fach nimmt jeden Typ', () => {
    const b = board({ slots: [[]] });
    expect(slotSpaceFor(b.slots[0], 'milk')).toBe(3);
  });

  it('Fach nimmt nur gleichen Typ auf das oberste Item', () => {
    const b = board({ slots: [['milk']] });
    expect(slotSpaceFor(b.slots[0], 'milk')).toBe(2);
    expect(slotSpaceFor(b.slots[0], 'bread')).toBe(0);
  });

  it('volles Fach nimmt nichts mehr', () => {
    const b = board({ slots: [['milk', 'milk', 'milk']] });
    expect(slotSpaceFor(b.slots[0], 'milk')).toBe(0);
  });

  it('geschlossenes Fach nimmt nichts', () => {
    const b = board({ slots: ['closed'] });
    expect(slotSpaceFor(b.slots[0], 'milk')).toBe(0);
  });

  it('ungültiger Zug in fremdes Fach hat moveCount 0 und applyMove wirft', () => {
    const b = board({ stacks: [['apple']], slots: [['milk']] });
    const mv = { from: stack(0), to: slot(0) };
    expect(moveCount(b, mv)).toBe(0);
    expect(() => applyMove(b, mv)).toThrow();
  });

  it('Wagen nimmt genau ein Item, Wagen -> Wagen ist verboten', () => {
    const b = board({ stacks: [['apple', 'apple']], cart: [null, 'milk', null] });
    expect(moveCount(b, { from: stack(0), to: cart(0) })).toBe(1);
    expect(moveCount(b, { from: stack(0), to: cart(1) })).toBe(0);
    expect(moveCount(b, { from: cart(1), to: cart(0) })).toBe(0);
  });
});

describe('Multi-Move', () => {
  it('nimmt alle gleichen sichtbaren Items oben vom Stapel mit', () => {
    const b = board({ stacks: [['bread', 'milk', 'milk', 'milk']], slots: [[]] });
    expect(types(pickableItems(b, stack(0)))).toEqual(['milk', 'milk', 'milk']);
    const r = applyMove(b, { from: stack(0), to: slot(0) });
    expect(types(r.board.slots[0].items)).toEqual(['milk', 'milk', 'milk']);
    expect(types(r.board.stacks[0])).toEqual(['bread']);
  });

  it('bewegt nur so viele, wie im Ziel Platz ist', () => {
    const b = board({ stacks: [['milk', 'milk', 'milk']], slots: [['milk', 'milk']] });
    const r = applyMove(b, { from: stack(0), to: slot(0) });
    expect(r.moved).toHaveLength(1);
    expect(r.board.stacks[0]).toHaveLength(2);
    expect(r.solvedSlot).toBe(0);
  });

  it('verdeckte Items wandern nie mit, auch wenn sie vom gleichen Typ sind', () => {
    const b = board({ stacks: [['?milk', '?milk', 'milk']], slots: [[]] });
    expect(pickableItems(b, stack(0))).toHaveLength(1);
  });

  it('in den Wagen geht immer nur ein Item', () => {
    const b = board({ stacks: [['milk', 'milk']], cart: [null] });
    const r = applyMove(b, { from: stack(0), to: cart(0) });
    expect(r.board.stacks[0]).toHaveLength(1);
    expect(r.board.cart[0]?.type).toBe('milk');
  });
});

describe('Mystery-Reveal', () => {
  it('deckt das neue oberste Item auf, wenn das alte entfernt wird', () => {
    const b = board({ stacks: [['?apple', '?bread', 'milk']], slots: [[]] });
    const r = applyMove(b, { from: stack(0), to: slot(0) });
    expect(r.revealed?.type).toBe('bread');
    const s = r.board.stacks[0];
    expect(s[s.length - 1].hidden).toBe(false);
    expect(s[0].hidden).toBe(true); // nur das oberste wird aufgedeckt
  });

  it('verändert das alte Board nicht (Immutability für Undo)', () => {
    const b = board({ stacks: [['?bread', 'milk']], slots: [[]] });
    applyMove(b, { from: stack(0), to: slot(0) });
    expect(b.stacks[0][0].hidden).toBe(true);
    expect(b.stacks[0]).toHaveLength(2);
    expect(b.slots[0].items).toHaveLength(0);
  });

  it('meldet goldene Items, die ins Fach gelegt werden', () => {
    const b = board({ stacks: [['milk']], cart: ['$apple'], slots: [[], []] });
    const toCart = applyMove(b, { from: cart(0), to: slot(0) });
    expect(toCart.goldPlaced).toBe(1);
    const plain = applyMove(b, { from: stack(0), to: slot(1) });
    expect(plain.goldPlaced).toBe(0);
  });
});

describe('Gelöste Fächer', () => {
  it('ein volles sortenreines Fach ist gelöst und öffnet das nächste geschlossene Fach', () => {
    const b = board({ stacks: [['milk']], slots: [['milk', 'milk'], 'closed', 'closed'] });
    const r = applyMove(b, { from: stack(0), to: slot(0) });
    expect(isSlotSolved(r.board.slots[0])).toBe(true);
    expect(r.solvedSlot).toBe(0);
    expect(r.openedSlot).toBe(1);
    expect(r.board.slots[1].closed).toBe(false);
    expect(r.board.slots[2].closed).toBe(true);
  });

  it('gelöste Fächer nehmen nichts mehr an (gesperrt)', () => {
    const b = board({ stacks: [['milk']], slots: [['milk', 'milk', 'milk']] });
    expect(listMoves(b)).toHaveLength(0);
  });
});

describe('Sieg, Deadlock, hoffnungslos', () => {
  it('Sieg, wenn Karton und Wagen leer und alle Fächer gelöst', () => {
    expect(isWon(board({ stacks: [[]], cart: [null], slots: [['milk', 'milk', 'milk'], []] }))).toBe(true);
    expect(isWon(board({ stacks: [[]], cart: ['milk'], slots: [['milk', 'milk'], []] }))).toBe(false);
  });

  it('Deadlock: kein Fach passt und Wagen voll', () => {
    const b = board({ stacks: [['apple'], ['bread']], cart: ['cheese'], slots: [['milk'], ['chips']] });
    expect(hasAnyMove(b)).toBe(false);
  });

  it('kein Deadlock, solange ein Wagenplatz frei ist', () => {
    const b = board({ stacks: [['apple']], cart: [null], slots: [['milk']] });
    expect(hasAnyMove(b)).toBe(true);
  });

  it('erkennt einen auf zwei Fächer verteilten Typ als hoffnungslos', () => {
    // 3 Milch insgesamt (1 Fach nötig), aber in 2 Fächern angefangen.
    const b = board({ stacks: [['milk']], slots: [['milk'], ['milk'], []] });
    expect(findHopelessType(b)).toBe('milk');
  });

  it('doppelte Typen dürfen zwei Fächer belegen', () => {
    // 6 Milch = 2 Fächer nötig -> Verteilung auf 2 Fächer ist ok.
    const b = board({ stacks: [['milk', 'milk', 'milk', 'milk']], slots: [['milk'], ['milk'], []] });
    expect(findHopelessType(b)).toBeNull();
  });
});
