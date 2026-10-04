# Game Design – Super Sorter (Regal-Modus)

> Es gibt zwei Spielprinzipien. Dieses Dokument beschreibt den **Regal-Modus** (das ursprüngliche Konzept). Der neuere **Onlineshop-Modus** (Pakete packen und verschicken) steht in [SHOP_MODE.md](SHOP_MODE.md). Booster, Mystery, Gold und Münzen funktionieren in beiden gleich.

Sortier-Puzzle im Supermarkt nach dem Prinzip *Water Sort / Magic Sort*: Eine Lieferung kommt im Karton an und muss sortenrein ins Regal geräumt werden. Ein Level dauert 30–60 Sekunden.

## Bildschirmaufbau (Hochformat, Daumenbedienung)

```
┌──────────────────────────────┐
│ [Level 12]        [↻] [🪙 45] │  HUD: Level, Neustart, Münzen
│ ┌──────────┐ ┌──────────┐    │
│ │ Fach 1   │ │ Fach 2   │    │  Regal: 3–6 Fächer, Kapazität 3 oder 4
│ ├──────────┤ ├──────────┤    │  geschlossene Fächer tragen eine Abdeckung
│ │ Fach 3   │ │Geschlossen│   │
│ └──────────┘ └──────────┘    │
│        (Hinweistext)         │
│   ▲  ▲  ▲  ▲          ┌──┐   │
│   ?  ?  ?  ?          │🛒│   │  Lieferkarton: 3–4 Stapel   Einkaufswagen:
│  [ Karton    ]        │  │   │  oben offen, darunter        1–2 Puffer-Plätze
│                       └──┘   │  verpackt
│  [Undo][Extra][Lupe][Mischen]│  Booster-Leiste
└──────────────────────────────┘
```

## Steuerung: nur Tippen

| Aktion | Ergebnis |
|---|---|
| Tap auf einen Karton-Stapel | Oberstes Item (bzw. alle gleichen sichtbaren obersten Items) heben sich an und leuchten. Gültige Ziele leuchten grün. |
| Tap auf Wagen-Item | Wählt dieses Item aus. |
| Tap auf dieselbe Auswahl | Auswahl wird aufgehoben. |
| Tap auf anderes Item | Auswahl wechselt. |
| Tap auf Regalfach | Item(s) hüpfen im Bogen hinein. Ungültig → Fach und Auswahl wackeln, kein Zug. |
| Tap auf freien Wagenplatz | Ausgewähltes Item wird dort abgestellt (immer nur eins). |

**Multi-Move:** Liegen oben auf einem Stapel mehrere gleiche *sichtbare* Items, wandern alle mit, soweit im Ziel Platz ist. Verdeckte Items wandern nie mit (der Spieler kennt sie nicht).

## Regeln

1. Ein Item darf in ein Regalfach, wenn das Fach **offen** ist und **leer** ist oder das oberste Item **denselben Typ** hat und noch Platz ist. Dadurch ist jedes Fach immer sortenrein.
2. Items im Regal bleiben dort (nur Undo holt sie zurück).
3. Ein Fach, das voll mit identischen Items ist, ist **gelöst**: gesperrt, Glow, Sterne, Schloss-Icon, Items bleiben sichtbar.
4. **Jedes gelöste Fach öffnet das nächste geschlossene Fach.**
5. **Gewonnen**, wenn Karton und Wagen leer und alle Items in gelösten Fächern sind.
6. **Verloren**, wenn
   - *Deadlock*: kein gültiger Zug mehr existiert (Wagen voll, kein Item passt ins Regal), oder
   - *Sackgasse*: eine Sorte liegt in mehr Fächern, als sie füllen kann. Dann ist der Sieg mathematisch unmöglich, auch wenn noch Züge gingen. Das erspart sinnloses Weiterspielen.
   Der Lose-Screen bietet **Extra-Platz (Booster)** (nur bei Deadlock), **Rückgängig** und **Nochmal**.

### Warum geschlossene Fächer? (wichtigste Design-Annahme)

Die Vorgabe kombiniert drei Regeln: Fächer sind sortenrein, Items verlassen das Regal nie, und gelöste Fächer bleiben belegt. Daraus folgt, dass jede Sorte ein eigenes Fach braucht. Wären von Anfang an alle Fächer offen, könnte ein aufmerksamer Spieler **nie verlieren**: Jedes sichtbare Item passt entweder in „sein“ angefangenes Fach oder in ein leeres. Es gäbe keine Deadlocks, und der Solver hätte nichts zu verwerfen.

