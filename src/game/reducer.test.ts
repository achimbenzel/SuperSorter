import { describe, expect, it } from 'vitest';
import { generateLevel } from './generator';
import { getLevelConfig, GOLD_BONUS } from './levels';
import { createGameState, gameReducer, type GameAction } from './reducer';
import { solve } from './solver';
import { board } from './testUtils';
import type { Board, GameState } from './types';

const cfg = { ...getLevelConfig(10), boosters: { undo: 3, extra: 1, peek: 2, shuffle: 1 } };
const start = (b: Board): GameState => createGameState(cfg, b);
const run = (s: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, s);

describe('Tap-Steuerung', () => {
  const b = board({ stacks: [['?apple', 'milk'], ['bread']], cart: [null, null], slots: [[], []] });

  it('Tap 1 wählt den Stapel aus, erneuter Tap hebt die Auswahl auf', () => {
    let s = run(start(b), { type: 'TAP_STACK', index: 0 });
    expect(s.selection).toEqual({ kind: 'stack', index: 0 });
    s = run(s, { type: 'TAP_STACK', index: 0 });
    expect(s.selection).toBeNull();
  });

  it('Tap auf anderes Item wechselt die Auswahl', () => {
    const s = run(start(b), { type: 'TAP_STACK', index: 0 }, { type: 'TAP_STACK', index: 1 });
    expect(s.selection).toEqual({ kind: 'stack', index: 1 });
  });

  it('Tap 2 auf Fach legt das Item hinein und deckt das nächste auf', () => {
    const s = run(start(b), { type: 'TAP_STACK', index: 0 }, { type: 'TAP_SLOT', index: 0 });
    expect(s.board.slots[0].items.map((i) => i.type)).toEqual(['milk']);
    expect(s.board.stacks[0][0]).toMatchObject({ type: 'apple', hidden: false });
    expect(s.selection).toBeNull();
    expect(s.moves).toBe(1);
    expect(s.history).toHaveLength(1);
  });

  it('ungültiges Ziel: Shake-Event, kein Zug, Auswahl bleibt', () => {
    let s = run(start(b), { type: 'TAP_STACK', index: 0 }, { type: 'TAP_SLOT', index: 0 }); // Milch in Fach 0
    s = run(s, { type: 'TAP_STACK', index: 1 }, { type: 'TAP_SLOT', index: 0 }); // Brot auf Milch
    expect(s.board.slots[0].items).toHaveLength(1);
    expect(s.selection).toEqual({ kind: 'stack', index: 1 });
    expect(s.fx).toEqual([expect.objectContaining({ kind: 'invalid', target: { kind: 'slot', index: 0 } })]);
    expect(s.moves).toBe(1);
  });

  it('Tap auf freien Wagenplatz parkt das Item, Tap auf Wagen-Item wählt es aus', () => {
    let s = run(start(b), { type: 'TAP_STACK', index: 1 }, { type: 'TAP_CART', index: 1 });
    expect(s.board.cart[1]?.type).toBe('bread');
    s = run(s, { type: 'TAP_CART', index: 1 });
    expect(s.selection).toEqual({ kind: 'cart', index: 1 });
    s = run(s, { type: 'TAP_SLOT', index: 1 });
    expect(s.board.slots[1].items.map((i) => i.type)).toEqual(['bread']);
    expect(s.board.cart[1]).toBeNull();
  });

  it('Tap auf Fach ohne Auswahl macht nichts', () => {
    const s0 = start(b);
    expect(run(s0, { type: 'TAP_SLOT', index: 0 })).toBe(s0);
  });

  it('Multi-Move über Taps', () => {
    const s = run(
      start(board({ stacks: [['bread', 'milk', 'milk']], slots: [[], []] })),
      { type: 'TAP_STACK', index: 0 },
      { type: 'TAP_SLOT', index: 0 },
    );
    expect(s.board.slots[0].items).toHaveLength(2);
  });
});

describe('Sieg und Niederlage', () => {
  it('Sieg, wenn das letzte Fach gelöst wird', () => {
    const s = run(
      start(board({ stacks: [['milk', 'milk', 'milk']], slots: [[]] })),
      { type: 'TAP_STACK', index: 0 },
      { type: 'TAP_SLOT', index: 0 },
    );
    expect(s.status).toBe('won');
    expect(s.fx.some((f) => f.kind === 'solved')).toBe(true);
  });

  it('Deadlock -> verloren; Extra-Platz rettet', () => {
    const b = board({ stacks: [['apple', 'bread'], ['cheese']], cart: [null], slots: [['milk'], 'closed'] });
    let s = run(start(b), { type: 'TAP_STACK', index: 0 }, { type: 'TAP_CART', index: 0 });
    expect(s.status).toBe('lost');
    expect(s.loseReason).toBe('deadlock');
    s = run(s, { type: 'USE_EXTRA' });
    expect(s.status).toBe('playing');
    expect(s.board.cart).toHaveLength(2);
    expect(s.boosters.extra).toBe(0);
    expect(run(s, { type: 'USE_EXTRA' })).toBe(s); // nur 1x pro Level
  });

  it('Typ auf zwei Fächer verteilt -> verloren (hoffnungslos), Undo rettet', () => {
    const b = board({ stacks: [['milk', 'milk'], ['apple']], slots: [['milk'], [], []] });
    let s = run(start(b), { type: 'TAP_STACK', index: 1 }, { type: 'TAP_SLOT', index: 1 });
    expect(s.status).toBe('playing');
    // Zweite Milch absichtlich in ein neues Fach statt zur ersten Milch.
    s = run(s, { type: 'APPLY_MOVE', move: { from: { kind: 'stack', index: 0 }, to: { kind: 'slot', index: 2 } } });
    expect(s.status).toBe('lost');
    expect(s.loseReason).toBe('hopeless');
    s = run(s, { type: 'UNDO' });
    expect(s.status).toBe('playing');
  });

  it('nach Sieg werden Taps ignoriert', () => {
    const won = run(
      start(board({ stacks: [['milk', 'milk', 'milk']], slots: [[]] })),
      { type: 'TAP_STACK', index: 0 },
      { type: 'TAP_SLOT', index: 0 },
    );
    expect(run(won, { type: 'UNDO' })).toBe(won);
  });
});

