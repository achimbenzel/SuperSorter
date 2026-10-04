// Übersicht über alle Tage des Packband-Modus: Lösbarkeit, geschätzte Schwierigkeit,
// Generierungszeit. Zum Feintuning von src/game/pack/levels.ts.
//
// Aufruf: npm run pack:report [-- <bis-Tag>]

import { generatePackLevel, totalPackBoxes, totalPackItems } from '../src/game/pack/generator';
import { getPackLevelConfig, PACK_LEVEL_COUNT } from '../src/game/pack/levels';
import { solvePack } from '../src/game/pack/solver';

const upTo = Number(process.argv[2] ?? PACK_LEVEL_COUNT);
const rows = [
  'Tag | Waren | Pakete (S/G) | Plätze | Tisch | Kisten | Myst. | Gold | Rew. | Vers. | Gewinnquote (Ziel)     | Lösung | Knoten | ms',
  '----|-------|--------------|--------|-------|--------|-------|------|------|-------|------------------------|--------|--------|----',
];
let worst = 0;
for (let level = 1; level <= upTo; level++) {
  const cfg = getPackLevelConfig(level);
  const t0 = performance.now();
  const gen = generatePackLevel(cfg);
  const ms = performance.now() - t0;
  worst = Math.max(worst, ms);
  const check = solvePack(gen.board);
  rows.push(
    [
      String(level).padStart(3),
      String(totalPackItems(cfg)).padStart(5),
      `${totalPackBoxes(cfg)} (${cfg.boxes.bulk}/${cfg.boxes.mixed})`.padEnd(12),
      String(cfg.spots).padStart(6),
      String(cfg.table).padStart(5),
      String(cfg.stacks).padStart(6),
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
