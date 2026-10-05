# Super Sorter

Spielbarer Prototyp eines Mobile-Puzzle-Games im Supermarkt mit zwei Modi:

- **Packband – Waren verkaufen** (Standard): Kundenpakete laufen auf einem Band vorbei und verlangen konkrete Waren. Ein Tap auf eine Lagerkiste nimmt die oberste Ware: Passt sie, fliegt sie ins Paket, sonst auf den Packtisch. Volle Pakete werden verschickt, und Waren vom Packtisch springen automatisch ins nächste Paket – Kettenreaktionen geben Kombo-Münzen. → [docs/PACK_MODE.md](docs/PACK_MODE.md)
- **Regal – Waren in den Bestand aufnehmen:** Du räumst die Lieferung sortenrein ins Supermarktregal (Prinzip *Water Sort / Magic Sort*). → [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)

Beide Modi haben verpackte Mystery-Waren, goldene Bonus-Waren und Booster und teilen sich die Münzen. Zum Testen sind sie getrennt über das Menü (☰ oben links) wählbar; später sollen sie sich abwechseln. Die Web-App ist für das iPhone optimiert und läuft als Homescreen-App im Vollbild und offline.

![Packband-Modus: Band mit allen wartenden Paketen, Kettenreaktion mit Kombo, Tag 20 mit zwei Packplätzen, Modus-Menü](docs/screenshots/pack.webp)

<details>
<summary>Regal-Modus</summary>

![Regal-Modus: Level 12, Level 16 mit Safe Area, Win-Screen](docs/screenshots/gameplay.webp)

</details>

## Features

- **Packband:** Ein Tap pro Zug, alle wartenden Pakete sichtbar, Versand-Animation (Klappen, Klebeband, Abflug), Pakete fahren vom Band heran, Kettenreaktionen werden Schritt für Schritt abgespielt („Kombo ×2!“).
- **Regal-Steuerung:** Ware antippen (hebt sich an, leuchtet), dann Fach antippen (Ware hüpft im Bogen hinein). Ungültige Ziele wackeln. **Multi-Move** für gleiche sichtbare Waren.
- **Mystery-Layering:** Nur die oberste Ware je Stapel ist sichtbar. Darunter liegt Packpapier, das beim Freilegen mit Papierfetzen aufreißt. **Gold-Pakete** bringen Bonus-Münzen.
- **Gelöste Fächer** (Regal) leuchten, sprühen Sterne, zeigen ein Schloss und öffnen das nächste geschlossene Fach.
- **Je 20 handkonfigurierte Level/Tage + Endlosmodus**, seed-basiert generiert und per **Solver garantiert lösbar**. Die Schwierigkeitskurve wird über simulierte Spieler gesteuert. Alle 4 Level ein Belohnungslevel.
- **Booster:** Undo (mehrstufig), Extra-Platz, Lupe, Mischen (bleibt garantiert lösbar), jeweils mit Kontingent pro Level. Ist es aufgebraucht, kann man den Booster für Münzen nachkaufen.
- **Win-/Lose-Screens** mit Sternen, Münzen, Konfetti; Lose-Screen mit Extra-Platz, Rückgängig, Nochmal.
- **Fortschritt** (Level je Modus, gemeinsame Münzen) in `localStorage`.
- **PWA:** Homescreen-Icon, Vollbild, Safe Areas, offline spielbar, kein Zoom, kein Scroll-Bounce, keine Textmarkierung.
- **Debug-Modus** `?debug=1`: Level-Sprung, Live-Lösbarkeit, Solver-Hinweis, Auto-Lösen, Röntgenblick.

## Quickstart

Voraussetzung: Node.js ≥ 20.19 (empfohlen: aktuelle LTS).

```bash
npm install
npm run dev        # Dev-Server: http://localhost:5173 (auch im LAN erreichbar)
npm test           # Unit-Tests (Vitest): Regeln, Kettenreaktion, Reveal, Solver, Generator, Reducer
npm run build      # Typecheck + Production-Build nach dist/ (Basis-Pfad /SuperSorter/)
npm run preview    # Build lokal ansehen: http://localhost:4173/SuperSorter/
```

