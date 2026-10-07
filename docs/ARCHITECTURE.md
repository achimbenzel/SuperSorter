# Architektur

## Überblick

Strikte Trennung zwischen **Spiellogik** (reines TypeScript, ohne DOM/React) und **UI** (React-Komponenten, CSS-Animationen).

Es gibt **zwei Spielmodi** mit eigener Logik, die sich Assets, Komponenten, Animationen, Booster und Münzen teilen:

| | Regal-Modus (Wareneingang) | Packband-Modus (Versand) |
|---|---|---|
| Logik | `src/game/*.ts` | `src/game/pack/*.ts` |
| Bildschirm | `src/modes/ShelfGame.tsx` | `src/modes/PackGame.tsx` |
| Hook | `src/hooks/useGame.ts` | `src/hooks/usePackGame.ts` |
| Spielfeld | `components/Board.tsx` (+ Shelf, ShelfSlot, Cart) | `components/pack/PackBoard.tsx` (+ PackBox, plan, timeline) |
| Design | [GAME_DESIGN.md](GAME_DESIGN.md) | [PACK_MODE.md](PACK_MODE.md) |

Gemeinsam: Karton-Regeln (`src/game/sources.ts`: Multi-Move, Mystery-Reveal, Lupe), `random.ts`, `items.ts`, Komponenten `DeliveryBox`, `Stack`, `Item`, `HUD`, `BoosterBar`, `WinScreen`, `LoseScreen`, `DebugPanel`, Hooks `useFlip`, `useFxAnimations`. `App.tsx` zeigt zuerst das Hauptmenü (`components/home/HomeScreen.tsx`) und nach „Play“ den gewählten Modus; das Menü-Symbol im Spiel führt zurück. Der Modus ist unter `super-sorter/mode/v1` gespeichert (Werte `pack` | `shelf`; Unbekanntes wie das alte `shop` wird zu `pack`).

**Spielstand** (`hooks/progress.ts`, Schlüssel `super-sorter/progress/v1`): `level`/`highest` (Regal), `packDay`/`packHighest` (Packband), `coins` (gemeinsame Geldbörse). Es ist immer nur ein Modus gemountet, der den Stand schreibt.

```
src/
├─ game/            ← reine Logik, vollständig per Vitest getestet, kennt kein React/DOM
│  ├─ items.ts        Warenkatalog (IDs, Kategorien, Namen) – ohne Bildpfade
│  ├─ types.ts        Zustandsmodell (Board, Item, Slot, GameState, LevelConfig, FxEvent)
│  ├─ random.ts       deterministischer PRNG (Mulberry32) + Seed-Hashing
│  ├─ rules.ts        Spielregeln: Platzieren, Multi-Move, Reveal, Sieg/Deadlock/Sackgasse
│  ├─ solver.ts       DFS-Solver mit Zustands-Hashing (Lösbarkeit, Hinweise)
│  ├─ generator.ts    seed-basierter Level-Generator + Schwierigkeitsschätzung + Mischen
│  ├─ levels.ts       Progressionstabelle (20 Level + Endlos), Münzwerte, Tipps
│  ├─ reducer.ts      gameReducer: Taps/Booster → neuer GameState
│  └─ *.test.ts       Unit-Tests
├─ hooks/           ← Brücke Logik ↔ React
│  ├─ useGame.ts      useReducer + Level laden + Persistenz + Sound-Hooks + Lupen-Timer
│  ├─ usePersistedState.ts  localStorage mit Fehlertoleranz
│  ├─ useFlip.ts      Flug-Animation von Items zwischen Containern (FLIP)
│  ├─ useFxAnimations.ts    Shake, Münzflug (Web Animations API)
│  └─ useDelayedFlag.ts     End-Screens erst nach den Animationen zeigen
├─ components/      ← "dumme" Darstellung, bekommen state + dispatch
├─ audio/           ← sfx.ts (Sound-Schnittstelle), player.ts (Web Audio, an/aus)
├─ styles/          ← tokens.css (Farben/Maße), global.css (iOS), game.css, screens.css
├─ assets.ts        ← einzige Stelle mit Bildpfaden
├─ imageLoader.ts   ← Bilder vorladen, dekodieren, festhalten; Ladefehler wiederholen
├─ levelStore.ts    ← Level-Cache beider Modi; nächstes Level per Web Worker (levelWorker.ts)
├─ config.ts        ← UI-Zeiten, Storage-Key, Debug-Flag
├─ iosGuards.ts     ← Pinch/Bounce/Long-Press-Schutz
├─ App.tsx / main.tsx
```

