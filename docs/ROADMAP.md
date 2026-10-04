# Roadmap

Was bewusst noch fehlt und sinnvolle nächste Schritte, grob nach Priorität.

## 0. Onlineshop-Konzept (aktueller Fokus)

Der Onlineshop-Modus ([SHOP_MODE.md](SHOP_MODE.md)) ist als Vergleichs-Prototyp umgesetzt. Nächste Schritte, falls er sich besser anfühlt:

1. **Playtesten und entscheiden:** Onlineshop vs. Regal. Danach den unterlegenen Modus entfernen (`src/game/*.ts` ohne `sources.ts`, `modes/ShelfGame.tsx`, `components/Board.tsx`, `Shelf*.tsx`) oder als Bonus-Minispiel behalten.
2. **Themen-Kapitel:** `shop/theme.ts` zu einer Auswahl pro Tag machen (Kapitel 1 Feinkost, Kapitel 2 Card Shop, Kapitel 3 Spielzeug …) und `items.ts` je Thema erweitern. Card Shop: Serien = Editionen (Booster, Hülle, Figur derselben Edition), Händler bestellen Displays (Sammelbestellung), Sammler Wunschlisten.
3. **Story & Figuren:** Kurze Dialogkarten zwischen Tagen (Mentor-Figur, Stammkunden mit Persönlichkeit), Shop-Ausbau als Meta (mehr Packtische/Ablage als dauerhafte Upgrades, Deko).
4. **Rangliste:** Tägliche Herausforderung mit gleichem Seed für alle (der Generator ist deterministisch), Wertung nach Zeit/Zügen. In der App über Game Center/Google Play Games; gegen Schummeln die Zugfolge serverseitig mit dem Reducer nachspielen (läuft ohne DOM).
5. **Auftragswahl:** Optional entscheiden lassen, welcher wartende Auftrag als Nächstes an einen freien Packtisch kommt (mehr Strategie).

## 1. Spielgefühl und Feedback (kurzfristig)

- **Audio:** Die Schnittstelle `src/audio/sfx.ts` ist an allen Stellen verdrahtet (tap, select, place, invalid, reveal, solved, gold, win, lose, booster). Es fehlt nur eine Implementierung, z. B. Web Audio API mit kleinen OGG/M4A-Samples (iOS: AudioContext beim ersten Tap entsperren). Dazu ein Lautstärke-/Stumm-Schalter.
- **Haptik:** iOS Safari unterstützt `navigator.vibrate` nicht. Optionen prüfen (z. B. Capacitor-Wrapper bei späterer App-Store-Version).
- **Playtesting der Kurve:** Echte Spielzeiten und Abbruchraten messen und `targetWinRate` bzw. Configs in `levels.ts` nachjustieren. Die simulierte Gewinnquote ist nur ein Proxy.
- **Tutorial-Hand:** In Level 1 eine animierte Hand, die den ersten Zug zeigt (statt nur Text).

## 2. Meta-Ebene

- ~~**Münzen ausgeben:** Booster kaufen, wenn das Level-Kontingent leer ist.~~ (umgesetzt, Preise in `BOOSTER_PRICES`)
- **Supermarkt ausbauen:** Zwischen Leveln Abteilungen freischalten/dekorieren (klassische Casual-Meta). Neue Abteilungen bringen neue Warentypen.
- **Level-Karte / Level-Auswahl:** `progress.highest` wird bereits gespeichert.
- **Tägliche Lieferung:** ein Tageslevel mit Datum als Seed (Generator ist deterministisch).

## 3. Neue Mechaniken

- **Spezialfächer:**
  - *Kühlregal*: nimmt nur Milchprodukte/Getränke an (Kategorie existiert schon in `ITEM_CATEGORY`).
  - *Kleines Eckfach* mit Kapazität 2, *Doppelfach* mit Kapazität 6.
  - *Gesperrtes Fach mit Schlüssel*: öffnet sich, wenn ein bestimmtes Item eingeräumt wird.
- **Aufträge / Kunden:** Kunden wollen „3 × Milch“ – liefert man aus einem gelösten Fach, gibt es Bonus. Das ergänzt die Regel „gelöste Fächer leeren sich“ (siehe Alternative in GAME_DESIGN.md).
- **Verderbliche Ware / Zeitdruck:** optionaler Timer pro Level oder Ware.
- **Gefrorene Pakete:** brauchen zwei Züge zum Auspacken.

Jede neue Regel: zuerst `rules.ts` + Test, dann Solver-Spiegelung, dann Generator-Config (siehe Kochrezept in ARCHITECTURE.md).

## 4. Assets

- **Einkaufswagen-Grafik** (derzeit CSS + 🛒), **Spielhintergrund** (derzeit CSS-Fliesen), **Restart-Icon** (derzeit Inline-SVG).
- **Regalfach in höherer Auflösung** (derzeit aus einem 474 px breiten Original ausgeschnitten, auf 3x-Displays leicht weich).
- Booster-Kacheln ohne eingebrannten englischen Text (Text dann per CSS, lokalisierbar).
- iOS-Splash-Screens (`apple-touch-startup-image`) für einen sauberen Start.

## 5. Technik

- **Generator in Web Worker oder zur Build-Zeit:** Aktuell 2–25 ms pro Level im Main-Thread (gecacht + Vorberechnung). Bei komplexeren Regeln Level vorab generieren und als JSON ausliefern.
- **Update-Hinweis:** Statt stillem Auto-Update ein „Neue Version – neu laden?“-Toast (`registerType: 'prompt'` in `vite-plugin-pwa`).
- **Komponenten-Tests** (React Testing Library) und ein Playwright-Smoke-Test im CI (Level 1 per Taps lösen).
- **Barrierefreiheit:** Farbenblind-Modus (Formen/Muster zusätzlich zu Bildern), größere Tap-Ziele optional, VoiceOver-Labels prüfen.
- **Lokalisierung:** Texte aus Komponenten in eine `i18n`-Datei ziehen (derzeit deutsch, inline).
- **Analytics (datensparsam):** Level-Start/Sieg/Niederlage/Booster-Nutzung, um die Kurve zu tunen.

## Die drei wichtigsten nächsten Schritte

1. **Auf dem iPhone playtesten** und die Schwierigkeitskurve anhand echter Spielzeiten nachjustieren (`npm run levels:report`, `?debug=1`).
2. **Audio einhängen** – größter Gewinn an Spielgefühl pro Aufwand, Schnittstelle steht.
3. **Meta-Ebene mit Münzen** (Booster kaufen, Supermarkt ausbauen), damit Fortschritt über einzelne Level hinaus motiviert.