Weitere Scripts:

| Script | Zweck |
|---|---|
| `npm run levels:report` | Regal-Modus: Tabelle aller Level (Lösbarkeit, simulierte Gewinnquote, Generierungszeit) |
| `npm run pack:report` | Packband-Modus: dasselbe für alle Versand-Tage |
| `npm run assets` | Assets aus `assets-src/` optimieren und App-Icons erzeugen (`assets:optimize`, `assets:icons`) |
| `npm run phone` | Production-Build bauen und im Netz bereitstellen (Port 4173) – zum Testen auf dem Handy |
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

**Schneller Test ohne Deployment (im WLAN):** `npm run phone` auf dem Rechner starten (Production-Build + Vorschau) und auf dem iPhone `http://<IP-des-Rechners>:4173/SuperSorter/` öffnen (die IP zeigt Vite als „Network“ an). Service Worker und Offline-Modus laufen ohne HTTPS nicht, das Gameplay schon.

> **Dev-Server (`npm run dev`, Port 5173) nicht zum Beurteilen von Tempo nutzen.** Er liefert React im Entwicklungsmodus (deutlich langsamer, Komponenten werden doppelt gerendert), lädt hunderte einzelne Module und hat keinen Service Worker. Ruckler und fehlende Bilder über WLAN sind dort normal und kein Fehler der App. Bilder unter `/assets/` werden im Dev-Server seit diesem Update eine Stunde gecacht; nach dem Austauschen von Assets einmal ohne Cache neu laden. Der Dev-Server ist für schnelles Ausprobieren von Änderungen (Hot Reload) gedacht.

### Test über Tailscale (empfohlen für lokales Testen)

`tailscale serve` stellt den lokalen Server per **HTTPS mit gültigem Zertifikat** im Tailnet bereit. Die Windows-Firewall spielt dabei keine Rolle, weil Tailscale selbst die Verbindung annimmt und an `localhost` weiterreicht.

Einmalig: In der Tailscale-Admin-Konsole unter **DNS** „MagicDNS“ und „HTTPS Certificates“ aktivieren. Auf dem iPhone muss die Tailscale-App verbunden sein.

```powershell
# Terminal 1: Dev-Server
npm run dev

# Terminal 2: per HTTPS ins Tailnet freigeben (läuft im Hintergrund weiter)
tailscale serve --bg 5173
# -> zeigt https://<pc-name>.<tailnet>.ts.net an, diese URL auf dem iPhone öffnen

tailscale serve reset   # Freigabe später wieder beenden
```

Für den **vollständigen PWA-Test** (Homescreen, Service Worker, offline – und realistisches Tempo) den Production-Build freigeben:

```powershell
npm run phone            # = npm run build + npm run preview, Port 4173
tailscale serve --bg 4173
# -> https://<pc-name>.<tailnet>.ts.net/SuperSorter/ öffnen, dann Teilen -> Zum Home-Bildschirm
```

`*.ts.net`-Hostnamen sind in `vite.config.ts` (`allowedHosts`) freigeschaltet; andere Hostnamen blockt Vite mit „Blocked request“.

**Direkt über die Tailscale-IP (`http://100.x.y.z:5173`) lädt nichts?** Meist blockt die Windows-Firewall. Typische Ursache: Beim ersten Start von Node.js hat Windows gefragt, und dabei wurde nur „Private Netzwerke“ erlaubt. Windows legt dann für öffentliche Netzwerke eine **Block-Regel für node.exe** an, und Block-Regeln haben Vorrang vor jeder Allow-Regel für den Port. Das Tailscale-Netz zählt unter Windows oft als „öffentlich“. Lösung (PowerShell als Administrator):

