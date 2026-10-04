// Reducer des Versand-Modus. Gleiche Bedienlogik wie im Regal-Modus (Tap 1 wählt,
// Tap 2 legt ab, Booster), aber Ziele sind Packstationen.

import type { BoosterCounts } from '../types';
import { hasHiddenItems } from '../sources';
import { sameSource } from '../rules';
import { shuffleShopBox } from './generator';
import { COINS_PER_ORDER, SHOP_GOLD_BONUS } from './levels';
import { applyMove, findShortage, hasAnyMove, isWon, moveCount, shortageAfter, whoNeeds } from './rules';
import { ITEM_LABEL } from '../items';
import { SERIES } from './theme';
import type { ShopBoard, ShopFx, ShopGameState, ShopLevelConfig, ShopLoseReason, ShopMove, SourceRef } from './types';

export type ShopAction =
  | { type: 'TAP_STACK'; index: number }
  | { type: 'TAP_CART'; index: number }
  | { type: 'TAP_STATION'; index: number }
  | { type: 'PEEK_ITEM'; itemId: number }
  | { type: 'END_PEEK' }
  | { type: 'TOGGLE_PEEK' }
  | { type: 'UNDO' }
  | { type: 'USE_EXTRA' }
  | { type: 'SHUFFLE' }
  | { type: 'RESTART' }
  | { type: 'LOAD_LEVEL'; config: ShopLevelConfig; board: ShopBoard }
  /** Booster für Münzen gekauft (Münzen zieht die App ab). */
  | { type: 'GRANT_BOOSTER'; booster: keyof BoosterCounts }
  | { type: 'APPLY_MOVE'; move: ShopMove };

export function createShopState(config: ShopLevelConfig, board: ShopBoard): ShopGameState {
  return {
    config,
    initialBoard: board,
    board,
    history: [],
    selection: null,
    boosters: { ...config.boosters },
    boostersUsed: 0,
    levelCoins: 0,
    moves: 0,
    status: 'playing',
    loseReason: null,
    peekArmed: false,
    peekItemId: null,
    shuffleCount: 0,
    fx: [],
    fxSeq: 0,
  };
}