Lösung im Sinne der Vorgabe: **Zu Beginn sind nur einige Fächer offen.** Jedes gelöste Fach öffnet ein weiteres. Damit entsteht echte Spannung: Welche Sorte fange ich an, welche parke ich im Wagen, und was liegt unter dem Packpapier? Alle Regeln aus der Vorgabe gelten unverändert, gelöste Fächer bleiben sichtbar und gesperrt. Level 1–5 haben noch alle Fächer offen (Einstieg). Ab Level 6 kommen geschlossene Fächer dazu.

*Alternative, falls sich das nicht gut anfühlt:* Gelöste Fächer werden „abkassiert“ und leeren sich (Goods-Sort-Prinzip). Dafür wären zwei Stellen anzupassen: `rules.applyMove` (Fach leeren statt nächstes Fach öffnen, Siegbedingung) und die kompakte Spiegelung der Regeln im Solver (`solver.ts → apply`, `isHopeless`). Der Referenz-Test in `solver.test.ts` deckt sofort auf, wenn beide auseinanderlaufen. Generator und UI bleiben unverändert.

## Mystery-Layering

- Jeder Karton-Stapel zeigt nur das oberste Item offen, alles darunter ist in Packpapier mit grauem Fragezeichen gewickelt.
- Wird das oberste Item entfernt, reißt das Papier des nächsten auf (Papier skaliert und verblasst, Fetzen fliegen, das Item ploppt auf).
- **Gold-Pakete** (ab Level 10): Manche verdeckten Items sind golden verpackt. Nach dem Auspacken tragen sie ein Münz-Badge. Sobald ein goldenes Item in ein Regalfach gelegt wird, gibt es **+5 Münzen** (Münzen fliegen zum Zähler). Gutgeschrieben wird beim Sieg; Undo nimmt den Bonus zurück, damit er nicht mehrfach kassiert werden kann.
- **`hintMode`** (Level-Flag, Standard: aus): Verpackte Items zeigen ihre Kategorie als Symbol (🥤 Getränke, 🍿 Snacks, 🍎 Obst, 🥖 Backwaren, 🧀 Milchprodukte). Aktiv in Level 4 als Einstieg in Mystery.

## Booster

Kontingent pro Level (Zähler-Badge in der Leiste). Ist es aufgebraucht, zeigt der Knopf einen Preis und kann für Münzen nachgekauft werden (`BOOSTER_PRICES` in `src/game/levels.ts`: Undo 20, Extra 40, Lupe 30, Mischen 30):

| Booster | Standard | Wirkung |
|---|---|---|
| **Undo** | 3 | Macht den letzten Zug rückgängig (mehrere Schritte). Gold-Bonus wird zurückgenommen, ein per Booster erzeugter Wagenplatz bleibt. Auch aus dem Lose-Screen nutzbar. |
| **Extra-Platz** | 1 | +1 Puffer-Platz im Einkaufswagen bis Levelende. Rettet aus einem Deadlock (Lose-Screen-Button). |
| **Lupe** (Scan) | 2 (nur Mystery-Level) | Lupe aktivieren, dann ein verpacktes Paket antippen: Der Inhalt erscheint 2,6 s lang. |
| **Mischen** | 1 | Mischt die Items im Karton neu (Stapelhöhen bleiben). Es werden nur Mischungen akzeptiert, die der Solver als lösbar bestätigt; findet sich keine, wird der Booster nicht verbraucht. |

## Progression (20 Level + Endlos)