Abhängigkeitsrichtung: `components → hooks → game`. `game/` importiert nie aus UI-Ordnern.

## Datenfluss

```
 Tap auf Stapel/Fach/Wagen/Booster
            │
            ▼
   dispatch(GameAction)  ── useGame: Sound-Hook (sfx.playTap …)
            │
            ▼
   gameReducer(state, action)          (rein, deterministisch)
     ├─ rules.moveCount / applyMove     neues Board (immutable)
     ├─ history.push(altes Board)       → Undo
     ├─ evaluateStatus(board)           playing | won | lost(deadlock|hopeless)
     └─ fx: [{kind:'invalid'|'gold'|'solved'|'opened'|'revealed'|…, seq}]
            │
            ▼
   React rendert neuen State
     ├─ useFlip           misst Item-Positionen → Bogenflug per transform
     ├─ useFxAnimations   spielt neue fx-Events ab (Shake, Münzflug)
     ├─ CSS-Klassen        Reveal (Item), Lock/Glow (Slot), Abdeckung (geschlossen)
     └─ useGame-Effekte   Sieg → Münzen + nächstes Level in localStorage
```

## Zustandsmodell

```ts
Item      { id, type, hidden, gold }          // id stabil im Level → Animationen
Slot      { capacity, items[], closed }       // gelöst = voll & sortenrein (abgeleitet)
Board     { stacks: Item[][], cart: (Item|null)[], slots: Slot[] }
GameState { config, initialBoard, board, history[], selection, boosters,
            boostersUsed, levelCoins, moves, status, loseReason,
            peekArmed, peekItemId, shuffleCount, fx[], fxSeq }
```

- **Immutable:** Jeder Zug erzeugt ein neues `Board`; unveränderte Teile werden geteilt. Undo ist ein `pop()` aus `history`.
- **Abgeleitete Werte** (gelöst, gültige Ziele, Sieg) werden nie gespeichert, sondern berechnet → keine Inkonsistenzen.
- **FX-Events** sind kurzlebig: Jede Aktion ersetzt `fx`, `fxSeq` zählt hoch. Die UI merkt sich die letzte verarbeitete `seq`.
- **Booster-Zähler** liegen außerhalb der History (Undo gibt keine Booster zurück).

## Regeln (`rules.ts`)

Alle Funktionen sind rein. Die zentralen:

| Funktion | Zweck |
|---|---|
| `pickableItems(board, from)` | Was würde mitgenommen? (Multi-Move: gleiche, sichtbare Items von oben) |
| `moveCount(board, move)` | Wie viele Items bewegt der Zug? 0 = ungültig |
| `applyMove(board, move)` | Neues Board + Infos (aufgedeckt, gelöst, geöffnet, Gold) |
| `listMoves` / `hasAnyMove` | alle gültigen Züge / Deadlock-Erkennung |
| `findHopelessType` | Sorte in mehr Fächern als sie füllen kann → Sieg unmöglich |
| `isWon` | Karton + Wagen leer, alle belegten Fächer gelöst |

## Solver (`solver.ts`)

Tiefensuche mit Gedächtnis („dieser Zustand ist schon gescheitert“). Die Suche ist vollständig: Weil jeder Zug ein Item endgültig weiterbewegt (Karton → Wagen → Fach), gibt es keine Zyklen, und die Tiefe ist durch 2 × Itemzahl begrenzt. Ein Tiefenlimit und ein Knotenbudget sind als Sicherheitsnetz vorhanden; ist das Budget erschöpft, liefert der Solver `null` statt `false`.

