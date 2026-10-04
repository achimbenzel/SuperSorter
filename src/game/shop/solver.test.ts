import { describe, expect, it } from 'vitest';
import { DEFAULT_BOOSTERS } from '../levels';
import { createRng, hashSeed } from '../random';
import { buildShopCandidate, replayShopWins } from './generator';
import { applyMove, isWon, listMoves } from './rules';
import { nextShopHint, solveShop } from './solver';
import { shopBoard } from './testUtils';
import type { ShopBoard, ShopLevelConfig } from './types';

/**
 * Referenz ohne Optimierungen: alle Züge der echten Regeln (rules.listMoves),
 * Gedächtnis über den vollständigen Zustand. Langsam, aber offensichtlich korrekt.
 */
function bruteForceSolvable(start: ShopBoard): boolean {
  const seen = new Set<string>();
  const key = (b: ShopBoard) =>
    JSON.stringify([
      b.stacks.map((s) => s.map((i) => i.id)),
      b.cart.map((c) => c?.id ?? -1),
      b.stations.map((s) => [s.order?.id ?? -1, s.filled.map((f) => f?.id ?? -1)]),
      b.queue.length,
    ]);
  const dfs = (b: ShopBoard): boolean => {
    if (isWon(b)) return true;
    const k = key(b);
    if (seen.has(k)) return false;
    seen.add(k);
    return listMoves(b).some((m) => dfs(applyMove(b, m).board));
  };
  return dfs(start);
}

describe('Versand-Solver', () => {
  it('löst ein einfaches Board; die Lösung gewinnt mit den echten Regeln', () => {
    const b = shopBoard({
      stacks: [
        ['milk', 'bread', 'milk'],
        ['bread', 'cola-can', 'green-can'],
      ],
      cart: [null],
      stations: ['bulk:milk:2', 'series:drinks:2'],
      queue: ['bulk:bread:2'],
    });
    const res = solveShop(b);
    expect(res.solvable).toBe(true);
    expect(replayShopWins(b, res.moves)).toBe(true);
  });

  it('erkennt Unlösbarkeit: benötigte Ware ist vergraben, keine Ablage', () => {
    const b = shopBoard({ stacks: [['milk', 'bread']], cart: [], stations: ['bulk:milk:1'], queue: ['bulk:bread:1'] });
    expect(solveShop(b).solvable).toBe(false);
  });

  it('Warteschlange: dieselbe Situation ist mit einem Ablageplatz lösbar', () => {
    const b = shopBoard({ stacks: [['milk', 'bread']], cart: [null], stations: ['bulk:milk:1'], queue: ['bulk:bread:1'] });
    const res = solveShop(b);
    expect(res.solvable).toBe(true);
    expect(replayShopWins(b, res.moves)).toBe(true);
  });

  it('nextShopHint liefert einen gültigen Zug', () => {
    const b = shopBoard({ stacks: [['bread', 'milk']], cart: [null], stations: ['bulk:milk:1', 'bulk:bread:1'] });
    expect(listMoves(b)).toContainEqual(nextShopHint(b));
  });

  it('stimmt auf 400 zufälligen kleinen Boards mit dem Brute-Force-Referenzsolver überein', () => {
    let solvable = 0;
    let unsolvable = 0;
    for (let i = 0; i < 400; i++) {
      const rng = createRng(hashSeed(77, i));
      const size = (2 + Math.floor(rng() * 2)) as 2 | 3;
      const cfg: ShopLevelConfig = {
        level: 1,
        stations: 1 + Math.floor(rng() * 2),
        cart: Math.floor(rng() * 2),
        stacks: rng() < 0.5 ? 3 : 4,
        types: 4 + Math.floor(rng() * 3),
        orders: { bulk: Math.floor(rng() * 2), series: Math.floor(rng() * 2), list: 1 + Math.floor(rng() * 2) },
        orderSize: size,
        mystery: rng() < 0.5,
        gold: 0,
        hintMode: false,
        reward: false,
        boosters: DEFAULT_BOOSTERS,
        targetWinRate: [0, 1],
      };
      const b = buildShopCandidate(cfg, rng);
      const expected = bruteForceSolvable(b);
      const res = solveShop(b);
      expect(res.solvable, `Board #${i}`).toBe(expected);
      if (res.solvable) expect(replayShopWins(b, res.moves), `Replay #${i}`).toBe(true);
      if (expected) solvable++;
      else unsolvable++;
    }
    expect(solvable).toBeGreaterThan(40);
    expect(unsolvable).toBeGreaterThan(40);
  });
});
