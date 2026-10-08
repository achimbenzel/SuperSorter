# Roadmap

Was bewusst noch fehlt und sinnvolle nächste Schritte, grob nach Priorität.

## 0. Packband + Regal im Wechsel (aktueller Fokus)

Der Onlineshop-Prototyp wurde nach dem Playtest durch das **Packband** ersetzt ([PACK_MODE.md](PACK_MODE.md), dort auch die Erkenntnisse). Beide Modi sind zum Testen noch getrennt wählbar. Nächste Schritte:

1. **Packband playtesten:** Tempo der Kettenreaktion (`TIMING.chainStep`), Schwierigkeitskurve (`npm run pack:report`, `?debug=1`), Lesbarkeit des Bands auf dem iPhone SE.
2. **Modi abwechseln** – „Waren in den Bestand aufnehmen“ (Regal) und „Waren verkaufen“ (Packband) als ein gemeinsamer Ablauf. Vorschlag: eine gemeinsame Tageszählung in `progress.ts`, ein `schedule(day)` liefert, welcher Modus dran ist (z. B. 2 Versand-Tage, dann eine Lieferung einräumen). `App.tsx` wählt dann nicht mehr per Menü, sondern per Plan; das Menü bleibt im Debug-Modus. Optional mit Story-Klammer: Was im Regal eingeräumt wurde, taucht am Packband als Sortiment auf.
3. **Kunden mit Persönlichkeit:** Stammkunden (Oma Herta, Max …) mit kurzen Sprechblasen; Geschäftskunden, die größere Sammelpakete bestellen. Kombos als „Versandrausch“ mit Sound.
4. **Rangliste:** Tägliche Herausforderung mit gleichem Seed für alle (der Generator ist deterministisch), Wertung nach Zügen/Kombos. In der App über Game Center/Google Play Games; gegen Schummeln die Zugfolge serverseitig mit dem Reducer nachspielen (läuft ohne DOM).
5. **Themen-Kapitel (z. B. Card Shop):** Neue Waren in `items.ts`/`assets.ts`, Kunden in `pack/customers.ts`. Die Packband-Regeln brauchen dafür keine Änderung.

## 0b. Card Shop und Sammelkarten

- **Packs kosten Münzen:** `PACK_PRICE` in `src/game/cards/packs.ts` setzen, Kauf im Packs-Reiter abbuchen (gemeinsame Geldbörse in `progress.ts`).
- ~~**Kartenkunst:**~~ umgesetzt: 32 eigene Vektor-Illustrationen (`scripts/card-art.mjs`). Offen: Holo-Varianten mit eigenem Hintergrund, Kartenkunst für weitere Sets.
- **Weitere Sets / Sonderkarten:** Full Art, Secret Rare, zweites Set mit eigenem Pack-Design.
- **Verknüpfung mit dem Puzzle:** Packs als Belohnung für Belohnungstage; im Shipping-Modus bestellen Kunden die Booster der Elemente, die man gerade sammelt.
- **Shop & Ranking:** die beiden Platzhalter-Reiter füllen (Münzpakete, tägliche Herausforderung).

## 1. Spielgefühl und Feedback (kurzfristig)

- ~~**Audio:**~~ umgesetzt (eigene synthetisierte Sounds im Sammelkarten-Stil, Web Audio, An/Aus-Schalter). Hintergrundmusik in Dauerschleife mit eigenem Schalter. Offen: eigene Sounds für Kombos; ggf. echte Foley-Aufnahmen (Karten, Folie).
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
- **Verderbliche Ware / Zeitdruck:** optionaler Timer pro Level oder Ware.
- **Gefrorene Pakete:** brauchen zwei Züge zum Auspacken.

Jede neue Regel: zuerst `rules.ts` + Test, dann Solver-Spiegelung, dann Generator-Config (siehe Kochrezept in ARCHITECTURE.md).

## 4. Assets

- **Einkaufswagen-Grafik** (derzeit CSS + 🛒), **Spielhintergrund** (derzeit CSS-Fliesen), **Restart-Icon** (derzeit Inline-SVG).
- **Regalfach in höherer Auflösung** (derzeit aus einem 474 px breiten Original ausgeschnitten, auf 3x-Displays leicht weich).
- Booster-Kacheln ohne eingebrannten englischen Text (Text dann per CSS, lokalisierbar).
- iOS-Splash-Screens (`apple-touch-startup-image`) für einen sauberen Start.

## 5. Technik

- ~~**Generator in Web Worker:**~~ umgesetzt (`levelStore.ts`). Bei deutlich komplexeren Regeln Level zur Build-Zeit generieren und als JSON ausliefern.
- **Mischen-Booster im Worker:** `shufflePackBox`/`shuffleBox` lösen bis zu 40 Kandidaten im Haupt-Thread (selten, aber auf alten Handys spürbar).
- **Update-Hinweis:** Statt stillem Auto-Update ein „Neue Version – neu laden?“-Toast (`registerType: 'prompt'` in `vite-plugin-pwa`).
- **Komponenten-Tests** (React Testing Library) und ein Playwright-Smoke-Test im CI (Level 1 per Taps lösen).
- **Barrierefreiheit:** Farbenblind-Modus (Formen/Muster zusätzlich zu Bildern), größere Tap-Ziele optional, VoiceOver-Labels prüfen.
- **Lokalisierung:** Texte aus Komponenten in eine `i18n`-Datei ziehen (derzeit deutsch, inline).
- **Analytics (datensparsam):** Level-Start/Sieg/Niederlage/Booster-Nutzung, um die Kurve zu tunen.

## Die drei wichtigsten nächsten Schritte

1. **Packband auf dem iPhone playtesten** und mit dem Regal vergleichen; Kurven anhand echter Spielzeiten nachjustieren (`npm run pack:report`, `npm run levels:report`, `?debug=1`).
2. **Modi im Wechsel** als gemeinsamen Spielablauf umsetzen (siehe Abschnitt 0).
3. **Packs mit Münzen bezahlen** (`PACK_PRICE`) und als Belohnung für Tage/Level vergeben.