Er arbeitet auf einer kompakten Zahlen-Darstellung (Stapelhöhen statt Item-Listen) und nutzt drei Optimierungen:

1. **Kanonischer Schlüssel:** Welches leere Fach bzw. welcher Wagenplatz benutzt wird, ist egal. Wagen und angefangene Fächer werden sortiert gehasht.
2. **Sichere Züge:** Muss eine Sorte nur noch *ein* Fach füllen und ist es angefangen, wird ohne Verzweigung dorthin gelegt. (Bei doppelten Sorten gilt das nicht. Das hat der Referenz-Test aufgedeckt, siehe unten.)
3. **Pruning:** Züge, die eine Sorte auf zu viele Fächer verteilen, werden gar nicht erst betreten.

**Verifikation:** `solver.test.ts` vergleicht den Solver auf 600 zufälligen kleinen Boards mit einem absichtlich naiven Brute-Force-Solver, der alle Züge der echten Regeln durchprobiert. Jede Lösung wird außerdem mit `rules.applyMove` nachgespielt (`replayWins`).

Typische Laufzeit: < 1 ms, wenige Dutzend Knoten pro Level.

## Generator

Pipeline pro Level (`generateLevel(config)`):

1. `seed = hash(SEED_SALT, levelNummer)` → deterministisch, gleiche Nummer = gleiches Level auf jedem Gerät.
2. Kandidat würfeln (`buildCandidate`): Sorten wählen, Items mischen, auf Stapel verteilen (gleichmäßig ± leichte Varianz, max. 7 hoch), Mystery-/Gold-Verpackung vergeben, Fächer anlegen (die ersten `openSlots` offen).
3. **Solver prüfen** – unlösbare Kandidaten werden verworfen.
4. **Schwierigkeit schätzen** (`estimateWinRate`): 48 simulierte Spiele mit einer plausiblen, aber unwissenden Strategie (füllt angefangene Fächer, startet sonst zu 70 % ein neues Fach, zu 30 % parkt sie im Wagen, verteilt nie absichtlich eine Sorte auf zwei Fächer). Die Gewinnquote muss im Zielbereich `targetWinRate` der Config liegen.
5. Erster Kandidat im Zielbereich gewinnt; sonst nach 60 Versuchen der nächstbeste lösbare. Rückfallebene (praktisch nie nötig): alle Fächer offen → garantiert lösbar.

Laufzeit: 2–25 ms pro Level (Node), Packband-Tage bis ca. 60 ms. In der App cacht `levelStore.ts` die Level pro Sitzung. Das aktuelle Level wird bei Bedarf sofort erzeugt, das nächste rechnet ein **Web Worker** (`levelWorker.ts`) im Hintergrund vor – vorher lief das im Haupt-Thread und war auf dem Handy als Ruckler kurz nach Levelstart spürbar. Ohne Worker-Unterstützung fällt der Store auf den Haupt-Thread zurück. Weil die Generierung deterministisch ist, liefern Worker und Haupt-Thread dasselbe Level.

**Seeds ändern:** `SEED_SALT` in `generator.ts` anpassen → alle Level werden neu gewürfelt (Tests prüfen weiterhin Lösbarkeit).

## Packband-Modus (`src/game/pack/`)

