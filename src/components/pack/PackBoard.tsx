import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ITEM_IMAGE } from '../../assets';
import type { PackAction } from '../../game/pack/reducer';
import type { PackBox as PackBoxModel, PackGameState } from '../../game/pack/types';
import { useFlip } from '../../hooks/useFlip';
import { DeliveryBox } from '../DeliveryBox';
import { Item } from '../Item';
import { describeNeeds, PackBox } from './PackBox';
import { usePackPlan, useShipGhosts, type PackPlan, type ShipGhost } from './plan';
import { closeAt } from './timeline';

interface PackBoardProps {
  state: PackGameState;
  dispatch: (action: PackAction) => void;
  /** Debug-Hinweis: diese Kiste ist der nächste Lösungszug. */
  hint: number | null;
  xray: boolean;
  tip?: string;
  tipTone?: 'info' | 'warn';
}

/**
 * Vorschau-Karte auf dem Band: Kunde + konkrete Waren (Sammelpaket als "Ware ×n").
 * `leaveAt`: Das Paket ist schon unterwegs zum Packplatz – die Karte bleibt bis dahin
 * stehen und blendet dann aus (das Paket fährt von hier los).
 */
function QueueCard({ box, next, leaveAt }: { box: PackBoxModel; next: boolean; leaveAt?: number }) {
  const uniform = box.needs.every((t) => t === box.needs[0]);
  const leaving = leaveAt !== undefined;
  return (
    <div
      className={`pk-card-pos${leaving ? ' is-leaving' : ''}`}
      data-flip-id={leaving ? undefined : `b${box.id}`}
      data-flip-kind="box"
      style={leaving ? ({ '--leave': `${leaveAt}ms` } as CSSProperties) : undefined}
    >
      <div className={`flip pk-card${next ? ' is-next' : ''}`} role="listitem" aria-label={`${box.customer}: ${describeNeeds(box.needs)}`}>
        <span className="pk-card-avatar" aria-hidden="true">
          {box.avatar}
        </span>
        {uniform ? (
          <>
            <img className="pk-card-icon" src={ITEM_IMAGE[box.needs[0]]} alt="" draggable={false} />
            <span className="pk-card-count">×{box.needs.length}</span>
          </>
        ) : (
          box.needs.map((t, i) => <img key={i} className="pk-card-icon" src={ITEM_IMAGE[t]} alt="" draggable={false} />)
        )}
      </div>
    </div>
  );
}

/** Abfahrende Karten verschwinden nach ihrer Abfahrt; erst dann rückt der Rest auf. */
function useLeavingCards(plan: PackPlan) {
  const [gone, setGone] = useState<{ plan: PackPlan; ids: ReadonlySet<number> }>({ plan, ids: new Set() });
  useEffect(() => {
    const timers = plan.leaving.map((l) =>
      window.setTimeout(
        () => setGone((g) => ({ plan, ids: new Set([...(g.plan === plan ? g.ids : []), l.box.id]) })),
        l.delay + 160,
      ),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [plan]);
  return plan.leaving.filter((l) => !(gone.plan === plan && gone.ids.has(l.box.id)));
}

/** Packband: alle wartenden Pakete in Reihenfolge, dazu der Versand-Fortschritt. */
function Conveyor({ state, leaving }: { state: PackGameState; leaving: PackPlan['leaving'] }) {
  const { queue, shipped, totalBoxes } = state.board;
  return (
    <section className="pk-band" aria-label="Conveyor">
      <span className="pk-progress" aria-label={`${shipped} of ${totalBoxes} parcels shipped`}>
        <span aria-hidden="true">🚚</span> {shipped}/{totalBoxes}
      </span>
      <div className="pk-queue" role="list" aria-label="Waiting parcels">
        {leaving.map((l) => (
          <QueueCard key={`l${l.box.id}`} box={l.box} next={false} leaveAt={l.delay} />
        ))}
        {queue.map((b, i) => (
          <QueueCard key={b.id} box={b} next={i === 0 && leaving.length === 0} />
        ))}
        {queue.length + leaving.length === 0 && <span className="pk-queue-empty">No more parcels</span>}
      </div>
    </section>
  );
}

function Spot({ index, state, ghosts, plan }: { index: number; state: PackGameState; ghosts: ShipGhost[]; plan: PackPlan }) {
  const spot = state.board.spots[index];
  return (
    <div className="pk-spot" data-target={`spot-${index}`}>
      {spot ? (
        <PackBox box={spot.box} filled={spot.filled} plan={plan} />
      ) : (
        <div className="pk-done" style={{ '--delay': `${plan.settleAt}ms` } as CSSProperties}>
          <span aria-hidden="true">✅</span>
          <small>All packed</small>
        </div>
      )}
      {ghosts.map((g) => (
        <PackBox key={g.seq} box={g.box} filled={g.items} plan={plan} close={closeAt(g.chain)} />
      ))}
    </div>
  );
}

/** Packtisch: Zwischenablage für Waren, die (noch) in kein Paket passen. */
function PackTable({ state, plan }: { state: PackGameState; plan: PackPlan }) {
  const { cart } = state.board;
  const free = cart.filter((c) => !c).length;
  return (
    <section className={`pk-table${free === 0 ? ' is-full' : ''}`} aria-label={`Packing table, ${free} of ${cart.length} slots free`}>
      <span className="pk-table-label">Table</span>
      <div className="pk-table-slots" style={{ '--n': cart.length } as CSSProperties}>
        {cart.map((it, i) => (
          <div className="pk-slot" key={i} data-target={`cart-${i}`}>
            {it && <Item item={it} flipDelay={plan.itemDelay.get(it.id)} />}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Spielfeld Packband: Band, Packplätze, Packtisch, darunter die Lagerkisten.
 * Wird pro Versuch neu montiert (key). Geister und abfahrende Karten sind State dieser
 * Komponente; useFlip läuft deshalb hier, damit auch deren Renders animiert werden.
 */
export function PackBoard({ state, dispatch, hint, xray, tip, tipTone = 'info' }: PackBoardProps) {
  const { board } = state;
  const rootRef = useRef<HTMLDivElement>(null);
  const plan = usePackPlan(state.fx, board);
  const ghosts = useShipGhosts(state.fx);
  const leaving = useLeavingCards(plan);
  useFlip(rootRef, 'board');
  const onTapStack = useCallback((index: number) => dispatch({ type: 'TAP_STACK', index }), [dispatch]);
  const onPeekItem = useCallback((itemId: number) => dispatch({ type: 'PEEK_ITEM', itemId }), [dispatch]);

  return (
    <div className="board pk-board" ref={rootRef}>
      <Conveyor state={state} leaving={leaving} />
      <section className={`pk-spots pk-spots--${board.spots.length}`} aria-label="Packing spots">
        {board.spots.map((_, i) => (
          <Spot key={i} index={i} state={state} ghosts={ghosts.filter((g) => g.spot === i)} plan={plan} />
        ))}
      </section>
      <PackTable state={state} plan={plan} />
      <div className="board-bottom">
        {tip && (
          <p className={`tip${tipTone === 'warn' ? ' tip--warn' : ''}`} key={tip} role={tipTone === 'warn' ? 'alert' : undefined}>
            {tip}
          </p>
        )}
        <DeliveryBox
          board={board}
          selection={null}
          peekArmed={state.peekArmed}
          peekItemId={state.peekItemId}
          xray={xray}
          hintSource={hint === null ? null : { kind: 'stack', index: hint }}
          onTapStack={onTapStack}
          onPeekItem={onPeekItem}
        />
      </div>
    </div>
  );
}
