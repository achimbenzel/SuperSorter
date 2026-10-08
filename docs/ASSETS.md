# Assets

Alle Grafiken wurden einzeln visuell gesichtet und anhand des Bildinhalts zugeordnet.

- **Originale** liegen unverändert (Dateiname und Inhalt) in [`assets-src/`](../assets-src).
- **Optimierte Versionen** (beschnitten, verkleinert, WebP) liegen in [`public/assets/`](../public/assets) und werden von der App geladen.
- **Zuordnung Original → Ziel** steht maschinenlesbar in [`scripts/asset-map.mjs`](../scripts/asset-map.mjs). Das ist die einzige Stelle, an der Quell- und Zieldateien verknüpft sind.
- **Zuordnung Spiel-ID → Pfad** steht in [`src/assets.ts`](../src/assets.ts). Komponenten verwenden ausschließlich diese Konstanten, nie hart codierte Pfade.

## Workflow

```bash
npm run assets:optimize   # assets-src/*.png  -> public/assets/**/*.webp
npm run assets:icons      # assets-src/AppIcon.png -> public/assets/icons/*.png
npm run assets            # beides
```

Die erzeugten Dateien sind eingecheckt, damit `npm run build` (und der GitHub-Actions-Build) nicht von `sharp` abhängt.
Nur nach Änderungen an `assets-src/` oder an `scripts/asset-map.mjs` muss das Script erneut laufen.

**Neues Asset hinzufügen:** PNG nach `assets-src/` legen → Zeile in `scripts/asset-map.mjs` ergänzen → `npm run assets:optimize` → Pfad in `src/assets.ts` eintragen → Tabelle unten ergänzen.

### Verarbeitung

| Art | Schritte |
|---|---|
| `sprite` (Waren, Mystery, Icons) | transparente Ränder abschneiden (`trim`) → quadratisch einpassen (`contain`) mit 3 % Rand → WebP (q88). Dadurch füllen alle Waren ihre Box gleich stark aus, egal wie viel Leerraum das Original hatte. |
| `wide` (Karton, Regal, Panel, breite Buttons) | optional Ausschnitt (`crop`) → optional Alpha-Bereinigung → `trim` → auf Zielbreite verkleinern → WebP |
| App-Icon | 180/192/512 px ohne Transparenz, 512 px maskable (Motiv auf 78 % verkleinert, Rand in Icon-Hintergrundfarbe `#63B0DA`), 64 px Favicon |

**Darstellungsgröße:** Waren werden im Spiel mit 44–72 CSS-px gezeigt (abhängig vom Gerät). 216 px reicht für 3x-Retina (72 × 3).

## Card-Shop-Waren (Vektorgrafik im Code)

Seit dem Card-Shop-Thema verkauft der Laden Sammelkarten-Produkte. Die acht Waren sind als SVG in `scripts/cardshop-art.mjs` gezeichnet (Sticker-Stil wie die Original-Assets: dunkle Kontur, weißer Rand, Glanz) und werden mit `node scripts/cardshop-art.mjs` gerendert: SVG-Quellen nach `assets-src/cardshop/`, Bilder nach `public/assets/items/<id>.webp` (216 × 216).

| Ware (`ItemType`) | Bild | Kategorie (Hinweis-Symbol) |
|---|---|---|
| `pack-fire` | rotes Booster-Pack „FIRE“, Flamme | Booster 🎴 |
| `pack-leaf` | grünes Booster-Pack „LEAF“, Blatt | Booster 🎴 |
| `pack-bolt` | gelbes Booster-Pack „BOLT“, Blitz | Booster 🎴 |
| `pack-water` | blaues Booster-Pack „WATER“, Tropfen | Booster 🎴 |
| `dice` | pinker W20 | Spiele 🎲 |
| `deck-box` | lila Deckbox mit Stern | Zubehör 🛡️ |
| `figure` | Sammelfigur (Feuerfuchs auf Sockel) | Sammlerstücke ⭐ |
| `sleeves` | Kartenhüllen, „SLEEVES“ | Zubehör 🛡️ |

Die Supermarkt-Originale (`Item_01`–`Item_08`) liegen weiter in `assets-src/`, werden aber nicht mehr ausgeliefert.

**Sammelkarten** (Packs-/Sammlungs-Reiter): Rahmen, Texte und Rückseite haben keine Bilddateien – in 3D zeichnet sie `src/three/textures.ts` per Canvas 2D als Texturen, ohne WebGL CSS (`components/cards/`, `styles/cards.css`).

