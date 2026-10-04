import { useCallback, useMemo } from 'react';
import type { GameAction } from '../game/reducer';
import { listTargets } from '../game/rules';
import type { GameState, Move } from '../game/types';
import { Cart } from './Cart';
import { DeliveryBox } from './DeliveryBox';
import { Shelf } from './Shelf';

interface BoardProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
  /** Debug: hervorgehobener nächster Lösungszug. */
  hint: Move | null;
  /** Debug: verpackte Items durchsichtig zeigen. */
  xray: boolean;
  /** Kurzer Hinweistext (Level-Einführung, Lupe aktiv). */
  tip?: string;
}

/** Spielfeld: Regal oben, darunter Lieferkarton und Einkaufswagen nebeneinander. */
export function Board({ state, dispatch, hint, xray, tip }: BoardProps) {
  const { board, selection } = state;
  const validTargets = useMemo(() => (selection ? listTargets(board, selection) : []), [board, selection]);

  const onTapSlot = useCallback((index: number) => dispatch({ type: 'TAP_SLOT', index }), [dispatch]);
  const onTapStack = useCallback((index: number) => dispatch({ type: 'TAP_STACK', index }), [dispatch]);
  const onTapCart = useCallback((index: number) => dispatch({ type: 'TAP_CART', index }), [dispatch]);
  const onPeekItem = useCallback((itemId: number) => dispatch({ type: 'PEEK_ITEM', itemId }), [dispatch]);

  return (
    <div className="board">
      <Shelf slots={board.slots} validTargets={validTargets} hintTarget={hint?.to ?? null} onTapSlot={onTapSlot} />
      <div className="board-bottom">
        {tip && (
          <p className="tip" key={tip}>
            {tip}
          </p>
        )}
        <DeliveryBox
          board={board}
          selection={selection}
          hintMode={state.config.hintMode}
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
          onTap={onTapCart}
        />
      </div>
    </div>
  );
}