```powershell
Get-NetConnectionProfile                                    # Ist "Tailscale" Public?
Set-NetConnectionProfile -InterfaceAlias "Tailscale" -NetworkCategory Private
# oder die Block-Regeln für Node.js abschalten:
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*Node*" -and $_.Action -eq "Block" } | Disable-NetFirewallRule
```

**Debug-Modus:** URL mit `?debug=1` öffnen, z. B. `https://achimbenzel.github.io/SuperSorter/?debug=1`. Das Panel lässt sich über ✕ einklappen und über 🐞 wieder öffnen.

## Ordnerübersicht

```
SuperSorter/
├─ .github/workflows/deploy.yml   GitHub Pages: Tests, Build, Deploy
├─ assets-src/                    Original-PNGs (unverändert, Quelle für Scripts)
├─ docs/
│  ├─ ARCHITECTURE.md             Aufbau, Datenfluss, Zustandsmodell, Solver/Generator, Erweitern
│  ├─ GAME_DESIGN.md              Regeln, Mystery, Booster, Progression, Annahmen
│  ├─ PACK_MODE.md                Packband-Modus: Regeln, Kettenreaktion, Tage, Playtest-Erkenntnisse
│  ├─ ASSETS.md                   Asset-Zuordnung, Größen, Platzhalter
│  ├─ ROADMAP.md                  nächste Schritte
│  └─ screenshots/
├─ public/assets/                 optimierte Assets (WebP) + App-Icons
│  ├─ items/  mystery/  board/  ui/  icons/
├─ scripts/
│  ├─ asset-map.mjs               Zuordnung Original → Ziel
│  ├─ optimize-assets.mjs         npm run assets:optimize (sharp)
│  ├─ generate-icons.mjs          npm run assets:icons (180/192/512/maskable)
│  ├─ level-report.ts             npm run levels:report
│  └─ pack-report.ts              npm run pack:report
├─ src/
│  ├─ game/                       reine Spiellogik + Tests, Regal-Modus (types, rules, reducer, solver, generator, levels)
│  │  ├─ sources.ts               gemeinsame Karton-Regeln beider Modi
│  │  └─ pack/                    Packband-Modus (types, rules, reducer, solver, generator, levels, customers + Tests)
│  ├─ modes/                      PackGame, ShelfGame (je ein kompletter Spielbildschirm)
│  ├─ components/                 Board, Shelf, ShelfSlot, DeliveryBox, Stack, Item, Cart,
│  │  │                           BoosterBar, HUD, WinScreen, LoseScreen, ModeMenu, DebugPanel, …
│  │  └─ pack/                    PackBoard, PackBox, plan (Animationsplan), timeline (Zeitplan der Kette)
│  ├─ hooks/                      useGame, usePackGame, progress, usePersistedState, useFlip, useFxAnimations, …
│  ├─ audio/sfx.ts                Sound-Schnittstelle (Platzhalter)
│  ├─ styles/                     tokens.css (Design-Tokens), global.css, game.css, screens.css, pack.css
│  ├─ assets.ts                   zentrales Asset-Mapping (einzige Stelle mit Bildpfaden)
│  ├─ imageLoader.ts              Bilder vorladen/dekodieren/festhalten, Ladefehler wiederholen
│  ├─ levelStore.ts, levelWorker.ts  Level-Cache beider Modi, Vorberechnung im Web Worker
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

- [docs/PACK_MODE.md](docs/PACK_MODE.md): Packband-Modus – Regeln, Kettenreaktion, Tage, was aus dem Onlineshop-Playtest gelernt wurde
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md): Regal-Modus – Regeln, Booster, Level-Tabelle, **getroffene Annahmen**
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Code-Aufbau, Solver, Generator, Animationen, Kochrezepte zum Erweitern
- [docs/ASSETS.md](docs/ASSETS.md): welches Bild wofür, fehlende Assets
- [docs/ROADMAP.md](docs/ROADMAP.md): nächste Schritte (Modi abwechseln, Audio, Meta-Ebene, Spezialfächer)
