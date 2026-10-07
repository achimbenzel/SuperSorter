import { BOOSTER_IMAGE, UI_IMAGE, type BoosterId } from '../assets';
import { BOOSTER_PRICES } from '../game/levels';
import type { BoosterCounts } from '../game/types';

interface BoosterBarProps {
  boosters: BoosterCounts;
  /** Ist der Booster gerade sinnvoll (z. B. Undo nur mit History)? */
  usable: Record<BoosterId, boolean>;
  playing: boolean;
  peekArmed: boolean;
  /** Gespeicherte Münzen (zum Nachkaufen). */
  coins: number;
  extraLabel?: string;
  onUse: (id: BoosterId) => void;
  onBuy: (id: BoosterId) => void;
}

const LABELS: Record<BoosterId, string> = {
  undo: 'Undo',
  extra: 'Extra slot',
  peek: 'Peek',
  shuffle: 'Shuffle',
};
const ORDER: BoosterId[] = ['undo', 'extra', 'peek', 'shuffle'];

/**
 * Booster-Leiste ganz unten (Daumenzone). Das rote Badge zeigt das Kontingent im
 * Level. Ist es aufgebraucht, erscheint stattdessen der Preis: Ein Tap kauft den
 * Booster für Münzen und setzt ihn sofort ein.
 */
export function BoosterBar({ boosters, usable, playing, peekArmed, coins, extraLabel, onUse, onBuy }: BoosterBarProps) {
  return (
    <nav className="boosters" aria-label="Power-ups">
      {ORDER.map((id) => {
        const count = boosters[id];
        const active = id === 'peek' && peekArmed;
        const price = BOOSTER_PRICES[id];
        const buyable = count === 0 && usable[id] && coins >= price;
        const enabled = playing && (active || (usable[id] && (count > 0 || buyable)));
        const label = id === 'extra' && extraLabel ? extraLabel : LABELS[id];
        return (
          <button
            key={id}
            type="button"
            className={`booster${active ? ' is-active' : ''}`}
            data-booster={id}
            disabled={!enabled}
            onClick={() => (count > 0 || active ? onUse(id) : onBuy(id))}
            aria-label={count > 0 ? `${label} (${count} left)` : `Buy ${label} for ${price} coins`}
            aria-pressed={id === 'peek' ? active : undefined}
          >
            <img src={BOOSTER_IMAGE[id]} alt="" />
            {count > 0 || !usable[id] ? (
              <span className={`booster-count${count === 0 ? ' is-empty' : ''}`}>{count}</span>
            ) : (
              <span className={`booster-price${coins >= price ? '' : ' is-short'}`}>
                <img src={UI_IMAGE.coin} alt="" />
                {price}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
