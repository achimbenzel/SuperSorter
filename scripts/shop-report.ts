// Übersicht über alle Tage des Versand-Modus: Lösbarkeit, geschätzte Schwierigkeit,
// Generierungszeit. Zum Feintuning von src/game/shop/levels.ts.
//
// Aufruf: npm run shop:report [-- <bis-Tag>]

import { generateShopLevel, totalShopItems, totalShopOrders } from '../src/game/shop/generator';
import { getShopLevelConfig, SHOP_LEVEL_COUNT } from '../src/game/shop/levels';
import { solveShop } from '../src/game/shop/solver';

const upTo = Number(process.argv[2] ?? SHOP_LEVEL_COUNT);
const rows = [
  'Tag | Items | Aufträge (S/Se/W) | Stat. | Ablage | Myst. | Gold | Rew. | Vers. | Gewinnquote (Ziel)     | Lösung | Knoten | ms',
  '----|-------|-------------------|-------|--------|-------|------|------|-------|------------------------|--------|--------|----',
];
let worst = 0;
for (let level = 1; level <= upTo; level++) {
  const cfg = getShopLevelConfig(level);
  const t0 = performance.now();
  const gen = generateShopLevel(cfg);
  const ms = performance.now() - t0;
  worst = Math.max(worst, ms);
  const check = solveShop(gen.board);
  const { bulk, series, list } = cfg.orders;
  rows.push(
    [
      String(level).padStart(3),
      String(totalShopItems(cfg)).padStart(5),
      `${totalShopOrders(cfg)} (${bulk}/${series}/${list})`.padEnd(17),
      String(cfg.stations).padStart(5),
      String(cfg.cart).padStart(6),
      (cfg.mystery ? 'ja' : '-').padEnd(5),
      String(cfg.gold).padStart(4),
      (cfg.reward ? 'ja' : '-').padEnd(4),
      String(gen.attempts).padStart(5),
      `${gen.winRate.toFixed(2)} (${cfg.targetWinRate[0].toFixed(2)}-${cfg.targetWinRate[1].toFixed(2)})${gen.outOfBand ? ' !' : ''}`.padEnd(22),
      String(gen.solution.length).padStart(6),
      String(check.nodes).padStart(6),
      ms.toFixed(0).padStart(4),
    ].join(' | '),
  );
}
console.log(rows.join('\n'));
console.log(`\nLangsamste Generierung: ${worst.toFixed(0)} ms   ("!" = kein Kandidat im Zielbereich)`);
