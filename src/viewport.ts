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
//
// Manche iOS-Versionen machen die Web-Ansicht selbst um die Statusleiste kürzer;
// den Streifen darunter füllt iOS dann mit der Hintergrundfarbe der Seite – dort
// hilft keine CSS-Höhe. Deshalb setzt setBottomColor() die Seitenfarbe auf die
// Farbe des untersten Elements (Menüleiste bzw. Boden), dann fällt der Streifen
// nicht auf. Die Diagnose (Titel im Hauptmenü 5× antippen) zeigt alle Messwerte.

/** Größere Abweichungen sind keine Statusleiste (z. B. Split View auf dem iPad). */
const MAX_STATUS_BAR_GAP = 80;

export interface ViewportInfo {
  innerHeight: number;
  clientHeight: number;
  visualHeight: number;
  screenHeight: number;
  /** Gemessene CSS-Höhen: 100vh, 100lvh, 100svh, 100dvh (0 = nicht unterstützt). */
  vh: number;
  lvh: number;
  svh: number;
  dvh: number;
  safeTop: number;
  safeBottom: number;
  standalone: boolean;
  displayMode: string;
  dpr: number;
  appHeight: number;
}

let last: ViewportInfo | null = null;

/** Zuletzt berechnete Werte (für die Diagnose-Anzeige im Hauptmenü). */
export const viewportInfo = () => last;

function displayMode(): string {
  return ['fullscreen', 'standalone', 'minimal-ui', 'browser'].find((m) => window.matchMedia?.(`(display-mode: ${m})`).matches) ?? '?';
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return ['standalone', 'fullscreen', 'minimal-ui'].includes(displayMode());
}

/** Höhe eines CSS-Werts in px (über ein unsichtbares Mess-Element; 0 = nicht unterstützt). */
function measure(height: string): number {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;top:0;left:0;width:0;visibility:hidden;pointer-events:none';
  probe.style.height = height;
  if (!probe.style.height) return 0;
  document.body.appendChild(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return Math.round(h * 10) / 10;
}

export function installStandaloneViewportFix(): void {
  const root = document.documentElement;
  const update = () => {
    const portrait = window.innerHeight >= window.innerWidth;
    // screen.width/height sind auf iOS immer die Hochformat-Werte.
    const screenHeight = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    const innerHeight = window.innerHeight;
    const clientHeight = root.clientHeight;
    const safeTop = measure('env(safe-area-inset-top)');
    const lvh = measure('100lvh');
    const standalone = isStandalone();

    // 100lvh = größte Höhe ohne Browser-Leisten; meldet iOS teils richtig, wenn innerHeight es nicht tut.
    // (Nur als Homescreen-App: In Safari ist lvh die Höhe bei eingefahrenen Leisten.)
    let appHeight = Math.max(innerHeight, clientHeight, standalone ? Math.min(Math.round(lvh), screenHeight) : 0);
    const gap = screenHeight - appHeight;
    const gapIsStatusBar = safeTop > 0 && Math.abs(gap - safeTop) <= 4;
    if (gap > 0 && gap <= MAX_STATUS_BAR_GAP && (standalone || gapIsStatusBar)) appHeight = screenHeight;

    last = {
      innerHeight,
      clientHeight,
      visualHeight: Math.round(window.visualViewport?.height ?? 0),
      screenHeight,
      vh: measure('100vh'),
      lvh,
      svh: measure('100svh'),
      dvh: measure('100dvh'),
      safeTop,
      safeBottom: measure('env(safe-area-inset-bottom)'),
      standalone,
      displayMode: displayMode(),
      dpr: window.devicePixelRatio,
      appHeight,
    };
    root.style.setProperty('--app-h', `${appHeight}px`);
  };
  update();
  window.addEventListener('resize', update);
  // Nach dem Drehen bzw. dem ersten Zeichnen liefert iOS die endgültigen Maße teils verzögert.
  window.addEventListener('orientationchange', () => window.setTimeout(update, 250));
  window.addEventListener('load', update);
  window.setTimeout(update, 500);
}

/**
 * Seitenfarbe = Farbe des untersten Elements des aktuellen Bildschirms. Füllt iOS
 * unten einen Streifen außerhalb der Web-Ansicht, hat er so dieselbe Farbe.
 */
export function setBottomColor(color: string): void {
  document.documentElement.style.setProperty('--page-bg', color);
}
