import { describe, expect, it } from 'vitest';
import { generateShopLevel } from './generator';
import { COINS_PER_ORDER, getShopLevelConfig, SHOP_GOLD_BONUS } from './levels';
import { createShopState, shopReducer, type ShopAction } from './reducer';
import { solveShop } from './solver';
import { shopBoard } from './testUtils';
import type { ShopBoard, ShopGameState } from './types';

const cfg = { ...getShopLevelConfig(10), boosters: { undo: 3, extra: 1, peek: 2, shuffle: 1 } };
const start = (b: ShopBoard) => createShopState(cfg, b);
const run = (s: ShopGameState, ...a: ShopAction[]) => a.reduce(shopReducer, s);

describe('Versand: Tap-Steuerung', () => {
  // 4 Waren für 4 Positionen (sonst wäre das Board von Anfang an im Engpass).
  const b = shopBoard({ stacks: [['?bread', 'milk'], ['cheese'], ['milk']], cart: [null], stations: ['bulk:milk:2', 'list:cheese,bread'] });

  it('Auswahl, Wechsel, Aufheben', () => {
    let s = run(start(b), { type: 'TAP_STACK', index: 0 });
    expect(s.selection).toEqual({ kind: 'stack', index: 0 });
    s = run(s, { type: 'TAP_STACK', index: 1 });
    expect(s.selection).toEqual({ kind: 'stack', index: 1 });
    s = run(s, { type: 'TAP_STACK', index: 1 });
    expect(s.selection).toBeNull();
  });

  it('Tap auf passendes Paket packt die Ware ein und deckt die nächste auf', () => {
    const s = run(start(b), { type: 'TAP_STACK', index: 0 }, { type: 'TAP_STATION', index: 0 });
    expect(s.board.stations[0].filled.filter(Boolean)).toHaveLength(1);
    expect(s.fx).toContainEqual(expect.objectContaining({ kind: 'revealed' }));
    expect(s.moves).toBe(1);
  });

  it('falsches Paket: Shake, kein Zug, Auswahl bleibt', () => {
    const s = run(start(b), { type: 'TAP_STACK', index: 1 }, { type: 'TAP_STATION', index: 0 });
    expect(s.fx).toEqual([expect.objectContaining({ kind: 'invalid', target: { kind: 'station', index: 0 } })]);
    expect(s.selection).toEqual({ kind: 'stack', index: 1 });
    expect(s.moves).toBe(0);
  });

  it('Ablage: parken und wieder auswählen', () => {
    let s = run(start(b), { type: 'TAP_STACK', index: 1 }, { type: 'TAP_CART', index: 0 });
    expect(s.board.cart[0]?.type).toBe('cheese');
    s = run(s, { type: 'TAP_CART', index: 0 }, { type: 'TAP_STATION', index: 1 });
    expect(s.board.cart[0]).toBeNull();
    expect(s.board.stations[1].filled.filter(Boolean)).toHaveLength(1);
  });
});

describe('Versand: Verschicken, Münzen, Sieg', () => {
  it('volles Paket wird verschickt: Event, Münzen, nächster Auftrag', () => {
    const b = shopBoard({ stacks: [['milk', 'milk'], ['bread']], stations: ['bulk:milk:2'], queue: ['bulk:bread:1'] });
    const s = run(start(b), { type: 'TAP_STACK', index: 0 }, { type: 'TAP_STATION', index: 0 });
    expect(s.fx).toContainEqual(expect.objectContaining({ kind: 'shipped', station: 0 }));
    expect(s.fx).toContainEqual(expect.objectContaining({ kind: 'coins', coinTarget: 'station-0', amount: COINS_PER_ORDER }));
    expect(s.levelCoins).toBe(COINS_PER_ORDER);
    expect(s.board.stations[0].order?.needs).toEqual([{ kind: 'type', type: 'bread' }]);
    const won = run(s, { type: 'TAP_STACK', index: 1 }, { type: 'TAP_STATION', index: 0 });
    expect(won.status).toBe('won');
    expect(won.levelCoins).toBe(2 * COINS_PER_ORDER);
  });

  it('Gold-Rarität bringt Bonus', () => {
    const b = shopBoard({ cart: ['$milk'], stations: ['bulk:milk:2'] });
    const s = run(start(b), { type: 'TAP_CART', index: 0 }, { type: 'TAP_STATION', index: 0 });
    expect(s.levelCoins).toBe(SHOP_GOLD_BONUS);
  });
});

