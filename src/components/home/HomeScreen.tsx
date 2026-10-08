import { House, LibraryBig, Music, Package, PackageOpen, Play, Store, Trophy, Volume2, VolumeX, WalletCards, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { UI_IMAGE } from '../../assets';
import { isSoundEnabled, setSoundEnabled } from '../../audio/player';
import { isMusicEnabled, setMusicEnabled } from '../../audio/music';
import { playSfx } from '../../audio/sfx';
import { CARD_SET } from '../../game/cards/cards';
import { STORAGE_KEY } from '../../config';
import { readProgress, type GameMode } from '../../hooks/progress';
import { useCollection } from '../../hooks/useCollection';
import { setPageBackground, viewportInfo } from '../../viewport';
import { TcgCard } from '../cards/TcgCard';
import { CollectionPage } from './CollectionPage';
import { PacksPage } from './PacksPage';
import { activeTabSlot, TAB_ACTIVE_COLOR, TAB_BAR_COLOR, TabBar, type TabDef } from './TabBar';

// Die fünf Plätze der Menüleiste, links nach rechts (Icons: lucide).
const TAB = { shop: 0, ranking: 1, home: 2, packs: 3, collection: 4 } as const;

// Fächer über dem Titel: drei Holo Rares (Abyss Whale, Solar Dragon, Plasma Unicorn)
const HERO_CARDS = [16, 8, 32].map((no) => CARD_SET[no - 1]);

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
  const [music, setMusic] = useState(isMusicEnabled);
  const [diag, setDiag] = useState(false);
  const titleTaps = useRef(0);
  // Richtung des Seitenwechsels (für die Einblend-Animation).
  const dir = useRef(0);
  const progress = readProgress(STORAGE_KEY);
  const { collection, addOpenedPack, markAllSeen } = useCollection();
  // Unten liegt die Menüleiste: Seitenhintergrund in ihrer Farbe samt aktivem Reiter.
  useEffect(() => setPageBackground(TAB_BAR_COLOR, { ...activeTabSlot(tab), color: TAB_ACTIVE_COLOR }), [tab]);

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

  const toggleMusic = () => {
    const next = !music;
    setMusicEnabled(next);
    setMusic(next);
    playSfx('tap');
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
        <div className="home-top-group">
          <button type="button" className="hud-pill hud-icon" onClick={toggleSound} aria-label={sound ? 'Mute sound' : 'Turn sound on'}>
            {sound ? <Volume2 strokeWidth={2.6} /> : <VolumeX strokeWidth={2.6} />}
          </button>
          <button
            type="button"
            className={`hud-pill hud-icon home-music${music ? '' : ' is-off'}`}
            onClick={toggleMusic}
            aria-label={music ? 'Turn music off' : 'Turn music on'}
            aria-pressed={music}
          >
            <Music strokeWidth={2.6} />
          </button>
        </div>
        <div className="hud-pill hud-coins" aria-label={`${progress.coins} coins`}>
          <img src={UI_IMAGE.coin} alt="" />
          <strong>{progress.coins}</strong>
        </div>
      </header>

      <div className="home-main">
        <main className={`home-page home-page--${tabs[tab].id}`} key={tab} style={{ '--dir': dir.current } as CSSProperties}>
          {isHome && (
            <>
              <div className="home-hero" aria-hidden="true">
                {HERO_CARDS.map((card, i) => (
                  <TcgCard key={card.id} card={card} className={`home-hero-card home-hero-card--${i}`} />
                ))}
              </div>
              <h1 className="home-title" onClick={tapTitle}>
                <span className="home-title-word">Super</span> <span className="home-title-word">Sorter</span>
                <small>Card Shop</small>
              </h1>
              <div className="home-modes" role="radiogroup" aria-label="Game mode">
                <ModeCard
                  icon={Package}
                  title="Shipping"
                  subtitle="Pack customer orders"
                  progress={`Day ${progress.packDay}`}
                  active={mode === 'pack'}
                  onSelect={() => onModeChange('pack')}
                />
                <ModeCard
                  icon={LibraryBig}
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
            className="game-btn game-btn--primary home-play-btn"
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
  icon: LucideIcon;
  title: string;
  subtitle: string;
  progress: string;
  active: boolean;
  onSelect: () => void;
}

function ModeCard({ icon: Icon, title, subtitle, progress, active, onSelect }: ModeCardProps) {
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
        <Icon strokeWidth={1.9} />
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
  const root = document.getElementById('root')?.getBoundingClientRect().height;
  return (
    <pre className="home-diag">
      {v
        ? [
            `build ${__BUILD_ID__} · ${v.displayMode} · standalone ${v.standalone} · dpr ${v.dpr}`,
            `screen ${v.screenHeight} · inner ${v.innerHeight} · client ${v.clientHeight} · visual ${v.visualHeight}`,
            `vh ${v.vh} · lvh ${v.lvh} · svh ${v.svh} · dvh ${v.dvh}`,
            `safe top ${v.safeTop} · bottom ${v.safeBottom}`,
            `app-h ${css} · root ${root}`,
          ].join('\n')
        : 'no data'}
    </pre>
  );
}
