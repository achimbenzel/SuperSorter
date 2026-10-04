import { UI_IMAGE } from '../assets';
import { EndPanel } from './EndPanel';
import { GameButton } from './GameButton';

interface LoseScreenProps {
  title: string;
  text: string;
  /** Extra-Platz rettet nur aus einem Deadlock (nicht aus einer Sackgasse/einem Engpass). */
  canExtra: boolean;
  extraLabel?: string;
  canUndo: boolean;
  undoCount: number;
  onExtra: () => void;
  onUndo: () => void;
  onRetry: () => void;
}

/** Niederlage mit Rettungsoptionen (Extra-Platz, Rückgängig) und Neustart. */
export function LoseScreen({ title, text, canExtra, extraLabel = 'Extra-Platz (Booster)', canUndo, undoCount, onExtra, onUndo, onRetry }: LoseScreenProps) {
  return (
    <EndPanel
      tone="lose"
      title={title}
      actions={
        <>
          {canExtra && (
            <GameButton variant="green" onClick={onExtra}>
              {extraLabel}
            </GameButton>
          )}
          {canUndo && (
            <GameButton variant="green" onClick={onUndo}>
              Rückgängig ({undoCount})
            </GameButton>
          )}
          <GameButton variant="red" icon={UI_IMAGE.cross} onClick={onRetry}>
            Nochmal
          </GameButton>
        </>
      }
    >
      <p className="end-text">{text}</p>
    </EndPanel>
  );
}
