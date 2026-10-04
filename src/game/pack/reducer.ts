// Reducer des Packband-Modus. Ein Tap auf eine Kiste ist ein kompletter Zug –
// es gibt keine Auswahl und keinen zweiten Tap.

import type { BoosterCounts } from '../types';
import { hasHiddenItems } from '../sources';
import { shufflePackBox } from './generator';
import { COINS_PER_BOX, COMBO_BONUS, PACK_GOLD_BONUS } from './levels';
import { applyTap, canTap, hasAnyMove, isWon } from './rules';
import type { PackBoard, PackFx, PackGameState, PackLevelConfig } from './types';

export type PackAction =
  | { type: 'TAP_STACK'; index: number }
  | { type: 'PEEK_ITEM'; itemId: number }
  | { type: 'END_PEEK' }
  | { type: 'TOGGLE_PEEK' }
  | { type: 'UNDO' }
  | { type: 'USE_EXTRA' }
  | { type: 'SHUFFLE' }
  | { type: 'RESTART' }
  | { type: 'LOAD_LEVEL'; config: PackLevelConfig; board: PackBoard }
  | { type: 'GRANT_BOOSTER'; booster: keyof BoosterCounts };

export function createPackState(config: PackLevelConfig, board: PackBoard): PackGameState {
  return {
    config,
    initialBoard: board,
    board,
    history: [],
    boosters: { ...config.boosters },
    boostersUsed: 0,
    levelCoins: 0,
    moves: 0,
    status: 'playing',
    peekArmed: false,
    peekItemId: null,
    shuffleCount: 0,
    fx: [],
    fxSeq: 0,
  };
}

export function packReducer(state: PackGameState, action: PackAction): PackGameState {
  switch (action.type) {
    case 'LOAD_LEVEL':
      return createPackState(action.config, action.board);
    case 'RESTART':
      return createPackState(state.config, state.initialBoard);
    case 'END_PEEK':
      return state.peekItemId === null ? state : { ...state, peekItemId: null };
    case 'GRANT_BOOSTER':
      return { ...state, boosters: { ...state.boosters, [action.booster]: state.boosters[action.booster] + 1 } };
  }

  if (state.status === 'won') return state;
  if (state.status === 'lost' && action.type !== 'UNDO' && action.type !== 'USE_EXTRA') return state;

  switch (action.type) {
    case 'TAP_STACK':
      return tap(state.peekArmed ? { ...state, peekArmed: false } : state, action.index);
    case 'TOGGLE_PEEK':
      if (!state.peekArmed && (state.boosters.peek <= 0 || !hasHiddenItems(state.board))) return state;
      return { ...state, peekArmed: !state.peekArmed };
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
      // Ein per Booster hinzugefügter Packtisch-Platz bleibt erhalten.
      const missing = state.board.cart.length - prev.board.cart.length;
      const board = missing > 0 ? { ...prev.board, cart: [...prev.board.cart, ...Array<null>(missing).fill(null)] } : prev.board;
      return withStatus({
        ...state,
        board,
        history: state.history.slice(0, -1),
        levelCoins: prev.levelCoins,
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
        peekArmed: false,
        boosters: { ...state.boosters, extra: state.boosters.extra - 1 },
        boostersUsed: state.boostersUsed + 1,
      });
    }
    case 'SHUFFLE': {
      if (state.boosters.shuffle <= 0) return state;
      const board = shufflePackBox(state.board, state.config, state.shuffleCount);
      if (!board) return emit(state, [{ kind: 'denied', booster: 'shuffle' }]);
      return emit(
        withStatus({
          ...state,
          board,
          history: [...state.history, { board: state.board, levelCoins: state.levelCoins }],
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

type FxInput = PackFx extends infer E ? (E extends { seq: number } ? Omit<E, 'seq'> : never) : never;

function tap(state: PackGameState, stack: number): PackGameState {
  if (!canTap(state.board, stack)) return emit(state, [{ kind: 'invalid', stack }]);
  const r = applyTap(state.board, stack);
  const events: FxInput[] = [];
  if (r.revealed) events.push({ kind: 'revealed', itemId: r.revealed.id });

  // Münzen: pro Paket, Kombo-Bonus ab dem zweiten Paket im selben Zug, Gold.
  let coins = r.goldPacked * PACK_GOLD_BONUS;
  let comboBonus = 0;
  for (const s of r.shipped) {
    coins += COINS_PER_BOX;
    comboBonus += s.chain * COMBO_BONUS;
    events.push({ kind: 'shipped', spot: s.spot, box: s.box, items: s.items, chain: s.chain });
  }
  coins += comboBonus;
  for (const f of r.fed) events.push({ kind: 'fed', itemIds: f.itemIds, chain: f.chain });
  if (r.shipped.length >= 2) events.push({ kind: 'combo', spot: r.shipped[0].spot, count: r.shipped.length, bonus: comboBonus });
  const coinSpot = r.shipped[0]?.spot ?? (r.route.kind === 'spot' ? r.route.index : null);
  if (coins > 0 && coinSpot !== null) events.push({ kind: 'coins', coinTarget: `spot-${coinSpot}`, amount: coins });

  return emit(
    withStatus({
      ...state,
      board: r.board,
      history: [...state.history, { board: state.board, levelCoins: state.levelCoins }],
      levelCoins: state.levelCoins + coins,
      moves: state.moves + 1,
    }),
    events,
  );
}

export function evaluatePackStatus(board: PackBoard): PackGameState['status'] {
  if (isWon(board)) return 'won';
  if (!hasAnyMove(board)) return 'lost';
  return 'playing';
}

function withStatus(state: PackGameState): PackGameState {
  return { ...state, status: evaluatePackStatus(state.board) };
}

function emit(state: PackGameState, events: FxInput[]): PackGameState {
  if (events.length === 0) return state;
  let seq = state.fxSeq;
  return { ...state, fx: events.map((e) => ({ ...e, seq: ++seq }) as PackFx), fxSeq: seq };
}

export function packStarRating(state: PackGameState): 1 | 2 | 3 {
  if (state.boostersUsed === 0) return 3;
  if (state.boostersUsed <= 2) return 2;
  return 1;
}
