import { CalendarDays, House, Play, Settings, Store, Trophy } from 'lucide-react';
import { useRef, useState, type CSSProperties } from 'react';
import { UI_IMAGE } from '../../assets';
import { STORAGE_KEY } from '../../config';
import { readProgress, type GameMode } from '../../hooks/progress';
import { TabBar, type TabDef } from './TabBar';

// Test-Icons (lucide) für die fünf Plätze der Menüleiste, links nach rechts.
const TABS: TabDef[] = [
  { id: 'shop', label: 'Shop', icon: Store },
  { id: 'ranking', label: 'Rangliste', icon: Trophy },
  { id: 'home', label: 'Start', icon: House },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'settings', label: 'Einstellungen', icon: Settings },
];
const HOME_TAB = 2;

const PLACEHOLDER: Record<string, string> = {
  shop: 'Booster, Deko und Münzpakete – kommt bald.',
  ranking: 'Tägliche Herausforderung mit Rangliste – kommt bald.',
  events: 'Wochen-Events und Sammelaktionen – kommt bald.',
  settings: 'Sound, Vibration und Sprache – kommt bald.',
};

interface HomeScreenProps {
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  onPlay: () => void;
}

/** Hauptmenü mit unterer Menüleiste; mittlerer Reiter = Start mit "Play". */
export function HomeScreen({ mode, onModeChange, onPlay }: HomeScreenProps) {
  const [tab, setTab] = useState(HOME_TAB);
  // Richtung des Seitenwechsels (für die Einblend-Animation).
  const dir = useRef(0);
  const progress = readProgress(STORAGE_KEY);

  const select = (i: number) => {
    if (i === tab) return;
    dir.current = i > tab ? 1 : -1;
    setTab(i);
  };

  const current = TABS[tab];
  const CurrentIcon = current.icon;
  const isHome = tab === HOME_TAB;

  return (
    <div className="app home">
      <header className="home-top">
        <div className="hud-pill hud-coins" aria-label={`${progress.coins} Münzen`}>
          <img src={UI_IMAGE.coin} alt="" />
          <strong>{progress.coins}</strong>
        </div>
      </header>

      <main className="home-page" key={tab} style={{ '--dir': dir.current } as CSSProperties}>
        {isHome ? (
          <>
            <h1 className="home-title">
              Super <span>Sorter</span>
            </h1>
            <div className="home-modes" role="radiogroup" aria-label="Spielmodus">
              <ModeCard
                icon="📦"
                title="Packband"
                subtitle="Waren verkaufen"
                progress={`Tag ${progress.packDay}`}
                active={mode === 'pack'}
                onSelect={() => onModeChange('pack')}
              />
              <ModeCard
                icon="🗄️"
                title="Regal"
                subtitle="Wareneingang"
                progress={`Level ${progress.level}`}
                active={mode === 'shelf'}
                onSelect={() => onModeChange('shelf')}
              />
            </div>
          </>
        ) : (
          <div className="home-placeholder">
            <span className="home-placeholder-icon">
              <CurrentIcon strokeWidth={1.8} aria-hidden="true" />
            </span>
            <h2>{current.label}</h2>
            <p>{PLACEHOLDER[current.id]}</p>
          </div>
        )}
      </main>

      {/* Play sitzt über dem mittleren Reiter und ploppt auf, sobald "Start" aktiv ist. */}
      <div className={`home-play${isHome ? ' is-shown' : ''}`} aria-hidden={!isHome}>
        <button
          type="button"
          className="game-btn game-btn--green home-play-btn"
          style={{ borderImageSource: `url(${UI_IMAGE.buttonGreen})` }}
          onClick={onPlay}
          tabIndex={isHome ? 0 : -1}
        >
          <Play className="home-play-icon" fill="currentColor" strokeWidth={0} aria-hidden="true" />
          <span>Play</span>
        </button>
      </div>

      <TabBar tabs={TABS} active={tab} onSelect={select} />
    </div>
  );
}

interface ModeCardProps {
  icon: string;
  title: string;
  subtitle: string;
  progress: string;
  active: boolean;
  onSelect: () => void;
}

function ModeCard({ icon, title, subtitle, progress, active, onSelect }: ModeCardProps) {
  return (
    <button type="button" role="radio" aria-checked={active} className={`home-mode${active ? ' is-active' : ''}`} onClick={onSelect}>
      <span className="home-mode-icon" aria-hidden="true">
        {icon}
      </span>
      <strong>{title}</strong>
      <span>{subtitle}</span>
      <small>{progress}</small>
    </button>
  );
}