**Booster-Pack** (`public/assets/pack/`): Vorlage vom Projektinhaber, `assets-src/pack/pack-front.jpg` (687 × 1024, flache Vorderseite ohne Packform) und `reference.jpg` (gewünschter Look als fertiges Pack). Aufbereitung:

1. **KI-Hochskalierung ×4** mit Real-ESRGAN (`realesrgan-x4plus`, BSD-3-Lizenz) auf der CPU über das Python-Paket `ncnn`; Modell aus dem Release `realesrgan-ncnn-vulkan-20220424-ubuntu.zip` (github.com/xinntao/Real-ESRGAN, Ordner `models/`). Ergebnis 2748 × 4096, deutlich schärfer als klassisches Vergrößern. Das Zwischenbild liegt nicht im Repo.
2. `python3 scripts/pack-texture.py HOCHSKALIERT.png` → `front.webp` (1536 × 2289, Farbe) und `maps.png` (768 × 1144, Materialkarte: R = Relief, G = Rauheit, B = Metall). Metall wird aus der Farbe geschätzt (graue Rahmenflächen, goldene Schrift und Plaketten); Innenfeld und Gemälde bleiben matt.

Nähte, Aufhängeloch, Aufreiß-Kerben und die Rückseite zeichnet `textures.ts` (`drawCrimp`, `drawPackBack`). Ohne WebGL zeigt die CSS-Variante `front.webp` mit gerillten Silbernähten.

**Kartenrahmen und Kartenrückseite (Prototyp, noch nicht im Spiel verwendet)** (`public/assets/card-design/`): Vorlagen vom Projektinhaber in `assets-src/card-design/` (`frame-prototype.jpg`: leerer Rahmen mit Namensleiste, Kreis oben rechts, quadratischem Bildfenster und Textfeld; `card-back.jpg`: Rückseite mit Logo). Wie das Booster-Pack per KI ×4 hochskaliert (Real-ESRGAN x4plus, CPU/ncnn), dann `python3 scripts/card-design.py RAHMEN_X4.png RUECKSEITE_X4.png`: Karte aus dem dunklen Hintergrund ausschneiden (Lage im Original x 25–662, y 29–994), runde Ecken transparent, 1024 × 1550 als WebP → `frame.webp`, `back.webp`. Seitenverhältnis der Vorlagen ≈ 0,66 – etwas schlanker als die bisherigen Karten (63 : 88 ≈ 0,72); beim Einbau Kartenmaße angleichen.

**Kartenillustrationen** (32 Wesen, eigene Zeichnungen): `scripts/card-art.mjs` beschreibt jedes Wesen als Vektorgrafik (Baukasten: Augen, Flammen, Blätter, Blitze, Tropfen, schattierte Flächen) und schreibt `public/assets/cards/<name>.svg` (für die CSS-Karte, scharf in jeder Größe, ~6 KB) und `<name>.webp` (512 px, für die 3D-Textur, ~20 KB). Der Name ist der Kartenname in Kleinbuchstaben mit Bindestrichen (`art` in `cards.ts`). Die Solar-Dragon-Illustration ziert auch das Booster-Pack. Ändern: Zeichnung im Skript anpassen, `node scripts/card-art.mjs --sheet übersicht.png` (Übersichtsbild aller Karten zum Prüfen). Vorher waren es Emojis – die sahen je Gerät anders aus und erschienen auf iOS in der 3D-Textur nur als Silhouette.

## Musik

`public/assets/music/shop-theme.mp3`: Hintergrundmusik in Dauerschleife (4:55 min, MP3 128 kbit/s, ca. 4,7 MB), vom Projektinhaber bereitgestellt. Quelle: `assets-src/music/shop_theme.ogg` (Ogg Vorbis, spielt nicht auf allen iPhones); umgewandelt und leicht leiser gemacht (Original übersteuert) mit:

```
ffmpeg -i assets-src/music/shop_theme.ogg -af volume=0.85 -c:a libmp3lame -b:a 128k public/assets/music/shop-theme.mp3
```

Wird gestreamt und nicht vom Service Worker vorab gecacht (Größe); offline gibt es keine Musik.

## Sounds

