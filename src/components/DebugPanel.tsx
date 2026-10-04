import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeneratedLevel } from '../game/generator';
import { LEVEL_COUNT } from '../game/levels';
import type { GameAction } from '../game/reducer';
import { solve } from '../game/solver';
import type { GameState, Move } from '../game/types';

interface DebugPanelProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
  generated: GeneratedLevel;
  loadLevel: (level: number) => void;
  hint: Move | null;
  setHint: (move: Move | null) => void;
  xray: boolean;
  setXray: (value: boolean) => void;
  onResetProgress: () => void;
}

const fmtMove = (m: Move) =>
  `${m.from.kind === 'stack' ? 'Stapel' : 'Wagen'} ${m.from.index + 1} → ${m.to.kind === 'slot' ? 'Fach' : 'Wagen'} ${m.to.index + 1}`;

/**
 * Debug-Werkzeuge (nur mit ?debug=1): Level-Sprung, Lösbarkeit des aktuellen
 * Zustands, Solver-Hinweis, automatisches Lösen, Röntgenblick auf Verpackungen.
 */
export function DebugPanel({ state, dispatch, generated, loadLevel, hint, setHint, xray, setXray, onResetProgress }: DebugPanelProps) {
  const [open, setOpen] = useState(true);
  const [target, setTarget] = useState(String(state.config.level));
  const [autoPlay, setAutoPlay] = useState(false);
  useEffect(() => setTarget(String(state.config.level)), [state.config.level]);

  // Lösbarkeit wird nach jedem Zug neu berechnet (Solver ist schnell genug).
  const analysis = useMemo(() => {
    const t0 = performance.now();
    const res = solve(state.board, { maxNodes: 100_000 });
    return { ...res, ms: performance.now() - t0 };
  }, [state.board]);

  // Hinweis verfällt, sobald sich das Board ändert.
  const hintBoard = useRef(state.board);
  useEffect(() => {
    if (hintBoard.current !== state.board) setHint(null);
    hintBoard.current = state.board;
  }, [state.board, setHint]);

  // Auto-Lösen: alle 450 ms den nächsten Lösungszug ausführen.
  useEffect(() => {
    if (!autoPlay) return;
    if (state.status !== 'playing' || !analysis.solvable || analysis.moves.length === 0) {
      setAutoPlay(false);
      return;
    }
    const t = window.setTimeout(() => dispatch({ type: 'APPLY_MOVE', move: analysis.moves[0] }), 450);
    return () => window.clearTimeout(t);
  }, [autoPlay, analysis, state.status, dispatch]);

  const go = (n: number) => loadLevel(Math.max(1, Math.min(999, n)));
  const cfg = state.config;
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
        <button type="button" onClick={() => go(cfg.level - 1)}>
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
        <button type="button" onClick={() => go(cfg.level + 1)}>
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
        <button type="button" disabled={!hint} onClick={() => hint && dispatch({ type: 'APPLY_MOVE', move: hint })}>
          ▶ Zug
        </button>
        <button type="button" onClick={() => setAutoPlay((v) => !v)}>
          {autoPlay ? '⏸ Stopp' : '⏩ Auto-Lösen'}
        </button>
        <button type="button" className={xray ? 'is-on' : ''} onClick={() => setXray(!xray)}>
          🔍 Röntgen
        </button>
      </div>
      {hint && <div className="debug-row">Hinweis: {fmtMove(hint)}</div>}
      <div className="debug-row debug-meta">
        Seed {generated.seed} · Versuche {generated.attempts} · Gewinnquote {Math.round(generated.winRate * 100)}% (Ziel{' '}
        {Math.round(cfg.targetWinRate[0] * 100)}–{Math.round(cfg.targetWinRate[1] * 100)}%){generated.outOfBand ? ' ⚠' : ''}
        <br />
        {cfg.types} Typen · Kap. {cfg.capacity} · {state.board.slots.length} Fächer ({cfg.openSlots} offen) · Wagen {cfg.cart} ·{' '}
        {cfg.mystery ? 'Mystery' : 'offen'}
        {cfg.gold ? ` · ${cfg.gold} Gold` : ''} · Level {cfg.level}/{LEVEL_COUNT}+ · Züge {state.moves}
      </div>
      <div className="debug-row">
        <button type="button" onClick={onResetProgress}>
          Fortschritt löschen
        </button>
      </div>
    </div>
  );
}
