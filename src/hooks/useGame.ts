import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import * as sfx from '../audio/sfx';
import { STORAGE_KEY, TIMING } from '../config';
import { generateLevel, type GeneratedLevel } from '../game/generator';
import { getLevelConfig, winCoins } from '../game/levels';
import { createGameState, gameReducer, type GameAction } from '../game/reducer';
import { usePersistedState } from './usePersistedState';

export interface Progress {
  /** Level, das als Nächstes gespielt wird. */
  level: number;
  coins: number;
  /** Höchstes erreichtes Level (für spätere Level-Auswahl). */
  highest: number;
}

const DEFAULT_PROGRESS: Progress = { level: 1, coins: 0, highest: 1 };
const BOOSTER_ACTIONS = new Set<GameAction['type']>(['UNDO', 'USE_EXTRA', 'TOGGLE_PEEK', 'SHUFFLE']);

// Generierte Level werden pro Sitzung gecacht (Generierung ist deterministisch).
const cache = new Map<number, GeneratedLevel>();
export function getGeneratedLevel(level: number): GeneratedLevel {
  let g = cache.get(level);
  if (!g) {
    g = generateLevel(getLevelConfig(level));
    cache.set(level, g);
  }
  return g;
}

/**
 * Verbindet die reine Spiellogik (Reducer) mit der App: Level laden, Fortschritt
 * speichern, Sound-Events auslösen, Lupen-Timer. Komponenten bekommen nur `state`
 * und `dispatch` und bleiben dadurch dumm und leicht austauschbar.
 */
export function useGame() {
  const [progress, setProgress] = usePersistedState<Progress>(STORAGE_KEY, DEFAULT_PROGRESS);
  const [generated, setGenerated] = useState(() => getGeneratedLevel(progress.level));
  const [state, rawDispatch] = useReducer(gameReducer, generated, (g) => createGameState(g.config, g.board));
  /** Ändert sich bei jedem neuen Versuch -> Board wird neu gemountet (keine Flug-Animationen von alten Positionen). */
  const [attempt, setAttempt] = useState(0);
  const winHandledFor = useRef<number | null>(null);

  const dispatch = useCallback((action: GameAction) => {
    if (action.type.startsWith('TAP_')) sfx.playTap();
    if (BOOSTER_ACTIONS.has(action.type)) sfx.playBooster();
    rawDispatch(action);
  }, []);

  const loadLevel = useCallback(
    (level: number) => {
      const g = getGeneratedLevel(level);
      setGenerated(g);
      rawDispatch({ type: 'LOAD_LEVEL', config: g.config, board: g.board });
      setAttempt((a) => a + 1);
      setProgress((p) => ({ ...p, level, highest: Math.max(p.highest, level) }));
    },
    [setProgress],
  );

  const restart = useCallback(() => {
    rawDispatch({ type: 'RESTART' });
    setAttempt((a) => a + 1);
  }, []);

  // Sieg: Münzen und nächstes Level sofort speichern (auch wenn die App danach geschlossen wird).
  useEffect(() => {
    if (state.status !== 'won' || winHandledFor.current === attempt) return;
    winHandledFor.current = attempt;
    const earned = winCoins(state.config) + state.levelCoins;
    const next = state.config.level + 1;
    setProgress((p) => ({ level: next, coins: p.coins + earned, highest: Math.max(p.highest, next) }));
    sfx.playWin();
  }, [state.status, state.config, state.levelCoins, attempt, setProgress]);

  useEffect(() => {
    if (state.status === 'lost') sfx.playLose();
  }, [state.status]);

  // Sound-Hooks für FX-Events
  const lastFx = useRef(0);
  useEffect(() => {
    for (const ev of state.fx) {
      if (ev.seq <= lastFx.current) continue;
      lastFx.current = ev.seq;
      if (ev.kind === 'invalid' || ev.kind === 'denied') sfx.playInvalid();
      if (ev.kind === 'solved') sfx.playSolved();
      if (ev.kind === 'gold') sfx.playGold();
      if (ev.kind === 'revealed') sfx.playReveal();
    }
  }, [state.fx]);
  useEffect(() => {
    if (state.selection) sfx.playSelect();
  }, [state.selection]);
  useEffect(() => {
    if (state.moves > 0) sfx.playPlace();
  }, [state.moves]);

  // Lupe: verpacktes Item nur kurz zeigen.
  useEffect(() => {
    if (state.peekItemId === null) return;
    const t = window.setTimeout(() => rawDispatch({ type: 'END_PEEK' }), TIMING.peek);
    return () => window.clearTimeout(t);
  }, [state.peekItemId]);

  // Nächstes Level im Leerlauf vorberechnen, damit "Weiter" ohne Verzögerung lädt.
  useEffect(() => {
    const next = state.config.level + 1;
    const t = window.setTimeout(() => getGeneratedLevel(next), 1200);
    return () => window.clearTimeout(t);
  }, [state.config.level]);

  /** Münzanzeige: gespeicherte Münzen + noch nicht gutgeschriebene Gold-Münzen dieses Versuchs. */
  const displayCoins = progress.coins + (state.status === 'won' ? 0 : state.levelCoins);

  return { state, dispatch, generated, progress, setProgress, loadLevel, restart, attempt, displayCoins };
}