describe('Booster', () => {
  it('Undo über mehrere Schritte stellt Board und Gold-Münzen wieder her', () => {
    const b = board({ stacks: [['milk', '$apple', 'bread']], cart: [null], slots: [[], [], []] });
    const s0 = start(b);
    const s1 = run(s0, { type: 'TAP_STACK', index: 0 }, { type: 'TAP_SLOT', index: 0 }); // Brot
    const s2 = run(s1, { type: 'TAP_STACK', index: 0 }, { type: 'TAP_SLOT', index: 1 }); // Gold-Apfel
    expect(s2.levelCoins).toBe(GOLD_BONUS);
    expect(s2.fx).toContainEqual(expect.objectContaining({ kind: 'gold', amount: GOLD_BONUS }));
    const u1 = run(s2, { type: 'UNDO' });
    expect(u1.board).toBe(s1.board);
    expect(u1.levelCoins).toBe(0);
    const u2 = run(u1, { type: 'UNDO' });
    expect(u2.board).toBe(s0.board);
    expect(u2.boosters.undo).toBe(1);
    expect(u2.boostersUsed).toBe(2);
    expect(run(u2, { type: 'UNDO' })).toBe(u2); // keine History mehr
  });

  it('Undo behält einen per Booster hinzugefügten Wagenplatz', () => {
    const b = board({ stacks: [['milk', 'bread']], cart: [null], slots: [[], []] });
    const s = run(start(b), { type: 'TAP_STACK', index: 0 }, { type: 'TAP_SLOT', index: 0 }, { type: 'USE_EXTRA' }, { type: 'UNDO' });
    expect(s.board.cart).toHaveLength(2);
  });

  it('Lupe: zeigt ein verpacktes Item und verbraucht eine Ladung', () => {
    const b = board({ stacks: [['?apple', 'milk']], slots: [[]] });
    let s = run(start(b), { type: 'TOGGLE_PEEK' });
    expect(s.peekArmed).toBe(true);
    const hiddenId = s.board.stacks[0][0].id;
    s = run(s, { type: 'PEEK_ITEM', itemId: hiddenId });
    expect(s.peekItemId).toBe(hiddenId);
    expect(s.peekArmed).toBe(false);
    expect(s.boosters.peek).toBe(1);
    expect(s.board.stacks[0][0].hidden).toBe(true); // nur temporär, das Item bleibt verpackt
    s = run(s, { type: 'END_PEEK' });
    expect(s.peekItemId).toBeNull();
  });

  it('Lupe ist ohne verpackte Items nicht aktivierbar', () => {
    const s0 = start(board({ stacks: [['milk']], slots: [[]] }));
    expect(run(s0, { type: 'TOGGLE_PEEK' })).toBe(s0);
  });

  it('Mischen behält Stapelhöhen und Items, bleibt lösbar und ist rückgängig machbar', () => {
    const gen = generateLevel(getLevelConfig(12));
    const s0 = createGameState(gen.config, gen.board);
    const s1 = run(s0, { type: 'SHUFFLE' });
    expect(s1.boosters.shuffle).toBe(s0.boosters.shuffle - 1);
    expect(s1.board.stacks.map((x) => x.length)).toEqual(s0.board.stacks.map((x) => x.length));
    const ids = (bb: Board) => bb.stacks.flat().map((i) => i.id).sort((a, c) => a - c);
    expect(ids(s1.board)).toEqual(ids(s0.board));
    expect(s1.board.stacks).not.toEqual(s0.board.stacks);
    expect(solve(s1.board).solvable).toBe(true);
    // Mystery: nach dem Mischen ist wieder nur das oberste Item offen.
    for (const st of s1.board.stacks) st.forEach((it, j) => expect(it.hidden).toBe(j < st.length - 1));
    expect(run(s1, { type: 'UNDO' }).board).toBe(s0.board);
  });

  it('Neustart setzt Board und Booster zurück', () => {
    const b = board({ stacks: [['milk', 'bread']], cart: [null], slots: [[], []] });
    const s = run(start(b), { type: 'TAP_STACK', index: 0 }, { type: 'TAP_SLOT', index: 0 }, { type: 'USE_EXTRA' }, { type: 'RESTART' });
    expect(s.board).toBe(b);
    expect(s.boosters).toEqual(cfg.boosters);
    expect(s.moves).toBe(0);
  });
});

describe('Komplettes Level per Reducer durchspielen', () => {
  it('die Solver-Lösung von Level 12 gewinnt auch über den Reducer', () => {
    const gen = generateLevel(getLevelConfig(12));
    let s = createGameState(gen.config, gen.board);
    for (const move of gen.solution) s = gameReducer(s, { type: 'APPLY_MOVE', move });
    expect(s.status).toBe('won');
    expect(s.levelCoins).toBe(gen.config.gold * GOLD_BONUS);
  });
});
