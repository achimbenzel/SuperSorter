import { useCallback, useEffect, useRef, useState } from 'react';
import type { BoosterId } from '../assets';
import { BoosterBar } from '../components/BoosterBar';
import { DebugPanel } from '../components/DebugPanel';
import { HUD } from '../components/HUD';
import { LoseScreen } from '../components/LoseScreen';
import { ShopBoard } from '../components/shop/ShopBoard';
import { WinScreen } from '../components/WinScreen';
import { DEBUG, TIMING } from '../config';
import { ITEM_LABEL } from '../game/items';
import { BOOSTER_PRICES } from '../game/levels';
import { REWARD_DAY_BONUS, SHOP_LEVEL_COUNT, SHOP_PEEK_TIP, SHOP_TIPS, shopWinCoins } from '../game/shop/levels';
import { shopStarRating, type ShopAction } from '../game/shop/reducer';
import { findShortage } from '../game/shop/rules';
import { solveShop } from '../game/shop/solver';
import { SERIES } from '../game/shop/theme';
import type { ShopMove } from '../game/shop/types';
import { hasHiddenItems } from '../game/sources';
import { DEFAULT_PROGRESS } from '../hooks/progress';
import { useDelayedFlag } from '../hooks/useDelayedFlag';
import { useFlip } from '../hooks/useFlip';
import { useFxAnimations } from '../hooks/useFxAnimations';
import { useShopGame } from '../hooks/useShopGame';

const BOOSTER_ACTION: Record<BoosterId, ShopAction> = {
  undo: { type: 'UNDO' },
  extra: { type: 'USE_EXTRA' },
  peek: { type: 'TOGGLE_PEEK' },
  shuffle: { type: 'SHUFFLE' },
};

const fmtMove = (m: ShopMove) =>
  `${m.from.kind === 'stack' ? 'Stapel' : 'Ablage'} ${m.from.index + 1} → ${m.to.kind === 'station' ? 'Paket' : 'Ablage'} ${m.to.index + 1}`;

/** Versand-Modus: Waren aus dem Großhandelskarton in Kundenpakete packen und verschicken. */
export function ShopGame({ onMenu }: { onMenu: () => void }) {
  const game = useShopGame();
  const { state, dispatch, progress } = game;
  const rootRef = useRef<HTMLDivElement>(null);
  const layoutKey = `${state.config.level}-${game.attempt}`;
  const [hint, setHint] = useState<ShopMove | null>(null);
  const [xray, setXray] = useState(false);

  useFlip(rootRef, layoutKey);
  useFxAnimations(rootRef, state.fx, state.fxSeq);

  // Win-Screen erst, wenn das letzte Paket davongeflogen ist.
  const showWin = useDelayedFlag(state.status === 'won', Math.max(TIMING.endScreenDelay, TIMING.ship));
  const showLose = useDelayedFlag(state.status === 'lost', TIMING.endScreenDelay);
  // Blockierter Zug: kurz erklären, wer die Ware noch braucht.
  const [notice, setNotice] = useState<string | null>(null);
  const noticeSeq = useRef(0);
  useEffect(() => {
    const ev = [...state.fx].reverse().find((e) => e.kind === 'blocked');
    if (!ev || ev.seq <= noticeSeq.current || ev.kind !== 'blocked') return;
    noticeSeq.current = ev.seq;
    setNotice(ev.message);
    const t = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(t);
  }, [state.fx]);

  const tip = notice ?? (state.peekArmed ? SHOP_PEEK_TIP : state.moves === 0 ? SHOP_TIPS[state.config.level] : undefined);

  const applyBooster = useCallback((id: BoosterId) => dispatch(BOOSTER_ACTION[id]), [dispatch]);
  const buyBooster = useCallback((id: BoosterId) => game.buyBooster(id, BOOSTER_ACTION[id]), [game]);
  const rescue = (id: BoosterId) => (state.boosters[id] > 0 ? applyBooster(id) : buyBooster(id));

  const shortage = state.loseReason === 'shortage' ? findShortage(state.board) : null;
  const shortageText = shortage
    ? 'type' in shortage
      ? `Für die restlichen Aufträge fehlt jetzt ${ITEM_LABEL[shortage.type]}. Eine Ware ist im falschen Paket gelandet.`
      : `Für die restlichen Aufträge fehlt jetzt eine Ware der Serie ${SERIES[shortage.series].label}.`
    : '';
  const extraOk = state.boosters.extra > 0 || progress.coins >= BOOSTER_PRICES.extra;

  return (
    <div className="app app--shop" ref={rootRef}>
      <HUD label="Tag" level={state.config.level} reward={state.config.reward} coins={game.displayCoins} onRestart={game.restart} onMenu={onMenu} />
      {DEBUG && (
        <DebugPanel
          level={state.config.level}
          status={state.status}
          board={state.board}
          solve={() => solveShop(state.board, { maxNodes: 100_000 })}
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
              Seed {game.generated.seed} · Versuche {game.generated.attempts} · Gewinnquote {Math.round(game.generated.winRate * 100)}% (Ziel{' '}
              {Math.round(state.config.targetWinRate[0] * 100)}–{Math.round(state.config.targetWinRate[1] * 100)}%)
              <br />
              Aufträge {state.config.orders.bulk}/{state.config.orders.series}/{state.config.orders.list} (Sammel/Serie/Wunsch) ·{' '}
              {state.config.stations} Packtische · Ablage {state.config.cart} · Tag {state.config.level}/{SHOP_LEVEL_COUNT}+ · Züge {state.moves}
            </>
          }
        />
      )}
      <ShopBoard key={layoutKey} state={state} dispatch={dispatch} hint={hint} xray={xray} tip={tip} tipTone={notice ? 'warn' : 'info'} />
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
        extraLabel="Extra-Ablage"
        onUse={applyBooster}
        onBuy={buyBooster}
      />
      {showWin && state.status === 'won' && (
        <WinScreen
          title="Feierabend!"
          stars={shopStarRating(state)}
          total={shopWinCoins(state.config) + state.levelCoins}
          detail={
            <>
              Tag {state.config.level} · {state.board.shipped} Pakete verschickt
              {state.config.reward && <> · Bonus +{REWARD_DAY_BONUS}</>}
            </>
          }
          nextLabel="Nächster Tag"
          onNext={() => game.loadLevel(progress.shopDay)}
        />
      )}
      {showLose && state.status === 'lost' && (
        <LoseScreen
          title={shortage ? 'Engpass!' : 'Packtisch blockiert!'}
          text={shortage ? shortageText : 'Die Ablage ist voll und keine Ware passt in ein offenes Paket.'}
          canExtra={state.loseReason === 'deadlock' && extraOk}
          extraLabel={state.boosters.extra > 0 ? 'Extra-Ablage (Booster)' : `Extra-Ablage (${BOOSTER_PRICES.extra} Münzen)`}
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
