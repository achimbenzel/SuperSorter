import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { installAudio } from './audio/player';
import { PRELOAD_IMAGES } from './assets';
import { applyTimingCssVars } from './config';
import { installImageRetry, preloadImages } from './imageLoader';
import { installIosGuards } from './iosGuards';
import { installStandaloneViewportFix } from './viewport';
import './styles/tokens.css';
import './styles/global.css';

applyTimingCssVars();
installStandaloneViewportFix();
installIosGuards();
installImageRetry();
installAudio();
// Alle Spielbilder vorladen, dekodieren und festhalten (kein Nachladen mitten im Spiel).
preloadImages(PRELOAD_IMAGES);

// Service Worker: cacht alle Assets für Offline-Spielen. Updates werden im
// Hintergrund geladen und aktivieren sich automatisch (registerType: autoUpdate).
if (import.meta.env.PROD) registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