| Datei | Inhalt |
|---|---|
| `types.ts` | `PackBox` (Kunde + konkrete Waren), `PackSpot` (Paket am Packplatz + gefüllte Positionen), `PackBoard` (Kisten, Packtisch = `cart`, Packplätze, Band-Warteschlange), `PackFx` |
| `rules.ts` | `routeOf` (erstes Paket, das die Ware braucht, sonst erster freier Packtisch-Platz), `applyTap` → Ware nehmen (Reveal über `sources.ts`), ablegen, dann `settle`: volle Pakete verschicken, nächstes Paket an denselben Platz, Packtisch-Waren nachfüttern – bis sich nichts mehr ändert. Liefert `shipped[]` (mit `chain`) und `fed[]` für die Animation |
| `solver.ts` | DFS mit Gedächtnis direkt auf den echten Regeln (≤ 4 Verzweigungen pro Zug, Taps direkt ins Paket zuerst). Schlüssel: Kistenhöhen, sortierte Packtisch-Waren, Paket-IDs + Füllmaske, Länge der Warteschlange |
| `generator.ts` | Sortiment wählen → Sammel-/gemischte Pakete mit Kunden würfeln → Waren = alle Paketinhalte, gemischt auf die Kisten → Mystery/Gold → Band-Reihenfolge mischen. Solver + Simulation wie im Regal; `shufflePackBox` |
| `levels.ts` | 20 Tage + Endlos, Münzwerte (Paket, Kombo, Gold, Tag), Einführungstexte |
| `customers.ts` | Geschäftskunden (Sammelpakete) und Privatkunden (gemischt) mit Emoji-Avatar |
| `reducer.ts` | `TAP_STACK` ist ein kompletter Zug; Booster wie im Regal (Extra-Platz bleibt nach Rückgängig erhalten) |

**Verifikation:** `pack/solver.test.ts` gleicht den Solver auf 300 Zufallsboards mit einer erschöpfenden Suche ohne Gedächtnis ab; jede Lösung wird mit `applyTap` nachgespielt.

**Kettenreaktion in der UI:** Der Reducer wertet den ganzen Zug sofort aus – das Board zeigt danach schon das *letzte* Paket. `components/pack/plan.ts` leitet aus den FX-Events einen Animationsplan ab (welche Ware/welches Paket wann startet; Zeitplan in `timeline.ts`, CSS nutzt dieselben Abstände):

- Verschickte Pakete (auch Zwischenpakete, die nie im Board-State stehen) bleiben als „Geister“ (`useShipGhosts`) über dem Packplatz: Klappen, Klebeband, Häkchen, Abflug ab `closeAt(chain)`.
- Pakete fahren per FLIP von ihrer Band-Karte heran (`data-flip-kind="box"`: gleichmäßig skaliert, eingeblendet). Die Karte bleibt bis zur Abfahrt auf dem Band stehen.
- Nachgefütterte Waren fliegen mit `data-flip-delay` vom Packtisch los; bis dahin hält die Animation sie (`fill: backwards`) sichtbar an ihrem alten Platz. Deshalb liegen Karton und Waren in getrennten Ebenen (`.pk-shell` / `.pk-contents`): Die Karton-Ebene darf sich bewegen, ohne die wartenden Waren mitzunehmen.
- Der Plan gilt nur für genau das Board, das mit den Events entstanden ist (Rückgängig/Extra-Platz bewegen sofort).
- `useFlip` läuft in `PackBoard`, weil Geister und abfahrende Karten State dieser Komponente sind – nur so werden auch diese Renders animiert.
- Tippt der Spieler während einer Kette, spult `finishAnimations` alle laufenden Animationen ans Ende.

## Animationen

Regel: nur `transform` und `opacity` animieren (GPU, 60 fps).

| Effekt | Technik |
|---|---|
| Item fliegt Stapel → Fach | `useFlip`: Position vor/nach dem Render vergleichen, Bogen per Web Animations API am inneren `.flip`-Element |
| Auswahl anheben / Glow | CSS-Transition `transform`, Glow = vorgerenderter Radialverlauf, `opacity` pulsiert |
| Ungültiges Ziel | `useFxAnimations`: Shake-Keyframes per WAAPI |
| Papier reißt auf | `Item.tsx` erkennt `hidden: true → false`, rendert Papier-Ebene + 4 Fetzen (clip-path) mit CSS-Keyframes |
| Fach gelöst | CSS: Glow-Ebene (opacity), Lichtschimmer (translate), Stern-Partikel, Schloss-Pop; startet nach `--t-hop` |
| Fach öffnet sich | Abdeckung klappt weg (Transition) |
| Münzflug | temporäre `<img>`-Elemente, WAAPI, danach entfernt |
| Packband: Paket verschicken, Kette, Kombo | Geister-Ebene + CSS-Keyframes relativ zu `--close`, verzögerte FLIPs, „Kombo ×n“ per `useFxAnimations` (siehe Packband-Abschnitt) |
| Konfetti | `canvas-confetti` (respektiert `prefers-reduced-motion`) |

