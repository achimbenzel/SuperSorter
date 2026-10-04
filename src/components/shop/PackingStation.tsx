import { memo, type CSSProperties } from 'react';
import type { Item as ItemModel, Order, Station } from '../../game/shop/types';
import { Item, type ItemDecorator } from '../Item';
import { RequirementIcon } from './RequirementIcon';

export interface ShipGhost {
  seq: number;
  station: number;
  order: Order;
  items: ItemModel[];
}

interface PackingStationProps {
  index: number;
  station: Station;
  /** Gerade verschickte Pakete dieser Station (fliegen davon). */
  ghosts: ShipGhost[];
  /** Ausgewählte Ware passt hier hinein. */
  valid: boolean;
  /** Debug-Hinweis: Ziel des nächsten Lösungszugs. */
  hinted: boolean;
  /** Packtische nebeneinander (bestimmt die Spaltenzahl im Paket). */
  stationCount: number;
  decorate: ItemDecorator;
  onTap: (index: number) => void;
}

const KIND_LABEL: Record<Order['kind'], string> = {
  bulk: 'Sammelbestellung',
  series: 'Serien-Set',
  list: 'Wunschliste',
};

function columns(size: number, stationCount: number): number {
  return stationCount <= 2 ? Math.min(size, 3) : Math.min(size, 2);
}

function Ticket({ order }: { order: Order }) {
  return (
    <div className={`ticket ticket--${order.kind}`} title={KIND_LABEL[order.kind]}>
      <span className="ticket-avatar" aria-hidden="true">
        {order.avatar}
      </span>
      <span className="ticket-name">{order.customer}</span>
    </div>
  );
}

function Package({
  order,
  filled,
  cols,
  decorate,
  closing,
}: {
  order: Order;
  filled: (ItemModel | null)[];
  cols: number;
  decorate: ItemDecorator;
  closing?: boolean;
}) {
  return (
    <div className={`package${closing ? ' is-closing' : ''}`} style={{ '--cols': cols } as CSSProperties}>
      <div className="package-grid">
        {order.needs.map((req, j) => {
          const it = filled[j];
          return (
            <div className={`req${it ? ' is-filled' : ''}`} key={j}>
              {it ? <Item item={it} {...decorate(it)} /> : <RequirementIcon req={req} />}
            </div>
          );
        })}
      </div>
      {closing && (
        <>
          <span className="flap flap-top" />
          <span className="flap flap-bottom" />
          <span className="tape" />
          <span className="ship-label">✓</span>
        </>
      )}
    </div>
  );
}

/**
 * Packstation: Auftragszettel (Kunde) + offenes Paket mit Positionen. Fehlende Waren
 * erscheinen als Silhouetten. Wird ein Paket verschickt, legt sich eine "Geist"-Ebene
 * mit dem vollen Paket darüber: Klappen zu, Klebeband, Häkchen, davonfliegen – während
 * darunter der nächste Auftrag hereinrutscht.
 */
export const PackingStation = memo(function PackingStation({
  index,
  station,
  ghosts,
  valid,
  hinted,
  stationCount,
  decorate,
  onTap,
}: PackingStationProps) {
  const order = station.order;
  const arriving = ghosts.length > 0;
  const classes = ['station', valid && 'is-valid', hinted && 'is-hint', !order && 'is-idle'].filter(Boolean).join(' ');
  const label = order ? `${KIND_LABEL[order.kind]} für ${order.customer}` : 'Packtisch frei';

  return (
    <button type="button" className={classes} data-target={`station-${index}`} onClick={() => onTap(index)} aria-label={label}>
      {order ? (
        <div className={`station-body${arriving ? ' is-arriving' : ''}`} key={order.id}>
          <Ticket order={order} />
          <Package order={order} filled={station.filled} cols={columns(order.needs.length, stationCount)} decorate={decorate} />
        </div>
      ) : (
        <div className={`station-body station-done${arriving ? ' is-arriving' : ''}`} key="done">
          <span aria-hidden="true">🎉</span>
          <small>Alles verschickt</small>
        </div>
      )}
      {ghosts.map((g) => (
        <div className="station-ghost" key={g.seq} aria-hidden="true">
          <Ticket order={g.order} />
          <Package order={g.order} filled={g.items} cols={columns(g.order.needs.length, stationCount)} decorate={decorate} closing />
        </div>
      ))}
    </button>
  );
});
