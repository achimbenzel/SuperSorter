import { useCallback, useEffect, useRef, useState } from 'react';
import type { BoosterId } from '../assets';
import { BoosterBar } from '../components/BoosterBar';
import { DebugPanel } from '../components/DebugPanel';
import { HUD } from '../components/HUD';
import { LoseScreen } from '../components/LoseScreen';
import { PackBoard } from '../components/pack/PackBoard';
import { settleTime } from '../components/pack/plan';
import { WinScreen } from '../components/WinScreen';
import { DEBUG, TIMING } from '../config';
import { BOOSTER_PRICES } from '../game/levels';
import { PACK_LEVEL_COUNT, PACK_PEEK_TIP, PACK_TIPS, packWinCoins, REWARD_PACK_DAY_BONUS } from '../game/pack/levels';
import { packStarRating, type PackAction } from '../game/pack/reducer';
import { solvePack } from '../game/pack/solver';
import { hasHiddenItems } from '../game/sources';
import { DEFAULT_PROGRESS } from '../hooks/progress';
import { useDelayedFlag } from '../hooks/useDelayedFlag';
import { finishAnimations } from '../hooks/useFlip';
import { useFxAnimations } from '../hooks/useFxAnimations';
import { usePackGame } from '../hooks/usePackGame';

const BOOSTER_ACTION: Record<BoosterId, PackAction> = {
  undo: { type: 'UNDO' },
  extra: { type: 'USE_EXTRA' },
  peek: { type: 'TOGGLE_PEEK' },
  shuffle: { type: 'SHUFFLE' },
};

const INVALID_TIP = 'Table is full – this item fits no parcel right now.';

/** Packband-Modus: Waren von den Lagerkisten in die Kundenpakete auf dem Band packen. */
export function PackGame({ onMenu }: { onMenu: () => void }) {
  const game = usePackGame();
  const { state, progress } = game;
  const rootRef = useRef<HTMLDivElement>(null);
  const layoutKey = `${state.config.level}-${game.attempt}`;
  const [hint, setHint] = useState<number | null>(null);
  const [xray, setXray] = useState(false);

  useFxAnimations(rootRef, state.fx, state.fxSeq);

  // Wer mitten in einer Kettenreaktion weitertippt, spult die laufende Animation vor.
  const dispatch = useCallback(
    (action: PackAction) => {
      finishAnimations(rootRef.current);
      game.dispatch(action);
    },
    [game],
  );

  // End-Screens erst, wenn die Kette ausgespielt ist und das letzte Paket weg ist.
  const settle = settleTime(state.fx);
  const showWin = useDelayedFlag(state.status === 'won', settle + 300);
  const showLose = useDelayedFlag(state.status === 'lost', settle + TIMING.endScreenDelay);

  // Ungültiger Tap: kurz erklären (nur sichtbare Infos, nichts Verdecktes verraten).
  const [notice, setNotice] = useState<string | null>(null);
  const noticeSeq = useRef(0);
  useEffect(() => {
    const ev = state.fx.find((e) => e.kind === 'invalid');
    if (!ev || ev.seq <= noticeSeq.current) return;
    noticeSeq.current = ev.seq;
    setNotice(INVALID_TIP);
    const t = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(t);
  }, [state.fx]);

  const tip = notice ?? (state.peekArmed ? PACK_PEEK_TIP : state.moves === 0 ? PACK_TIPS[state.config.level] : undefined);

  const applyBooster = useCallback((id: BoosterId) => dispatch(BOOSTER_ACTION[id]), [dispatch]);
  const buyBooster = useCallback((id: BoosterId) => game.buyBooster(id, BOOSTER_ACTION[id]), [game]);
  const rescue = (id: BoosterId) => (state.boosters[id] > 0 ? applyBooster(id) : buyBooster(id));
  const extraOk = state.boosters.extra > 0 || progress.coins >= BOOSTER_PRICES.extra;

  return (
    <div className="app app--pack" ref={rootRef}>
      <HUD label="Day" level={state.config.level} reward={state.config.reward} coins={game.displayCoins} onRestart={game.restart} onMenu={onMenu} />
      {DEBUG && (
        <DebugPanel
          level={state.config.level}
          status={state.status}
          board={state.board}
          solve={() => solvePack(state.board, { maxNodes: 100_000 })}
          formatMove={(t: number) => `Crate ${t + 1}`}
          applyMove={(t) => dispatch({ type: 'TAP_STACK', index: t })}
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
              Parcels {state.config.boxes.bulk}/{state.config.boxes.mixed} (bulk/mixed) of {state.config.boxSize} · {state.config.spots}{' '}
              spots · Table {state.board.cart.length} · Day {state.config.level}/{PACK_LEVEL_COUNT}+ · Moves {state.moves}
            </>
          }
        />
      )}
      <PackBoard key={layoutKey} state={state} dispatch={dispatch} hint={hint} xray={xray} tip={tip} tipTone={notice ? 'warn' : 'info'} />
      <BoosterBar
        boosters={state.boosters}
        usable={{
          undo: state.history.length > 0,
          extra: true,
          peek: hasHiddenItems(state.board),
          shuffle: state.board.stacks.reduce((n, s) => n + s.length, 0) > 1,
        }}
        playing={state.status === 'playing'}
        peekArmed={state.peekArmed}
        coins={progress.coins}
        extraLabel="Extra slot"
        onUse={applyBooster}
        onBuy={buyBooster}
      />
      {showWin && state.status === 'won' && (
        <WinScreen
          title="Closing time!"
          stars={packStarRating(state)}
          total={packWinCoins(state.config) + state.levelCoins}
          detail={
            <>
              Day {state.config.level} · {state.board.shipped} parcels shipped
              {state.config.reward && <> · Bonus +{REWARD_PACK_DAY_BONUS}</>}
            </>
          }
          nextLabel="Next day"
          onNext={() => game.loadLevel(progress.packDay)}
        />
      )}
      {showLose && state.status === 'lost' && (
        <LoseScreen
          title="Table is full!"
          text="No visible item fits a parcel and there is no room left on the packing table."
          canExtra={extraOk}
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
