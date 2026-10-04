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

## Zuordnungstabelle

| Alter Dateiname | Neuer Dateiname | Inhalt | Verwendung | Original px | Ziel px |
|---|---|---|---|---|---|
| `Item_01_Cola_Red.png` | `assets/items/cola-can.webp` | Rote Cola-Dose „COLA“ | Ware `cola` | 512×512 | 216×216 |
| `Item_02_Energy_Green.png` | `assets/items/green-can.webp` | Grüne Energy-Drink-Dose „ENERGY“ | Ware `green-can` | 512×512 | 216×216 |
| `Item_03_Orange_Juice.png` | `assets/items/orange-juice.webp` | Orangensaft-Tetrapak mit Strohhalm | Ware `orange-juice` | 512×512 | 216×216 |
| `Item_04_Chips_Blue.png` | `assets/items/chips.webp` | Blaue Chipstüte „CRISPS“ | Ware `chips` | 512×512 | 216×216 |
| `Item_05_Apple.png` | `assets/items/apple.webp` | Roter Apfel mit Blatt | Ware `apple` | 512×512 | 216×216 |
| `Item_06_Bread.png` | `assets/items/bread.webp` | Baguette/Brotlaib | Ware `bread` | 512×512 | 216×216 |
| `Item_07_Cheese.png` | `assets/items/cheese.webp` | Käsestück mit Löchern | Ware `cheese` | 512×512 | 216×216 |
| `Item_08_Milk.png` | `assets/items/milk.webp` | Milchflasche „MILK“ | Ware `milk` | 512×512 | 216×216 |
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
| Sound-Effekte | leere Funktionen (Schnittstelle) | `src/audio/sfx.ts` |
| iOS-Splash-Screens | keine (iOS zeigt kurz die Hintergrundfarbe) | – |

### Derzeit ungenutzte Assets (Reserve)

| Datei | Mögliche Verwendung |
|---|---|
| `board/shelf.webp` | Deko, Level-Auswahl, Ladebildschirm |
| `ui/button-square-green.webp`, `ui/button-square-red.webp` | eckige Icon-Buttons (z. B. Einstellungen, Pause) |
