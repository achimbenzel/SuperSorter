import { describe, expect, it } from 'vitest';
import { generatePackLevel } from './generator';
import { COINS_PER_BOX, COMBO_BONUS, getPackLevelConfig, PACK_GOLD_BONUS } from './levels';
import { createPackState, packReducer, packStarRating, type PackAction } from './reducer';
import { listTaps } from './rules';
import { solvePack } from './solver';
import { packBoard } from './testUtils';
import type { PackBoard, PackGameState } from './types';

const cfg = { ...getPackLevelConfig(11), boosters: { undo: 3, extra: 1, peek: 2, shuffle: 1 } };
const start = (b: PackBoard): PackGameState => createPackState(cfg, b);
const run = (s: PackGameState, ...actions: PackAction[]) => actions.reduce(packReducer, s);
const tap = (index: number): PackAction => ({ type: 'TAP_STACK', index });

describe('Packband-Reducer: Tap', () => {
  it('ein Tap ist ein kompletter Zug', () => {
    const b = packBoard({ stacks: [['?sleeves', 'pack-fire']], table: [null], spots: ['pack-fire*2'], queue: ['sleeves*1'] });
    const s = run(start(b), tap(0));
    expect(s.moves).toBe(1);
    expect(s.history).toHaveLength(1);
    expect(s.board.spots[0]!.filled[0]?.type).toBe('pack-fire');
    expect(s.fx).toContainEqual(expect.objectContaining({ kind: 'revealed', itemId: s.board.stacks[0][0].id }));
  });

  it('ungültiger Tap: Shake-Event auf die Kiste, kein Zug', () => {
    const b = packBoard({ stacks: [['sleeves'], ['pack-fire']], table: ['deck-box'], spots: ['pack-fire*2'], queue: ['sleeves*1', 'deck-box*1'] });
    const s = run(start(b), tap(0));
    expect(s.board).toBe(b);
    expect(s.moves).toBe(0);
    expect(s.fx).toEqual([expect.objectContaining({ kind: 'invalid', stack: 0 })]);
  });

  it('Versand, Kettenreaktion, Kombo und Münzen', () => {
    const b = packBoard({
      stacks: [['pack-fire'], ['dice']],
      table: ['sleeves', 'sleeves', 'deck-box'],
      spots: ['pack-fire*1'],
      queue: ['sleeves*2', 'deck-box*1', 'dice*1'],
    });
    const s = run(start(b), tap(0));
    const shipped = s.fx.filter((e) => e.kind === 'shipped');
    expect(shipped.map((e) => (e.kind === 'shipped' ? e.chain : -1))).toEqual([0, 1, 2]);
    expect(s.fx.filter((e) => e.kind === 'fed')).toHaveLength(2);
    const bonus = (1 + 2) * COMBO_BONUS;
    expect(s.fx).toContainEqual(expect.objectContaining({ kind: 'combo', count: 3, bonus }));
    expect(s.fx).toContainEqual(expect.objectContaining({ kind: 'coins', coinTarget: 'spot-0', amount: 3 * COINS_PER_BOX + bonus }));
    expect(s.levelCoins).toBe(3 * COINS_PER_BOX + bonus);
    expect(s.status).toBe('playing');
    expect(run(s, tap(1)).status).toBe('won');
  });

  it('Gold im Paket bringt Bonus-Münzen', () => {
    const b = packBoard({ stacks: [['pack-fire']], table: ['$sleeves'], spots: ['pack-fire*1'], queue: ['sleeves*1'] });
    expect(run(start(b), tap(0)).levelCoins).toBe(2 * COINS_PER_BOX + COMBO_BONUS + PACK_GOLD_BONUS);
  });

  it('kein Tap mehr möglich: verloren', () => {
    const b = packBoard({ stacks: [['sleeves'], ['deck-box', 'pack-fire']], table: [null], spots: ['pack-fire*2'], queue: ['sleeves*1', 'deck-box*1'] });
    // Cola ins Paket, Brot auf den Packtisch -> Milch passt nirgends, Packtisch voll.
    const s = run(start(b), tap(1), tap(1));
    expect(s.status).toBe('lost');
    expect(run(s, tap(0))).toBe(s);
  });
});

