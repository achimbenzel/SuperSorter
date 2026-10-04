// Spiel-Reducer: übersetzt Taps und Booster in Zustandsänderungen.
//
// Reine Funktion (kein DOM, kein localStorage, kein Math.random): gleicher Zustand +
// gleiche Aktion = gleiches Ergebnis. Dadurch ist die komplette Spielsteuerung
// ohne UI testbar (reducer.test.ts) und Undo ist trivial (alte Boards aufheben).

import { shuffleBox } from './generator';
import { GOLD_BONUS } from './levels';
import {
  applyMove,
  findHopelessType,
  hasAnyMove,
  isWon,
  moveCount,
  sameSource,
} from './rules';
import type { Board, FxEvent, GameState, GameStatus, LevelConfig, LoseReason, Move, SourceRef } from './types';

export type GameAction =
  | { type: 'TAP_STACK'; index: number }
  | { type: 'TAP_CART'; index: number }
  | { type: 'TAP_SLOT'; index: number }
  /** Tap auf ein verpacktes Item, während die Lupe aktiv ist. */
  | { type: 'PEEK_ITEM'; itemId: number }
  | { type: 'END_PEEK' }
  | { type: 'TOGGLE_PEEK' }
  | { type: 'UNDO' }
  | { type: 'USE_EXTRA' }
  | { type: 'SHUFFLE' }
  | { type: 'RESTART' }
  | { type: 'LOAD_LEVEL'; config: LevelConfig; board: Board }
  /** Direkter Zug (Debug-Hinweis "Zug ausführen", Tests). */
  | { type: 'APPLY_MOVE'; move: Move };

