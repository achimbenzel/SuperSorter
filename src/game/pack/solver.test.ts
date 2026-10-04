import { describe, expect, it } from 'vitest';
import { DEFAULT_BOOSTERS } from '../levels';
import { createRng, hashSeed } from '../random';
import { buildPackCandidate, replayPackWins } from './generator';
import { applyTap, isWon, listTaps } from './rules';
import { nextPackHint, solvePack } from './solver';
import { packBoard } from './testUtils';
import type { PackBoard, PackLevelConfig } from './types';

/** Referenz: probiert schlicht alle Tap-Folgen durch (ohne Gedächtnis, ohne Heuristik). */
function exhaustive(b: PackBoard): boolean {
  if (isWon(b)) return true;
  return listTaps(b).some((t) => exhaustive(applyTap(b, t).board));
}

describe('Packband-Solver', () => {
  it('löst ein einfaches Board; die Lösung gewinnt mit den echten Regeln', () => {
    const b = packBoard({
      stacks: [
        ['milk', 'cola-can'],
        ['cola-can', 'milk'],
      ],
      table: [null],
      spots: ['cola-can*2'],
      queue: ['milk*2'],
    });
    const res = solvePack(b);
    expect(res.solvable).toBe(true);
    expect(replayPackWins(b, res.moves)).toBe(true);
  });

  it('erkennt Unlösbarkeit (benötigte Ware vergraben, Packtisch zu klein)', () => {
    const b = packBoard({ stacks: [['cola-can', 'milk', 'bread']], table: [null], spots: ['cola-can*1'], queue: ['milk*1', 'bread*1'] });
    expect(solvePack(b).solvable).toBe(false);
    const roomy = { ...b, cart: [null, null] };
    expect(solvePack(roomy).solvable).toBe(true);
  });

  it('nextPackHint liefert eine antippbare Kiste', () => {
    const b = packBoard({ stacks: [['milk'], ['cola-can']], table: [null], spots: ['cola-can*1'], queue: ['milk*1'] });
    expect(listTaps(b)).toContain(nextPackHint(b));
  });

  it('stimmt auf 300 zufälligen kleinen Boards mit der erschöpfenden Suche überein', () => {
    let solvable = 0;
    let unsolvable = 0;
    for (let i = 0; i < 300; i++) {
      const rng = createRng(hashSeed(91, i));
      const cfg: PackLevelConfig = {
        level: 1,
        // Bewusst knapp (kleiner Packtisch), damit beide Ausgänge häufig vorkommen.
        stacks: rng() < 0.5 ? 3 : 4,
        table: 1 + Math.floor(rng() * 2),
        spots: rng() < 0.8 ? 1 : 2,
        types: 3 + Math.floor(rng() * 3),
        boxes: { bulk: 2 + Math.floor(rng() * 2), mixed: Math.floor(rng() * 2) },
        boxSize: rng() < 0.3 ? 2 : 3,
        mystery: rng() < 0.5,
        gold: 0,
        reward: false,
        boosters: DEFAULT_BOOSTERS,
        targetWinRate: [0, 1],
      };
      const b = buildPackCandidate(cfg, rng);
      const expected = exhaustive(b);
      const res = solvePack(b);
      expect(res.solvable, `Board #${i}`).toBe(expected);
      if (res.solvable) expect(replayPackWins(b, res.moves), `Replay #${i}`).toBe(true);
      if (expected) solvable++;
      else unsolvable++;
    }
    expect(solvable).toBeGreaterThan(30);
    expect(unsolvable).toBeGreaterThan(30);
  });
});
