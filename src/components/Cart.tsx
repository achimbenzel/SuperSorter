import { CART_ICON } from '../assets';
import type { Item as ItemModel, SourceRef, TargetRef } from '../game/types';
import { Item } from './Item';

interface CartProps {
  cart: (ItemModel | null)[];
  selection: SourceRef | null;
  validTargets: TargetRef[];
  hintSource: SourceRef | null;
  hintTarget: TargetRef | null;
  onTap: (index: number) => void;
}

/**
 * Einkaufswagen = Puffer. Jeder Platz hält ein Item. Platzhalter-Grafik (kein Asset):
 * 🛒-Emoji als Kopf und CSS-Mulden als Plätze.
 */
export function Cart({ cart, selection, validTargets, hintSource, hintTarget, onTap }: CartProps) {
  return (
    <section className="cart" aria-label="Einkaufswagen">
      <div className="cart-head" aria-hidden="true">
        {CART_ICON}
      </div>
      {cart.map((item, i) => {
        const selected = selection?.kind === 'cart' && selection.index === i;
        const valid = validTargets.some((t) => t.kind === 'cart' && t.index === i);
        const hinted =
          (hintSource?.kind === 'cart' && hintSource.index === i) || (hintTarget?.kind === 'cart' && hintTarget.index === i);
        return (
          <button
            key={i}
            type="button"
            className={`cart-spot${valid ? ' is-valid' : ''}${hinted ? ' is-hint' : ''}`}
            data-target={`cart-${i}`}
            onClick={() => onTap(i)}
            aria-label={`Wagenplatz ${i + 1}${item ? ' belegt' : ' frei'}`}
          >
            {item && <Item item={item} selected={selected} />}
          </button>
        );
      })}
    </section>
  );
}