Konfiguriert in [`src/game/levels.ts`](../src/game/levels.ts). Die Gewinnquote ist die simulierte Erfolgsrate eines Gelegenheitsspielers ohne Wissen über verdeckte Items und ohne Booster (siehe [ARCHITECTURE.md](ARCHITECTURE.md#generator)). Echte Spieler mit Undo, Lupe und Planung liegen deutlich höher.

| Level | Typen | Kap. | Items | Fächer (offen) | Stapel | Wagen | Mystery | Gold | Besonderheit | Gewinnquote |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 3 | 3 | 9 | 3 (3) | 3 | 2 | – | – | Tutorial | 100 % |
| 2 | 3 | 4 | 12 | 3 (3) | 3 | 2 | – | – | Multi-Move | 100 % |
| 3 | 4 | 3 | 12 | 4 (4) | 4 | 2 | – | – | 4 Sorten | 100 % |
| 4 | 4 | 3 | 12 | 4 (4) | 4 | 2 | ✓ | – | **Mystery** + Kategorie-Hinweis | 100 % |
| 5 | 3 | 4 | 12 | 3 (3) | 3 | 2 | ✓ | – | 🎁 Belohnung | 100 % |
| 6 | 4 | 3 | 12 | 4 (3) | 3 | 2 | ✓ | – | **1. geschlossenes Fach** | 85 % |
| 7 | 5 | 3 | 15 | 5 (3) | 4 | 2 | ✓ | – | **mehr Typen** | 88 % |
| 8 | 4 | 4 | 16 | 4 (3) | 4 | 1 | ✓ | – | **1 Pufferplatz weniger** | 73 % |
| 9 | 4 | 3 | 12 | 4 (4) | 4 | 2 | ✓ | – | 🎁 Belohnung | 100 % |
| 10 | 5 | 3 | 15 | 5 (3) | 4 | 1 | ✓ | 2 | **Gold** | 69 % |
| 11 | 5 (1×doppelt) | 3 | 18 | 6 (3) | 4 | 1 | ✓ | 2 | doppelte Sorte | 69 % |
| 12 | 5 | 4 | 20 | 5 (3) | 4 | 2 | ✓ | 2 | | 42 % |
| 13 | 3 (1×doppelt) | 4 | 16 | 4 (4) | 4 | 2 | ✓ | 4 | 🎁 Belohnung | 100 % |
| 14 | 4 | 4 | 16 | 4 (2) | 4 | 2 | ✓ | 2 | 2 geschlossen | 46 % |
| 15 | 5 | 3 | 15 | 5 (2) | 4 | 2 | ✓ | 3 | 3 geschlossen | 50 % |
| 16 | 5 | 4 | 20 | 5 (3) | 4 | 1 | ✓ | 3 | | 33 % |
| 17 | 4 | 4 | 16 | 4 (4) | 4 | 2 | ✓ | 4 | 🎁 Belohnung | 100 % |
| 18 | 5 (1×doppelt) | 3 | 18 | 6 (3) | 4 | 1 | ✓ | 3 | | 27 % |
| 19 | 5 | 4 | 20 | 5 (3) | 4 | 2 | ✓ | 3 | | 23 % |
| 20 | 5 | 4 | 20 | 5 (3) | 4 | 1 | ✓ | 4 | Finale | 25 % |
| 21+ | Level 14–20 rotieren mit neuen Seeds (Endlosmodus) | | | | | | | | | |

Aktuelle Werte jederzeit mit `npm run levels:report`.

**Hebel für die Schwierigkeit** (gemessen, stärkster zuerst): weniger offene Fächer › weniger Wagenplätze › Kapazität 4 statt 3 › mehr Typen. Doppelte Sorten machen es *leichter* (mehr Flexibilität).

## Belohnungen

- Sieg: **+10 Münzen**, Belohnungslevel **+20** extra, Gold-Items **+5** je Stück.
- Sterne: 3 ohne Booster, 2 mit höchstens zwei Boostern, sonst 1.
- Münzen sind eine gemeinsame Geldbörse beider Modi und kaufen Booster nach, wenn das Kontingent leer ist.

## Einführungstexte

Bis zum ersten Zug erscheint unter dem Regal ein kurzer Hinweis, wenn ein Level eine neue Mechanik einführt (Level 1–10, Texte in `LEVEL_TIPS`). Bei aktiver Lupe steht dort „Tippe auf ein verpacktes Paket“.

## Getroffene Annahmen (Übersicht)

| Thema | Annahme |
|---|---|
| Spannung trotz gesperrter Fächer | Geschlossene Fächer, die sich mit jedem gelösten Fach öffnen (siehe oben). |
| Quellen | Nur Karton-Stapel und Wagen sind Quellen, Regalfächer nur Ziele (wie in der Vorgabe beschrieben). Wagen → Wagen ist nicht erlaubt (sinnlos). |
| Darstellung der Fächer | Items stehen nebeneinander auf dem Regalbrett; das zuletzt eingeräumte gilt als „oberstes“. |
| Kapazität | Einheitlich pro Level (3 oder 4). Jede Sorte kommt genau einmal (bzw. bei „doppelt“ zweimal) in Fachkapazität vor. |
| Verloren | Zusätzlich zum Deadlock wird eine nachweisliche Sackgasse sofort erkannt. |
| Extra-Fach-Booster | Umgesetzt als zusätzlicher Wagenplatz (die Vorgabe erlaubt „Extra-Fach / zusätzlicher Puffer-Platz“). Ein zusätzliches Regalfach müsste selbst gelöst werden und würde die Lösbarkeitsgarantie aufweichen. |
| Lupe | Zeigt *ein* gewähltes Paket für 2,6 s. |
| Gold | Bonus beim Ablegen im Fach (nicht erst beim Lösen des Fachs), gutgeschrieben beim Sieg. |
| Lösbarkeit | „Lösbar“ heißt: mit vollem Wissen über verdeckte Items gibt es einen Weg. Ein Spieler kann durch Pech beim Aufdecken trotzdem verlieren; dafür gibt es Undo, Lupe und Mischen. |
| Sprache | UI deutsch; die Booster-Grafiken enthalten englische Beschriftung (Asset-Vorgabe). |
