import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { UI_IMAGE } from '../assets';
import { REWARD_LEVEL_BONUS, winCoins } from '../game/levels';
import { starRating } from '../game/reducer';
import type { GameState } from '../game/types';
import { EndPanel } from './EndPanel';
import { GameButton } from './GameButton';

interface WinScreenProps {
  state: GameState;
  onNext: () => void;
}

export function WinScreen({ state, onNext }: WinScreenProps) {
  const stars = starRating(state);
  const base = winCoins(state.config);
  const total = base + state.levelCoins;

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
      title="Geschafft!"
      actions={
        <GameButton variant="green" icon={UI_IMAGE.check} onClick={onNext}>
          Weiter
        </GameButton>
      }
      backdrop={<img className="end-confetti" src={UI_IMAGE.confetti} alt="" />}
      footer={
        <p className="end-detail">
          Level {state.config.level} · {state.moves} Züge
          {state.levelCoins > 0 && <> · Gold +{state.levelCoins}</>}
          {state.config.reward && <> · Bonus +{REWARD_LEVEL_BONUS}</>}
        </p>
      }
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
