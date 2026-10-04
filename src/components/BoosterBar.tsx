import { BOOSTER_IMAGE, type BoosterId } from '../assets';
import type { GameAction } from '../game/reducer';
import { hasHiddenItems } from '../game/reducer';
import type { GameState } from '../game/types';

interface BoosterBarProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

const BOOSTERS: { id: BoosterId; label: string; action: GameAction }[] = [
  { id: 'undo', label: 'Rückgängig', action: { type: 'UNDO' } },
  { id: 'extra', label: 'Extra-Platz im Wagen', action: { type: 'USE_EXTRA' } },
  { id: 'peek', label: 'Lupe', action: { type: 'TOGGLE_PEEK' } },
  { id: 'shuffle', label: 'Mischen', action: { type: 'SHUFFLE' } },
];

/** Booster-Leiste ganz unten (Daumenzone). Zähler zeigt die Restmenge in diesem Level. */
export function BoosterBar({ state, dispatch }: BoosterBarProps) {
  const playing = state.status === 'playing';
  const usable: Record<BoosterId, boolean> = {
    undo: state.history.length > 0,
    extra: true,
    peek: hasHiddenItems(state.board),
    shuffle: state.board.stacks.some((s) => s.length > 0),
  };

  return (
    <nav className="boosters" aria-label="Booster">
      {BOOSTERS.map(({ id, label, action }) => {
        const count = state.boosters[id];
        const active = id === 'peek' && state.peekArmed;
        const enabled = playing && (active || (count > 0 && usable[id]));
        return (
          <button
            key={id}
            type="button"
            className={`booster${active ? ' is-active' : ''}`}
            data-booster={id}
            disabled={!enabled}
            onClick={() => dispatch(action)}
            aria-label={`${label} (${count} übrig)`}
            aria-pressed={id === 'peek' ? active : undefined}
          >
            <img src={BOOSTER_IMAGE[id]} alt="" />
            <span className={`booster-count${count === 0 ? ' is-empty' : ''}`}>{count}</span>
          </button>
        );
      })}
    </nav>
  );
}
