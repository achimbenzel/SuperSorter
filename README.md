# Super Sorter

Spielbarer Prototyp eines Mobile-Puzzle-Games: Eine Lieferung kommt im Karton an, und du räumst sie sortenrein ins Supermarktregal. Das Prinzip ist *Water Sort / Magic Sort*, mit verpackten Mystery-Waren, goldenen Bonus-Paketen und Boostern. Die Web-App ist für das iPhone optimiert und läuft als Homescreen-App im Vollbild und offline.

![Gameplay: Level 12, Level 16 mit Safe Area, Win-Screen](docs/screenshots/gameplay.webp)

## Features

- **Tap-Steuerung:** Ware antippen (hebt sich an, leuchtet), dann Fach antippen (Ware hüpft im Bogen hinein). Ungültige Ziele wackeln. **Multi-Move** für gleiche sichtbare Waren.
- **Mystery-Layering:** Nur die oberste Ware je Stapel ist sichtbar. Darunter liegt Packpapier, das beim Freilegen mit Papierfetzen aufreißt. **Gold-Pakete** bringen Bonus-Münzen.
- **Gelöste Fächer** leuchten, sprühen Sterne, zeigen ein Schloss und öffnen das nächste geschlossene Fach.
- **20 handkonfigurierte Level + Endlosmodus**, seed-basiert generiert und per **Solver garantiert lösbar**. Die Schwierigkeitskurve wird über simulierte Spieler gesteuert. Alle 4 Level ein Belohnungslevel.
- **Booster:** Undo (mehrstufig), Extra-Platz, Lupe, Mischen (bleibt garantiert lösbar), jeweils mit Kontingent pro Level.
- **Win-/Lose-Screens** mit Sternen, Münzen, Konfetti; Lose-Screen mit Extra-Platz, Rückgängig, Nochmal.
- **Fortschritt** (Level, Münzen) in `localStorage`.
- **PWA:** Homescreen-Icon, Vollbild, Safe Areas, offline spielbar, kein Zoom, kein Scroll-Bounce, keine Textmarkierung.
- **Debug-Modus** `?debug=1`: Level-Sprung, Live-Lösbarkeit, Solver-Hinweis, Auto-Lösen, Röntgenblick.

## Quickstart

Voraussetzung: Node.js ≥ 20.19 (empfohlen: aktuelle LTS).

```bash
npm install
npm run dev        # Dev-Server: http://localhost:5173 (auch im LAN erreichbar)
npm test           # Unit-Tests (Vitest): Regeln, Multi-Move, Reveal, Solver, Generator, Reducer
npm run build      # Typecheck + Production-Build nach dist/ (Basis-Pfad /SuperSorter/)
npm run preview    # Build lokal ansehen: http://localhost:4173/SuperSorter/
```

Weitere Scripts:

| Script | Zweck |
|---|---|
| `npm run levels:report` | Tabelle aller Level: Lösbarkeit, simulierte Gewinnquote, Generierungszeit (zum Feintuning) |
| `npm run assets` | Assets aus `assets-src/` optimieren und App-Icons erzeugen (`assets:optimize`, `assets:icons`) |
| `npm run typecheck` | nur TypeScript prüfen |
| `npm run test:watch` | Tests im Watch-Modus |

## Auf dem iPhone testen (GitHub Pages)

Der Service Worker und die Homescreen-App brauchen HTTPS. Deshalb wird über GitHub Pages veröffentlicht.

**Einmalig einrichten**

1. Auf GitHub im Repo: **Settings → Pages → Build and deployment → Source: „GitHub Actions“** auswählen.
2. Den Entwicklungsbranch nach `main` mergen. Der Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) startet bei jedem Push auf `main` automatisch (Tests → Build → Deploy). Alternativ: **Actions → „Deploy to GitHub Pages“ → „Run workflow“** auf `main`.
3. Im Tab **Actions** warten, bis beide Jobs grün sind (ca. 1–2 Minuten). Die URL steht im Job „deploy“:
   **https://achimbenzel.github.io/SuperSorter/**

**Auf den Homescreen legen**

4. Die URL auf dem iPhone in **Safari** öffnen (nicht in Chrome/In-App-Browsern).
5. Unten auf **Teilen** (Quadrat mit Pfeil) → **„Zum Home-Bildschirm“** → Name „Super Sorter“ → **Hinzufügen**.
6. Die App vom Homescreen starten. Sie läuft im Vollbild ohne Safari-Leisten, im Hochformat und nach dem ersten Start auch offline.

**Nach einem Update**

