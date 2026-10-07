import type { Slot, TargetRef } from '../game/types';
import { ShelfSlot } from './ShelfSlot';

interface ShelfProps {
  slots: Slot[];
  validTargets: TargetRef[];
  hintTarget: TargetRef | null;
  onTapSlot: (index: number) => void;
}

/** Das Regal: Holzrahmen mit 2 Spalten Fächern (ungerade Anzahl -> letztes zentriert). */
export function Shelf({ slots, validTargets, hintTarget, onTapSlot }: ShelfProps) {
  return (
    <section className="shelf" aria-label="Shelf" style={{ '--cap': slots[0]?.capacity ?? 3 } as React.CSSProperties}>
      {slots.map((slot, i) => (
        <ShelfSlot
          key={i}
          index={i}
          slot={slot}
          validTarget={validTargets.some((t) => t.kind === 'slot' && t.index === i)}
          hinted={hintTarget?.kind === 'slot' && hintTarget.index === i}
          onTap={onTapSlot}
        />
      ))}
    </section>
  );
}