Alle Zeiten stehen in `src/config.ts` (`TIMING`) und werden als CSS-Variablen `--t-*` gespiegelt.

## Sammelkarten und Booster-Packs (`src/game/cards/`)

| Datei | Inhalt |
|---|---|
| `cards.ts` | „Base Set“: 32 Karten, 4 Elemente (Fire, Water, Leaf, Bolt) × (4 Common, 2 Uncommon, 1 Rare, 1 Holo Rare). Illustration vorerst Emoji |
| `packs.ts` | `openCardPack(rng)`: 3 verschiedene Commons, 1 Uncommon, Rare-Platz (25 % Holo Rare) zuletzt. `PACK_PRICE` (0 = zum Testen kostenlos). `addPack`: Sammlung zählen, neue Karten erkennen |

Die Sammlung liegt unter `super-sorter/collection/v1` (`hooks/useCollection.ts`): Anzahl je Karte, geöffnete Packs, noch ungesehene neue Karten (Zahl am Collection-Reiter). Ein Pack wird schon beim Aufreißen gespeichert – wer mitten im Aufdecken wechselt, verliert nichts.

UI: `components/cards/TcgCard.tsx` zeichnet die Karte komplett in CSS, alle Maße in `cqw` (Prozent der Kartenbreite) – dieselbe Komponente ist Mini-Vorschau im Album, in der Übersicht nach dem Öffnen und Fallback ohne WebGL. Holo in CSS: Regenbogenstreifen (`mix-blend-mode: color-dodge`) und Funkeln über dem Bild, wandernder Glanz über der Karte.

### Packs und Großansicht in 3D (`src/three/`, three.js)

Pack öffnen und die Großansicht einer Karte laufen mit **three.js** (wie in Pokémon TCG Pocket). three.js wird erst nachgeladen, wenn die Packs-Seite oder die Sammlung aufgeht (`React.lazy`, eigener Chunk ~150 kB gzip; der Service Worker cacht ihn). Ohne WebGL (`three/support.ts`, prüft ohne three.js zu laden) oder wenn der Renderer nicht startet, zeigen `PacksPage` bzw. `CollectionPage` die CSS-Variante.

| Datei | Inhalt |
|---|---|
| `stage.ts` | Basis: Renderer (Pixeldichte ≤ 2), Kamera, Umgebungslicht (`RoomEnvironment`), Render-Schleife (pausiert bei verdeckter Seite / `setPaused`), Tween-Engine an einer eigenen Spielzeit (Ruckler werden gekappt statt übersprungen; in der Entwicklung `window.__ss3dTimeScale` = Zeitlupe), `project()` Welt → Pixel |
| `textures.ts` | Canvas-2D-Zeichnungen: Kartenvorder-/-rückseite (gleiches Design wie die CSS-Karte), Packfolie, Zick-Zack-Naht, Glühen |
| `holoMaterial.ts` | Shader der Kartenflächen: Glanzstreifen (Rare in Gold), bei Holo Regenbogenfolie (Farbe hängt von Position **und** Kippwinkel ab, Overlay-Mischung → Motiv bleibt erkennbar) und Glitzerpunkte; im Bildfenster stark, sonst schwach |
| `meshes.ts` | Karte = Vorder- und Rückseite als eigene Flächen + Kante (keine `backface-visibility`-Tricks → keine durchscheinende Rückseite wie in CSS auf iOS). `setOnTop`: oberste Karte ohne Tiefentest zeichnen, damit sie beim Kippen nicht in den Stapel schneidet. Pack = gewölbte Folie (`MeshPhysicalMaterial` mit Iridescence) + Nähte |
| `PackOpening.ts` | Ablauf und Gesten: Pack schwebt (ziehen = kippen) → über die obere Naht wischen (oder „Open pack“) → Naht fliegt weg, Karten steigen verdeckt heraus, Pack fällt → Stapel → Karte antippen = umdrehen, ziehen = kippen, antippen/wischen = nächste. Die Rare liegt zuletzt und glüht vorher. Kamera so, dass Pack/Karte zwischen die React-Overlays passt (`PACK_PAD`, `CARDS_PAD`). Meldet alles über Events (`requestCards`, `onHint`, `onTearLine`, `onCardShown`, …) |
| `CardViewer.ts` | Großansicht: frei drehen und kippen, mit Schwung loslassen → rastet auf Vorder- oder Rückseite ein; antippen = Drehung, daneben tippen = schließen |

