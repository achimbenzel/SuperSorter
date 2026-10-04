# Versand-Modus („Onlineshop“)

Zweites Spielprinzip neben dem Regal-Modus ([GAME_DESIGN.md](GAME_DESIGN.md)). Du betreibst einen kleinen Onlineshop: Ware kommt im Großhandelskarton an, du packst sie in Pakete für deine Kunden und verschickst sie. Jedes verschickte Paket macht den Packtisch für den nächsten Auftrag frei.

Status: **Prototyp zum Vergleich**. Über das Menü (☰ oben links) lässt sich zwischen beiden Modi wechseln; neue Spieler starten im Onlineshop.

## Warum dieses Konzept

- **Versenden schafft Platz.** Im Regal-Modus bleiben gelöste Fächer für immer belegt, deshalb brauchte er geschlossene Fächer als künstliche Spannung. Hier rückt nach jedem Versand der nächste Auftrag nach – der natürliche Kreislauf von Sortierspielen.
- **Mechanik und Story passen zusammen.** Großhandelskarton mit verpackter Mystery-Ware = Einkauf, Pakete = Verkauf an einzelne Kunden, Gold-Raritäten = seltene Sammlerstücke.
- **Themen werden austauschbar.** Waren, Serien und Kunden stehen in einer Theme-Datei. Ein Card Shop braucht keine neuen Regeln, nur neue Daten und Bilder.

## Bildschirm

```
┌──────────────────────────────┐
│ [☰] [Tag 6]       [↻] [🪙 45] │  HUD
│ 📦 1/5  Danach: 🏨🥤×3  💑🥛🍿 │  Auftragsleiste: verschickt / Vorschau
│ ┌────────┐┌────────┐┌───────┐ │
│ │🧒 Max   ││👨 Becker││👩 Lisa │ │  Packtische: Auftragszettel (Kunde)
│ │ ☀ ☀    ││ 🥤 🥤   ││ 🍞 🧀  │ │  + Paket mit offenen Positionen
│ │ ☀      ││ 🥤      ││ 🍞     │ │    (Silhouette = genau diese Ware,
│ └────────┘└────────┘└───────┘ │     gestrichelter Kreis = Serie)
│      (Hinweis / Warnung)      │
│  ▲ ▲ ▲ ▲   Großhandels-  ┌──┐ │
│  ? ? ? ?   karton        │📥│ │  Ablage (Puffer)
│ [Undo][Extra][Lupe][Misch]   │
└──────────────────────────────┘
```

## Aufträge

Jeder Auftrag hat 2–4 Positionen. Drei Arten, gestaffelt eingeführt:

| Art | Beispiel | Positionen | Zettel-Farbe | ab Tag |
|---|---|---|---|---|
| **Sammelbestellung** (Geschäftskunde) | Hotel Linde: 3 × Cola | genau diese Ware, mehrfach | grau-blau | 1 |
| **Serien-Set** | Max: 3 × irgendetwas aus „Frühstück“ | jede Ware mit passendem Aufkleber | lila | 3 |
| **Wunschliste** (Privatkunde) | Lisa: Brot, Käse, Energy | genau diese Waren | orange | 6 |

**Serien (Feinkost-Theme)** – Farbaufkleber unten rechts auf jeder Ware:

| Serie | Aufkleber | Waren |
|---|---|---|
| Getränke | 🥤 blau | Cola, Energy-Drink, Orangensaft |
| Frühstück | ☀️ grün | Brot, Käse, Milch |
| Snacks | 🍿 rot | Chips, Apfel |

## Regeln

