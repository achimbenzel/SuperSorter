// Solver für den Packband-Modus.
//
// Weil nach jedem Tap alles Weitere festgelegt ist (Routing, Versand, Kettenreaktion),
// verzweigt die Suche nur über die Wahl der Kiste: höchstens 4 Möglichkeiten pro Zug.
// Deshalb arbeitet der Solver direkt auf den echten Regeln (rules.applyTap) – es gibt
// keine zweite Regel-Implementierung, die auseinanderlaufen könnte.
//
// Tiefensuche mit Gedächtnis für gescheiterte Zustände. Jeder Tap entfernt eine Ware
// aus einer Kiste, die Tiefe ist also durch die Warenzahl begrenzt.

import { applyTap, isWon, listTaps, routeOf, topItem } from './rules';
import type { PackBoard } from './types';

export interface PackSolveResult {
  /** true = lösbar, false = beweisbar unlösbar, null = Budget erschöpft */
  solvable: boolean | null;
  /** Lösung als Folge von Kisten-Indizes. */
  moves: number[];
  nodes: number;
}

export function packKey(b: PackBoard): string {
  const cart = b.cart
    .filter(Boolean)
    .map((c) => c!.type)
    .sort()
    .join(',');
  const spots = b.spots
    .map((s) => (s ? `${s.box.id}:${s.filled.map((f) => (f ? 1 : 0)).join('')}` : '-'))
    .join('/');
  return `${b.stacks.map((s) => s.length).join(',')}|${cart}|${spots}|${b.queue.length}`;
}

export function solvePack(board: PackBoard, options: { maxNodes?: number } = {}): PackSolveResult {
  const maxNodes = options.maxNodes ?? 100_000;
  const failed = new Set<string>();
  const path: number[] = [];
  let nodes = 0;
  let budgetHit = false;

  const dfs = (b: PackBoard): boolean => {
    if (isWon(b)) return true;
    if (++nodes > maxNodes) {
      budgetHit = true;
      return false;
    }
    const key = packKey(b);
    if (failed.has(key)) return false;
    // Zugreihenfolge als Heuristik: erst Taps, deren Ware direkt in ein Paket passt.
    const taps = listTaps(b).sort((x, y) => directScore(b, y) - directScore(b, x));
    for (const t of taps) {
      path.push(t);
      if (dfs(applyTap(b, t).board)) return true;
      path.pop();
      if (budgetHit) return false;
    }
    failed.add(key);
    return false;
  };

  const ok = dfs(board);
  if (ok) return { solvable: true, moves: path.slice(), nodes };
  return { solvable: budgetHit ? null : false, moves: [], nodes };
}

function directScore(b: PackBoard, stack: number): number {
  const top = topItem(b, stack);
  return top && routeOf(b, top.type)?.kind === 'spot' ? 1 : 0;
}

/** Nächster Zug einer Lösung (Debug-Hinweis). */
export function nextPackHint(board: PackBoard): number | null {
  const res = solvePack(board);
  return res.solvable ? (res.moves[0] ?? null) : null;
}
