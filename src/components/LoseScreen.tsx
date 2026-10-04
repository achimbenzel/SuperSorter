import { UI_IMAGE } from '../assets';
import { ITEM_LABEL } from '../game/items';
import type { GameAction } from '../game/reducer';
import { findHopelessType } from '../game/rules';
import type { GameState } from '../game/types';
import { EndPanel } from './EndPanel';
import { GameButton } from './GameButton';

interface LoseScreenProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
  onRetry: () => void;
}

/**
 * Niederlage. Zwei Gründe:
 * - deadlock: kein gültiger Zug mehr -> Extra-Platz (Booster) kann retten
 * - hopeless: eine Sorte liegt in zu vielen Fächern -> nur Rückgängig hilft
 */
export function LoseScreen({ state, dispatch, onRetry }: LoseScreenProps) {
  const hopelessType = state.loseReason === 'hopeless' ? findHopelessType(state.board) : null;
  const canExtra = state.loseReason === 'deadlock' && state.boosters.extra > 0;
  const canUndo = state.boosters.undo > 0 && state.history.length > 0;

  return (
    <EndPanel
      tone="lose"
      title={hopelessType ? 'Sackgasse!' : 'Keine Züge mehr!'}
      actions={
        <>
          {canExtra && (
            <GameButton variant="green" onClick={() => dispatch({ type: 'USE_EXTRA' })}>
              Extra-Platz (Booster)
            </GameButton>
          )}
          {canUndo && (
            <GameButton variant="green" onClick={() => dispatch({ type: 'UNDO' })}>
              Rückgängig ({state.boosters.undo})
            </GameButton>
          )}
          <GameButton variant="red" icon={UI_IMAGE.cross} onClick={onRetry}>
            Nochmal
          </GameButton>
        </>
      }
    >
      <p className="end-text">
        {hopelessType
          ? `${ITEM_LABEL[hopelessType]} liegt in zu vielen Fächern – so wird keins davon voll.`
          : 'Der Wagen ist voll und keine Ware passt mehr ins Regal.'}
      </p>
    </EndPanel>
  );
}
