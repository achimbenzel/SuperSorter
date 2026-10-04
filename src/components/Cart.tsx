import { CART_ICON } from '../assets';
import type { Item as ItemModel, SourceRef } from '../game/types';
import { Item, type ItemDecorator } from './Item';

/** Ziel-Referenz, soweit der Wagen sie braucht (Regal: slot|cart, Versand: station|cart). */
type AnyTarget = { kind: string; index: number };

interface CartProps {
  cart: (ItemModel | null)[];
  selection: SourceRef | null;
  validTargets: AnyTarget[];
  hintSource: SourceRef | null;
  hintTarget: AnyTarget | null;
  decorate?: ItemDecorator;
  /** Symbol im Kopf (Regal: Einkaufswagen, Versand: Ablage). */
  icon?: string;
  label?: string;
  onTap: (index: number) => void;
}

/**
 * Puffer: Einkaufswagen (Regal) bzw. Ablage am Packtisch (Versand). Jeder Platz hält
 * ein Item. Platzhalter-Grafik (kein Asset): Emoji als Kopf und CSS-Mulden als Plätze.
 */
export function Cart({ cart, selection, validTargets, hintSource, hintTarget, decorate, icon = CART_ICON, label = 'Einkaufswagen', onTap }: CartProps) {
  return (
    <section className="cart" aria-label={label}>
      <div className="cart-head" aria-hidden="true">
        {icon}
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
            aria-label={`${label} Platz ${i + 1}${item ? ' belegt' : ' frei'}`}
          >
            {item && <Item item={item} selected={selected} {...decorate?.(item)} />}
          </button>
        );
      })}
    </section>
  );
}