Alle Sounds sind **eigene Arbeit**: per Klangsynthese erzeugt (`scripts/sfx/synth.py`, numpy/scipy, MP3 über ffmpeg/libmp3lame). Sie enthalten kein fremdes Audiomaterial und sind damit frei nutzbar, auch kommerziell. Stil: angelehnt an Sammelkarten-Spiele (Pokémon TCG Pocket, Hearthstone, Yu-Gi-Oh!) – gefiltertes Rauschen als „Foley“ für Karten und Folie, Glocken und Glitzer für Rares, Marimba statt Piepser für Bedienelemente. Die ersten Sounds (UI SFX, CC0) klangen nach Spielautomat und wurden ersetzt. 25 Dateien, zusammen ca. 270 KB, in `public/assets/sfx/`.

| Datei | Klang | Einsatz |
|---|---|---|
| `tap.mp3`, `tap-2.mp3` | weiches Holz-„Tock“ (zwei Varianten) | Taps |
| `select.mp3` | Marimba-Ton | Ware auswählen (Regal), Modus wählen |
| `place.mp3`, `place-2.mp3` | Pappe-„Plopp“ | Ware landet |
| `invalid.mp3` | gedämpftes „Bonk-bonk“ abwärts | ungültiger Zug |
| `reveal.mp3` | Papier reißt | Packpapier reißt auf |
| `solved.mp3` | Marimba-Zweiklang + Glocke | Regalfach fertig |
| `ship.mp3` | Klebeband „Zzzip“ + Wusch | Paket verschickt (im Takt der Kettenreaktion) |
| `gold.mp3` | Münzen-Klingeln | Münzen |
| `win.mp3` | Fanfare: Marimba-Arpeggio, Glocken-Akkord, Glitzer | Level/Tag geschafft |
| `lose.mp3` | absteigende weiche Töne | Verloren |
| `booster.mp3` | magisches Aufrauschen + „Ding“ | Power-up benutzt |
| `tab.mp3` | kurzer Holz-Klick | Reiter der Menüleiste, Filter |
| `button.mp3` | zwei Marimba-Töne aufwärts | Play, Übersicht, nächstes Pack |
| `pack-tear.mp3` | Folie knistert und reißt, Glitzer, dumpfer Plopp | Riss ist durch, Streifen fliegt weg |
| `tear-tick.mp3`, `-2`, `-3` | kurzes Folien-Knistern (drei Varianten) | während der Finger das Pack Stück für Stück aufreißt |
| `card-flip.mp3`, `card-flip-2.mp3` | Luft-„Fwip“ + leises Klacken | Karte umdrehen |
| `card-slide.mp3` | Karte gleitet weg | Karte wegwischen |
| `card-rare.mp3` | helles Glocken-Arpeggio mit Glitzer | Rare aufgedeckt |
| `card-holo.mp3` | Aufrauschen, Glitzer-Arpeggio, schimmernder Akkord | Holo Rare aufgedeckt |

Ändern: Klang in `scripts/sfx/synth.py` anpassen und `python3 scripts/sfx/synth.py [name …]` ausführen (braucht numpy, scipy, ffmpeg). Oder eine Datei gleichen Namens ersetzen bzw. den Pfad in `SFX_FILE` (`src/assets.ts`) ändern; mehrere Pfade = Varianten, die zufällig abwechseln. Lautstärken je Sound in `src/audio/player.ts`.

## Zuordnungstabelle