React-Seite: `components/three/Packs3D.tsx` (Wisch-Hinweis an der Naht, Zähler, Banner, „NEW“, Strahlen hinter der durchsichtigen Zeichenfläche, Konfetti, Übersicht) und `CardViewer3D.tsx` (Portal über allem). Ein Pack wird beim Aufreißen gezogen und gespeichert (`requestCards`). Gemeinsame Teile beider Varianten in `components/home/packsShared.tsx`.

## Sound (`src/audio/`)

`sfx.ts` ist die Schnittstelle (`playSfx(name)` und Kurzformen), `player.ts` die Wiedergabe per Web Audio: Dateien werden beim Start geladen, beim ersten Tap dekodiert (iOS erlaubt Audio erst nach einer Geste), jeder Tap weckt den AudioContext wieder auf. Lautstärke je Sound, gleicher Sound höchstens alle 45 ms; hat ein Sound mehrere Dateien (`SFX_FILE`), wird zufällig variiert. Die Sounds selbst erzeugt `scripts/sfx/synth.py` (siehe docs/ASSETS.md). An/Aus unter `super-sorter/sound/v1` (Schalter oben links im Hauptmenü). iOS: Web Audio folgt dem Lautlos-Schalter.

## Hauptmenü und Menüleiste

`components/home/TabBar.tsx` setzt die Vektor-Vorlage (1.svg–5.svg im `main`-Branch, 1170 × 265 px = 390 pt bei 3x) maßstabsgetreu um: Alle Maße sind Anteile der Breite (Container-Query-Einheit `cqw`), die Leiste skaliert also mit dem Gerät. Die Icon-Mitten (129/351/585/819/1041 px) und die Reiter-Positionen (0/222/456/690/912 px) stehen als Konstanten in der Datei.

- Alle fünf Icons stehen immer an ihrem Platz (gelber Punkt der Vorlage); inaktiv `scale(0.62)`, aktiv `scale(1)` mit Überschwing-Kurve.
- Der aktive Reiter ist ein einzelnes Element, das per `transform: translateX` mit Überschwingen gleitet. Ein innerer Teil wird pro Wechsel neu gemountet (`key`) und spielt eine Stauch-und-Streck-Animation („aufploppen“).
- Leiste und Reiter laufen unter dem Home-Indikator weiter (`env(safe-area-inset-bottom)`).
- Der Play-Knopf ist immer gerendert und wird nur ein-/ausgeblendet (Platz bleibt, nichts springt).

Neuen Reiter mit Inhalt füllen: Eintrag in `TABS` (`HomeScreen.tsx`) behalten, statt des Platzhalters eine eigene Seite rendern. Echte Icons: Lucide-Icon in `TABS` austauschen.

## Performance und Bilder (Handy)

Gemessen mit Playwright und 4-fach gedrosselter CPU über 8 Packband-Tage:

