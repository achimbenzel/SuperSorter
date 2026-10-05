import { useState } from 'react';
import { ModeMenu } from './components/ModeMenu';
import { DEFAULT_MODE, MODE_KEY, normalizeMode } from './hooks/progress';
import { usePersistedState } from './hooks/usePersistedState';
import { PackGame } from './modes/PackGame';
import { ShelfGame } from './modes/ShelfGame';
import './styles/game.css';
import './styles/screens.css';
import './styles/pack.css';

/**
 * Wählt den Spielmodus. Beide Modi teilen Assets, Animationen, Booster und Münzen,
 * haben aber eigene Regeln (src/game/ bzw. src/game/pack/). Zum Testen sind sie
 * getrennt wählbar; später sollen sie sich abwechseln (Wareneingang / Versand).
 */
export default function App() {
  const [modeState, setModeState] = usePersistedState(MODE_KEY, DEFAULT_MODE);
  const [menuOpen, setMenuOpen] = useState(false);

  const openMenu = () => setMenuOpen(true);
  const mode = normalizeMode(modeState.mode);
  return (
    <>
      {mode === 'pack' ? <PackGame key="pack" onMenu={openMenu} /> : <ShelfGame key="shelf" onMenu={openMenu} />}
      {menuOpen && (
        <ModeMenu
          mode={mode}
          onSelect={(mode) => {
            setModeState({ mode });
            setMenuOpen(false);
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