| Alter Dateiname | Neuer Dateiname | Inhalt | Verwendung | Original px | Ziel px |
|---|---|---|---|---|---|
| `Mystery_01_Paperbag.png` | `assets/mystery/paper-wrap.webp` | Packpapier-Paket mit grauem Fragezeichen | Verdecktes Item im Karton | 512×512 | 216×216 |
| `Mystery_01_Paperbag_Gold.png` | `assets/mystery/paper-gold.webp` | Goldenes Paket mit Fragezeichen, Glitzer | Verdecktes Gold-Item (Bonus-Münzen) | 512×512 | 216×216 |
| `Mystery_01_Paperbag_Ripped.png` | `assets/mystery/paper-shreds.webp` | Zerrissenes Packpapier, Fetzen | Reveal-Animation (Papierfetzen) | 512×512 | 216×216 |
| `Background_Box.png` | `assets/board/delivery-box.webp` | Offener Umzugs-/Lieferkarton (komplett) | Hintere Ebene des Lieferkartons | 1024×1024 | 720×573 |
| `Background_Box_Front.png` | `assets/board/delivery-box-front.webp` | Nur Vorderwand + Laschen des Kartons | Vordere Ebene: liegt über den Stapeln, damit die Waren „im“ Karton stehen | 1024×1024 | 720×573 |
| `Background_Box_Alpha.png` | `assets/board/delivery-box-mask.webp` | Schwarze Silhouette des Kartons (Alpha-Maske) | Schlagschatten unter dem Karton | 1024×1024 | 360×287 |
| `Background_Shelf.png` | `assets/board/shelf.webp` | Holzregal mit 4 Böden, Preisschild-Halter | Reserve (derzeit nicht im Spiel, siehe unten) | 474×1024 | 362×564 |
| `Background_Shelf.png` (Ausschnitt) | `assets/board/shelf-slot.webp` | Ein einzelnes Regalfach: Rückwand + Boden mit Preisschild | Hintergrund jedes Regalfachs | 474×1024 | 334×150 |
| `UI_01_Lock.png` | `assets/ui/lock.webp` | Dunkles Vorhängeschloss | Markierung „Fach gelöst/gesperrt“ | 512×512 | 128×128 |
| `UI_02_Coin_Gold.png` | `assets/ui/coin.webp` | Goldmünze mit Stern | Münzzähler im HUD, Belohnungen | 512×512 | 128×128 |
| `UI_03_Star.png` | `assets/ui/star.webp` | Goldener Stern | Sterne-Effekt beim Lösen eines Fachs, Sterne im Win-Screen | 512×512 | 128×128 |
| `UI_04_confetti.png` | `assets/ui/confetti.webp` | Bunte Konfetti-Explosion | Deko im Win-Screen | 512×512 | 384×384 |
| `UI_05_Undo.png` | `assets/ui/booster-undo.webp` | Kachel „UNDO“ mit Pfeil | Booster Rückgängig | 512×512 | 192×192 |
| `UI_06_Extra_Slot.png` | `assets/ui/booster-extra-slot.webp` | Kachel „EXTRA SLOT+“, Schatztruhe mit 3 Fächern | Booster Extra-Platz | 512×512 | 192×192 |
| `UI_07_Xray.png` | `assets/ui/booster-peek.webp` | Kachel „SCAN (X-RAY+)“, Lupe + Röntgenbrille | Booster Peek/Lupe | 512×512 | 192×192 |
| `UI_08_Shuffle.png` | `assets/ui/booster-shuffle.webp` | Kachel „SHUFFLE“, gekreuzte Pfeile | Booster Mischen | 512×512 | 192×192 |
| `UI_09_Panel.png` | `assets/ui/panel.webp` | Goldener Zierrahmen mit Waren und Sternen | Hintergrund von Win- und Lose-Screen | 1024×1024 | 900×771 |
| `Button_01_Square.png` | `assets/ui/button-square-green.webp` | Grüner quadratischer Glanz-Button (leer) | Reserve (eckige Icon-Buttons) | 512×512 | 192×192 |
| `Button_02_Square_Red.png` | `assets/ui/button-square-red.webp` | Roter quadratischer Glanz-Button (leer) | Reserve | 512×512 | 192×192 |
| `Button_03_Wide.png` | `assets/ui/button-wide-green.webp` | Grüner breiter Glanz-Button (leer) | Primär-Button („Weiter“, „Extra-Platz“) | 1024×512 | 600×272 |
| `Button_04_Wide.png` | `assets/ui/button-wide-red.webp` | Roter breiter Glanz-Button (leer) | Sekundär-Button („Nochmal“) | 1024×512 | 600×273 |
| `Button_05_Checkmark.png` | `assets/ui/icon-check.webp` | Weißer Haken mit grüner Kontur | Icon im „Weiter“-Button | 512×512 | 128×128 |
| `Button_06_Cross.png` | `assets/ui/icon-cross.webp` | Weißes Kreuz mit roter Kontur | Icon im Lose-Screen | 512×512 | 128×128 |
| `AppIcon.png` | `assets/icons/apple-touch-icon-180.png` | Goldener Einkaufskorb + Schriftzug „Super Sorter“ auf Blau | iOS-Homescreen-Icon | 1024×1024 | 180×180 |
| `AppIcon.png` | `assets/icons/pwa-192.png` | (s. o.) | Manifest-Icon | 1024×1024 | 192×192 |
| `AppIcon.png` | `assets/icons/pwa-512.png` | (s. o.) | Manifest-Icon, Splash | 1024×1024 | 512×512 |
| `AppIcon.png` | `assets/icons/pwa-maskable-512.png` | (s. o.), mit Safe-Zone-Rand | Manifest-Icon `purpose: maskable` | 1024×1024 | 512×512 |
| `AppIcon.png` | `assets/icons/favicon-64.png` | (s. o.) | Browser-Favicon | 1024×1024 | 64×64 |

