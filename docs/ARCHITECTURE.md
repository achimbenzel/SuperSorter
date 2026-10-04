# Architektur

## Überblick

Strikte Trennung zwischen **Spiellogik** (reines TypeScript, ohne DOM/React) und **UI** (React-Komponenten, CSS-Animationen).

Es gibt **zwei Spielmodi** mit eigener Logik, die sich Assets, Komponenten, Animationen, Booster und Münzen teilen:

| | Regal-Modus | Onlineshop-Modus |
|---|---|---|
| Logik | `src/game/*.ts` | `src/game/shop/*.ts` |
| Bildschirm | `src/modes/ShelfGame.tsx` | `src/modes/ShopGame.tsx` |
| Hook | `src/hooks/useGame.ts` | `src/hooks/useShopGame.ts` |
| Spielfeld | `components/Board.tsx` (+ Shelf, ShelfSlot) | `components/shop/ShopBoard.tsx` (+ PackingStation, OrderRail) |
| Design | [GAME_DESIGN.md](GAME_DESIGN.md) | [SHOP_MODE.md](SHOP_MODE.md) |

Gemeinsam: Karton-/Ablage-Regeln (`src/game/sources.ts`: Multi-Move, Mystery-Reveal), `random.ts`, `items.ts`, Komponenten `DeliveryBox`, `Stack`, `Item`, `Cart`, `HUD`, `BoosterBar`, `WinScreen`, `LoseScreen`, `DebugPanel`, Hooks `useFlip`, `useFxAnimations`. `App.tsx` wählt nur den Modus (gespeichert unter `super-sorter/mode/v1`) und zeigt das Modus-Menü.

**Spielstand** (`hooks/progress.ts`, Schlüssel `super-sorter/progress/v1`): `level`/`highest` (Regal), `shopDay`/`shopHighest` (Onlineshop), `coins` (gemeinsame Geldbörse). Es ist immer nur ein Modus gemountet, der den Stand schreibt.

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
│  ├─ useGame.ts      useReducer + Level-Cache + Persistenz + Sound-Hooks + Lupen-Timer
│  ├─ usePersistedState.ts  localStorage mit Fehlertoleranz
│  ├─ useFlip.ts      Flug-Animation von Items zwischen Containern (FLIP)
│  ├─ useFxAnimations.ts    Shake, Münzflug (Web Animations API)
│  └─ useDelayedFlag.ts     End-Screens erst nach den Animationen zeigen
├─ components/      ← "dumme" Darstellung, bekommen state + dispatch
├─ audio/sfx.ts     ← Sound-Schnittstelle (Platzhalter)
├─ styles/          ← tokens.css (Farben/Maße), global.css (iOS), game.css, screens.css
├─ assets.ts        ← einzige Stelle mit Bildpfaden
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

Laufzeit: 2–25 ms pro Level (Node). In der App werden Level pro Sitzung gecacht, das nächste Level wird im Leerlauf vorberechnet.

**Seeds ändern:** `SEED_SALT` in `generator.ts` anpassen → alle Level werden neu gewürfelt (Tests prüfen weiterhin Lösbarkeit).

## Onlineshop-Modus (`src/game/shop/`)

| Datei | Inhalt |
|---|---|
| `theme.ts` | Serien (Aufkleber: Symbol, Farbe, Waren) und Kunden – austauschbar für andere Themen |
| `types.ts` | `Order` (Positionen: bestimmte Ware oder Serie), `Station` (Auftrag + gefüllte Positionen), `ShopBoard` (Stapel, Ablage, Stationen, Warteschlange) |
| `rules.ts` | Passt eine Ware? (`openPositions`), `applyMove` inkl. **Versand + Nachrücken**, `findShortage` (Hall-Bedingung), `isLegal` (passt **und** erzeugt keinen Engpass), `whoNeeds` für den Hinweistext |
| `solver.ts` | DFS wie im Regal-Modus. Kompakt: Station = sortierte Liste offener Positions-Schlüssel (Typ 0–7, Serie 100+). Pruning per Hall-Bedingung. Dazu `simulateShopWinRate` (schnelle Simulation auf derselben Darstellung) |
| `generator.ts` | Sortiment wählen → Aufträge würfeln (mit Kunden) → Waren daraus ableiten → Stapel; Solver + Simulation wie gehabt; `shuffleShopBox` |
| `levels.ts` | 20 Tage + Endlos, Münzwerte, Einführungstexte |
| `reducer.ts` | `TAP_STATION` statt `TAP_SLOT`; blockierte Züge erzeugen ein `blocked`-FX-Event mit Erklärtext |

**Engpass-Prüfung (Warum genügt sie?):** Jede Ware gehört zu genau einer Serie, Positionen verlangen eine bestimmte Ware oder eine Serie. Die Waren decken die Positionen genau dann, wenn (a) jede bestimmte Ware oft genug da ist und (b) pro Serie danach genug übrig bleibt (Heiratssatz von Hall für diese verschachtelte Struktur). Der Brute-Force-Abgleich in `shop/solver.test.ts` (400 Zufallsboards) bestätigt das.

**Versand-Animation:** Der Reducer verschickt das Paket sofort (Logik bleibt einfach und testbar). `ShopBoard` hält verschickte Pakete per `useShipGhosts` für `TIMING.ship` als „Geist“-Ebene über dem Packtisch (Klappen, Klebeband, Häkchen, Abflug), während darunter der neue Auftrag hereinrutscht. Damit die letzte Ware sichtbar ins Paket fliegt, merkt sich `useFlip` die Position kurz verschwundener Items einige Renders lang.

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
| Konfetti | `canvas-confetti` (respektiert `prefers-reduced-motion`) |

