import { useEffect, useState } from 'react';
import { HomeScreen } from './components/home/HomeScreen';
import { DEFAULT_MODE, MODE_KEY, normalizeMode } from './hooks/progress';
import { usePersistedState } from './hooks/usePersistedState';
import { PackGame } from './modes/PackGame';
import { ShelfGame } from './modes/ShelfGame';
import { setPageBackground } from './viewport';
import './styles/game.css';
import './styles/screens.css';
import './styles/pack.css';
import './styles/home.css';
import './styles/cards.css';

/**
 * Start im Hauptmenü (untere Menüleiste, "Play" im mittleren Reiter). Dort wird
 * auch der Spielmodus gewählt: Beide Modi teilen Assets, Animationen, Booster und
 * Münzen, haben aber eigene Regeln (src/game/ bzw. src/game/pack/). Zum Testen sind
 * sie getrennt wählbar; später sollen sie sich abwechseln (Wareneingang / Versand).
 * Das Menü-Symbol im Spiel führt zurück ins Hauptmenü.
 */
export default function App() {
  const [modeState, setModeState] = usePersistedState(MODE_KEY, DEFAULT_MODE);
  const [screen, setScreen] = useState<'home' | 'game'>('home');
  const mode = normalizeMode(modeState.mode);
  // Im Spiel liegt unten der Boden (das Menü setzt seinen Hintergrund selbst, HomeScreen).
  useEffect(() => {
    if (screen === 'game') setPageBackground('var(--c-bg-floor)');
  }, [screen]);

  if (screen === 'home') {
    return <HomeScreen mode={mode} onModeChange={(m) => setModeState({ mode: m })} onPlay={() => setScreen('game')} />;
  }
  const toHome = () => setScreen('home');
  return mode === 'pack' ? <PackGame key="pack" onMenu={toHome} /> : <ShelfGame key="shelf" onMenu={toHome} />;
}
