import { useCallback, useRef, useState } from 'react';
import type { BoosterId } from '../assets';
import { Board } from '../components/Board';
import { BoosterBar } from '../components/BoosterBar';
import { DebugPanel } from '../components/DebugPanel';
import { HUD } from '../components/HUD';
import { LoseScreen } from '../components/LoseScreen';
import { WinScreen } from '../components/WinScreen';
import { DEBUG, TIMING } from '../config';
import { ITEM_LABEL } from '../game/items';
import { BOOSTER_PRICES, LEVEL_COUNT, LEVEL_TIPS, PEEK_TIP, REWARD_LEVEL_BONUS, winCoins } from '../game/levels';
import { starRating, type GameAction } from '../game/reducer';
import { findHopelessType } from '../game/rules';
import { solve } from '../game/solver';
import { hasHiddenItems } from '../game/sources';
import type { Move } from '../game/types';
import { DEFAULT_PROGRESS } from '../hooks/progress';
import { useDelayedFlag } from '../hooks/useDelayedFlag';
import { useFlip } from '../hooks/useFlip';
import { useFxAnimations } from '../hooks/useFxAnimations';
import { useGame } from '../hooks/useGame';

const BOOSTER_ACTION: Record<BoosterId, GameAction> = {
  undo: { type: 'UNDO' },
  extra: { type: 'USE_EXTRA' },
  peek: { type: 'TOGGLE_PEEK' },
  shuffle: { type: 'SHUFFLE' },
};

const fmtMove = (m: Move) =>
  `${m.from.kind === 'stack' ? 'Crate' : 'Cart'} ${m.from.index + 1} → ${m.to.kind === 'slot' ? 'Shelf' : 'Cart'} ${m.to.index + 1}`;

/** Klassischer Modus: Lieferung sortenrein ins Regal räumen. */
export function ShelfGame({ onMenu }: { onMenu: () => void }) {
  const game = useGame();
  const { state, dispatch, progress } = game;
  const rootRef = useRef<HTMLDivElement>(null);
  const layoutKey = `${state.config.level}-${game.attempt}`;
  const [hint, setHint] = useState<Move | null>(null);
  const [xray, setXray] = useState(false);

  useFlip(rootRef, layoutKey);
  useFxAnimations(rootRef, state.fx, state.fxSeq);

  const showWin = useDelayedFlag(state.status === 'won', TIMING.endScreenDelay);
  const showLose = useDelayedFlag(state.status === 'lost', TIMING.endScreenDelay);
  const tip = state.peekArmed ? PEEK_TIP : state.moves === 0 ? LEVEL_TIPS[state.config.level] : undefined;

  const applyBooster = useCallback((id: BoosterId) => dispatch(BOOSTER_ACTION[id]), [dispatch]);
  const buyBooster = useCallback((id: BoosterId) => game.buyBooster(id, BOOSTER_ACTION[id]), [game]);
  const rescue = (id: BoosterId) => (state.boosters[id] > 0 ? applyBooster(id) : buyBooster(id));

  const hopeless = state.loseReason === 'hopeless' ? findHopelessType(state.board) : null;

  return (
    <div className="app" ref={rootRef}>
      <HUD label="Level" level={state.config.level} reward={state.config.reward} coins={game.displayCoins} onRestart={game.restart} onMenu={onMenu} />
      {DEBUG && (
        <DebugPanel
          level={state.config.level}
          status={state.status}
          board={state.board}
          solve={() => solve(state.board, { maxNodes: 100_000 })}
          formatMove={fmtMove}
          applyMove={(move) => dispatch({ type: 'APPLY_MOVE', move })}
          hint={hint}
          setHint={setHint}
          xray={xray}
          setXray={setXray}
          loadLevel={game.loadLevel}
          onResetProgress={() => {
            game.setProgress(DEFAULT_PROGRESS);
            game.loadLevel(1);
          }}
          meta={
            <>
              Seed {game.generated.seed} · Attempts {game.generated.attempts} · Win rate {Math.round(game.generated.winRate * 100)}% (target{' '}
              {Math.round(state.config.targetWinRate[0] * 100)}–{Math.round(state.config.targetWinRate[1] * 100)}%)
              <br />
              {state.config.types} types · cap. {state.config.capacity} · {state.board.slots.length} shelves ({state.config.openSlots} open) ·
              Cart {state.config.cart} · Level {state.config.level}/{LEVEL_COUNT}+ · Moves {state.moves}
            </>
          }
        />
      )}
      <Board key={layoutKey} state={state} dispatch={dispatch} hint={hint} xray={xray} tip={tip} />
      <BoosterBar
        boosters={state.boosters}
        usable={{
          undo: state.history.length > 0,
          extra: true,
          peek: hasHiddenItems(state.board),
          shuffle: state.board.stacks.some((s) => s.length > 0),
        }}
        playing={state.status === 'playing'}
        peekArmed={state.peekArmed}
        coins={progress.coins}
        onUse={applyBooster}
        onBuy={buyBooster}
      />
      {showWin && state.status === 'won' && (
        <WinScreen
          stars={starRating(state)}
          total={winCoins(state.config) + state.levelCoins}
          detail={
            <>
              Level {state.config.level} · {state.moves} moves
              {state.levelCoins > 0 && <> · Gold +{state.levelCoins}</>}
              {state.config.reward && <> · Bonus +{REWARD_LEVEL_BONUS}</>}
            </>
          }
          onNext={() => game.loadLevel(progress.level)}
        />
      )}
      {showLose && state.status === 'lost' && (
        <LoseScreen
          title={hopeless ? 'Dead end!' : 'No moves left!'}
          text={
            hopeless
              ? `${ITEM_LABEL[hopeless]} is spread over too many shelves – none of them can be completed.`
              : 'The cart is full and no item fits on the shelves anymore.'
          }
          canExtra={state.loseReason === 'deadlock' && (state.boosters.extra > 0 || progress.coins >= BOOSTER_PRICES.extra)}
          extraLabel={state.boosters.extra > 0 ? 'Extra slot (power-up)' : `Extra slot (${BOOSTER_PRICES.extra} coins)`}
          canUndo={state.history.length > 0 && state.boosters.undo > 0}
          undoCount={state.boosters.undo}
          onExtra={() => rescue('extra')}
          onUndo={() => applyBooster('undo')}
          onRetry={game.restart}
        />
      )}
    </div>
  );
}
