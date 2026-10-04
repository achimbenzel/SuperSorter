# Packband-Modus („Versand“)

Zweites Spielprinzip neben dem Regal-Modus ([GAME_DESIGN.md](GAME_DESIGN.md)). Im Regal nimmst du **Waren in den Bestand auf**, am Packband **verkaufst** du sie: Kundenpakete laufen auf einem Band an deinen Packplätzen vorbei, du füllst sie aus den Lagerkisten und verschickst sie.

Status: **Prototyp**. Beide Modi sind zum Testen getrennt über das Menü (☰ oben links) wählbar; neue Spieler starten am Packband. Später sollen sich die Modi abwechseln (Wareneingang → Versand → Wareneingang …), siehe [ROADMAP.md](ROADMAP.md).

## Bildschirm

```
┌──────────────────────────────┐
│ [☰] [Tag 6]       [↻] [🪙 45] │  HUD
│ 🚚 1/5 [🏪🥛×3] [⚽🍎×3] [👵🍞🧀🥛] │  Band: ALLE wartenden Pakete, nächstes zuerst
│ ┌─────────────┐┌─────────────┐ │
│ │ 🏨 Hotel     ││ 🧒 Max (12)  │ │  Packplätze: Kunde + Paket mit
│ │ [🥤][🥤][  ] ││ [🍞][  ][  ] │ │  Silhouetten der fehlenden Waren
│ └─────────────┘└─────────────┘ │
│ PACKTISCH [🧀][🍎][  ][  ][  ] │  Ablage für Waren, die (noch) nicht passen
│      ▲    ▲    ▲    ▲         │
│      ?    ?    ?    ?         │  Lagerkisten (oberste Ware sichtbar)
│ [Undo][Extra][Lupe][Misch]    │
└──────────────────────────────┘
```

## Regeln

1. **Ein Tap = ein Zug.** Tippe eine Lagerkiste an: Die oberste Ware wird entnommen.
2. Braucht ein **aktives Paket** sie, fliegt sie hinein (bei zwei Packplätzen in das erste, das sie braucht). Sonst landet sie auf dem **ersten freien Platz des Packtischs**.
3. Ist der Packtisch voll und passt die Ware nirgends, ist der Tap nicht erlaubt (Kiste wackelt, kurzer Hinweis).
4. Ein volles Paket wird **sofort verschickt**. Das nächste Paket vom Band rückt an **denselben** Packplatz.
5. **Kettenreaktion:** Waren auf dem Packtisch springen automatisch ins neue Paket, wenn es sie braucht. Wird es dadurch voll, geht es ebenfalls raus, das nächste rückt nach und so weiter. Mehrere Pakete in einem Zug geben **Kombo-Münzen**.
6. **Geschafft**, wenn alle Pakete verschickt sind (Waren und Paketinhalte passen exakt zusammen). **Verloren**, wenn kein Tap mehr möglich ist – Rettung per Extra-Platz oder Rückgängig.

Pakete:

| Art | Beispiel | ab Tag |
|---|---|---|
| **Sammelpaket** (Geschäftskunde) | Hotel Linde: 3 × Cola | 1 |
| **Gemischtes Paket** (Privatkunde) | Oma Herta: Brot, Käse, Milch | 8 |

Mystery und Gold wie im Regal: Nur die oberste Ware einer Kiste ist sichtbar, darunter liegt Packpapier. Gold-Ware bringt +5 Münzen, sobald sie in einem Paket liegt (auch per Kettenreaktion).

## Was aus dem Onlineshop-Playtest gelernt wurde

Der Vorgänger („Onlineshop“: Ware auswählen, dann Paket antippen, Serien-Sets, blockierte Züge) wurde nach dem ersten Playtest verworfen. Die Kritikpunkte und was das Packband anders macht:

| Problem im Onlineshop | Packband |
|---|---|
| Machte weniger Spaß als das Regal | Ein Tap pro Zug, Kettenreaktionen und Kombos als Belohnungsmoment |
| Vorschau zu klein (nur 3 Aufträge, winzige Symbole) | **Alle** wartenden Pakete auf dem Band, Waren in lesbarer Größe; das nächste ist markiert |
| Blockierter Zug („Käse wird noch für Oma Herta gebraucht“) verriet, was unter dem Packpapier liegt | Keine Blockade mit verdeckten Infos. Ein Tap ist nur ungültig, wenn der Packtisch voll ist und die **sichtbare** Ware nirgends passt |
| Serien-Kategorien (☀️ Frühstück, 🥤 Getränke) ergaben keinen Sinn – Kategorie-Bestellungen wären für den Kunden Mystery-Boxen | Jedes Paket verlangt **konkrete Waren** |

Alle Regeln sind deterministisch und nutzen nur, was der Spieler sieht. Die Spannung kommt aus der Reihenfolge (welche Kiste grabe ich zuerst auf?), dem knappen Packtisch und den verdeckten Waren.

## Booster

Rückgängig, **Extra-Platz** (Packtisch +1, bleibt auch nach Rückgängig), Lupe (verpackte Ware ansehen), Mischen (Waren in den Kisten neu verteilen, garantiert lösbar). Ist das Kontingent leer, zeigt der Knopf einen Preis (Rückgängig 20, Extra 40, Lupe 30, Mischen 30 Münzen).

## Belohnungen

