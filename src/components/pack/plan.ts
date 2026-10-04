import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TIMING } from '../../config';
import type { Item, PackBoard, PackBox, PackFx } from '../../game/pack/types';
import { arriveAt, feedAt, goneAt } from './timeline';

/**
 * Animationsplan für den letzten Zug: Wer startet wann (FLIP-Verzögerungen).
 * Gilt nur für genau das Board, das der Zug erzeugt hat – Rückgängig, Extra-Platz usw.
 * bewegen Dinge sofort.
 */
export interface PackPlan {
  itemDelay: ReadonlyMap<number, number>;
  boxDelay: ReadonlyMap<number, number>;
  /** Pakete, die in diesem Zug das Band verlassen: Ihre Karten bleiben bis zur Abfahrt stehen. */
  leaving: { box: PackBox; delay: number }[];
  /** Ab wann die Kette ausgespielt ist (End-Screens, "fertig"-Platzhalter). */
  settleAt: number;
}

const IDLE: PackPlan = { itemDelay: new Map(), boxDelay: new Map(), leaving: [], settleAt: 0 };

function buildPlan(fx: PackFx[], board: PackBoard): PackPlan {
  const itemDelay = new Map<number, number>();
  const boxDelay = new Map<number, number>();
  const leaving: PackPlan['leaving'] = [];
  const shipped = fx.filter((e) => e.kind === 'shipped');
  for (const e of fx) if (e.kind === 'fed') for (const id of e.itemIds) itemDelay.set(id, feedAt(e.chain));
  // Zwischenpakete der Kette (Geister) und das Paket, das am Ende stehen bleibt,
  // fahren nacheinander vom Band an den Packplatz.
  const arriving = shipped.filter((e) => e.chain > 0).map((e) => ({ box: e.box, delay: arriveAt(e.chain - 1) }));
  const last = shipped[shipped.length - 1];
  if (!last) return { ...IDLE, itemDelay, settleAt: TIMING.hop };
  const nextBox = board.spots[last.spot]?.box;
  if (nextBox) arriving.push({ box: nextBox, delay: arriveAt(last.chain) });
  for (const a of arriving) {
    boxDelay.set(a.box.id, a.delay);
    leaving.push(a);
  }
  return { itemDelay, boxDelay, leaving, settleAt: goneAt(last.chain) };
}

export function usePackPlan(fx: PackFx[], board: PackBoard): PackPlan {
  // Der Plan gehört zu dem Board, das zusammen mit den Events entstanden ist
  // (bewusst nur von fx abhängig; ein späteres Board ohne neue Events -> IDLE).
  const planned = useMemo(() => ({ board, plan: buildPlan(fx, board) }), [fx]);
  return planned.board === board ? planned.plan : IDLE;
}

/** Verschicktes Paket, das noch zuklappt und davonfliegt. */
export interface ShipGhost {
  seq: number;
  spot: number;
  chain: number;
  box: PackBox;
  items: Item[];
}

/**
 * Verschickte Pakete bleiben als "Geist" über dem Packplatz, bis sie davongeflogen
 * sind (Neustart/neuer Tag montiert das Board neu und verwirft sie).
 * useLayoutEffect: Der Geist erscheint noch vor dem nächsten Frame, damit die letzte
 * Ware sichtbar hineinfliegt (useFlip merkt sich ihre alte Position).
 */
export function useShipGhosts(fx: PackFx[]): ShipGhost[] {
  const handled = useRef(0);
  const timers = useRef<number[]>([]);
  const [ghosts, setGhosts] = useState<ShipGhost[]>([]);

  useLayoutEffect(() => {
    const fresh: ShipGhost[] = [];
    for (const ev of fx) {
      if (ev.seq <= handled.current) continue;
      handled.current = ev.seq;
      if (ev.kind === 'shipped') fresh.push({ seq: ev.seq, spot: ev.spot, chain: ev.chain, box: ev.box, items: ev.items });
    }
    if (fresh.length === 0) return;
    setGhosts((g) => [...g, ...fresh]);
    for (const ghost of fresh) {
      timers.current.push(window.setTimeout(() => setGhosts((g) => g.filter((x) => x.seq !== ghost.seq)), goneAt(ghost.chain) + 80));
    }
  }, [fx]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  return ghosts;
}

/** Wie lange die Kette des letzten Zugs läuft (für Win-/Lose-Screen). */
export function settleTime(fx: PackFx[]): number {
  const ships = fx.filter((e) => e.kind === 'shipped').length;
  return ships > 0 ? goneAt(ships - 1) : TIMING.hop;
}
