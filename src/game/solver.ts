// Solver: Prüft, ob ein Board lösbar ist, und liefert eine Lösung (Zugfolge).
//
// Verfahren: Tiefensuche (DFS) mit Zustands-Hashing ("schon gesehen und
// gescheitert") und Tiefenlimit. Der Solver kennt auch verdeckte Items
// (volle Information) – er beantwortet also "Gibt es überhaupt einen Weg?".
// Wie schwer das Level für einen Menschen ohne diese Information ist, schätzt
// der Generator separat über Zufallsspiele (siehe generator.ts).
//
// Warum DFS statt BFS? Wir brauchen *irgendeine* Lösung, nicht die kürzeste.
// DFS mit guter Zugreihenfolge findet sie meist im ersten Anlauf und braucht
// kaum Speicher. Weil jeder Zug ein Item endgültig weiterbewegt (Karton -> Wagen
// -> Fach, nie zurück), gibt es keine Zyklen und die Tiefe ist durch 2 × Itemzahl
// begrenzt. Das Tiefenlimit ist trotzdem als Sicherheitsnetz vorhanden.
//
// Drei Tricks halten den Suchraum klein:
// 1. Kanonischer Zustandsschlüssel: Welches leere Fach oder welcher freie
//    Wagenplatz benutzt wird, ist egal -> Wagen und Teilfächer werden sortiert gehasht.
// 2. Sichere Züge ohne Verzweigung: Muss ein Typ nur noch ein einziges Fach füllen
//    und ist es schon angefangen, kann das Einräumen dorthin eine Lösung nie
//    verhindern (alle restlichen Items dieses Typs müssen ohnehin dorthin).
//    Solche Züge werden ohne Alternativen ausgeführt. (Für Typen mit 2+ offenen
//    Fächern gilt das nicht – der Referenz-Test in solver.test.ts hat das gezeigt.)
// 3. Pruning: Würde ein Typ in mehr Fächer verteilt als er füllen kann
//    (siehe rules.findHopelessType), wird der Zweig gar nicht erst betreten.

import type { Board, Move } from './types';

export interface SolveOptions {
  /** Max. Anzahl untersuchter Zustände, danach gilt das Ergebnis als "unbekannt". */
  maxNodes?: number;
  /** Max. Suchtiefe (Züge). Standard: 2 × Itemzahl + 4. */
  maxDepth?: number;
}

export interface SolveResult {
  /** true = Lösung gefunden, false = beweisbar unlösbar, null = Budget erschöpft */
  solvable: boolean | null;
  moves: Move[];
  nodes: number;
}

/** Kompakte, veränderliche Darstellung für die Suche (Typen als Zahlen). */
interface SState {
  heights: number[];
  cart: number[]; // Typ-Index oder -1
  slotType: number[]; // Typ-Index oder -1 (leer)
  slotCount: number[];
  slotClosed: boolean[];
}

interface Static {
  stackTypes: number[][];
  stackHidden: boolean[][];
  capacity: number;
  /** Anzahl Fächer, die jeder Typ insgesamt füllen muss. */
  slotsNeeded: number[];
}

const DEFAULT_MAX_NODES = 250_000;

export function solve(board: Board, options: SolveOptions = {}): SolveResult {
  const { st, state, typeCount } = encode(board);
  const totalItems = board.stacks.reduce((n, s) => n + s.length, 0) + board.cart.filter(Boolean).length;
  const maxDepth = options.maxDepth ?? totalItems * 2 + 4;
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;

  const failed = new Set<string>();
  const path: Move[] = [];
  let nodes = 0;
  let budgetHit = false;

  // Bereits verlorenes Board?
  if (isHopeless(st, state, typeCount)) return { solvable: false, moves: [], nodes: 0 };

  const dfs = (s: SState, depth: number): boolean => {
    if (isSolved(s)) return true;
    if (depth >= maxDepth) {
      budgetHit = true;
      return false;
    }
    if (++nodes > maxNodes) {
      budgetHit = true;
      return false;
    }
    const key = keyOf(s);
    if (failed.has(key)) return false;

    for (const mv of candidateMoves(st, s)) {
      const next = apply(st, s, mv);
      if (isHopeless(st, next, typeCount)) continue;
      path.push(mv);
      if (dfs(next, depth + 1)) return true;
      path.pop();
      if (budgetHit) return false;
    }
    failed.add(key);
    return false;
  };

  const ok = dfs(state, 0);
  if (ok) return { solvable: true, moves: path.slice(), nodes };
  return { solvable: budgetHit ? null : false, moves: [], nodes };
}