describe('Versand: Niederlage und Booster', () => {
  it('Deadlock -> verloren; Extra-Ablage rettet', () => {
    const b = shopBoard({ stacks: [['milk', 'bread'], ['cheese']], cart: [null], stations: ['bulk:milk:1'], queue: ['bulk:bread:1', 'bulk:cheese:1'] });
    let s = run(start(b), { type: 'TAP_STACK', index: 1 }, { type: 'TAP_CART', index: 0 });
    expect(s.status).toBe('lost');
    expect(s.loseReason).toBe('deadlock');
    s = run(s, { type: 'USE_EXTRA' });
    expect(s.status).toBe('playing');
    expect(s.board.cart).toHaveLength(2);
  });

  it('Engpass -> verloren; Undo rettet und nimmt Münzen zurück', () => {
    const b = shopBoard({ stacks: [['cheese', 'bread']], stations: ['series:breakfast:1', 'list:bread'] });
    let s = run(start(b), { type: 'TAP_STACK', index: 0 }, { type: 'TAP_STATION', index: 0 });
    expect(s.status).toBe('lost');
    expect(s.loseReason).toBe('shortage');
    expect(s.levelCoins).toBe(COINS_PER_ORDER);
    s = run(s, { type: 'UNDO' });
    expect(s.status).toBe('playing');
    expect(s.levelCoins).toBe(0);
    expect(s.board).toBe(b);
  });

  it('Booster kaufen erhöht das Kontingent', () => {
    const s0 = { ...start(shopBoard({ stacks: [['milk']], stations: ['bulk:milk:1'] })), boosters: { undo: 0, extra: 0, peek: 0, shuffle: 0 } };
    expect(run(s0, { type: 'GRANT_BOOSTER', booster: 'undo' }).boosters.undo).toBe(1);
  });

  it('Mischen bleibt lösbar und ist rückgängig machbar', () => {
    const gen = generateShopLevel(getShopLevelConfig(12));
    const s0 = createShopState(gen.config, gen.board);
    const s1 = run(s0, { type: 'SHUFFLE' });
    expect(s1.boosters.shuffle).toBe(s0.boosters.shuffle - 1);
    expect(s1.board.stacks.map((x) => x.length)).toEqual(s0.board.stacks.map((x) => x.length));
    expect(solveShop(s1.board).solvable).toBe(true);
    expect(run(s1, { type: 'UNDO' }).board).toBe(s0.board);
  });

  it('Lupe zeigt ein verpacktes Item temporär', () => {
    const b = shopBoard({ stacks: [['?bread', 'milk']], stations: ['bulk:milk:1'], queue: ['bulk:bread:1'] });
    let s = run(start(b), { type: 'TOGGLE_PEEK' });
    s = run(s, { type: 'PEEK_ITEM', itemId: s.board.stacks[0][0].id });
    expect(s.peekItemId).toBe(s.board.stacks[0][0].id);
    expect(s.boosters.peek).toBe(1);
  });
});

describe('Versand: kompletter Tag über den Reducer', () => {
  it('die Solver-Lösung von Tag 15 gewinnt über den Reducer', () => {
    const gen = generateShopLevel(getShopLevelConfig(15));
    let s = createShopState(gen.config, gen.board);
    for (const move of gen.solution) s = shopReducer(s, { type: 'APPLY_MOVE', move });
    expect(s.status).toBe('won');
    expect(s.board.shipped).toBe(gen.board.totalOrders);
    expect(s.levelCoins).toBe(gen.board.totalOrders * COINS_PER_ORDER + gen.config.gold * SHOP_GOLD_BONUS);
  });
});
