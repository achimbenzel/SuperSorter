import type { CSSProperties } from 'react';
import { ITEM_IMAGE } from '../../assets';
import { ITEM_LABEL } from '../../game/items';
import { SERIES } from '../../game/shop/theme';
import type { Requirement } from '../../game/shop/types';

/**
 * Offene Auftragsposition: bestimmte Ware als graue Silhouette, Serien-Position als
 * gestrichelter Kreis in Serienfarbe mit Symbol.
 */
export function RequirementIcon({ req, className = '' }: { req: Requirement; className?: string }) {
  if (req.kind === 'type') {
    return <img className={`req-ghost ${className}`} src={ITEM_IMAGE[req.type]} alt={ITEM_LABEL[req.type]} draggable={false} />;
  }
  const s = SERIES[req.series];
  return (
    <span className={`req-series ${className}`} style={{ '--badge': s.color } as CSSProperties} title={`irgendeine Ware: ${s.label}`}>
      {s.icon}
    </span>
  );
}
