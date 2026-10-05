import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import * as sfx from '../audio/sfx';
import type { BoosterId } from '../assets';
import { STORAGE_KEY, TIMING } from '../config';
import { BOOSTER_PRICES, winCoins } from '../game/levels';
import { createGameState, gameReducer, type GameAction } from '../game/reducer';
import { getShelfLevel, prefetchLevel } from '../levelStore';
import { DEFAULT_PROGRESS, type Progress } from './progress';
import { usePersistedState } from './usePersistedState';
const BOOSTER_ACTIONS = new Set<GameAction['type']>(['UNDO', 'USE_EXTRA', 'TOGGLE_PEEK', 'SHUFFLE']);

/**
 * Verbindet die reine Spiellogik (Reducer) mit der App: Level laden, Fortschritt
 * speichern, Sound-Events auslösen, Lupen-Timer. Komponenten bekommen nur `state`
 * und `dispatch` und bleiben dadurch dumm und leicht austauschbar.
 */
export function useGame() {
  const [progress, setProgress] = usePersistedState<Progress>(STORAGE_KEY, DEFAULT_PROGRESS);
  const [generated, setGenerated] = useState(() => getShelfLevel(progress.level));
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
      const g = getShelfLevel(level);
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
    setProgress((p) => ({ ...p, level: next, coins: p.coins + earned, highest: Math.max(p.highest, next) }));
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

  // Nächstes Level im Hintergrund (Web Worker) vorberechnen, damit "Weiter" sofort lädt.
  useEffect(() => {
    const t = window.setTimeout(() => prefetchLevel('shelf', state.config.level + 1), 600);
    return () => window.clearTimeout(t);
  }, [state.config.level]);

  /** Booster für Münzen kaufen und sofort einsetzen (Kontingent im Level aufgebraucht). */
  const buyBooster = useCallback(
    (id: BoosterId, use: GameAction) => {
      const price = BOOSTER_PRICES[id];
      if (progress.coins < price) return;
      setProgress((p) => ({ ...p, coins: p.coins - price }));
      rawDispatch({ type: 'GRANT_BOOSTER', booster: id });
      dispatch(use);
    },
    [progress.coins, setProgress, dispatch],
  );

  /** Münzanzeige: gespeicherte Münzen + noch nicht gutgeschriebene Gold-Münzen dieses Versuchs. */
  const displayCoins = progress.coins + (state.status === 'won' ? 0 : state.levelCoins);

  return { state, dispatch, generated, progress, setProgress, loadLevel, restart, attempt, displayCoins, buyBooster };
}
