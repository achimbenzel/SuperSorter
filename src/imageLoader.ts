// Bilder robust laden.
//
// 1. Vorladen + dekodieren: Alle Spielbilder werden beim Start geladen, dekodiert und
//    für die ganze Sitzung festgehalten. Sonst darf der Browser sie unter
//    Speicherdruck verwerfen und lädt sie später neu – über WLAN (Dev-Server ohne
//    Service Worker) kann das dauern oder scheitern: Waren fehlen dann mitten im Spiel.
// 2. Wiederholen: Scheitert ein <img> trotzdem, wird es nach kurzer Pause bis zu
//    dreimal neu angefordert (mit Cache-Buster, damit wirklich neu geladen wird).

const MAX_RETRIES = 3;

/** Bleibt bis zum Schließen der App referenziert -> Bilder bleiben im Speicher. */
const held: HTMLImageElement[] = [];

export function preloadImages(srcs: string[]): void {
  for (const src of srcs) load(src, 0);
}

function load(src: string, attempt: number) {
  const img = new Image();
  img.onload = () => {
    // Dekodieren vorab: Beim ersten Einblenden muss das Bild nicht mehr dekodiert werden.
    img.decode?.().catch(() => {});
  };
  img.onerror = () => {
    held.splice(held.indexOf(img), 1);
    if (attempt < MAX_RETRIES) window.setTimeout(() => load(src, attempt + 1), 500 * 2 ** attempt);
  };
  img.src = src;
  held.push(img);
}

/** Fehlgeschlagene <img>-Ladevorgänge der App-Assets automatisch wiederholen. */
export function installImageRetry(): void {
  window.addEventListener(
    'error',
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || !img.src.includes('/assets/')) return;
      const attempt = Number(img.dataset.retry ?? 0) + 1;
      if (attempt > MAX_RETRIES) return;
      img.dataset.retry = String(attempt);
      const base = img.src.replace(/[?&]retry=\d+$/, '');
      window.setTimeout(() => {
        if (img.isConnected) img.src = `${base}${base.includes('?') ? '&' : '?'}retry=${attempt}`;
      }, 400 * 2 ** (attempt - 1));
    },
    // Ladefehler von Bildern steigen nicht auf -> in der Capture-Phase abfangen.
    true,
  );
}