describe('Packband-Reducer: Booster', () => {
  const deadlock = () => {
    const b = packBoard({ stacks: [['sleeves'], ['deck-box', 'pack-fire']], table: [null], spots: ['pack-fire*2'], queue: ['sleeves*1', 'deck-box*1'] });
    return run(start(b), tap(1), tap(1));
  };

  it('Rückgängig stellt Board und Münzen wieder her', () => {
    const b = packBoard({ stacks: [['sleeves'], ['pack-fire']], table: [null], spots: ['pack-fire*1'], queue: ['sleeves*1'] });
    const s = run(start(b), tap(1));
    expect(s.levelCoins).toBe(COINS_PER_BOX);
    const u = run(s, { type: 'UNDO' });
    expect(u.board).toEqual(b);
    expect(u.levelCoins).toBe(0);
    expect(u.boosters.undo).toBe(2);
    expect(u.boostersUsed).toBe(1);
  });

  it('Rückgängig rettet auch aus der Niederlage', () => {
    const u = run(deadlock(), { type: 'UNDO' });
    expect(u.status).toBe('playing');
  });

  it('Extra-Platz erweitert den Packtisch und rettet die Sackgasse', () => {
    const s = run(deadlock(), { type: 'USE_EXTRA' });
    expect(s.board.cart).toHaveLength(2);
    expect(s.status).toBe('playing');
    expect(s.boosters.extra).toBe(0);
    // Der Extra-Platz bleibt nach Rückgängig erhalten.
    expect(run(s, { type: 'UNDO' }).board.cart).toHaveLength(2);
  });

  it('Lupe: scharf schalten, verpackte Ware ansehen, verbraucht einen', () => {
    const b = packBoard({ stacks: [['?sleeves', 'pack-fire']], table: [null], spots: ['pack-fire*1'], queue: ['sleeves*1'] });
    const hiddenId = b.stacks[0][0].id;
    let s = run(start(b), { type: 'TOGGLE_PEEK' });
    expect(s.peekArmed).toBe(true);
    s = run(s, { type: 'PEEK_ITEM', itemId: b.stacks[0][1].id });
    expect(s.peekItemId).toBeNull();
    s = run(s, { type: 'PEEK_ITEM', itemId: hiddenId });
    expect(s.peekItemId).toBe(hiddenId);
    expect(s.boosters.peek).toBe(1);
    expect(run(s, { type: 'END_PEEK' }).peekItemId).toBeNull();
  });

  it('Lupe ohne verpackte Waren bleibt aus', () => {
    const b = packBoard({ stacks: [['pack-fire']], table: [null], spots: ['pack-fire*1'] });
    expect(run(start(b), { type: 'TOGGLE_PEEK' }).peekArmed).toBe(false);
  });

  it('Mischen: lösbar, gleiche Waren, per Rückgängig umkehrbar', () => {
    const c = getPackLevelConfig(11);
    const g = generatePackLevel(c);
    const s0 = createPackState({ ...c, boosters: cfg.boosters }, g.board);
    const s = run(s0, { type: 'SHUFFLE' });
    expect(s.fx).toContainEqual(expect.objectContaining({ kind: 'shuffled' }));
    expect(s.board.stacks).not.toEqual(g.board.stacks);
    expect(solvePack(s.board).solvable).toBe(true);
    expect(s.boosters.shuffle).toBe(0);
    expect(run(s, { type: 'UNDO' }).board).toEqual(g.board);
  });

  it('gekaufter Booster wird gutgeschrieben', () => {
    const s = run(start(packBoard({ stacks: [['pack-fire']], table: [null], spots: ['pack-fire*1'] })), {
      type: 'GRANT_BOOSTER',
      booster: 'extra',
    });
    expect(s.boosters.extra).toBe(2);
  });
});

describe('Packband-Reducer: ganzer Tag', () => {
  it('Lösung des Generators gewinnt mit 3 Sternen', () => {
    for (const day of [1, 6, 8, 12, 20]) {
      const c = getPackLevelConfig(day);
      const g = generatePackLevel(c);
      let s = createPackState(c, g.board);
      for (const t of g.solution) {
        expect(listTaps(s.board)).toContain(t);
        s = packReducer(s, tap(t));
      }
      expect(s.status, `Tag ${day}`).toBe('won');
      expect(s.board.shipped).toBe(s.board.totalBoxes);
      expect(s.levelCoins).toBeGreaterThanOrEqual(s.board.totalBoxes * COINS_PER_BOX);
      expect(packStarRating(s)).toBe(3);
    }
  });
});
