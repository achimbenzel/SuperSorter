// iOS-Homescreen-App: die App füllt den ganzen Bildschirm.
//
// Mit der Statusleiste "black-translucent" zeichnet iOS die App ab der obersten
// Bildschirmkante (unter der Statusleiste). Als Höhe für 100%/100vh/100dvh – je nach
// iOS-Version auch für innerHeight – meldet es aber den Bildschirm *minus*
// Statusleiste. Ergebnis: unten bleibt ein Streifen in Statusleisten-Höhe frei.
// Deshalb setzen wir --app-h auf die echte Bildschirmhöhe (global.css nutzt sie).
//
// Nur im iOS-Standalone-Modus (navigator.standalone): Im Browser und auf Android
// stimmt die Viewport-Höhe, und dort würde screen.height die Systemleisten mitzählen.

/** Größere Abweichungen sind keine Statusleiste (z. B. Split View auf dem iPad). */
const MAX_STATUS_BAR_GAP = 80;

export function installStandaloneViewportFix(): void {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (!iosStandalone) return;

  const root = document.documentElement;
  const update = () => {
    const portrait = window.innerHeight >= window.innerWidth;
    // screen.width/height sind auf iOS immer die Hochformat-Werte.
    const screenH = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    const gap = screenH - window.innerHeight;
    const height = gap > 0 && gap <= MAX_STATUS_BAR_GAP ? screenH : window.innerHeight;
    root.style.setProperty('--app-h', `${height}px`);
  };
  update();
  window.addEventListener('resize', update);
  // Nach dem Drehen liefert iOS die neuen Maße teils erst verzögert.
  window.addEventListener('orientationchange', () => window.setTimeout(update, 250));
}
