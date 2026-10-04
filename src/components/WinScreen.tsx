import confetti from 'canvas-confetti';
import { useEffect, type ReactNode } from 'react';
import { UI_IMAGE } from '../assets';
import { EndPanel } from './EndPanel';
import { GameButton } from './GameButton';

interface WinScreenProps {
  title?: string;
  stars: 1 | 2 | 3;
  /** Münzen, die dieser Sieg insgesamt bringt. */
  total: number;
  /** Zeile unter dem Panel (Level, Züge, Bonus …). */
  detail: ReactNode;
  nextLabel?: string;
  onNext: () => void;
}

export function WinScreen({ title = 'Geschafft!', stars, total, detail, nextLabel = 'Weiter', onNext }: WinScreenProps) {
  useEffect(() => {
    confetti({
      particleCount: 140,
      spread: 85,
      startVelocity: 42,
      origin: { y: 0.3 },
      zIndex: 150,
      disableForReducedMotion: true,
    });
  }, []);

  return (
    <EndPanel
      tone="win"
      title={title}
      actions={
        <GameButton variant="green" icon={UI_IMAGE.check} onClick={onNext}>
          {nextLabel}
        </GameButton>
      }
      backdrop={<img className="end-confetti" src={UI_IMAGE.confetti} alt="" />}
      footer={<p className="end-detail">{detail}</p>}
    >
      <div className="end-stars" aria-label={`${stars} von 3 Sternen`}>
        {[1, 2, 3].map((n) => (
          <img key={n} src={UI_IMAGE.star} alt="" className={n <= stars ? 'is-on' : 'is-off'} style={{ animationDelay: `${n * 140}ms` }} />
        ))}
      </div>
      <div className="end-coins">
        <img src={UI_IMAGE.coin} alt="" />
        <strong>+{total}</strong>
      </div>
    </EndPanel>
  );
}
