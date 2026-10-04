import { UI_IMAGE } from '../assets';
import { RestartIcon } from './icons';

interface HUDProps {
  level: number;
  reward: boolean;
  coins: number;
  onRestart: () => void;
}

/** Kopfzeile: Level-Anzeige, Neustart, Münzzähler. */
export function HUD({ level, reward, coins, onRestart }: HUDProps) {
  return (
    <header className="hud">
      <div className="hud-pill hud-level">
        <span className="hud-level-label">Level</span>
        <strong>{level}</strong>
        {reward && <span className="hud-bonus">Bonus</span>}
      </div>
      <button type="button" className="hud-pill hud-restart" onClick={onRestart} aria-label="Level neu starten">
        <RestartIcon />
      </button>
      <div className="hud-pill hud-coins" id="hud-coins" aria-label={`${coins} Münzen`}>
        <img src={UI_IMAGE.coin} alt="" />
        <strong>{coins}</strong>
      </div>
    </header>
  );
}
