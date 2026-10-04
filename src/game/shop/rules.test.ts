import { describe, expect, it } from 'vitest';
import { applyMove, findShortage, hasAnyMove, isLegal, isWon, listMoves, moveCount, openPositions, whoNeeds } from './rules';
import { shopBoard } from './testUtils';

const stack = (index: number) => ({ kind: 'stack' as const, index });
const cart = (index: number) => ({ kind: 'cart' as const, index });
const station = (index: number) => ({ kind: 'station' as const, index });

describe('Versand: Was passt in ein Paket?', () => {
  it('Sammelbestellung nimmt nur genau diese Ware', () => {
    const b = shopBoard({ stacks: [['milk'], ['bread']], stations: ['bulk:milk:3'] });
    expect(moveCount(b, { from: stack(0), to: station(0) })).toBe(1);
    expect(moveCount(b, { from: stack(1), to: station(0) })).toBe(0);
  });

  it('Serien-Set nimmt jede Ware der Serie, auch verschiedene', () => {
    const b = shopBoard({ stacks: [['cola-can'], ['orange-juice'], ['bread']], stations: ['series:drinks:3'] });
    expect(moveCount(b, { from: stack(0), to: station(0) })).toBe(1);
    expect(moveCount(b, { from: stack(1), to: station(0) })).toBe(1);
    expect(moveCount(b, { from: stack(2), to: station(0) })).toBe(0); // Brot ist Frühstück
  });

  it('Wunschliste nimmt jede gelistete Ware genau so oft wie gelistet', () => {
    const b0 = shopBoard({ stacks: [['bread', 'bread']], stations: ['list:bread,cheese'] });
    // Multi-Move: zwei Brote sichtbar, aber nur eine Brot-Position offen
    expect(moveCount(b0, { from: stack(0), to: station(0) })).toBe(1);
    const b1 = applyMove(b0, { from: stack(0), to: station(0) }).board;
    expect(moveCount(b1, { from: stack(0), to: station(0) })).toBe(0);
  });

  it('Multi-Move füllt mehrere passende Positionen auf einmal', () => {
    const b = shopBoard({ stacks: [['apple', 'milk', 'milk']], stations: ['bulk:milk:3'] });
    const r = applyMove(b, { from: stack(0), to: station(0) });
    expect(r.moved).toHaveLength(2);
    expect(r.board.stations[0].filled.filter(Boolean)).toHaveLength(2);
  });

  it('Reihenfolge im Paket ist egal', () => {
    const b = shopBoard({ stacks: [['milk'], ['cheese'], ['bread']], stations: ['list:bread,cheese,milk'] });
    let x = applyMove(b, { from: stack(0), to: station(0) }).board;
    x = applyMove(x, { from: stack(1), to: station(0) }).board;
    expect(openPositions(x.stations[0], 'bread')).toEqual([0]);
  });

  it('Ablage nimmt ein Item, Ablage -> Ablage ist verboten', () => {
    const b = shopBoard({ stacks: [['milk', 'milk']], cart: [null, 'bread'], stations: ['bulk:milk:3'] });
    expect(moveCount(b, { from: stack(0), to: cart(0) })).toBe(1);
    expect(moveCount(b, { from: cart(1), to: cart(0) })).toBe(0);
  });

  it('Mystery: nach dem Entnehmen wird die nächste Ware ausgepackt', () => {
    const b = shopBoard({ stacks: [['?bread', 'milk']], stations: ['bulk:milk:2'] });
    const r = applyMove(b, { from: stack(0), to: station(0) });
    expect(r.revealed?.type).toBe('bread');
    expect(r.board.stacks[0][0].hidden).toBe(false);
  });
});

describe('Versand: Verschicken', () => {
  it('volles Paket wird verschickt, der nächste Auftrag rückt an die Station', () => {
    const b = shopBoard({ stacks: [['milk', 'milk']], stations: ['bulk:milk:2'], queue: ['bulk:bread:2'] });
    const r = applyMove(b, { from: stack(0), to: station(0) });
    expect(r.shipped?.station).toBe(0);
    expect(r.shipped?.items).toHaveLength(2);
    expect(r.board.shipped).toBe(1);
    expect(r.board.queue).toHaveLength(0);
    expect(r.board.stations[0].order?.needs[0]).toEqual({ kind: 'type', type: 'bread' });
    expect(r.board.stations[0].filled).toEqual([null, null]);
  });

  it('ohne weitere Aufträge bleibt die Station leer', () => {
    const b = shopBoard({ stacks: [['milk']], stations: ['bulk:milk:1', 'bulk:bread:1'] });
    const r = applyMove(b, { from: stack(0), to: station(0) });
    expect(r.board.stations[0].order).toBeNull();
    expect(moveCount(r.board, { from: stack(0), to: station(0) })).toBe(0);
  });

  it('meldet Gold-Waren im Paket', () => {
    const b = shopBoard({ cart: ['$milk'], stations: ['bulk:milk:2'] });
    expect(applyMove(b, { from: cart(0), to: station(0) }).goldPlaced).toBe(1);
  });

  it('Sieg, wenn alle Aufträge verschickt sind', () => {
    const b = shopBoard({ stacks: [['milk', 'milk']], stations: ['bulk:milk:2'] });
    expect(isWon(b)).toBe(false);
    expect(isWon(applyMove(b, { from: stack(0), to: station(0) }).board)).toBe(true);
  });
});

describe('Versand: Niederlage', () => {
  it('Deadlock: nichts passt, Ablage voll', () => {
    const b = shopBoard({ stacks: [['milk', 'bread']], cart: ['cheese'], stations: ['bulk:milk:1'], queue: [] });
    expect(hasAnyMove(b)).toBe(false);
    expect(listMoves(b)).toHaveLength(0);
  });

  it('Engpass: letzte Ware falsch verplant (Typ)', () => {
    // Ein Brot im Spiel. Steckt es im Serien-Set, fehlt es der Wunschliste.
    const b = shopBoard({ stacks: [['cheese', 'bread']], stations: ['series:breakfast:1', 'list:bread'] });
    expect(findShortage(b)).toBeNull();
    const wrong = applyMove(b, { from: stack(0), to: station(0) }).board;
    expect(findShortage(wrong)).toEqual({ type: 'bread' });
  });

  it('Züge, die einen Engpass erzeugen würden, sind nicht erlaubt', () => {
    const b = shopBoard({ stacks: [['cheese', 'bread']], stations: ['series:breakfast:1', 'list:bread'] });
    const wrong = { from: stack(0), to: station(0) };
    expect(moveCount(b, wrong)).toBe(1); // passt eigentlich hinein …
    expect(isLegal(b, wrong)).toBe(false); // … nimmt aber der Wunschliste das Brot weg
    expect(listMoves(b)).not.toContainEqual(wrong);
    expect(listMoves(b)).toContainEqual({ from: stack(0), to: station(1) });
    expect(whoNeeds(b, { type: 'bread' })).toBe('Test');
  });

  it('Engpass: Serie reicht nicht mehr', () => {
    const b = shopBoard({ stacks: [['milk', 'cola-can']], stations: ['series:drinks:1', 'series:breakfast:1'], queue: ['series:drinks:1'] });
    expect(findShortage(b)).toEqual({ series: 'drinks' });
  });

  it('wartende Aufträge zählen bei der Engpass-Prüfung mit', () => {
    const b = shopBoard({ stacks: [['milk', 'milk']], stations: ['series:breakfast:1'], queue: ['bulk:milk:1'] });
    expect(findShortage(b)).toBeNull();
  });
});
