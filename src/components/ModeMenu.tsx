import { STORAGE_KEY } from '../config';
import { readProgress, type GameMode } from '../hooks/progress';

interface ModeMenuProps {
  mode: GameMode;
  onSelect: (mode: GameMode) => void;
  onClose: () => void;
}

/** Menü zum Umschalten zwischen den beiden Modi (zum Testen getrennt wählbar). */
export function ModeMenu({ mode, onSelect, onClose }: ModeMenuProps) {
  const progress = readProgress(STORAGE_KEY);
  const options: { id: GameMode; icon: string; title: string; text: string; progress: string }[] = [
    {
      id: 'pack',
      icon: '📦',
      title: 'Packband (Versand)',
      text: 'Waren verkaufen: Kundenpakete auf dem Band packen und verschicken – Kettenreaktionen bringen Kombo-Münzen.',
      progress: `Tag ${progress.packDay}`,
    },
    {
      id: 'shelf',
      icon: '🗄️',
      title: 'Regal (Wareneingang)',
      text: 'Waren in den Bestand aufnehmen: die Lieferung sortenrein ins Supermarktregal räumen.',
      progress: `Level ${progress.level}`,
    },
  ];

  return (
    <div className="overlay menu-overlay" role="dialog" aria-modal="true" aria-label="Spielmodus" onClick={onClose}>
      <div className="menu" onClick={(e) => e.stopPropagation()}>
        <div className="menu-head">
          <h2>Spielmodus</h2>
          <button type="button" className="menu-close" onClick={onClose} aria-label="Schließen">
            ✕
          </button>
        </div>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`menu-option${o.id === mode ? ' is-active' : ''}`}
            onClick={() => onSelect(o.id)}
          >
            <span className="menu-option-icon" aria-hidden="true">
              {o.icon}
            </span>
            <span className="menu-option-body">
              <strong>
                {o.title}
                {o.id === mode && <em>aktiv</em>}
              </strong>
              <span>{o.text}</span>
              <small>{o.progress}</small>
            </span>
          </button>
        ))}
        <p className="menu-coins">Münzen gelten in beiden Modi: {progress.coins}</p>
      </div>
    </div>
  );
}