/** Nächster Zug einer Lösung vom aktuellen Board aus (für Debug-Hinweise). */
export function nextHint(board: Board, options?: SolveOptions): Move | null {
  const res = solve(board, options);
  return res.solvable ? (res.moves[0] ?? null) : null;
}

// ---------------------------------------------------------------------------
// Kodierung

function encode(board: Board): { st: Static; state: SState; typeCount: number } {
  const typeIndex = new Map<string, number>();
  const idx = (t: string) => {
    let i = typeIndex.get(t);
    if (i === undefined) {
      i = typeIndex.size;
      typeIndex.set(t, i);
    }
    return i;
  };
  const totals: number[] = [];
  const count = (i: number) => (totals[i] = (totals[i] ?? 0) + 1);

  const stackTypes = board.stacks.map((s) => s.map((it) => idx(it.type)));
  const stackHidden = board.stacks.map((s) => s.map((it) => it.hidden));
  stackTypes.flat().forEach(count);
  const cart = board.cart.map((c) => (c ? idx(c.type) : -1));
  cart.filter((c) => c >= 0).forEach(count);
  const slotType = board.slots.map((s) => (s.items.length ? idx(s.items[0].type) : -1));
  board.slots.forEach((s) => s.items.forEach((it) => count(idx(it.type))));

  const capacity = board.slots[0]?.capacity ?? 1;
  const typeCount = typeIndex.size;
  const slotsNeeded = Array.from({ length: typeCount }, (_, i) => Math.ceil((totals[i] ?? 0) / capacity));

  return {
    st: { stackTypes, stackHidden, capacity, slotsNeeded },
    state: {
      heights: board.stacks.map((s) => s.length),
      cart,
      slotType,
      slotCount: board.slots.map((s) => s.items.length),
      slotClosed: board.slots.map((s) => s.closed),
    },
    typeCount,
  };
}

function keyOf(s: SState): string {
  const cart = s.cart.filter((c) => c >= 0).sort((a, b) => a - b);
  const partial: number[] = [];
  for (let i = 0; i < s.slotType.length; i++) {
    if (s.slotType[i] >= 0) partial.push(s.slotType[i] * 16 + s.slotCount[i]);
  }
  partial.sort((a, b) => a - b);
  // Gelöste/geschlossene/leere Fächer ergeben sich aus den restlichen Items -> nicht im Schlüssel.
  return `${s.heights.join(',')}|${cart.join(',')}|${partial.join(',')}`;
}

function isSolved(s: SState): boolean {
  return s.heights.every((h) => h === 0) && s.cart.every((c) => c < 0);
}

/** Länge des mitnehmbaren Laufs oben auf Stapel i (oberstes ist immer sichtbar). */
function runLength(st: Static, s: SState, i: number): number {
  const h = s.heights[i];
  const types = st.stackTypes[i];
  const top = types[h - 1];
  let run = 1;
  for (let j = h - 2; j >= 0; j--) {
    if (st.stackHidden[i][j] || types[j] !== top) break;
    run++;
  }
  return run;
}

function isSlotFull(st: Static, s: SState, i: number): boolean {
  return s.slotCount[i] >= st.capacity;
}

