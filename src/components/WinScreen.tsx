import confetti from 'canvas-confetti';
import { Check } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { UI_IMAGE } from '../assets';
import { EndPanel, GoldStar } from './EndPanel';
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

/** Funken in Gold und Glut statt bunter Schnipsel */
const SPARK_COLORS = ['#fff3cf', '#f6dfa0', '#e2b65c', '#ff9a3c', '#ff7a1f', '#c2410c'];

export function WinScreen({ title = 'Well done!', stars, total, detail, nextLabel = 'Next', onNext }: WinScreenProps) {
  useEffect(() => {
    confetti({
      particleCount: 140,
      spread: 85,
      startVelocity: 42,
      origin: { y: 0.3 },
      colors: SPARK_COLORS,
      shapes: ['square', 'circle', 'star'],
      zIndex: 150,
      disableForReducedMotion: true,
    });
  }, []);

  return (
    <EndPanel
      tone="win"
      title={title}
      actions={
        <GameButton variant="primary" icon={<Check strokeWidth={3} />} onClick={onNext}>
          {nextLabel}
        </GameButton>
      }
      footer={<p className="end-detail">{detail}</p>}
    >
      <div className="end-stars" aria-label={`${stars} of 3 stars`}>
        {[1, 2, 3].map((n) => (
          <GoldStar key={n} on={n <= stars} style={{ animationDelay: `${n * 140}ms` }} />
        ))}
      </div>
      <div className="end-coins">
        <img src={UI_IMAGE.coin} alt="" />
        <strong>+{total}</strong>
      </div>
    </EndPanel>
  );
}
