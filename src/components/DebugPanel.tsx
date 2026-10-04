import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GameStatus } from '../game/types';

export interface DebugAnalysis<M> {
  solvable: boolean | null;
  moves: M[];
  nodes: number;
}

interface DebugPanelProps<M> {
  level: number;
  status: GameStatus;
  /** Ändert sich mit jedem Zug (Board-Objekt) -> Lösbarkeit neu berechnen. */
  board: unknown;
  solve: () => DebugAnalysis<M>;
  formatMove: (move: M) => string;
  applyMove: (move: M) => void;
  hint: M | null;
  setHint: (move: M | null) => void;
  xray: boolean;
  setXray: (value: boolean) => void;
  loadLevel: (level: number) => void;
  onResetProgress: () => void;
  /** Modusspezifische Zusatzinfos (Seed, Gewinnquote, Config …). */
  meta: ReactNode;
}

/**
 * Debug-Werkzeuge (nur mit ?debug=1), für beide Spielmodi: Level-Sprung, Lösbarkeit
 * des aktuellen Zustands, Solver-Hinweis, automatisches Lösen, Röntgenblick.
 */
export function DebugPanel<M>({
  level,
  status,
  board,
  solve,
  formatMove,
  applyMove,
  hint,
  setHint,
  xray,
  setXray,
  loadLevel,
  onResetProgress,
  meta,
}: DebugPanelProps<M>) {
  const [open, setOpen] = useState(true);
  const [target, setTarget] = useState(String(level));
  const [autoPlay, setAutoPlay] = useState(false);
  useEffect(() => setTarget(String(level)), [level]);

  const analysis = useMemo(() => {
    const t0 = performance.now();
    const res = solve();
    return { ...res, ms: performance.now() - t0 };
    // solve hängt nur vom Board ab
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  // Hinweis verfällt, sobald sich das Board ändert.
  const hintBoard = useRef(board);
  useEffect(() => {
    if (hintBoard.current !== board) setHint(null);
    hintBoard.current = board;
  }, [board, setHint]);

  // Auto-Lösen: alle 450 ms den nächsten Lösungszug ausführen.
  useEffect(() => {
    if (!autoPlay) return;
    if (status !== 'playing' || !analysis.solvable || analysis.moves.length === 0) {
      setAutoPlay(false);
      return;
    }
    const t = window.setTimeout(() => applyMove(analysis.moves[0]), 450);
    return () => window.clearTimeout(t);
  }, [autoPlay, analysis, status, applyMove]);

  const go = (n: number) => loadLevel(Math.max(1, Math.min(999, n)));
  const solvableText =
    analysis.solvable === true
      ? `✅ ja – noch ${analysis.moves.length} Züge`
      : analysis.solvable === false
        ? '❌ nein'
        : '❓ unbekannt (Budget)';

  if (!open) {
    return (
      <button type="button" className="debug-toggle" onClick={() => setOpen(true)}>
        🐞
      </button>
    );
  }

  return (
    <div className="debug" role="region" aria-label="Debug">
      <div className="debug-row">
        <strong>Debug</strong>
        <button type="button" onClick={() => go(level - 1)}>
          ◀
        </button>
        <input
          inputMode="numeric"
          value={target}
          onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && go(Number(target))}
          aria-label="Level"
        />
        <button type="button" onClick={() => go(Number(target))}>
          Los
        </button>
        <button type="button" onClick={() => go(level + 1)}>
          ▶
        </button>
        <button type="button" className="debug-close" onClick={() => setOpen(false)} aria-label="Debug schließen">
          ✕
        </button>
      </div>
      <div className="debug-row">
        Lösbar: {solvableText} <small>({analysis.nodes} Knoten, {analysis.ms.toFixed(0)} ms)</small>
      </div>
      <div className="debug-row">
        <button type="button" onClick={() => setHint(analysis.solvable ? (analysis.moves[0] ?? null) : null)}>
          💡 Hinweis
        </button>
        <button type="button" disabled={!hint} onClick={() => hint && applyMove(hint)}>
          ▶ Zug
        </button>
        <button type="button" onClick={() => setAutoPlay((v) => !v)}>
          {autoPlay ? '⏸ Stopp' : '⏩ Auto-Lösen'}
        </button>
        <button type="button" className={xray ? 'is-on' : ''} onClick={() => setXray(!xray)}>
          🔍 Röntgen
        </button>
      </div>
      {hint && <div className="debug-row">Hinweis: {formatMove(hint)}</div>}
      <div className="debug-row debug-meta">{meta}</div>
      <div className="debug-row">
        <button type="button" onClick={onResetProgress}>
          Fortschritt löschen
        </button>
      </div>
    </div>
  );
}
