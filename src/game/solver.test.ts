import { describe, expect, it } from 'vitest';
import { buildCandidate, replayWins } from './generator';
import { getLevelConfig } from './levels';
import { createRng, hashSeed } from './random';
import { applyMove, isWon, listMoves } from './rules';
import { nextHint, solve } from './solver';
import { board } from './testUtils';
import type { Board, LevelConfig } from './types';

/**
 * Referenz-Solver ohne jede Optimierung: probiert *alle* Züge der echten Regeln
 * (rules.listMoves) durch. Langsam, aber offensichtlich korrekt – dient als
 * Orakel, um die Abkürzungen des echten Solvers (sichere Züge, Pruning,
 * kanonische Schlüssel) zu überprüfen.
 */
function bruteForceSolvable(start: Board): boolean {
  const seen = new Set<string>();
  const key = (b: Board) =>
    JSON.stringify([
      b.stacks.map((s) => s.map((i) => i.id)),
      b.cart.map((c) => c?.id ?? -1),
      b.slots.map((s) => [s.closed, s.items.map((i) => i.id)]),
    ]);
  const dfs = (b: Board): boolean => {
    if (isWon(b)) return true;
    const k = key(b);
    if (seen.has(k)) return false;
    seen.add(k);
    return listMoves(b).some((m) => dfs(applyMove(b, m).board));
  };
  return dfs(start);
}

describe('Solver', () => {
  it('löst ein einfaches Board und die Lösung gewinnt mit den echten Regeln', () => {
    const b = board({
      stacks: [
        ['sleeves', 'deck-box', 'sleeves'],
        ['deck-box', 'sleeves', 'deck-box'],
      ],
      cart: [null],
      slots: [[], []],
    });
    const res = solve(b);
    expect(res.solvable).toBe(true);
    expect(replayWins(b, res.moves)).toBe(true);
  });

  it('erkennt ein unlösbares Board (zu wenig Platz)', () => {
    // Nur ein offenes Fach, kein Wagen: Apfel liegt auf Milch, beide Typen brauchen ein Fach.
    const b = board({
      stacks: [['sleeves', 'sleeves', 'sleeves', 'dice', 'dice', 'dice'].map((t, i) => (i < 5 ? `?${t}` : t))],
      slots: [[], 'closed'],
    });
    // Apfel oben -> Apfel-Fach -> öffnet zweites Fach -> Milch passt. Also lösbar:
    expect(solve(b).solvable).toBe(true);
    // Ohne zweites Fach geht es nicht:
    const tight = board({ stacks: [['sleeves', 'dice', 'sleeves', 'dice']], capacity: 2, slots: [[]] });
    expect(solve(tight).solvable).toBe(false);
  });

  it('doppelte Typen: welches Item welches Fach füllt, ist entscheidend (Regressionstest)', () => {
    // Chips kommen 6x vor (2 Fächer). Die frei liegenden Chips auf Stapel 0 dürfen das
    // erste Chips-Fach NICHT sofort füllen – sonst bleibt der letzte Chip unter Milch und
    // Apfel vergraben, während der Wagen nur einen Platz hat.
    const b = board({
      stacks: [
        ['pack-water', 'pack-water'],
        ['dice', 'sleeves', 'pack-water'],
        ['sleeves', 'dice', 'pack-water'],
        ['pack-water', 'sleeves', 'dice', 'pack-water'],
      ],
      cart: [null],
      slots: [[], 'closed', 'closed', 'closed'],
    });
    const res = solve(b);
    expect(res.solvable).toBe(true);
    expect(replayWins(b, res.moves)).toBe(true);
  });

  it('erkennt Deadlock durch vollen Wagen', () => {
    const b = board({ stacks: [['dice', 'deck-box', 'figure']], cart: [], slots: [['sleeves', 'sleeves']] });
    expect(solve(b).solvable).toBe(false);
  });

  it('beachtet, dass verdeckte Items beim Multi-Move nicht mitwandern', () => {
    // Offen gleich: Multi-Move füllt das Fach auf einmal. Verdeckt: drei Einzelzüge – beides lösbar,
    // aber die Lösung muss jeweils zu den echten Regeln passen.
    for (const spec of [['sleeves', 'sleeves', 'sleeves'], ['?sleeves', '?sleeves', 'sleeves']]) {
      const b = board({ stacks: [spec], slots: [[]] });
      const res = solve(b);
      expect(res.solvable).toBe(true);
      expect(replayWins(b, res.moves)).toBe(true);
      expect(res.moves).toHaveLength(spec[0].startsWith('?') ? 3 : 1);
    }
  });

  it('liefert null, wenn das Knoten-Budget erschöpft ist', () => {
    const cfg = getLevelConfig(20);
    const b = buildCandidate(cfg, createRng(1));
    const res = solve(b, { maxNodes: 1 });
    expect(res.solvable === null || res.solvable === true).toBe(true);
  });

  it('nextHint liefert einen gültigen ersten Zug', () => {
    const b = board({ stacks: [['sleeves', 'deck-box']], cart: [null], slots: [[], []] });
    const hint = nextHint(b);
    expect(hint).not.toBeNull();
    expect(listMoves(b)).toContainEqual(hint);
  });

  it('stimmt auf 600 zufälligen kleinen Boards mit dem Brute-Force-Referenzsolver überein', () => {
    let solvable = 0;
    let unsolvable = 0;
    for (let i = 0; i < 600; i++) {
      const rng = createRng(hashSeed(42, i));
      const types = 2 + Math.floor(rng() * 2); // 2-3
      const doubleTypes = rng() < 0.4 ? 1 : 0;
      const cfg: LevelConfig = {
        ...getLevelConfig(1),
        types,
        capacity: 3,
        doubleTypes,
        stacks: rng() < 0.5 ? 3 : 4,
        cart: Math.floor(rng() * 2), // 0-1
        openSlots: 1 + Math.floor(rng() * (types + doubleTypes)),
        mystery: rng() < 0.5,
      };
      const b = buildCandidate(cfg, rng);
      const expected = bruteForceSolvable(b);
      const res = solve(b);
      expect(res.solvable, `Board #${i}`).toBe(expected);
      if (res.solvable) expect(replayWins(b, res.moves), `Replay #${i}`).toBe(true);
      if (expected) solvable++;
      else unsolvable++;
    }
    // Der Test ist nur aussagekräftig, wenn beide Fälle vorkommen.
    expect(solvable).toBeGreaterThan(40);
    expect(unsolvable).toBeGreaterThan(40);
  });
});
