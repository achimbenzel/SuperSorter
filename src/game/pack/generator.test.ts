import { describe, expect, it } from 'vitest';
import { generatePackLevel, replayPackWins, shufflePackBox, totalPackBoxes, totalPackItems } from './generator';
import { getPackLevelConfig, PACK_LEVEL_COUNT } from './levels';
import { countItems, countOpenNeeds } from './rules';
import { solvePack } from './solver';

describe('Packband: Progression', () => {
  it('hat mindestens 20 Tage', () => {
    expect(PACK_LEVEL_COUNT).toBeGreaterThanOrEqual(20);
  });

  it('Einführung: 1-3 offen, ab 4 verpackt, zweiter Packplatz ab 6, gemischte Pakete ab 8, Gold ab 10', () => {
    for (let l = 1; l <= 3; l++) expect(getPackLevelConfig(l).mystery).toBe(false);
    for (let l = 4; l <= PACK_LEVEL_COUNT; l++) expect(getPackLevelConfig(l).mystery).toBe(true);
    for (let l = 1; l < 6; l++) expect(getPackLevelConfig(l).spots).toBe(1);
    expect(getPackLevelConfig(6).spots).toBe(2);
    for (let l = 1; l < 8; l++) expect(getPackLevelConfig(l).boxes.mixed).toBe(0);
    expect(getPackLevelConfig(8).boxes.mixed).toBeGreaterThan(0);
    for (let l = 1; l < 10; l++) expect(getPackLevelConfig(l).gold).toBe(0);
    expect(getPackLevelConfig(10).gold).toBeGreaterThan(0);
  });

  it('spätestens alle 5 Tage ein Belohnungstag', () => {
    const rewards = Array.from({ length: PACK_LEVEL_COUNT }, (_, i) => i + 1).filter((l) => getPackLevelConfig(l).reward);
    let last = 0;
    for (const r of rewards) {
      expect(r - last).toBeLessThanOrEqual(5);
      last = r;
    }
  });

  it('Endlosmodus liefert gültige Configs nach Tag 20', () => {
    for (let l = PACK_LEVEL_COUNT + 1; l <= PACK_LEVEL_COUNT + 20; l++) {
      const c = getPackLevelConfig(l);
      expect(c.level).toBe(l);
      expect(totalPackBoxes(c)).toBeGreaterThan(0);
    }
  });
});

describe('Packband: Generator', () => {
  it('ist deterministisch', () => {
    const a = generatePackLevel(getPackLevelConfig(7));
    const b = generatePackLevel(getPackLevelConfig(7));
    expect(a.board).toEqual(b.board);
  });

  it('Tag 1-30: lösbar, Waren = offene Stellen, Pakete passend zur Config', () => {
    for (let l = 1; l <= 30; l++) {
      const c = getPackLevelConfig(l);
      const g = generatePackLevel(c);
      const b = g.board;
      expect(replayPackWins(b, g.solution), `Tag ${l}`).toBe(true);
      expect(solvePack(b).solvable, `Tag ${l}`).toBe(true);
      expect(countItems(b)).toBe(totalPackItems(c));
      expect(countOpenNeeds(b)).toBe(totalPackItems(c));
      expect(b.stacks).toHaveLength(c.stacks);
      expect(b.spots.filter(Boolean)).toHaveLength(c.spots);
      expect(b.totalBoxes).toBe(totalPackBoxes(c));

      const boxes = [...b.spots.map((s) => s!.box), ...b.queue];
      const bulk = boxes.filter((x) => new Set(x.needs).size === 1);
      expect(boxes.every((x) => x.needs.length === c.boxSize)).toBe(true);
      expect(bulk.length).toBeGreaterThanOrEqual(c.boxes.bulk);

      const items = b.stacks.flat();
      if (!c.mystery) expect(items.some((it) => it.hidden)).toBe(false);
      else expect(b.stacks.every((s) => s.slice(0, -1).every((it) => it.hidden))).toBe(true);
      expect(items.filter((it) => it.gold)).toHaveLength(c.gold);
      // Oberste Ware ist immer sichtbar.
      expect(b.stacks.every((s) => s.length === 0 || !s[s.length - 1].hidden)).toBe(true);
    }
  });

  it('ist schnell genug für den Start eines Tages', () => {
    for (const l of [12, 16, 20]) {
      const t = performance.now();
      generatePackLevel(getPackLevelConfig(l));
      expect(performance.now() - t, `Tag ${l}`).toBeLessThan(400);
    }
  });

  it('Mischen liefert eine andere, lösbare Verteilung derselben Waren', () => {
    const c = getPackLevelConfig(11);
    const b = generatePackLevel(c).board;
    const s = shufflePackBox(b, c, 0);
    expect(s).not.toBeNull();
    expect(s!.stacks.map((x) => x.length)).toEqual(b.stacks.map((x) => x.length));
    expect(
      s!.stacks
        .flat()
        .map((it) => it.id)
        .sort((x, y) => x - y),
    ).toEqual(
      b.stacks
        .flat()
        .map((it) => it.id)
        .sort((x, y) => x - y),
    );
    expect(solvePack(s!).solvable).toBe(true);
  });
});