function isHopeless(st: Static, s: SState, typeCount: number): boolean {
  const partial = new Array<number>(typeCount).fill(0);
  const solved = new Array<number>(typeCount).fill(0);
  for (let i = 0; i < s.slotType.length; i++) {
    const t = s.slotType[i];
    if (t < 0) continue;
    if (isSlotFull(st, s, i)) solved[t]++;
    else partial[t]++;
  }
  for (let t = 0; t < typeCount; t++) {
    if (partial[t] > st.slotsNeeded[t] - solved[t]) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Züge

function candidateMoves(st: Static, s: SState): Move[] {
  // Gelöste Fächer pro Typ und angefangene (nicht volle) Fächer pro Typ.
  const solvedOf = new Map<number, number>();
  const partialsOf = new Map<number, number[]>();
  for (let i = 0; i < s.slotType.length; i++) {
    const t = s.slotType[i];
    if (t < 0) continue;
    if (isSlotFull(st, s, i)) solvedOf.set(t, (solvedOf.get(t) ?? 0) + 1);
    else partialsOf.set(t, [...(partialsOf.get(t) ?? []), i]);
  }
  const emptyOpen = s.slotType.findIndex((t, i) => t < 0 && !s.slotClosed[i]);
  const freeCart = s.cart.findIndex((c) => c < 0);

  // Quellen: jeder nichtleere Stapel; im Wagen pro Typ nur ein Platz (gleiche Typen sind austauschbar).
  const sources: { from: Move['from']; type: number }[] = [];
  for (let i = 0; i < s.heights.length; i++) {
    if (s.heights[i] > 0) sources.push({ from: { kind: 'stack', index: i }, type: st.stackTypes[i][s.heights[i] - 1] });
  }
  const cartTypes = new Set<number>();
  for (let c = 0; c < s.cart.length; c++) {
    const t = s.cart[c];
    if (t < 0 || cartTypes.has(t)) continue;
    cartTypes.add(t);
    sources.push({ from: { kind: 'cart', index: c }, type: t });
  }

  // 1) Sicherer Zug: Muss ein Typ nur noch genau EIN Fach füllen und ist dieses schon
  //    angefangen, dann gehören alle restlichen Items dieses Typs genau dorthin.
  //    Jetzt einräumen kann eine Lösung nie verhindern (es gibt keine Alternative,
  //    früheres Lösen öffnet höchstens früher ein neues Fach) -> keine Verzweigung nötig.
  //    Achtung: Bei Typen, die noch 2+ Fächer füllen müssen, gilt das NICHT – dort
  //    entscheidet die Reihenfolge, welche Items welches Fach füllen (siehe Tests).
  for (const src of sources) {
    const partials = partialsOf.get(src.type);
    const remaining = st.slotsNeeded[src.type] - (solvedOf.get(src.type) ?? 0);
    if (partials && partials.length === 1 && remaining === 1) {
      return [{ from: src.from, to: { kind: 'slot', index: partials[0] } }];
    }
  }

  // 2) Verzweigungen. Reihenfolge = Heuristik: angefangene Fächer auffüllen,
  //    neue Fächer anfangen, zuletzt in den Wagen parken.
  const moves: Move[] = [];
  for (const src of sources) {
    for (const p of partialsOf.get(src.type) ?? []) moves.push({ from: src.from, to: { kind: 'slot', index: p } });
  }
  if (emptyOpen >= 0) {
    for (const src of sources) moves.push({ from: src.from, to: { kind: 'slot', index: emptyOpen } });
  }
  if (freeCart >= 0) {
    for (const src of sources) {
      if (src.from.kind === 'stack') moves.push({ from: src.from, to: { kind: 'cart', index: freeCart } });
    }
  }
  return moves;
}

function apply(st: Static, s: SState, mv: Move): SState {
  const next: SState = {
    heights: s.heights.slice(),
    cart: s.cart.slice(),
    slotType: s.slotType.slice(),
    slotCount: s.slotCount.slice(),
    slotClosed: s.slotClosed,
  };
  let type: number;
  let available: number;
  if (mv.from.kind === 'stack') {
    const i = mv.from.index;
    type = st.stackTypes[i][s.heights[i] - 1];
    available = runLength(st, s, i);
  } else {
    type = s.cart[mv.from.index];
    available = 1;
  }

  let n: number;
  if (mv.to.kind === 'cart') {
    n = 1;
    next.cart[mv.to.index] = type;
  } else {
    const t = mv.to.index;
    n = Math.min(available, st.capacity - s.slotCount[t]);
    next.slotType[t] = type;
    next.slotCount[t] += n;
    if (next.slotCount[t] >= st.capacity) {
      // Fach gelöst -> nächstes geschlossenes Fach öffnet sich (wie rules.applyMove).
      const closed = s.slotClosed.indexOf(true);
      if (closed >= 0) {
        next.slotClosed = s.slotClosed.slice();
        next.slotClosed[closed] = false;
      }
    }
  }

  if (mv.from.kind === 'stack') next.heights[mv.from.index] -= n;
  else next.cart[mv.from.index] = -1;
  return next;
}
