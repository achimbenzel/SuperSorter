// iOS-Homescreen-App: die App füllt den ganzen Bildschirm.
//
// Mit der Statusleiste "black-translucent" zeichnet iOS die App ab der obersten
// Bildschirmkante (unter der Statusleiste). Als Höhe für 100%/100vh/100dvh – je nach
// iOS-Version auch für innerHeight – meldet es aber den Bildschirm *minus*
// Statusleiste. Ergebnis: unten bleibt ein Streifen in Statusleisten-Höhe frei.
//
// Deshalb setzen wir --app-h (global.css nutzt sie für html, body, #root):
//   1. immer die größte gemeldete Fensterhöhe (innerHeight vs. clientHeight – iOS
//      meldet in manchen Versionen nur eine der beiden falsch),
//   2. fehlt dann noch genau etwa die Statusleisten-Höhe bis zur Bildschirmhöhe und
//      läuft die App als Homescreen-App, die volle Bildschirmhöhe.
// Erkennung "Homescreen-App" über mehrere Signale, weil iOS-Versionen sich
// unterscheiden (navigator.standalone, display-mode, Lücke = Safe-Area oben).

/** Größere Abweichungen sind keine Statusleiste (z. B. Split View auf dem iPad). */
const MAX_STATUS_BAR_GAP = 80;

export interface ViewportInfo {
  innerHeight: number;
  clientHeight: number;
  screenHeight: number;
  safeTop: number;
  standalone: boolean;
  appHeight: number;
}

let last: ViewportInfo | null = null;

/** Zuletzt berechnete Werte (für die Diagnose-Anzeige im Hauptmenü). */
export const viewportInfo = () => last;

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return ['standalone', 'fullscreen', 'minimal-ui'].some((m) => window.matchMedia?.(`(display-mode: ${m})`).matches);
}

/** env(safe-area-inset-top) in px (über ein unsichtbares Mess-Element). */
function measureSafeTop(): number {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;height:env(safe-area-inset-top)';
  document.body.appendChild(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return h;
}

export function installStandaloneViewportFix(): void {
  const root = document.documentElement;
  const update = () => {
    const portrait = window.innerHeight >= window.innerWidth;
    // screen.width/height sind auf iOS immer die Hochformat-Werte.
    const screenHeight = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    const innerHeight = window.innerHeight;
    const clientHeight = root.clientHeight;
    const safeTop = measureSafeTop();
    const standalone = isStandalone();

    let appHeight = Math.max(innerHeight, clientHeight);
    const gap = screenHeight - appHeight;
    const gapIsStatusBar = safeTop > 0 && Math.abs(gap - safeTop) <= 4;
    if (gap > 0 && gap <= MAX_STATUS_BAR_GAP && (standalone || gapIsStatusBar)) appHeight = screenHeight;

    last = { innerHeight, clientHeight, screenHeight, safeTop, standalone, appHeight };
    root.style.setProperty('--app-h', `${appHeight}px`);
  };
  update();
  window.addEventListener('resize', update);
  // Nach dem Drehen bzw. dem ersten Zeichnen liefert iOS die endgültigen Maße teils verzögert.
  window.addEventListener('orientationchange', () => window.setTimeout(update, 250));
  window.addEventListener('load', update);
  window.setTimeout(update, 500);
}