1. Tippen wie im Regal-Modus: Ware im Karton (oder auf der Ablage) antippen, dann ein Paket oder einen freien Ablageplatz. Multi-Move: Gleiche sichtbare Waren oben auf einem Stapel wandern zusammen, soweit das Paket noch passende Positionen hat.
2. Ein Paket nimmt eine Ware, wenn eine **offene Position** passt. Die Reihenfolge im Paket ist egal.
3. Ist jede Position erfüllt, wird das Paket **sofort verschickt** (+3 Münzen). Der nächste Auftrag aus der Warteschlange rückt an den Packtisch; gibt es keinen mehr, bleibt der Tisch frei.
4. **Geschafft**, wenn alle Aufträge verschickt sind (dann sind Karton und Ablage automatisch leer: Waren und Positionen passen exakt zusammen).
5. **Blockierte Züge:** Würde eine Ware in einem Paket landen, das sie einem anderen Auftrag wegnimmt (z. B. die letzte Cola ins Getränke-Set, obwohl das Hotel 3 Cola braucht), wird der Zug nicht ausgeführt. Das Paket wackelt und ein Hinweis erklärt: *„Cola wird noch für Hotel Linde gebraucht!“*
6. **Verloren**, wenn kein Zug mehr möglich ist (Ablage voll, nichts passt): *„Packtisch blockiert!“* – Rettung per Extra-Ablage oder Rückgängig.

### Warum Züge blockiert statt bestraft werden (Design-Entscheidung)

Im ersten Testlauf beendete ein harmlos wirkender Zug (zweite Cola ins Getränke-Set) das Level sofort, weil die Cola später fehlte. Regeltechnisch korrekt, für ein Casual-Spiel aber frustrierend: Der Fehler ist schwer vorherzusehen, und danach ist nichts mehr zu retten. Deshalb prüft das Spiel bei jedem Zug, ob die restlichen Waren die restlichen Positionen noch decken können (Heiratssatz von Hall, siehe `findShortage` in `src/game/shop/rules.ts`). Die Spannung kommt aus Platz (Packtische, Ablage), Reihenfolge und verdeckten Waren – nicht aus Fallen. Die Schwierigkeits-Simulation hat solche Züge ohnehin nie gemacht; die Kurve ändert sich dadurch nicht.

## Mystery, Gold, Booster

Wie im Regal-Modus: Nur die oberste Ware eines Stapels ist sichtbar, Gold-Pakete bringen +5 Münzen, wenn die Ware in ein Paket kommt. `hintMode` zeigt auf Verpackungen das Serien-Symbol (Tag 4).

Booster: Rückgängig, **Extra-Ablage**, Lupe, Mischen (bleibt garantiert lösbar). **Neu in beiden Modi:** Ist das Kontingent eines Boosters aufgebraucht, zeigt der Knopf einen Preis (Rückgängig 20, Extra 40, Lupe 30, Mischen 30 Münzen). Ein Tap kauft und setzt ihn sofort ein. Preise in `BOOSTER_PRICES` (`src/game/levels.ts`).

## Belohnungen

- +3 Münzen pro verschicktem Paket, +5 pro Gold-Rarität (beides fliegt sichtbar zum Zähler)
- +10 pro geschafftem Tag, Belohnungstage +20
- Sterne wie im Regal-Modus (3 = ohne Booster)
- Münzen sind eine gemeinsame Geldbörse für beide Modi

## Progression (20 Tage + Endlos)

Konfiguriert in [`src/game/shop/levels.ts`](../src/game/shop/levels.ts), Werte mit `npm run shop:report`. Gewinnquote = simulierter, aufmerksamer, aber unwissender Spieler ohne Booster.

