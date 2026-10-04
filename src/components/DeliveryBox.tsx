import type { CSSProperties } from 'react';
import { BOARD_IMAGE } from '../assets';
import { pickableItems, type SourceBoard } from '../game/sources';
import type { SourceRef } from '../game/types';
import type { ItemDecorator } from './Item';
import { Stack } from './Stack';

interface DeliveryBoxProps {
  board: SourceBoard;
  selection: SourceRef | null;
  decorate?: ItemDecorator;
  peekArmed: boolean;
  peekItemId: number | null;
  xray: boolean;
  hintSource: SourceRef | null;
  onTapStack: (index: number) => void;
  onPeekItem: (itemId: number) => void;
}

/**
 * Lieferkarton (Regal-Modus) bzw. Lagerkisten (Packband-Modus) mit 3-4 Stapeln.
 * Drei Bildebenen: Schatten, Karton (hinten), Stapel, Kartonfront (vorne, verdeckt den
 * Fuß der Stapel -> Items stehen "im" Karton).
 */
export function DeliveryBox({ board, selection, decorate, peekArmed, peekItemId, xray, hintSource, onTapStack, onPeekItem }: DeliveryBoxProps) {
  const selectedRun = selection?.kind === 'stack' ? pickableItems(board, selection).length : 0;
  return (
    <section className={`box${peekArmed ? ' is-peek-mode' : ''}`} aria-label="Lieferkarton">
      <img className="box-shadow" src={BOARD_IMAGE.boxShadow} alt="" />
      <img className="box-back" src={BOARD_IMAGE.box} alt="" />
      <div className="box-stacks" style={{ '--stacks': board.stacks.length } as CSSProperties}>
        {board.stacks.map((stack, i) => (
          <Stack
            key={i}
            index={i}
            items={stack}
            selectedCount={selection?.kind === 'stack' && selection.index === i ? selectedRun : 0}
            decorate={decorate}
            peekArmed={peekArmed}
            peekItemId={peekItemId}
            xray={xray}
            hinted={hintSource?.kind === 'stack' && hintSource.index === i}
            onTap={onTapStack}
            onPeekItem={onPeekItem}
          />
        ))}
      </div>
      <img className="box-front" src={BOARD_IMAGE.boxFront} alt="" />
    </section>
  );
}