export function shopReducer(state: ShopGameState, action: ShopAction): ShopGameState {
  switch (action.type) {
    case 'LOAD_LEVEL':
      return createShopState(action.config, action.board);
    case 'RESTART':
      return createShopState(state.config, state.initialBoard);
    case 'END_PEEK':
      return state.peekItemId === null ? state : { ...state, peekItemId: null };
    case 'GRANT_BOOSTER':
      return { ...state, boosters: { ...state.boosters, [action.booster]: state.boosters[action.booster] + 1 } };
  }

  if (state.status === 'won') return state;
  if (state.status === 'lost' && action.type !== 'UNDO' && action.type !== 'USE_EXTRA') return state;

  switch (action.type) {
    case 'TAP_STACK': {
      const s = disarm(state);
      const from: SourceRef = { kind: 'stack', index: action.index };
      if (s.board.stacks[action.index]?.length === 0) return { ...s, selection: null };
      return { ...s, selection: sameSource(s.selection, from) ? null : from };
    }
    case 'TAP_CART': {
      const s = disarm(state);
      const here: SourceRef = { kind: 'cart', index: action.index };
      if (s.board.cart[action.index]) return { ...s, selection: sameSource(s.selection, here) ? null : here };
      if (!s.selection) return s;
      return tryMove(s, { from: s.selection, to: { kind: 'cart', index: action.index } });
    }
    case 'TAP_STATION': {
      const s = disarm(state);
      if (!s.selection) return s;
      return tryMove(s, { from: s.selection, to: { kind: 'station', index: action.index } });
    }
    case 'APPLY_MOVE':
      return tryMove(disarm(state), action.move);
    case 'TOGGLE_PEEK':
      if (!state.peekArmed && (state.boosters.peek <= 0 || !hasHiddenItems(state.board))) return state;
      return { ...state, peekArmed: !state.peekArmed, selection: null };
    case 'PEEK_ITEM': {
      if (!state.peekArmed) return state;
      const hidden = state.board.stacks.some((st) => st.some((it) => it.id === action.itemId && it.hidden));
      if (!hidden) return state;
      return {
        ...state,
        peekArmed: false,
        peekItemId: action.itemId,
        boosters: { ...state.boosters, peek: state.boosters.peek - 1 },
        boostersUsed: state.boostersUsed + 1,
      };
    }
    case 'UNDO': {
      if (state.boosters.undo <= 0 || state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      const missing = state.board.cart.length - prev.board.cart.length;
      const board = missing > 0 ? { ...prev.board, cart: [...prev.board.cart, ...Array<null>(missing).fill(null)] } : prev.board;
      return withStatus({
        ...state,
        board,
        history: state.history.slice(0, -1),
        levelCoins: prev.levelCoins,
        selection: null,
        peekArmed: false,
        boosters: { ...state.boosters, undo: state.boosters.undo - 1 },
        boostersUsed: state.boostersUsed + 1,
      });
    }
    case 'USE_EXTRA': {
      if (state.boosters.extra <= 0) return state;
      return withStatus({
        ...state,
        board: { ...state.board, cart: [...state.board.cart, null] },
        selection: null,
        peekArmed: false,
        boosters: { ...state.boosters, extra: state.boosters.extra - 1 },
        boostersUsed: state.boostersUsed + 1,
      });
    }
    case 'SHUFFLE': {
      if (state.boosters.shuffle <= 0) return state;
      const board = shuffleShopBox(state.board, state.config, state.shuffleCount);
      if (!board) return emit({ ...state, selection: null }, [{ kind: 'denied', booster: 'shuffle' }]);
      return emit(
        withStatus({
          ...state,
          board,
          history: [...state.history, { board: state.board, levelCoins: state.levelCoins }],
          selection: null,
          peekArmed: false,
          shuffleCount: state.shuffleCount + 1,
          boosters: { ...state.boosters, shuffle: state.boosters.shuffle - 1 },
          boostersUsed: state.boostersUsed + 1,
        }),
        [{ kind: 'shuffled' }],
      );
    }
  }
  return state;
}

type FxInput = ShopFx extends infer E ? (E extends { seq: number } ? Omit<E, 'seq'> : never) : never;

function tryMove(state: ShopGameState, move: ShopMove): ShopGameState {
  if (moveCount(state.board, move) === 0) return emit(state, [{ kind: 'invalid', target: move.to }]);
  const shortage = shortageAfter(state.board, move);
  if (shortage) {
    // Nicht ausführen, sondern erklären, wer die Ware noch braucht. Auswahl bleibt.
    const who = whoNeeds(state.board, shortage);
    const message =
      'type' in shortage
        ? `${ITEM_LABEL[shortage.type]} wird noch${who ? ` für ${who}` : ''} gebraucht!`
        : `${who ? `${who} braucht` : 'Es fehlt'} sonst eine Ware der Serie ${SERIES[shortage.series].label}!`;
    return emit(state, [{ kind: 'blocked', target: move.to, message }]);
  }
  const result = applyMove(state.board, move);
  const events: FxInput[] = [];
  if (result.revealed) events.push({ kind: 'revealed', itemId: result.revealed.id });
  let coins = result.goldPlaced * SHOP_GOLD_BONUS;
  if (result.shipped) {
    coins += COINS_PER_ORDER;
    events.push({ kind: 'shipped', station: result.shipped.station, order: result.shipped.order, items: result.shipped.items });
  }
  if (coins > 0 && move.to.kind === 'station') events.push({ kind: 'coins', coinTarget: `station-${move.to.index}`, amount: coins });

  return emit(
    withStatus({
      ...state,
      board: result.board,
      history: [...state.history, { board: state.board, levelCoins: state.levelCoins }],
      levelCoins: state.levelCoins + coins,
      selection: null,
      moves: state.moves + 1,
    }),
    events,
  );
}

export function evaluateShopStatus(board: ShopBoard): { status: ShopGameState['status']; loseReason: ShopLoseReason | null } {
  if (isWon(board)) return { status: 'won', loseReason: null };
  if (findShortage(board)) return { status: 'lost', loseReason: 'shortage' };
  if (!hasAnyMove(board)) return { status: 'lost', loseReason: 'deadlock' };
  return { status: 'playing', loseReason: null };
}

function withStatus(state: ShopGameState): ShopGameState {
  return { ...state, ...evaluateShopStatus(state.board) };
}

function emit(state: ShopGameState, events: FxInput[]): ShopGameState {
  if (events.length === 0) return state;
  let seq = state.fxSeq;
  const fx = events.map((e) => ({ ...e, seq: ++seq }) as ShopFx);
  return { ...state, fx, fxSeq: seq };
}

function disarm(state: ShopGameState): ShopGameState {
  return state.peekArmed ? { ...state, peekArmed: false } : state;
}

export function shopStarRating(state: ShopGameState): 1 | 2 | 3 {
  if (state.boostersUsed === 0) return 3;
  if (state.boostersUsed <= 2) return 2;
  return 1;
}
