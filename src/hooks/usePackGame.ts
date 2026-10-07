import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { BoosterId } from '../assets';
import * as sfx from '../audio/sfx';
import { closeAt } from '../components/pack/timeline';
import { STORAGE_KEY, TIMING } from '../config';
import { BOOSTER_PRICES } from '../game/levels';
import { packWinCoins } from '../game/pack/levels';
import { createPackState, packReducer, type PackAction } from '../game/pack/reducer';
import { getPackLevel, prefetchLevel } from '../levelStore';
import { DEFAULT_PROGRESS, type Progress } from './progress';
import { usePersistedState } from './usePersistedState';

const BOOSTER_ACTIONS = new Set<PackAction['type']>(['UNDO', 'USE_EXTRA', 'TOGGLE_PEEK', 'SHUFFLE']);

/** Wie useGame, aber für den Packband-Modus (Fortschritt = Versand-Tag). */
export function usePackGame() {
  const [progress, setProgress] = usePersistedState<Progress>(STORAGE_KEY, DEFAULT_PROGRESS);
  const [generated, setGenerated] = useState(() => getPackLevel(progress.packDay));
  const [state, rawDispatch] = useReducer(packReducer, generated, (g) => createPackState(g.config, g.board));
  const [attempt, setAttempt] = useState(0);
  const winHandledFor = useRef<number | null>(null);

  const dispatch = useCallback((action: PackAction) => {
    if (BOOSTER_ACTIONS.has(action.type)) sfx.playBooster();
    rawDispatch(action);
  }, []);

  const loadLevel = useCallback(
    (day: number) => {
      const g = getPackLevel(day);
      setGenerated(g);
      rawDispatch({ type: 'LOAD_LEVEL', config: g.config, board: g.board });
      setAttempt((a) => a + 1);
      setProgress((p) => ({ ...p, packDay: day, packHighest: Math.max(p.packHighest, day) }));
    },
    [setProgress],
  );

  const restart = useCallback(() => {
    rawDispatch({ type: 'RESTART' });
    setAttempt((a) => a + 1);
  }, []);

  // Tag geschafft: Münzen + nächster Tag sofort speichern.
  useEffect(() => {
    if (state.status !== 'won' || winHandledFor.current === attempt) return;
    winHandledFor.current = attempt;
    const earned = packWinCoins(state.config) + state.levelCoins;
    const next = state.config.level + 1;
    setProgress((p) => ({ ...p, packDay: next, coins: p.coins + earned, packHighest: Math.max(p.packHighest, next) }));
    sfx.playWin();
  }, [state.status, state.config, state.levelCoins, attempt, setProgress]);

  useEffect(() => {
    if (state.status === 'lost') sfx.playLose();
  }, [state.status]);

  // Sounds passend zur abgespielten Kettenreaktion.
  const lastFx = useRef(0);
  const sfxTimers = useRef<number[]>([]);
  useEffect(() => {
    for (const ev of state.fx) {
      if (ev.seq <= lastFx.current) continue;
      lastFx.current = ev.seq;
      if (ev.kind === 'invalid' || ev.kind === 'denied') sfx.playInvalid();
      if (ev.kind === 'revealed') sfx.playReveal();
      if (ev.kind === 'coins') sfx.playGold();
      if (ev.kind === 'shipped') sfxTimers.current.push(window.setTimeout(sfx.playShip, closeAt(ev.chain)));
    }
  }, [state.fx]);
  useEffect(() => () => sfxTimers.current.forEach((t) => window.clearTimeout(t)), []);
  // Ware landet erst nach dem Flug -> Sound passend dazu.
  useEffect(() => {
    if (state.moves === 0) return;
    const t = window.setTimeout(sfx.playPlace, TIMING.hop * 0.8);
    return () => window.clearTimeout(t);
  }, [state.moves]);

  useEffect(() => {
    if (state.peekItemId === null) return;
    const t = window.setTimeout(() => rawDispatch({ type: 'END_PEEK' }), TIMING.peek);
    return () => window.clearTimeout(t);
  }, [state.peekItemId]);

  // Nächsten Tag im Hintergrund (Web Worker) vorberechnen, damit er sofort lädt.
  useEffect(() => {
    const t = window.setTimeout(() => prefetchLevel('pack', state.config.level + 1), 600);
    return () => window.clearTimeout(t);
  }, [state.config.level]);

  const buyBooster = useCallback(
    (id: BoosterId, use: PackAction) => {
      const price = BOOSTER_PRICES[id];
      if (progress.coins < price) return;
      setProgress((p) => ({ ...p, coins: p.coins - price }));
      rawDispatch({ type: 'GRANT_BOOSTER', booster: id });
      dispatch(use);
    },
    [progress.coins, setProgress, dispatch],
  );

  const displayCoins = progress.coins + (state.status === 'won' ? 0 : state.levelCoins);

  return { state, dispatch, generated, progress, setProgress, loadLevel, restart, attempt, displayCoins, buyBooster };
}