- Neue Versionen lädt der Service Worker im Hintergrund und aktiviert sie automatisch. Normalerweise reicht es, die App zu öffnen, ein paar Sekunden zu warten und sie dann einmal zu schließen (im App-Umschalter nach oben wischen) und neu zu starten.
- Zeigt die App weiterhin die alte Version: App-Icon lange drücken → **App entfernen**, optional in den iOS-Einstellungen unter Safari → Erweitert → Websitedaten die Daten von `github.io` löschen, und dann Schritt 4–5 wiederholen.
- Achtung: Homescreen-Apps haben auf iOS einen eigenen Speicher. Beim Entfernen der App geht der Spielstand (Level, Münzen) verloren.

**Schneller Test ohne Deployment (im WLAN):** `npm run dev` auf dem Rechner starten und auf dem iPhone `http://<IP-des-Rechners>:5173` öffnen (die IP zeigt Vite als „Network“ an). Das Gameplay funktioniert, Service Worker und Offline-Modus aber nicht (kein HTTPS).

**Debug-Modus:** URL mit `?debug=1` öffnen, z. B. `https://achimbenzel.github.io/SuperSorter/?debug=1`. Das Panel lässt sich über ✕ einklappen und über 🐞 wieder öffnen.

## Ordnerübersicht

```
SuperSorter/
├─ .github/workflows/deploy.yml   GitHub Pages: Tests, Build, Deploy
├─ assets-src/                    Original-PNGs (unverändert, Quelle für Scripts)
├─ docs/
│  ├─ ARCHITECTURE.md             Aufbau, Datenfluss, Zustandsmodell, Solver/Generator, Erweitern
│  ├─ GAME_DESIGN.md              Regeln, Mystery, Booster, Progression, Annahmen
│  ├─ ASSETS.md                   Asset-Zuordnung, Größen, Platzhalter
│  ├─ ROADMAP.md                  nächste Schritte
│  └─ screenshots/
├─ public/assets/                 optimierte Assets (WebP) + App-Icons
│  ├─ items/  mystery/  board/  ui/  icons/
├─ scripts/
│  ├─ asset-map.mjs               Zuordnung Original → Ziel
│  ├─ optimize-assets.mjs         npm run assets:optimize (sharp)
│  ├─ generate-icons.mjs          npm run assets:icons (180/192/512/maskable)
│  └─ level-report.ts             npm run levels:report
├─ src/
│  ├─ game/                       reine Spiellogik + Tests (types, rules, reducer, solver, generator, levels)
│  ├─ components/                 Board, Shelf, ShelfSlot, DeliveryBox, Stack, Item, Cart,
│  │                              BoosterBar, HUD, WinScreen, LoseScreen, DebugPanel, …
│  ├─ hooks/                      useGame, usePersistedState, useFlip, useFxAnimations, useDelayedFlag
│  ├─ audio/sfx.ts                Sound-Schnittstelle (Platzhalter)
│  ├─ styles/                     tokens.css (Design-Tokens), global.css, game.css, screens.css
│  ├─ assets.ts                   zentrales Asset-Mapping (einzige Stelle mit Bildpfaden)
│  ├─ config.ts                   UI-Zeiten, Storage-Key, Debug-Flag
│  ├─ iosGuards.ts                Schutz vor Zoom/Bounce/Long-Press
│  ├─ App.tsx, main.tsx
├─ index.html                     iOS-Meta-Tags, Apple-Touch-Icon
├─ vite.config.ts                 Basis-Pfad, PWA/Manifest/Service Worker
├─ vitest.config.ts, tsconfig.json, package.json
```

## Tech-Stack und Entscheidungen

| | |
|---|---|
| React 18 + Vite 8 + TypeScript 5.9 (strict) | TS 5.9 statt 7.x: erprobt mit allen Tools |
| Zustand per **`useReducer`** | Ein einziges Zustandsobjekt; der Reducer ist eine reine Funktion und ohne React testbar. Eine Bibliothek wie Zustand bringt hier keinen Mehrwert. |
| Animationen per **CSS + Web Animations API** | Nur `transform`/`opacity`, kein framer-motion nötig (kleineres Bundle, volle Kontrolle) |
| `canvas-confetti` | Konfetti im Win-Screen |
| `vite-plugin-pwa` (Workbox) | Manifest + Service Worker |
| Vitest | Unit-Tests der Spiellogik |
| sharp (dev) | Asset-Optimierung und Icon-Generierung |

## Dokumentation

- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md): Regeln, Booster, Level-Tabelle, **getroffene Annahmen**
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Code-Aufbau, Solver, Generator, Animationen, Kochrezepte zum Erweitern
- [docs/ASSETS.md](docs/ASSETS.md): welches Bild wofür, fehlende Assets
- [docs/ROADMAP.md](docs/ROADMAP.md): nächste Schritte (Audio, Meta-Ebene, Spezialfächer, Aufträge)