- **Kein Generator im Haupt-Thread während des Spiels** (Web Worker, s. o.). Längster Timer-Task vorher 222 ms, jetzt < 2 ms.
- **Keine Dauer-GPU-Ebene pro Ware:** `.flip` hat bewusst kein `will-change`. Eine Ebene pro Ware kostet auf iOS viel Grafikspeicher; unter Speicherdruck zeichnet Safari dann Bilder nicht mehr. Während einer Animation legt der Browser die Ebene selbst an.
- **Aufgedeckte Waren räumen auf:** Papier und Fetzen der Reveal-Animation werden danach entfernt.
- **Bilder** (`imageLoader.ts`): Alle Spielbilder werden beim Start geladen, dekodiert und für die Sitzung festgehalten (der Browser darf sie so nicht verwerfen und später neu laden). Scheitert ein `<img>` trotzdem, wird es bis zu dreimal mit Pause neu angefordert.
- **Dev-Server:** Vite schickt `public/` im Dev-Modus mit `no-cache`; das Plugin `devAssetCache` in `vite.config.ts` erlaubt für `/assets/` eine Stunde Caching, damit das Handy Bilder nicht ständig neu über WLAN anfragt. Zum Beurteilen von Tempo trotzdem immer den Production-Build nehmen (`npm run phone`): React im Dev-Modus ist um ein Vielfaches langsamer.

## Layout und Skalierung

Alles hängt an `--item` (Kantenlänge einer Ware), berechnet aus Viewport-Breite und *nutzbarer* Höhe (ohne Safe Areas): `clamp(44px, min(15.5vw, 7.1 % der nutzbaren Höhe), 72px)`. Das Regal verkleinert `--item` lokal, wenn zwei Fächer mit Kapazität 4 sonst nicht nebeneinanderpassen. Der Karton nutzt Container-Query-Einheiten (`cqw`), damit die Stapel immer im Karton stehen.

Getestet (per Playwright, mit simulierten Safe Areas): iPhone SE (375×667), iPhone 13/14 (390×844), Pro Max (430×932). Mindestanforderung: iOS 16 (Container Queries, `dvh`).

**Homescreen-App randlos:** Die Statusleiste ist `black-translucent` (transparent, weiße Schrift), die App reicht bis an die Oberkante. Zwei Details dazu:

- *Höhe:* iOS meldet in diesem Modus als Viewport-Höhe den Bildschirm minus Statusleiste, zeichnet aber ab der Oberkante – unten blieb ein Streifen frei. `src/viewport.ts` setzt `--app-h` (genutzt von `html`, `body`, `#root`, `--usable-h`): immer die größere von `innerHeight`/`clientHeight`; fehlt dann bis zur Bildschirmhöhe noch etwa die Statusleisten-Höhe und läuft die App als Homescreen-App (`navigator.standalone`, `display-mode`) **oder** entspricht die Lücke genau der oberen Safe Area, die volle Bildschirmhöhe. Die erste Version prüfte nur `navigator.standalone` – das setzte iOS auf dem Testgerät offenbar nicht. Als Homescreen-App zählt zusätzlich `100lvh` als Kandidat. Bleibt der Streifen trotzdem, ist er vermutlich gar nicht Teil der Web-Ansicht (iOS macht sie selbst kürzer und füllt den Rest mit der Seitenfarbe): Deshalb setzt `setBottomColor()` die Seitenfarbe (`--page-bg` auf `html`/`body`) auf die Farbe des untersten Elements – im Menü das Blau der Menüleiste, im Spiel der Boden. Diagnose: auf „Home“ fünfmal auf den Titel tippen (Build-Zeit, display-mode, alle gemeldeten Höhen inkl. vh/lvh/svh/dvh, Safe Areas).
- *Lesbarkeit oben:* Statt eines abgetrennten Bandes läuft der Hintergrund hinter der Statusleiste in einem weichen Verlauf ins Blaue (`.app::before`, hinter dem Inhalt, ohne Kante/Schatten). Die Menüleiste unten reicht bis unter den Home-Indikator.

## PWA und Deployment