### Zustand der Originale (Freistellung)

| Datei | Befund | Behandlung |
|---|---|---|
| `Background_Shelf.png` | **Nicht sauber freigestellt:** halbtransparenter grüner Schleier (Alpha ≈ 13–15, Greenscreen-Rest) um das Regal, unterer Bereich leer. | Script setzt Alpha < 40 auf 0 und schneidet zu. Für `shelf-slot` wird ein Fach aus dem Inneren ausgeschnitten, das davon nicht betroffen ist. Ein sauberes Original wäre trotzdem gut. |
| `AppIcon.png` | RGB ohne Alpha, blauer Hintergrund. | Gewollt: iOS-Icons dürfen keine Transparenz haben. |
| `Background_Box_Alpha.png` | Reine Maske (schwarz), kein sichtbares Motiv. | Wird als weicher Schlagschatten verwendet. |
| alle übrigen | sauber freigestellt (transparenter Hintergrund, weiße Sticker-Kontur). | – |

**Hinweis Auflösung:** Das Regal-Original ist nur 474 px breit; das ausgeschnittene Fach (334×150 px) wird im Spiel auf bis zu ca. 300 CSS-px gestreckt und wirkt auf 3x-Displays leicht weich. Für die finale Version wäre ein eigenes Regalfach-Asset in ≥ 1000 px Breite ideal.

**Hinweis Sprache:** Die Booster-Kacheln enthalten englische Beschriftungen („UNDO“, „EXTRA SLOT+“, „SCAN (X-RAY+)“, „SHUFFLE“), das restliche UI ist deutsch.

## Fehlende Assets / Platzhalter

| Benötigt für | Platzhalter im Prototyp | Wo definiert |
|---|---|---|
| Einkaufswagen (Puffer-Plätze) | 🛒-Emoji als Kopf, CSS-Gitterkorb mit Rädern, Mulden als Plätze | `src/components/Cart.tsx`, `.cart` in `src/styles/game.css` |
| Spielhintergrund (Supermarkt) | CSS-Verlauf mit Fliesenraster (Farben `--c-bg-*`) | `.app` in `src/styles/game.css`, `src/styles/tokens.css` |
| Regalrahmen | CSS (dunkles Holz, Schatten), die Fächer selbst nutzen `shelf-slot.webp` | `.shelf` in `src/styles/game.css` |
| Restart-Icon (HUD) | Inline-SVG (Lucide „rotate-ccw“) | `src/components/icons.tsx` |
| Geschlossenes Regalfach | CSS-Holzabdeckung mit Schild „Geschlossen“ | `src/components/ShelfSlot.tsx`, `.slot-cover` |
| Auswahl-, Fach- und Gold-Glow | CSS (vorgerenderte Verläufe/Schatten, nur `opacity` animiert) | `src/styles/game.css` |
| Papierfetzen beim Aufreißen | 4 Ausschnitte der jeweiligen Verpackung (`paper-wrap`/`paper-gold`) per `clip-path`, dazu `paper-shreds.webp` als Burst | `src/components/Item.tsx` |
| Kategorie-Hinweis auf verpackten Items (`hintMode`) | Emoji (🥤 🍿 🍎 🥖 🧀) | `CATEGORY_ICON` in `src/assets.ts` |
| Statusleisten-Hintergrund (iOS) | CSS-Band in Theme-Farbe | `.app::before` in `src/styles/game.css` |
| Booster-Zähler-Badge | CSS | `src/components/BoosterBar.tsx`, `src/styles/screens.css` |
| Hinweistexte, Debug-Panel | HTML/CSS | `src/styles/screens.css` |
| Sound-Effekte | per Klangsynthese erzeugt (eigene Arbeit) | `scripts/sfx/synth.py` → `public/assets/sfx/` |
| iOS-Splash-Screens | keine (iOS zeigt kurz die Hintergrundfarbe) | – |

### Derzeit ungenutzte Assets (Reserve)

| Datei | Mögliche Verwendung |
|---|---|
| `board/shelf.webp` | Deko, Level-Auswahl, Ladebildschirm |
| `ui/button-square-green.webp`, `ui/button-square-red.webp` | eckige Icon-Buttons (z. B. Einstellungen, Pause) |