- +3 Münzen pro verschicktem Paket
- **Kombo:** Das 2. Paket im selben Zug bringt +2, das 3. +4, das 4. +6 …
- +5 pro Gold-Ware im Paket
- +10 pro geschafftem Tag, Belohnungstage +20
- Sterne: 3 ohne Booster, 2 mit bis zu zwei, sonst 1
- Münzen sind eine gemeinsame Geldbörse für beide Modi

## Progression (20 Tage + Endlos)

Konfiguriert in [`src/game/pack/levels.ts`](../src/game/pack/levels.ts), Werte mit `npm run pack:report`. Gewinnquote = simulierter Gelegenheitsspieler ohne Booster (tippt passende Waren direkt, parkt sonst bevorzugt Waren für die nächsten zwei Pakete).

| Tag | Waren | Pakete (Sammel/gemischt) | Packplätze | Packtisch | Mystery | Gold | Besonderheit | Gewinnquote |
|---|---|---|---|---|---|---|---|---|
| 1 | 9 | 3 (3/0) | 1 | 5 | – | – | Tutorial | 100 % |
| 2 | 12 | 4 (4/0) | 1 | 5 | – | – | Packtisch erklärt | 100 % |
| 3 | 12 | 4 (4/0) | 1 | 4 | – | – | kleinerer Packtisch | 88 % |
| 4 | 15 | 5 (5/0) | 1 | 5 | ✓ | – | **Mystery** | 100 % |
| 5 | 12 | 4 (4/0) | 1 | 5 | ✓ | – | 🎁 Belohnung | 100 % |
| 6 | 15 | 5 (5/0) | 2 | 5 | ✓ | – | **zwei Packplätze** | 78 % |
| 7 | 15 | 5 (5/0) | 1 | 4 | ✓ | – | Kombo-Tipp | 50 % |
| 8 | 15 | 5 (3/2) | 1 | 5 | ✓ | – | **gemischte Pakete** | 75 % |
| 9 | 12 | 4 (4/0) | 1 | 5 | ✓ | – | 🎁 Belohnung | 97 % |
| 10 | 18 | 6 (4/2) | 2 | 5 | ✓ | 2 | **Gold** | 45 % |
| 11 | 18 | 6 (4/2) | 1 | 4 | ✓ | 2 | | 42 % |
| 12 | 21 | 7 (4/3) | 2 | 4 | ✓ | 2 | | 53 % |
| 13 | 15 | 5 (5/0) | 1 | 5 | ✓ | 4 | 🎁 Belohnung | 100 % |
| 14 | 20 | 5 (3/2) | 1 | 4 | ✓ | 3 | 4er-Pakete | 40 % |
| 15 | 15 | 5 (4/1) | 1 | 3 | ✓ | 3 | 3 Plätze Packtisch | 40 % |
| 16 | 18 | 6 (3/3) | 2 | 4 | ✓ | 3 | | 30 % |
| 17 | 15 | 5 (4/1) | 1 | 5 | ✓ | 4 | 🎁 Belohnung | 90 % |
| 18 | 18 | 6 (4/2) | 1 | 3 | ✓ | 3 | | 42 % |
| 19 | 20 | 5 (2/3) | 1 | 4 | ✓ | 3 | 4er-Pakete | 20 % |
| 20 | 21 | 7 (4/3) | 2 | 3 | ✓ | 4 | Finale | 15 % |
| 21+ | Tage 14–20 rotieren mit neuen Seeds | | | | | | | |

**Hebel für die Schwierigkeit:** kleinerer Packtisch › mehr Waren-Sorten › gemischte Pakete › größere Pakete. Ein zweiter Packplatz macht es eher leichter (mehr Waren passen direkt), dafür muss man zwei Pakete im Blick behalten.

## Technik in Kürze

- Logik: `src/game/pack/` (`rules.ts` mit `applyTap` → Routing, Versand, Nachschub-Schleife `settle`; `solver.ts`, `generator.ts`, `reducer.ts`, `levels.ts`, `customers.ts`). Der Solver nutzt direkt die echten Regeln; ein Test gleicht ihn auf 300 Zufallsboards mit einer erschöpfenden Suche ab.
- UI: `src/modes/PackGame.tsx`, `src/components/pack/` (`PackBoard`, `PackBox`, `plan.ts`, `timeline.ts`), `src/styles/pack.css`.
- Der Reducer wertet einen Tap samt Kettenreaktion sofort aus. Die Anzeige spielt die Kette danach Schritt für Schritt ab (Zeitplan in `timeline.ts`): Paket klappt zu und fliegt weg, das nächste fährt vom Band heran, Waren springen vom Packtisch hinein. Wer währenddessen weitertippt, spult die laufenden Animationen vor.

Details: [ARCHITECTURE.md](ARCHITECTURE.md#packband-modus-srcgamepack).

## Offene Fragen fürs Playtesting

- Ist das Tempo der Kettenreaktion gut (`TIMING.chainStep` = 1150 ms pro Paket) oder zu langsam?
- Fühlt sich „ein Tap = ein Zug“ zu einfach an? Option: Packtisch-Waren antippen, um sie gezielt einem Paket zuzuweisen.
- Lieber Waren-Sorten pro Tag begrenzen (bessere Übersicht) oder mehr Abwechslung?
- Abwechslung mit dem Regal: ein Regal-Level pro Versand-Tag, oder Blöcke (z. B. 3 Tage Versand, dann eine große Lieferung einräumen)?
