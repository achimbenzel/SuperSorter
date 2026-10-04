import { describe, expect, it } from 'vitest';
import { applyTap, canTap, countItems, countOpenNeeds, hasAnyMove, isWon, routeOf } from './rules';
import { packBoard } from './testUtils';

describe('Packband: Routing', () => {
  it('passende Ware fliegt ins aktive Paket', () => {
    const b = packBoard({ stacks: [['cola-can']], table: [null, null], spots: ['cola-can*3'] });
    const r = applyTap(b, 0);
    expect(r.route.kind).toBe('spot');
    expect(r.board.spots[0]!.filled.filter(Boolean)).toHaveLength(1);
    expect(r.board.cart).toEqual([null, null]);
  });

  it('unpassende Ware landet auf dem ersten freien Packtisch-Platz', () => {
    const b = packBoard({ stacks: [['milk']], table: ['bread', null], spots: ['cola-can*3'] });
    const r = applyTap(b, 0);
    expect(r.route).toEqual({ kind: 'table', index: 1 });
    expect(r.board.cart[1]?.type).toBe('milk');
  });

  it('Packtisch voll und Ware passt nicht: Tap nicht erlaubt', () => {
    const b = packBoard({ stacks: [['milk'], ['cola-can']], table: ['bread'], spots: ['cola-can*3'] });
    expect(canTap(b, 0)).toBe(false);
    expect(canTap(b, 1)).toBe(true);
    expect(() => applyTap(b, 0)).toThrow();
  });

  it('zwei Packplätze: Ware geht ins erste Paket, das sie braucht', () => {
    const b = packBoard({ stacks: [['milk']], table: [null], spots: ['cola-can*2', 'milk*2'] });
    expect(routeOf(b, 'milk')).toEqual({ kind: 'spot', index: 1, pos: 0 });
  });

  it('gemischtes Paket nimmt jede gelistete Ware genau einmal', () => {
    const b = packBoard({ stacks: [['bread', 'bread']], table: [null], spots: ['bread,cheese'] });
    const once = applyTap(b, 0).board;
    expect(once.spots[0]!.filled[0]?.type).toBe('bread');
    expect(routeOf(once, 'bread')).toEqual({ kind: 'table', index: 0 });
  });

  it('nimmt immer nur die oberste Ware (ein Tap = eine Ware)', () => {
    const b = packBoard({ stacks: [['cola-can', 'cola-can']], table: [null], spots: ['cola-can*3'] });
    expect(applyTap(b, 0).board.stacks[0]).toHaveLength(1);
  });

  it('Mystery: nach dem Entnehmen wird die nächste Ware ausgepackt', () => {
    const b = packBoard({ stacks: [['?bread', 'cola-can']], table: [null], spots: ['cola-can*3'] });
    const r = applyTap(b, 0);
    expect(r.revealed?.type).toBe('bread');
    expect(r.board.stacks[0][0].hidden).toBe(false);
  });
});

describe('Packband: Versand und Kettenreaktion', () => {
  it('volles Paket wird verschickt, das nächste rückt an denselben Platz', () => {
    const b = packBoard({ stacks: [['cola-can']], table: [null], spots: ['cola-can*1'], queue: ['milk*2'] });
    const r = applyTap(b, 0);
    expect(r.shipped).toEqual([expect.objectContaining({ spot: 0, chain: 0 })]);
    expect(r.board.spots[0]!.box.needs).toEqual(['milk', 'milk']);
    expect(r.board.queue).toHaveLength(0);
    expect(r.board.shipped).toBe(1);
  });

  it('Ware vom Packtisch springt automatisch ins neue Paket', () => {
    const b = packBoard({ stacks: [['cola-can']], table: ['milk', null], spots: ['cola-can*1'], queue: ['milk*2'] });
    const r = applyTap(b, 0);
    expect(r.fed).toEqual([{ itemIds: [b.cart[0]!.id], chain: 1 }]);
    expect(r.board.cart).toEqual([null, null]);
    expect(r.board.spots[0]!.filled.filter(Boolean)).toHaveLength(1);
  });

  it('Kettenreaktion: mehrere Pakete in einem Zug', () => {
    const b = packBoard({
      stacks: [['cola-can']],
      table: ['milk', 'milk', 'bread'],
      spots: ['cola-can*1'],
      queue: ['milk*2', 'bread*1', 'apple*1'],
    });
    const r = applyTap(b, 0);
    expect(r.shipped.map((s) => s.chain)).toEqual([0, 1, 2]);
    expect(r.board.shipped).toBe(3);
    expect(r.board.spots[0]!.box.needs).toEqual(['apple']);
    expect(r.board.cart).toEqual([null, null, null]);
  });

  it('Gold zählt auch, wenn es per Kette ins Paket springt', () => {
    const b = packBoard({ stacks: [['cola-can']], table: ['$milk'], spots: ['cola-can*1'], queue: ['milk*1'] });
    expect(applyTap(b, 0).goldPacked).toBe(1);
  });

  it('Sieg, wenn alle Pakete verschickt sind', () => {
    const b = packBoard({ stacks: [['cola-can']], table: [null], spots: ['cola-can*1'] });
    expect(isWon(b)).toBe(false);
    expect(isWon(applyTap(b, 0).board)).toBe(true);
  });

  it('Waren und offene Stellen bleiben im Gleichgewicht', () => {
    const b = packBoard({ stacks: [['milk', 'cola-can'], ['cola-can']], table: [null, null], spots: ['cola-can*2'], queue: ['milk*1'] });
    expect(countItems(b)).toBe(countOpenNeeds(b));
    const after = applyTap(applyTap(b, 0).board, 1).board;
    expect(countItems(after)).toBe(countOpenNeeds(after) + 0);
  });
});

describe('Packband: Niederlage', () => {
  it('keine Kiste antippbar -> keine Züge', () => {
    const b = packBoard({ stacks: [['milk'], ['bread']], table: ['cheese'], spots: ['cola-can*1'], queue: ['milk*1', 'bread*1', 'cheese*1'] });
    expect(hasAnyMove(b)).toBe(false);
  });
});