| Tag | Waren | Aufträge (Sammel/Serie/Wunsch) | Packtische | Ablage | Mystery | Gold | Besonderheit | Gewinnquote |
|---|---|---|---|---|---|---|---|---|
| 1 | 9 | 3 (3/0/0) | 2 | 2 | – | – | Tutorial | 100 % |
| 2 | 12 | 4 (4/0/0) | 3 | 2 | – | – | Nachrücken | 100 % |
| 3 | 12 | 4 (2/2/0) | 3 | 2 | – | – | **Serien-Sets** | 100 % |
| 4 | 12 | 4 (2/2/0) | 3 | 2 | ✓ | – | **Mystery** + Serien-Hinweis | 100 % |
| 5 | 12 | 4 (3/1/0) | 3 | 2 | ✓ | – | 🎁 Belohnung | 100 % |
| 6 | 15 | 5 (1/2/2) | 3 | 2 | ✓ | – | **Wunschlisten** | 63 % |
| 7 | 15 | 5 (2/2/1) | 3 | 1 | ✓ | – | 1 Ablageplatz | 65 % |
| 8 | 18 | 6 (2/2/2) | 2 | 2 | ✓ | – | 2 Packtische | 68 % |
| 9 | 15 | 5 (3/2/0) | 3 | 2 | ✓ | – | 🎁 Belohnung | 100 % |
| 10 | 18 | 6 (2/2/2) | 3 | 2 | ✓ | 2 | **Gold** | 70 % |
| 11 | 18 | 6 (2/2/2) | 3 | 1 | ✓ | 2 | | 42 % |
| 12 | 21 | 7 (1/3/3) | 3 | 2 | ✓ | 2 | | 55 % |
| 13 | 18 | 6 (3/2/1) | 3 | 2 | ✓ | 4 | 🎁 Belohnung | 88 % |
| 14 | 18 | 6 (2/2/2) | 2 | 2 | ✓ | 3 | | 35 % |
| 15 | 21 | 7 (2/3/2) | 3 | 1 | ✓ | 3 | | 45 % |
| 16 | 20 | 5 (1/2/2) | 3 | 2 | ✓ | 3 | 4er-Pakete | 45 % |
| 17 | 18 | 6 (2/2/2) | 3 | 2 | ✓ | 4 | 🎁 Belohnung | 97 % |
| 18 | 21 | 7 (2/2/3) | 2 | 2 | ✓ | 3 | | 20 % |
| 19 | 21 | 7 (1/3/3) | 3 | 1 | ✓ | 3 | | 40 % |
| 20 | 20 | 5 (1/2/2) | 3 | 1 | ✓ | 4 | Finale, 4er-Pakete | 15 % |
| 21+ | Tage 14–20 rotieren mit neuen Seeds | | | | | | | |

**Hebel für die Schwierigkeit:** weniger Packtische › weniger Ablage › mehr Wunschlisten (konkurrieren mit Serien-Sets um dieselben Waren) › größere Pakete.

## Neues Thema anlegen (z. B. Card Shop)

1. Waren-Bilder nach `assets-src/`, Zeilen in `scripts/asset-map.mjs`, `npm run assets:optimize`.
2. Waren-IDs in `src/game/items.ts` und Pfade in `src/assets.ts` ergänzen.
3. `src/game/shop/theme.ts`: Serien (z. B. „Drachen-Edition“, „Wasser-Edition“ mit je 2–4 Waren: Booster, Hülle, Figur …) und Kunden (Händler, Sammler, Turnier-Veranstalter) eintragen.
4. Tage in `src/game/shop/levels.ts` anpassen, `npm run shop:report` und `npm test`.

Regeln, Solver, Generator und UI bleiben unverändert. Für mehrere Themen gleichzeitig (Kapitel) müsste `theme.ts` von einer Konstanten zu einer Auswahl pro Tag werden – siehe [ROADMAP.md](ROADMAP.md).

## Offene Fragen fürs Playtesting

- Ist die Auftragsvorschau (nächste 3 Aufträge) genug Planbarkeit, oder sollte die ganze Liste sichtbar sein?
- Sind Wunschlisten mit 3 verschiedenen Waren auf kleinen Bildschirmen gut lesbar?
- Sollen Packtische zwischendurch wählbar sein („welchen Auftrag nehme ich als Nächstes an?“)?
- Fühlt sich die Blockade („wird noch gebraucht“) hilfreich an oder zu bevormundend? Alternative: nur warnen (orange) statt blockieren.
