import { UI_IMAGE } from '../assets';
import { MenuIcon, RestartIcon } from './icons';

interface HUDProps {
  /** "Level" (Regal) oder "Tag" (Versand). */
  label: string;
  level: number;
  reward: boolean;
  coins: number;
  onRestart: () => void;
  onMenu: () => void;
}

/** Kopfzeile: Menü, Level/Tag, Neustart, Münzzähler. */
export function HUD({ label, level, reward, coins, onRestart, onMenu }: HUDProps) {
  return (
    <header className="hud">
      <button type="button" className="hud-pill hud-icon" onClick={onMenu} aria-label="Main menu">
        <MenuIcon />
      </button>
      <div className="hud-pill hud-level">
        <span className="hud-level-label">{label}</span>
        <strong>{level}</strong>
        {reward && <span className="hud-bonus">Bonus</span>}
      </div>
      <button type="button" className="hud-pill hud-icon hud-restart" onClick={onRestart} aria-label="Restart">
        <RestartIcon />
      </button>
      <div className="hud-pill hud-coins" id="hud-coins" aria-label={`${coins} coins`}>
        <img src={UI_IMAGE.coin} alt="" />
        <strong>{coins}</strong>
      </div>
    </header>
  );
}
