import type { Order } from '../../game/shop/types';
import { RequirementIcon } from './RequirementIcon';

interface OrderRailProps {
  queue: Order[];
  shipped: number;
  total: number;
}

const MAX_VISIBLE = 3;

/** Kompakte Darstellung eines Auftrags: Sammel/Serie als "Symbol ×n", Wunschliste einzeln. */
function MiniOrder({ order }: { order: Order }) {
  const uniform = order.kind !== 'list';
  return (
    <div className="rail-order" title={`${order.customer}`}>
      <span className="rail-avatar" aria-hidden="true">
        {order.avatar}
      </span>
      {uniform ? (
        <>
          <RequirementIcon req={order.needs[0]} className="is-mini" />
          <span className="rail-count">×{order.needs.length}</span>
        </>
      ) : (
        order.needs.map((r, i) => <RequirementIcon key={i} req={r} className="is-mini" />)
      )}
    </div>
  );
}

/** Auftragsvorschau: verschickte Pakete und die nächsten wartenden Aufträge. */
export function OrderRail({ queue, shipped, total }: OrderRailProps) {
  return (
    <section className="rail" aria-label="Aufträge">
      <span className="rail-progress" aria-label={`${shipped} von ${total} Paketen verschickt`}>
        📦 {shipped}/{total}
      </span>
      {queue.length === 0 ? (
        <span className="rail-empty">Keine weiteren Aufträge</span>
      ) : (
        <>
          <span className="rail-label">Danach:</span>
          {queue.slice(0, MAX_VISIBLE).map((o) => (
            <MiniOrder key={o.id} order={o} />
          ))}
          {queue.length > MAX_VISIBLE && <span className="rail-more">+{queue.length - MAX_VISIBLE}</span>}
        </>
      )}
    </section>
  );
}
