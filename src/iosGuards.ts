// Schutz vor ungewollten Browser-Gesten auf dem iPhone.
//
// CSS (touch-action, overscroll-behavior, user-select) deckt das meiste ab. Safari
// ignoriert aber aus Barrierefreiheitsgründen `user-scalable=no` im Browser-Modus
// und kennt eigene Gesture-Events. Diese Listener schließen die Lücken:
// - Pinch-Zoom (gesturestart/-change)
// - Scrollen/Gummiband (touchmove auf dem Dokument)
// - Long-Press-Kontextmenü
// - Doppeltipp-Zoom (dblclick)

export function installIosGuards(): void {
  const prevent = (e: Event) => e.preventDefault();
  const opts = { passive: false } as const;

  document.addEventListener('gesturestart', prevent, opts);
  document.addEventListener('gesturechange', prevent, opts);
  document.addEventListener('gestureend', prevent, opts);
  document.addEventListener('dblclick', prevent, opts);
  document.addEventListener('contextmenu', prevent, opts);
  document.addEventListener(
    'touchmove',
    (e) => {
      // Das Spiel hat keine scrollbaren Bereiche – jede Wischbewegung wäre Bounce.
      // Ausnahme: Eingabefelder (Debug-Panel).
      if ((e.target as HTMLElement | null)?.closest('input, textarea')) return;
      e.preventDefault();
    },
    opts,
  );
}
