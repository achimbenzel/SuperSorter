import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TIMING } from '../../config';
import type { ShopAction } from '../../game/shop/reducer';
import { listTargets } from '../../game/shop/rules';
import type { ShopFx, ShopGameState, ShopMove } from '../../game/shop/types';
import { Cart } from '../Cart';
import { DeliveryBox } from '../DeliveryBox';
import { makeShopDecorator } from './decorate';
import { OrderRail } from './OrderRail';
import { PackingStation, type ShipGhost } from './PackingStation';

interface ShopBoardProps {
  state: ShopGameState;
  dispatch: (action: ShopAction) => void;
  hint: ShopMove | null;
  xray: boolean;
  tip?: string;
  /** 'warn' = blockierter Zug (orange). */
  tipTone?: 'info' | 'warn';
}

/**
 * Verschickte Pakete bleiben für die Dauer der Versand-Animation als "Geist" sichtbar.
 * useLayoutEffect statt useEffect: Der Geist erscheint noch vor dem nächsten Frame,
 * damit die letzte Ware sichtbar ins Paket fliegt (useFlip merkt sich ihre Position).
 */
function useShipGhosts(fx: ShopFx[]): ShipGhost[] {
  const handled = useRef(0);
  const timers = useRef<number[]>([]);
  const [ghosts, setGhosts] = useState<ShipGhost[]>([]);

  useLayoutEffect(() => {
    const fresh: ShipGhost[] = [];
    for (const ev of fx) {
      if (ev.seq <= handled.current) continue;
      handled.current = ev.seq;
      if (ev.kind === 'shipped') fresh.push({ seq: ev.seq, station: ev.station, order: ev.order, items: ev.items });
    }
    if (fresh.length === 0) return;
    setGhosts((g) => [...g, ...fresh]);
    for (const ghost of fresh) {
      timers.current.push(window.setTimeout(() => setGhosts((g) => g.filter((x) => x.seq !== ghost.seq)), TIMING.ship));
    }
  }, [fx]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  return ghosts;
}

/** Spielfeld Versand: Auftragsleiste, Packtische, darunter Großhandelskarton und Ablage. */
export function ShopBoard({ state, dispatch, hint, xray, tip, tipTone = 'info' }: ShopBoardProps) {
  const { board, selection } = state;
  const ghosts = useShipGhosts(state.fx);
  const validTargets = useMemo(() => (selection ? listTargets(board, selection) : []), [board, selection]);
  const decorate = useMemo(() => makeShopDecorator(state.config.hintMode), [state.config.hintMode]);

  const onTapStation = useCallback((index: number) => dispatch({ type: 'TAP_STATION', index }), [dispatch]);
  const onTapStack = useCallback((index: number) => dispatch({ type: 'TAP_STACK', index }), [dispatch]);
  const onTapCart = useCallback((index: number) => dispatch({ type: 'TAP_CART', index }), [dispatch]);
  const onPeekItem = useCallback((itemId: number) => dispatch({ type: 'PEEK_ITEM', itemId }), [dispatch]);

  return (
    <div className="board shop-board">
      <OrderRail queue={board.queue} shipped={board.shipped} total={board.totalOrders} />
      <section className="stations" style={{ '--n': board.stations.length } as React.CSSProperties} aria-label="Packtische">
        {board.stations.map((st, i) => (
          <PackingStation
            key={i}
            index={i}
            station={st}
            ghosts={ghosts.filter((g) => g.station === i)}
            valid={validTargets.some((t) => t.kind === 'station' && t.index === i)}
            hinted={hint?.to.kind === 'station' && hint.to.index === i}
            stationCount={board.stations.length}
            decorate={decorate}
            onTap={onTapStation}
          />
        ))}
      </section>
      <div className="board-bottom">
        {tip && (
          <p className={`tip${tipTone === 'warn' ? ' tip--warn' : ''}`} key={tip} role={tipTone === 'warn' ? 'alert' : undefined}>
            {tip}
          </p>
        )}
        <DeliveryBox
          board={board}
          selection={selection}
          decorate={decorate}
          peekArmed={state.peekArmed}
          peekItemId={state.peekItemId}
          xray={xray}
          hintSource={hint?.from ?? null}
          onTapStack={onTapStack}
          onPeekItem={onPeekItem}
        />
        <Cart
          cart={board.cart}
          selection={selection}
          validTargets={validTargets}
          hintSource={hint?.from ?? null}
          hintTarget={hint?.to ?? null}
          decorate={decorate}
          icon="📥"
          label="Ablage"
          onTap={onTapCart}
        />
      </div>
    </div>
  );
}