- `vite-plugin-pwa` erzeugt Manifest und Service Worker (Workbox, `generateSW`). Alle Assets werden vorab gecacht → offline spielbar.
- Registrierung in `main.tsx` (`virtual:pwa-register`, nur im Production-Build). `registerType: autoUpdate`: neue Versionen werden im Hintergrund geladen und aktivieren sich automatisch.
- **Basis-Pfad:** GitHub Pages hostet unter `/<repo>/`. `vite.config.ts` liest `BASE_PATH` (setzt der Workflow aus `actions/configure-pages`); Standard für Build/Preview ist `/SuperSorter/`, für den Dev-Server `/`. Manifest-`start_url`/`scope`/`id`, Service-Worker-Scope und `assets.ts` (über `import.meta.env.BASE_URL`) folgen automatisch.
- `.github/workflows/deploy.yml`: Node LTS → `npm ci` → `npm test` → `npm run build` → Upload von `dist/` → Deploy.

## Tests

`npm test` (Vitest, Node-Umgebung, ca. 2 s, 124 Tests):

| Datei | Inhalt |
|---|---|
| `rules.test.ts` | Platzierungsregeln, Multi-Move, Reveal, Gold, gelöste/geschlossene Fächer, Sieg, Deadlock, Sackgasse |
| `solver.test.ts` | einfache/unlösbare Boards, Multi-Move vs. verdeckt, Regressionstest doppelte Sorten, **Abgleich mit Brute-Force auf 600 Zufallsboards** |
| `reducer.test.ts` | Tap-Steuerung, Auswahlwechsel, Shake-Event, Wagen, Sieg/Niederlage, Undo (mehrstufig, Gold), Extra-Platz, Lupe, Mischen, komplettes Level über den Reducer |
| `generator.test.ts` | Progression (Mystery ab 4, Gold ab 10, Belohnungslevel), Determinismus, **Level 1–30 lösbar** und konfigurationstreu, Generierungszeit |
| `pack/rules.test.ts` | Routing (Paket/Packtisch/ungültig), zwei Packplätze, gemischte Pakete, Reveal, Versand + Nachrücken, Nachfüttern, Kettenreaktion über 3 Pakete, Gold per Kette, Sieg, Niederlage |
| `pack/solver.test.ts` | einfache/unlösbare Boards, Hinweis, **Abgleich mit erschöpfender Suche auf 300 Zufallsboards** |
| `pack/reducer.test.ts` | Tap, ungültiger Tap, Versand/Kette/Kombo/Münzen, Gold, Niederlage, Rückgängig, Extra-Platz, Lupe, Mischen, Booster kaufen, kompletter Tag |
| `pack/generator.test.ts` | Progression (Mystery ab 4, 2 Packplätze ab 6, gemischt ab 8, Gold ab 10), Determinismus, **Tage 1–30 lösbar**, Waren = Paketinhalte, Generierungszeit, Mischen |

## Erweitern – Kochrezepte

**Neue Ware:** Bild nach `assets-src/`, Zeile in `scripts/asset-map.mjs`, `npm run assets:optimize`, ID in `ITEM_TYPES`/`ITEM_CATEGORY`/`ITEM_LABEL` (`src/game/items.ts`), Pfad in `ITEM_IMAGE` (`src/assets.ts`). Der Generator nutzt sie automatisch.

**Level anpassen/hinzufügen:** Zeile in `TABLE` (`src/game/levels.ts`) ändern oder anhängen → `npm run levels:report` zeigt Gewinnquote und ob der Zielbereich getroffen wird → `npm test`.

**Neuer Booster:** Zähler in `BoosterCounts` (`types.ts`) und `DEFAULT_BOOSTERS` (`levels.ts`), Aktion im `gameReducer`, Eintrag in `BOOSTERS` (`components/BoosterBar.tsx`) und Bild in `BOOSTER_IMAGE` (`assets.ts`), Test in `reducer.test.ts`.

**Neuer Sound:** Namen in `SfxName` (`audio/sfx.ts`) ergänzen, Datei nach `public/assets/sfx/`, Pfad in `SFX_FILE` (`assets.ts`), abspielen mit `playSfx('name')`. Lizenz in docs/ASSETS.md eintragen.

**Neue Regel:** zuerst in `rules.ts` (+ Test), dann die kompakte Spiegelung in `solver.ts → apply/candidateMoves` nachziehen. Der Brute-Force-Abgleich in `solver.test.ts` deckt Abweichungen zwischen beiden auf.
