import { RotateCcw } from 'lucide-react';
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
export function LoseScreen({ title, text, canExtra, extraLabel = 'Extra slot (power-up)', canUndo, undoCount, onExtra, onUndo, onRetry }: LoseScreenProps) {
  return (
    <EndPanel
      tone="lose"
      title={title}
      actions={
        <>
          {canExtra && (
            <GameButton variant="primary" onClick={onExtra}>
              {extraLabel}
            </GameButton>
          )}
          {canUndo && (
            <GameButton variant="primary" onClick={onUndo}>
              Undo ({undoCount})
            </GameButton>
          )}
          <GameButton variant="secondary" icon={<RotateCcw strokeWidth={2.8} />} onClick={onRetry}>
            Try again
          </GameButton>
        </>
      }
    >
      <p className="end-text">{text}</p>
    </EndPanel>
  );
}
