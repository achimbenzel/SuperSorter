import { describe, expect, it } from 'vitest';
import { generateShopLevel, replayShopWins, totalShopItems, totalShopOrders } from './generator';
import { getShopLevelConfig, SHOP_LEVEL_COUNT } from './levels';
import { countOpenNeeds, findShortage } from './rules';
import { solveShop } from './solver';
import { SERIES_OF } from './theme';

describe('Versand: Tage (Level)', () => {
  it('mindestens 20 Tage', () => {
    expect(SHOP_LEVEL_COUNT).toBeGreaterThanOrEqual(20);
  });

  it('Progression: erst Sammelbestellungen, Serien ab 3, Mystery ab 4, Wunschlisten ab 6, Gold ab 10', () => {
    for (const d of [1, 2]) {
      const c = getShopLevelConfig(d);
      expect(c.orders.series + c.orders.list).toBe(0);
      expect(c.mystery).toBe(false);
    }
    expect(getShopLevelConfig(3).orders.series).toBeGreaterThan(0);
    for (let d = 4; d <= SHOP_LEVEL_COUNT; d++) expect(getShopLevelConfig(d).mystery).toBe(true);
    for (let d = 1; d < 6; d++) expect(getShopLevelConfig(d).orders.list).toBe(0);
    expect(getShopLevelConfig(6).orders.list).toBeGreaterThan(0);
    for (let d = 1; d < 10; d++) expect(getShopLevelConfig(d).gold).toBe(0);
    expect(getShopLevelConfig(10).gold).toBeGreaterThan(0);
  });

  it('spätestens alle 5 Tage ein Belohnungstag', () => {
    let last = 0;
    for (let d = 1; d <= SHOP_LEVEL_COUNT; d++) {
      if (getShopLevelConfig(d).reward) {
        expect(d - last).toBeLessThanOrEqual(5);
        last = d;
      }
    }
  });

  it('Spieldauer-Proxy: 9-21 Waren pro Tag', () => {
    for (let d = 1; d <= SHOP_LEVEL_COUNT; d++) {
      const n = totalShopItems(getShopLevelConfig(d));
      expect(n).toBeGreaterThanOrEqual(9);
      expect(n).toBeLessThanOrEqual(21);
    }
  });
});

describe('Versand-Generator', () => {
  it('ist deterministisch', () => {
    for (const d of [1, 8, 16]) {
      expect(generateShopLevel(getShopLevelConfig(d)).board).toEqual(generateShopLevel(getShopLevelConfig(d)).board);
    }
  });

  for (let day = 1; day <= SHOP_LEVEL_COUNT + 10; day++) {
    it(`Tag ${day} ist lösbar und entspricht seiner Config`, () => {
      const cfg = getShopLevelConfig(day);
      const gen = generateShopLevel(cfg);
      const b = gen.board;

      expect(solveShop(b).solvable).toBe(true);
      expect(replayShopWins(b, gen.solution)).toBe(true);

      expect(b.stations).toHaveLength(cfg.stations);
      expect(b.cart).toHaveLength(cfg.cart); // Rückfallebene würde die Ablage vergrößern
      expect(b.totalOrders).toBe(totalShopOrders(cfg));
      expect(b.stations.filter((s) => s.order).length + b.queue.length).toBe(totalShopOrders(cfg));

      // Waren und Positionen passen exakt zusammen.
      const items = b.stacks.flat();
      expect(items).toHaveLength(totalShopItems(cfg));
      expect(countOpenNeeds(b)).toBe(items.length);
      expect(findShortage(b)).toBeNull();
      expect(new Set(items.map((i) => i.type)).size).toBeLessThanOrEqual(cfg.types);

      // Auftragsarten wie konfiguriert, Serien-Sets nutzen die Serie, Positionen gleichartig.
      const orders = [...b.stations.map((s) => s.order!), ...b.queue];
      expect(orders.filter((o) => o.kind === 'bulk')).toHaveLength(cfg.orders.bulk);
      expect(orders.filter((o) => o.kind === 'series')).toHaveLength(cfg.orders.series);
      expect(orders.filter((o) => o.kind === 'list')).toHaveLength(cfg.orders.list);
      for (const o of orders) {
        expect(o.needs).toHaveLength(cfg.orderSize);
        expect(o.customer.length).toBeGreaterThan(0);
        if (o.kind === 'bulk') expect(new Set(o.needs.map((n) => (n.kind === 'type' ? n.type : '?'))).size).toBe(1);
        if (o.kind === 'series') expect(o.needs.every((n) => n.kind === 'series')).toBe(true);
        if (o.kind === 'list') expect(o.needs.every((n) => n.kind === 'type')).toBe(true);
      }

      // Mystery & Gold
      for (const s of b.stacks) s.forEach((it, j) => expect(it.hidden).toBe(cfg.mystery && j < s.length - 1));
      expect(items.filter((i) => i.gold)).toHaveLength(cfg.gold);

      // Serien-Sets bestehen (wo möglich) aus mindestens zwei verschiedenen Waren im Spiel.
      for (const o of orders.filter((x) => x.kind === 'series')) {
        const series = o.needs[0].kind === 'series' ? o.needs[0].series : null;
        expect(new Set(items.filter((i) => SERIES_OF[i.type] === series).map((i) => i.type)).size).toBeGreaterThanOrEqual(2);
      }
    });
  }

  it('Generierung schnell genug fürs Handy (< 400 ms pro Tag in Node)', () => {
    for (let d = 1; d <= SHOP_LEVEL_COUNT; d++) {
      const t0 = performance.now();
      generateShopLevel(getShopLevelConfig(d));
      expect(performance.now() - t0).toBeLessThan(400);
    }
  });
});