Alle Zeiten stehen in `src/config.ts` (`TIMING`) und werden als CSS-Variablen `--t-*` gespiegelt.

## Layout und Skalierung

Alles hängt an `--item` (Kantenlänge einer Ware), berechnet aus Viewport-Breite und *nutzbarer* Höhe (ohne Safe Areas): `clamp(44px, min(15.5vw, 7.1 % der nutzbaren Höhe), 72px)`. Das Regal verkleinert `--item` lokal, wenn zwei Fächer mit Kapazität 4 sonst nicht nebeneinanderpassen. Der Karton nutzt Container-Query-Einheiten (`cqw`), damit die Stapel immer im Karton stehen.

Getestet (per Playwright, mit simulierten Safe Areas): iPhone SE (375×667), iPhone 13/14 (390×844), Pro Max (430×932). Mindestanforderung: iOS 16 (Container Queries, `dvh`).

## PWA und Deployment

- `vite-plugin-pwa` erzeugt Manifest und Service Worker (Workbox, `generateSW`). Alle Assets werden vorab gecacht → offline spielbar.
- Registrierung in `main.tsx` (`virtual:pwa-register`, nur im Production-Build). `registerType: autoUpdate`: neue Versionen werden im Hintergrund geladen und aktivieren sich automatisch.
- **Basis-Pfad:** GitHub Pages hostet unter `/<repo>/`. `vite.config.ts` liest `BASE_PATH` (setzt der Workflow aus `actions/configure-pages`); Standard für Build/Preview ist `/SuperSorter/`, für den Dev-Server `/`. Manifest-`start_url`/`scope`/`id`, Service-Worker-Scope und `assets.ts` (über `import.meta.env.BASE_URL`) folgen automatisch.
- `.github/workflows/deploy.yml`: Node LTS → `npm ci` → `npm test` → `npm run build` → Upload von `dist/` → Deploy.

## Tests

`npm test` (Vitest, Node-Umgebung, ca. 2 s, 155 Tests):

| Datei | Inhalt |
|---|---|
| `rules.test.ts` | Platzierungsregeln, Multi-Move, Reveal, Gold, gelöste/geschlossene Fächer, Sieg, Deadlock, Sackgasse |
| `solver.test.ts` | einfache/unlösbare Boards, Multi-Move vs. verdeckt, Regressionstest doppelte Sorten, **Abgleich mit Brute-Force auf 600 Zufallsboards** |
| `reducer.test.ts` | Tap-Steuerung, Auswahlwechsel, Shake-Event, Wagen, Sieg/Niederlage, Undo (mehrstufig, Gold), Extra-Platz, Lupe, Mischen, komplettes Level über den Reducer |
| `generator.test.ts` | Progression (Mystery ab 4, Gold ab 10, Belohnungslevel), Determinismus, **Level 1–30 lösbar** und konfigurationstreu, Generierungszeit |
| `shop/rules.test.ts` | Sammel/Serie/Wunschliste, Multi-Move, Versand + Nachrücken, Engpass, blockierte Züge |
| `shop/solver.test.ts` | einfache/unlösbare Boards, **Abgleich mit Brute-Force auf 400 Zufallsboards** |
| `shop/reducer.test.ts` | Taps, Versand-Event + Münzen, Blockade mit Erklärtext, Undo, Extra-Ablage, Lupe, Mischen, Booster kaufen, kompletter Tag |
| `shop/generator.test.ts` | Progression, Determinismus, **Tage 1–30 lösbar**, Waren = Positionen, Auftragsarten wie konfiguriert |

## Erweitern – Kochrezepte

**Neue Ware:** Bild nach `assets-src/`, Zeile in `scripts/asset-map.mjs`, `npm run assets:optimize`, ID in `ITEM_TYPES`/`ITEM_CATEGORY`/`ITEM_LABEL` (`src/game/items.ts`), Pfad in `ITEM_IMAGE` (`src/assets.ts`). Der Generator nutzt sie automatisch.

**Level anpassen/hinzufügen:** Zeile in `TABLE` (`src/game/levels.ts`) ändern oder anhängen → `npm run levels:report` zeigt Gewinnquote und ob der Zielbereich getroffen wird → `npm test`.

**Neuer Booster:** Zähler in `BoosterCounts` (`types.ts`) und `DEFAULT_BOOSTERS` (`levels.ts`), Aktion im `gameReducer`, Eintrag in `BOOSTERS` (`components/BoosterBar.tsx`) und Bild in `BOOSTER_IMAGE` (`assets.ts`), Test in `reducer.test.ts`.

**Sound einhängen:** In `main.tsx` `setSfxHandler((name) => …)` aufrufen (z. B. Web Audio API). Alle Aufrufstellen existieren bereits (`useGame.ts`). iOS: AudioContext beim ersten Tap mit `resume()` entsperren.

**Neue Regel:** zuerst in `rules.ts` (+ Test), dann die kompakte Spiegelung in `solver.ts → apply/candidateMoves` nachziehen. Der Brute-Force-Abgleich in `solver.test.ts` deckt Abweichungen zwischen beiden auf.
