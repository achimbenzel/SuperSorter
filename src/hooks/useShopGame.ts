import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { BoosterId } from '../assets';
import * as sfx from '../audio/sfx';
import { STORAGE_KEY, TIMING } from '../config';
import { BOOSTER_PRICES } from '../game/levels';
import { generateShopLevel, type GeneratedShopLevel } from '../game/shop/generator';
import { getShopLevelConfig, shopWinCoins } from '../game/shop/levels';
import { createShopState, shopReducer, type ShopAction } from '../game/shop/reducer';
import { DEFAULT_PROGRESS, type Progress } from './progress';
import { usePersistedState } from './usePersistedState';

const BOOSTER_ACTIONS = new Set<ShopAction['type']>(['UNDO', 'USE_EXTRA', 'TOGGLE_PEEK', 'SHUFFLE']);

const cache = new Map<number, GeneratedShopLevel>();
export function getGeneratedShopLevel(day: number): GeneratedShopLevel {
  let g = cache.get(day);
  if (!g) {
    g = generateShopLevel(getShopLevelConfig(day));
    cache.set(day, g);
  }
  return g;
}

/** Wie useGame, aber für den Versand-Modus (Fortschritt = "Tag"). */
export function useShopGame() {
  const [progress, setProgress] = usePersistedState<Progress>(STORAGE_KEY, DEFAULT_PROGRESS);
  const [generated, setGenerated] = useState(() => getGeneratedShopLevel(progress.shopDay));
  const [state, rawDispatch] = useReducer(shopReducer, generated, (g) => createShopState(g.config, g.board));
  const [attempt, setAttempt] = useState(0);
  const winHandledFor = useRef<number | null>(null);

  const dispatch = useCallback((action: ShopAction) => {
    if (action.type.startsWith('TAP_')) sfx.playTap();
    if (BOOSTER_ACTIONS.has(action.type)) sfx.playBooster();
    rawDispatch(action);
  }, []);

  const loadLevel = useCallback(
    (day: number) => {
      const g = getGeneratedShopLevel(day);
      setGenerated(g);
      rawDispatch({ type: 'LOAD_LEVEL', config: g.config, board: g.board });
      setAttempt((a) => a + 1);
      setProgress((p) => ({ ...p, shopDay: day, shopHighest: Math.max(p.shopHighest, day) }));
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
    const earned = shopWinCoins(state.config) + state.levelCoins;
    const next = state.config.level + 1;
    setProgress((p) => ({ ...p, shopDay: next, coins: p.coins + earned, shopHighest: Math.max(p.shopHighest, next) }));
    sfx.playWin();
  }, [state.status, state.config, state.levelCoins, attempt, setProgress]);

  useEffect(() => {
    if (state.status === 'lost') sfx.playLose();
  }, [state.status]);

  const lastFx = useRef(0);
  useEffect(() => {
    for (const ev of state.fx) {
      if (ev.seq <= lastFx.current) continue;
      lastFx.current = ev.seq;
      if (ev.kind === 'invalid' || ev.kind === 'blocked' || ev.kind === 'denied') sfx.playInvalid();
      if (ev.kind === 'shipped') sfx.playShip();
      if (ev.kind === 'revealed') sfx.playReveal();
      if (ev.kind === 'coins') sfx.playGold();
    }
  }, [state.fx]);
  useEffect(() => {
    if (state.selection) sfx.playSelect();
  }, [state.selection]);
  useEffect(() => {
    if (state.moves > 0) sfx.playPlace();
  }, [state.moves]);

  useEffect(() => {
    if (state.peekItemId === null) return;
    const t = window.setTimeout(() => rawDispatch({ type: 'END_PEEK' }), TIMING.peek);
    return () => window.clearTimeout(t);
  }, [state.peekItemId]);

  // Nächsten Tag im Leerlauf vorberechnen.
  useEffect(() => {
    const t = window.setTimeout(() => getGeneratedShopLevel(state.config.level + 1), 1200);
    return () => window.clearTimeout(t);
  }, [state.config.level]);

  const buyBooster = useCallback(
    (id: BoosterId, use: ShopAction) => {
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