export function createGameState(config: LevelConfig, board: Board): GameState {
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

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'LOAD_LEVEL':
      return createGameState(action.config, action.board);
    case 'RESTART':
      return createGameState(state.config, state.initialBoard);
    case 'END_PEEK':
      return state.peekItemId === null ? state : { ...state, peekItemId: null };
  }

  // Ab hier nur, solange gespielt wird. Ausnahme: Undo und Extra-Platz retten
  // aus einer Niederlage (Buttons im Lose-Screen).
  if (state.status === 'won') return state;
  if (state.status === 'lost' && action.type !== 'UNDO' && action.type !== 'USE_EXTRA') return state;

  switch (action.type) {
    case 'TAP_STACK': {
      const s = disarmPeek(state);
      const from: SourceRef = { kind: 'stack', index: action.index };
      if (s.board.stacks[action.index]?.length === 0) return { ...s, selection: null };
      return { ...s, selection: sameSource(s.selection, from) ? null : from };
    }

    case 'TAP_CART': {
      const s = disarmPeek(state);
      const here: SourceRef = { kind: 'cart', index: action.index };
      if (s.board.cart[action.index]) {
        // Belegter Platz: auswählen bzw. Auswahl aufheben/wechseln.
        return { ...s, selection: sameSource(s.selection, here) ? null : here };
      }
      // Freier Platz: ausgewähltes Item dort abstellen.
      if (!s.selection) return s;
      return tryMove(s, { from: s.selection, to: { kind: 'cart', index: action.index } });
    }

    case 'TAP_SLOT': {
      const s = disarmPeek(state);
      if (!s.selection) return s;
      return tryMove(s, { from: s.selection, to: { kind: 'slot', index: action.index } });
    }

    case 'APPLY_MOVE':
      return tryMove({ ...state, peekArmed: false }, action.move);

    case 'TOGGLE_PEEK': {
      if (!state.peekArmed && (state.boosters.peek <= 0 || !hasHiddenItems(state.board))) return state;
      return { ...state, peekArmed: !state.peekArmed, selection: null };
    }

    case 'PEEK_ITEM': {
      if (!state.peekArmed) return state;
      const isHidden = state.board.stacks.some((st) => st.some((it) => it.id === action.itemId && it.hidden));
      if (!isHidden) return state;
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
      // Ein per Booster hinzugefügter Wagenplatz bleibt auch nach Undo erhalten.
      const board = padCart(prev.board, state.board.cart.length);
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
      const board: Board = { ...state.board, cart: [...state.board.cart, null] };
      return withStatus({
        ...state,
        board,
        selection: null,
        peekArmed: false,
        boosters: { ...state.boosters, extra: state.boosters.extra - 1 },
        boostersUsed: state.boostersUsed + 1,
      });
    }

    case 'SHUFFLE': {
      if (state.boosters.shuffle <= 0) return state;
      const shuffledBoard = shuffleBox(state.board, state.config, state.shuffleCount);
      // Keine lösbare Mischung gefunden (z. B. weil das Level schon verloren ist): Booster nicht verbrauchen.
      if (!shuffledBoard) return emit({ ...state, selection: null }, [{ kind: 'denied', booster: 'shuffle' }]);
      return emit(
        withStatus({
          ...state,
          board: shuffledBoard,
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

/** Führt einen Zug aus, wenn er gültig ist; sonst Shake-Event und Auswahl bleibt bestehen. */
function tryMove(state: GameState, move: Move): GameState {
  if (moveCount(state.board, move) === 0) {
    return emit(state, [{ kind: 'invalid', target: move.to }]);
  }
  const result = applyMove(state.board, move);
  const events: FxEventInput[] = [];
  const goldCoins = result.goldPlaced * GOLD_BONUS;
  if (move.to.kind === 'slot' && goldCoins > 0) events.push({ kind: 'gold', slot: move.to.index, amount: goldCoins });
  if (result.solvedSlot !== null) events.push({ kind: 'solved', slot: result.solvedSlot });
  if (result.openedSlot !== null) events.push({ kind: 'opened', slot: result.openedSlot });
  if (result.revealed) events.push({ kind: 'revealed', itemId: result.revealed.id });

  return emit(
    withStatus({
      ...state,
      board: result.board,
      history: [...state.history, { board: state.board, levelCoins: state.levelCoins }],
      levelCoins: state.levelCoins + goldCoins,
      selection: null,
      moves: state.moves + 1,
    }),
    events,
  );
}

/** Berechnet Sieg/Niederlage für das aktuelle Board. */
export function evaluateStatus(board: Board): { status: GameStatus; loseReason: LoseReason | null } {
  if (isWon(board)) return { status: 'won', loseReason: null };
  if (findHopelessType(board)) return { status: 'lost', loseReason: 'hopeless' };
  if (!hasAnyMove(board)) return { status: 'lost', loseReason: 'deadlock' };
  return { status: 'playing', loseReason: null };
}

function withStatus(state: GameState): GameState {
  return { ...state, ...evaluateStatus(state.board) };
}

type FxEventInput = FxEvent extends infer E ? (E extends { seq: number } ? Omit<E, 'seq'> : never) : never;

function emit(state: GameState, events: FxEventInput[]): GameState {
  if (events.length === 0) return state;
  let seq = state.fxSeq;
  const fx = events.map((e) => ({ ...e, seq: ++seq }) as FxEvent);
  return { ...state, fx, fxSeq: seq };
}

function disarmPeek(state: GameState): GameState {
  return state.peekArmed ? { ...state, peekArmed: false } : state;
}

function padCart(board: Board, length: number): Board {
  if (board.cart.length >= length) return board;
  return { ...board, cart: [...board.cart, ...Array.from({ length: length - board.cart.length }, () => null)] };
}

export function hasHiddenItems(board: Board): boolean {
  return board.stacks.some((s) => s.some((it) => it.hidden));
}

/** Sterne im Win-Screen: 3 ohne Booster, 2 mit höchstens zwei, sonst 1. */
export function starRating(state: GameState): 1 | 2 | 3 {
  if (state.boostersUsed === 0) return 3;
  if (state.boostersUsed <= 2) return 2;
  return 1;
}
