import { describe, expect, it } from 'vitest';
import { generateLevel, MAX_STACK_HEIGHT, replayWins, totalItems, totalSlots } from './generator';
import { getLevelConfig, LEVEL_COUNT } from './levels';
import { countItems } from './rules';
import { solve } from './solver';

describe('Levelsystem', () => {
  it('hat mindestens 20 Level', () => {
    expect(LEVEL_COUNT).toBeGreaterThanOrEqual(20);
  });

  it('Progression: 1-3 ohne Mystery, ab 4 Mystery, Gold erst ab 10', () => {
    for (let l = 1; l <= 3; l++) expect(getLevelConfig(l).mystery).toBe(false);
    for (let l = 4; l <= LEVEL_COUNT; l++) expect(getLevelConfig(l).mystery).toBe(true);
    for (let l = 1; l < 10; l++) expect(getLevelConfig(l).gold).toBe(0);
    expect(getLevelConfig(10).gold).toBeGreaterThan(0);
  });

  it('Progression: ab Level 7 weniger Puffer oder mehr Typen als in Level 1-6', () => {
    const early = [1, 2, 3, 4, 5, 6].map(getLevelConfig);
    const maxTypes = Math.max(...early.map((c) => c.types));
    const minCart = Math.min(...early.map((c) => c.cart));
    for (let l = 7; l <= LEVEL_COUNT; l++) {
      const c = getLevelConfig(l);
      if (c.reward) continue;
      expect(c.types > maxTypes || c.cart < minCart || c.openSlots < totalSlots(c)).toBe(true);
    }
  });

  it('spätestens alle 5 Level ein Belohnungslevel', () => {
    const rewards = Array.from({ length: LEVEL_COUNT }, (_, i) => i + 1).filter((l) => getLevelConfig(l).reward);
    expect(rewards.length).toBeGreaterThanOrEqual(3);
    let last = 0;
    for (const r of [...rewards, LEVEL_COUNT + 1]) {
      if (r <= LEVEL_COUNT) expect(r - last).toBeLessThanOrEqual(5);
      last = r;
    }
  });

  it('typische Größe: 3-5 Typen, 9-20 Items, 3-6 Fächer', () => {
    for (let l = 1; l <= LEVEL_COUNT; l++) {
      const c = getLevelConfig(l);
      expect(c.types).toBeGreaterThanOrEqual(3);
      expect(c.types).toBeLessThanOrEqual(5);
      expect(totalItems(c)).toBeGreaterThanOrEqual(9);
      expect(totalItems(c)).toBeLessThanOrEqual(20);
      expect(totalSlots(c)).toBeLessThanOrEqual(6);
    }
  });

  it('Endlosmodus liefert gültige Configs über Level 20 hinaus', () => {
    for (let l = LEVEL_COUNT + 1; l <= LEVEL_COUNT + 15; l++) {
      const c = getLevelConfig(l);
      expect(c.level).toBe(l);
      expect(c.types).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('Generator', () => {
  it('ist deterministisch: gleiche Level-Nummer = gleiches Board', () => {
    for (const l of [1, 7, 15]) {
      const a = generateLevel(getLevelConfig(l));
      const b = generateLevel(getLevelConfig(l));
      expect(a.board).toEqual(b.board);
      expect(a.seed).toBe(b.seed);
    }
  });

  it('verschiedene Level ergeben verschiedene Boards', () => {
    const a = generateLevel(getLevelConfig(14));
    const b = generateLevel(getLevelConfig(21)); // gleiche Config-Zeile, anderer Seed
    expect(a.board).not.toEqual(b.board);
  });

  // Kernanforderung: Jedes Level ist garantiert lösbar.
  for (let level = 1; level <= LEVEL_COUNT + 10; level++) {
    it(`Level ${level} ist lösbar und entspricht seiner Config`, () => {
      const cfg = getLevelConfig(level);
      const gen = generateLevel(cfg);
      const b = gen.board;

      // Lösbarkeit: Solver bestätigt, Lösung gewinnt mit den echten Regeln.
      expect(solve(b).solvable).toBe(true);
      expect(replayWins(b, gen.solution)).toBe(true);

      // Aufbau
      expect(b.stacks).toHaveLength(cfg.stacks);
      expect(b.cart).toEqual(Array(cfg.cart).fill(null));
      expect(b.slots).toHaveLength(totalSlots(cfg));
      expect(b.slots.filter((s) => !s.closed)).toHaveLength(cfg.openSlots);
      expect(countItems(b)).toBe(totalItems(cfg));
      for (const s of b.stacks) {
        expect(s.length).toBeGreaterThanOrEqual(1);
        expect(s.length).toBeLessThanOrEqual(MAX_STACK_HEIGHT);
        // oberstes Item immer offen; darunter verdeckt genau dann, wenn Mystery
        s.forEach((it, j) => expect(it.hidden).toBe(cfg.mystery && j < s.length - 1));
      }
      const golds = b.stacks.flat().filter((i) => i.gold);
      expect(golds).toHaveLength(cfg.mystery ? cfg.gold : 0);
      golds.forEach((g) => expect(g.hidden).toBe(true));

      // Jeder Typ kommt in Vielfachen der Kapazität vor.
      const counts = new Map<string, number>();
      b.stacks.flat().forEach((i) => counts.set(i.type, (counts.get(i.type) ?? 0) + 1));
      expect(counts.size).toBe(cfg.types);
      counts.forEach((n) => expect(n % cfg.capacity).toBe(0));

      // Spieldauer-Proxy: ca. 30-60 s entspricht ~9-25 Zügen.
      expect(gen.solution.length).toBeGreaterThanOrEqual(7);
      expect(gen.solution.length).toBeLessThanOrEqual(30);
    });
  }

  it('Generierung ist schnell genug fürs Handy (< 300 ms pro Level in Node)', () => {
    for (let l = 1; l <= LEVEL_COUNT; l++) {
      const t0 = performance.now();
      generateLevel(getLevelConfig(l));
      expect(performance.now() - t0).toBeLessThan(300);
    }
  });
});
