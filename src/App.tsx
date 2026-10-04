import { useEffect, useState } from 'react';
import { PRELOAD_IMAGES } from './assets';
import { ModeMenu } from './components/ModeMenu';
import { DEFAULT_MODE, MODE_KEY } from './hooks/progress';
import { usePersistedState } from './hooks/usePersistedState';
import { ShelfGame } from './modes/ShelfGame';
import { ShopGame } from './modes/ShopGame';
import './styles/game.css';
import './styles/screens.css';
import './styles/shop.css';

/**
 * Wählt den Spielmodus. Beide Modi teilen Assets, Animationen, Booster und Münzen,
 * haben aber eigene Regeln (src/game/ bzw. src/game/shop/).
 */
export default function App() {
  const [modeState, setModeState] = usePersistedState(MODE_KEY, DEFAULT_MODE);
  const [menuOpen, setMenuOpen] = useState(false);

  // Bilder vorladen, damit Reveal und Screens nicht flackern.
  useEffect(() => {
    PRELOAD_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const openMenu = () => setMenuOpen(true);
  return (
    <>
      {modeState.mode === 'shop' ? <ShopGame key="shop" onMenu={openMenu} /> : <ShelfGame key="shelf" onMenu={openMenu} />}
      {menuOpen && (
        <ModeMenu
          mode={modeState.mode}
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
