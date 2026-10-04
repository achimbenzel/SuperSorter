// Übersicht über alle generierten Level: Lösbarkeit, geschätzte Schwierigkeit,
// Generierungszeit. Hilft beim Feintuning der Progressionstabelle in src/game/levels.ts.
//
// Aufruf: npm run levels:report [-- <bis-Level>]

import { generateLevel, totalItems, totalSlots } from '../src/game/generator';
import { getLevelConfig, LEVEL_COUNT } from '../src/game/levels';
import { solve } from '../src/game/solver';

const upTo = Number(process.argv[2] ?? LEVEL_COUNT);
const rows: string[] = [];
rows.push('Lvl | Items | Fächer (offen) | Stapel | Wagen | Mystery | Gold | Reward | Versuche | Gewinnquote (Ziel)     | Lösung | Knoten | ms');
rows.push('----|-------|----------------|--------|-------|---------|------|--------|----------|------------------------|--------|--------|----');
let worst = 0;
for (let level = 1; level <= upTo; level++) {
  const cfg = getLevelConfig(level);
  const t0 = performance.now();
  const gen = generateLevel(cfg);
  const ms = performance.now() - t0;
  worst = Math.max(worst, ms);
  const check = solve(gen.board);
  const band = `${cfg.targetWinRate[0].toFixed(2)}-${cfg.targetWinRate[1].toFixed(2)}`;
  rows.push(
    [
      String(level).padStart(3),
      String(totalItems(cfg)).padStart(5),
      `${totalSlots(cfg)} (${cfg.openSlots})`.padEnd(14),
      String(cfg.stacks).padStart(6),
      String(cfg.cart).padStart(5),
      (cfg.mystery ? 'ja' : '-').padEnd(7),
      String(cfg.gold).padStart(4),
      (cfg.reward ? 'ja' : '-').padEnd(6),
      String(gen.attempts).padStart(8),
      `${gen.winRate.toFixed(2)} (${band})${gen.outOfBand ? ' !' : ''}`.padEnd(22),
      String(gen.solution.length).padStart(6),
      String(check.nodes).padStart(6),
      ms.toFixed(0).padStart(4),
    ].join(' | '),
  );
}
console.log(rows.join('\n'));
console.log(`\nLangsamste Generierung: ${worst.toFixed(0)} ms   ("!" = kein Kandidat im Zielbereich, nächstbester genommen)`);
