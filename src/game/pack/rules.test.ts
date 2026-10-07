import { describe, expect, it } from 'vitest';
import { applyTap, canTap, countItems, countOpenNeeds, hasAnyMove, isWon, routeOf } from './rules';
import { packBoard } from './testUtils';

describe('Packband: Routing', () => {
  it('passende Ware fliegt ins aktive Paket', () => {
    const b = packBoard({ stacks: [['pack-fire']], table: [null, null], spots: ['pack-fire*3'] });
    const r = applyTap(b, 0);
    expect(r.route.kind).toBe('spot');
    expect(r.board.spots[0]!.filled.filter(Boolean)).toHaveLength(1);
    expect(r.board.cart).toEqual([null, null]);
  });

  it('unpassende Ware landet auf dem ersten freien Packtisch-Platz', () => {
    const b = packBoard({ stacks: [['sleeves']], table: ['deck-box', null], spots: ['pack-fire*3'] });
    const r = applyTap(b, 0);
    expect(r.route).toEqual({ kind: 'table', index: 1 });
    expect(r.board.cart[1]?.type).toBe('sleeves');
  });

  it('Packtisch voll und Ware passt nicht: Tap nicht erlaubt', () => {
    const b = packBoard({ stacks: [['sleeves'], ['pack-fire']], table: ['deck-box'], spots: ['pack-fire*3'] });
    expect(canTap(b, 0)).toBe(false);
    expect(canTap(b, 1)).toBe(true);
    expect(() => applyTap(b, 0)).toThrow();
  });

  it('zwei Packplätze: Ware geht ins erste Paket, das sie braucht', () => {
    const b = packBoard({ stacks: [['sleeves']], table: [null], spots: ['pack-fire*2', 'sleeves*2'] });
    expect(routeOf(b, 'sleeves')).toEqual({ kind: 'spot', index: 1, pos: 0 });
  });

  it('gemischtes Paket nimmt jede gelistete Ware genau einmal', () => {
    const b = packBoard({ stacks: [['deck-box', 'deck-box']], table: [null], spots: ['deck-box,figure'] });
    const once = applyTap(b, 0).board;
    expect(once.spots[0]!.filled[0]?.type).toBe('deck-box');
    expect(routeOf(once, 'deck-box')).toEqual({ kind: 'table', index: 0 });
  });

  it('nimmt immer nur die oberste Ware (ein Tap = eine Ware)', () => {
    const b = packBoard({ stacks: [['pack-fire', 'pack-fire']], table: [null], spots: ['pack-fire*3'] });
    expect(applyTap(b, 0).board.stacks[0]).toHaveLength(1);
  });

  it('Mystery: nach dem Entnehmen wird die nächste Ware ausgepackt', () => {
    const b = packBoard({ stacks: [['?deck-box', 'pack-fire']], table: [null], spots: ['pack-fire*3'] });
    const r = applyTap(b, 0);
    expect(r.revealed?.type).toBe('deck-box');
    expect(r.board.stacks[0][0].hidden).toBe(false);
  });
});

describe('Packband: Versand und Kettenreaktion', () => {
  it('volles Paket wird verschickt, das nächste rückt an denselben Platz', () => {
    const b = packBoard({ stacks: [['pack-fire']], table: [null], spots: ['pack-fire*1'], queue: ['sleeves*2'] });
    const r = applyTap(b, 0);
    expect(r.shipped).toEqual([expect.objectContaining({ spot: 0, chain: 0 })]);
    expect(r.board.spots[0]!.box.needs).toEqual(['sleeves', 'sleeves']);
    expect(r.board.queue).toHaveLength(0);
    expect(r.board.shipped).toBe(1);
  });

  it('Ware vom Packtisch springt automatisch ins neue Paket', () => {
    const b = packBoard({ stacks: [['pack-fire']], table: ['sleeves', null], spots: ['pack-fire*1'], queue: ['sleeves*2'] });
    const r = applyTap(b, 0);
    expect(r.fed).toEqual([{ itemIds: [b.cart[0]!.id], chain: 1 }]);
    expect(r.board.cart).toEqual([null, null]);
    expect(r.board.spots[0]!.filled.filter(Boolean)).toHaveLength(1);
  });

  it('Kettenreaktion: mehrere Pakete in einem Zug', () => {
    const b = packBoard({
      stacks: [['pack-fire']],
      table: ['sleeves', 'sleeves', 'deck-box'],
      spots: ['pack-fire*1'],
      queue: ['sleeves*2', 'deck-box*1', 'dice*1'],
    });
    const r = applyTap(b, 0);
    expect(r.shipped.map((s) => s.chain)).toEqual([0, 1, 2]);
    expect(r.board.shipped).toBe(3);
    expect(r.board.spots[0]!.box.needs).toEqual(['dice']);
    expect(r.board.cart).toEqual([null, null, null]);
  });

  it('Gold zählt auch, wenn es per Kette ins Paket springt', () => {
    const b = packBoard({ stacks: [['pack-fire']], table: ['$sleeves'], spots: ['pack-fire*1'], queue: ['sleeves*1'] });
    expect(applyTap(b, 0).goldPacked).toBe(1);
  });

  it('Sieg, wenn alle Pakete verschickt sind', () => {
    const b = packBoard({ stacks: [['pack-fire']], table: [null], spots: ['pack-fire*1'] });
    expect(isWon(b)).toBe(false);
    expect(isWon(applyTap(b, 0).board)).toBe(true);
  });

  it('Waren und offene Stellen bleiben im Gleichgewicht', () => {
    const b = packBoard({ stacks: [['sleeves', 'pack-fire'], ['pack-fire']], table: [null, null], spots: ['pack-fire*2'], queue: ['sleeves*1'] });
    expect(countItems(b)).toBe(countOpenNeeds(b));
    const after = applyTap(applyTap(b, 0).board, 1).board;
    expect(countItems(after)).toBe(countOpenNeeds(after) + 0);
  });
});

describe('Packband: Niederlage', () => {
  it('keine Kiste antippbar -> keine Züge', () => {
    const b = packBoard({ stacks: [['sleeves'], ['deck-box']], table: ['figure'], spots: ['pack-fire*1'], queue: ['sleeves*1', 'deck-box*1', 'figure*1'] });
    expect(hasAnyMove(b)).toBe(false);
  });
});
