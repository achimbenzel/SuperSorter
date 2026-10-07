import { House, PackageOpen, Play, Store, Trophy, Volume2, VolumeX, WalletCards } from 'lucide-react';
import { useRef, useState, type CSSProperties } from 'react';
import { UI_IMAGE } from '../../assets';
import { isSoundEnabled, setSoundEnabled } from '../../audio/player';
import { playSfx } from '../../audio/sfx';
import { STORAGE_KEY } from '../../config';
import { readProgress, type GameMode } from '../../hooks/progress';
import { useCollection } from '../../hooks/useCollection';
import { viewportInfo } from '../../viewport';
import { CollectionPage } from './CollectionPage';
import { PacksPage } from './PacksPage';
import { TabBar, type TabDef } from './TabBar';

// Die fünf Plätze der Menüleiste, links nach rechts (Icons: lucide).
const TAB = { shop: 0, ranking: 1, home: 2, packs: 3, collection: 4 } as const;

const PLACEHOLDER: Record<number, { title: string; text: string }> = {
  [TAB.shop]: { title: 'Shop', text: 'Coin bundles, power-ups and shop decorations – coming soon.' },
  [TAB.ranking]: { title: 'Ranking', text: 'Daily challenge with a global leaderboard – coming soon.' },
};

interface HomeScreenProps {
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  onPlay: () => void;
}

/** Hauptmenü mit unterer Menüleiste; mittlerer Reiter = Home mit "Play". */
export function HomeScreen({ mode, onModeChange, onPlay }: HomeScreenProps) {
  const [tab, setTab] = useState<number>(TAB.home);
  const [sound, setSound] = useState(isSoundEnabled);
  const [diag, setDiag] = useState(false);
  const titleTaps = useRef(0);
  // Richtung des Seitenwechsels (für die Einblend-Animation).
  const dir = useRef(0);
  const progress = readProgress(STORAGE_KEY);
  const { collection, addOpenedPack, markAllSeen } = useCollection();

  const tabs: TabDef[] = [
    { id: 'shop', label: 'Shop', icon: Store },
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'home', label: 'Home', icon: House },
    { id: 'packs', label: 'Packs', icon: PackageOpen },
    { id: 'collection', label: 'Collection', icon: WalletCards, badge: collection.unseen.length },
  ];

  const select = (i: number) => {
    if (i === tab) return;
    dir.current = i > tab ? 1 : -1;
    setTab(i);
    playSfx('tab');
  };

  const toggleSound = () => {
    const next = !sound;
    setSoundEnabled(next);
    setSound(next);
    if (next) playSfx('tap');
  };

  // Versteckte Diagnose (Höhe der Homescreen-App): Titel fünfmal antippen.
  const tapTitle = () => {
    titleTaps.current += 1;
    if (titleTaps.current >= 5) {
      titleTaps.current = 0;
      setDiag((d) => !d);
    }
  };

  const isHome = tab === TAB.home;
  const placeholder = PLACEHOLDER[tab];
  const PlaceholderIcon = tabs[tab].icon;

  return (
    <div className="app home">
      <header className="home-top">
        <button type="button" className="hud-pill hud-icon" onClick={toggleSound} aria-label={sound ? 'Mute sound' : 'Turn sound on'}>
          {sound ? <Volume2 strokeWidth={2.6} /> : <VolumeX strokeWidth={2.6} />}
        </button>
        <div className="hud-pill hud-coins" aria-label={`${progress.coins} coins`}>
          <img src={UI_IMAGE.coin} alt="" />
          <strong>{progress.coins}</strong>
        </div>
      </header>

      <div className="home-main">
        <main className={`home-page home-page--${tabs[tab].id}`} key={tab} style={{ '--dir': dir.current } as CSSProperties}>
          {isHome && (
            <>
              <h1 className="home-title" onClick={tapTitle}>
                Super <span>Sorter</span>
                <small>Card Shop</small>
              </h1>
              <div className="home-modes" role="radiogroup" aria-label="Game mode">
                <ModeCard
                  icon="📦"
                  title="Shipping"
                  subtitle="Pack customer orders"
                  progress={`Day ${progress.packDay}`}
                  active={mode === 'pack'}
                  onSelect={() => onModeChange('pack')}
                />
                <ModeCard
                  icon="🗄️"
                  title="Restock"
                  subtitle="Fill the shop shelves"
                  progress={`Level ${progress.level}`}
                  active={mode === 'shelf'}
                  onSelect={() => onModeChange('shelf')}
                />
              </div>
              {diag && <Diagnostics />}
            </>
          )}
          {tab === TAB.packs && (
            <PacksPage packsOpened={collection.packsOpened} onOpened={addOpenedPack} onViewCollection={() => select(TAB.collection)} />
          )}
          {tab === TAB.collection && <CollectionPage collection={collection} onSeen={markAllSeen} onOpenPacks={() => select(TAB.packs)} />}
          {placeholder && (
            <div className="home-placeholder">
              <span className="home-placeholder-icon">
                <PlaceholderIcon strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h2>{placeholder.title}</h2>
              <p>{placeholder.text}</p>
            </div>
          )}
        </main>

        {/* Play sitzt über dem mittleren Reiter und ploppt auf, sobald "Home" aktiv ist. */}
        <div className={`home-play${isHome ? ' is-shown' : ''}`} aria-hidden={!isHome}>
          <button
            type="button"
            className="game-btn game-btn--green home-play-btn"
            style={{ borderImageSource: `url(${UI_IMAGE.buttonGreen})` }}
            onClick={() => {
              playSfx('button');
              onPlay();
            }}
            tabIndex={isHome ? 0 : -1}
          >
            <Play className="home-play-icon" fill="currentColor" strokeWidth={0} aria-hidden="true" />
            <span>Play</span>
          </button>
        </div>
      </div>

      <TabBar tabs={tabs} active={tab} onSelect={select} />
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
    <button
      type="button"
      role="radio"
      aria-checked={active}
      className={`home-mode${active ? ' is-active' : ''}`}
      onClick={() => {
        onSelect();
        playSfx('select');
      }}
    >
      <span className="home-mode-icon" aria-hidden="true">
        {icon}
      </span>
      <strong>{title}</strong>
      <span>{subtitle}</span>
      <small>{progress}</small>
    </button>
  );
}

function Diagnostics() {
  const v = viewportInfo();
  const css = getComputedStyle(document.documentElement).getPropertyValue('--app-h') || '–';
  return (
    <pre className="home-diag">
      {v
        ? `inner ${v.innerHeight} · client ${v.clientHeight} · screen ${v.screenHeight}\nsafeTop ${v.safeTop} · standalone ${v.standalone}\napp-h ${css} · root ${document.getElementById('root')?.getBoundingClientRect().height}`
        : 'no data'}
    </pre>
  );
}
