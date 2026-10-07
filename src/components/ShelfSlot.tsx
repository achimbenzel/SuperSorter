import { memo, type CSSProperties } from 'react';
import { BOARD_IMAGE, UI_IMAGE } from '../assets';
import { isSlotSolved } from '../game/rules';
import type { Slot } from '../game/types';
import { Item } from './Item';

interface ShelfSlotProps {
  index: number;
  slot: Slot;
  /** Ausgewähltes Item würde hier hineinpassen -> dezent grün hervorheben. */
  validTarget: boolean;
  /** Debug-Hinweis: Ziel des nächsten Lösungszugs. */
  hinted: boolean;
  onTap: (index: number) => void;
}

/** Sterne, die beim Lösen aus dem Fach fliegen (Richtung in % der Fachbreite). */
const STARS = [
  { x: -60, y: -70, s: 0.9, d: 0 },
  { x: 55, y: -80, s: 1, d: 60 },
  { x: -15, y: -105, s: 0.7, d: 120 },
  { x: 80, y: -20, s: 0.6, d: 40 },
  { x: -85, y: -15, s: 0.65, d: 90 },
];

/**
 * Ein Regalfach. Items stehen nebeneinander auf dem Regalbrett; das zuletzt
 * eingeräumte (rechte) Item gilt als "oberstes". Gelöste Fächer leuchten, zeigen
 * ein Schloss und nehmen nichts mehr an. Geschlossene Fächer tragen eine Abdeckung,
 * die beim Öffnen wegklappt.
 */
export const ShelfSlot = memo(function ShelfSlot({ index, slot, validTarget, hinted, onTap }: ShelfSlotProps) {
  const solved = isSlotSolved(slot);
  const classes = [
    'slot',
    solved && 'is-solved',
    slot.closed && 'is-closed',
    validTarget && 'is-valid',
    hinted && 'is-hint',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      data-target={`slot-${index}`}
      style={{ '--cap': slot.capacity } as CSSProperties}
      onClick={() => onTap(index)}
      aria-label={`Shelf ${index + 1}${solved ? ', complete' : slot.closed ? ', closed' : ''}`}
    >
      <img className="slot-bg" src={BOARD_IMAGE.shelfSlot} alt="" />
      <span className="slot-glow" />
      <span className="slot-valid" />
      {slot.items.map((it, j) => (
        <Item key={it.id} item={it} style={{ '--j': j } as CSSProperties} />
      ))}
      {solved && (
        <>
          <span className="slot-shine" />
          <span className="slot-burst" />
          <img className="slot-lock" src={UI_IMAGE.lock} alt="" />
          {STARS.map((st, i) => (
            <img
              key={i}
              className="slot-star"
              src={UI_IMAGE.star}
              alt=""
              style={{ '--x': `${st.x}%`, '--y': `${st.y}%`, '--s': st.s, '--d': `${st.d}ms` } as CSSProperties}
            />
          ))}
        </>
      )}
      <span className="slot-cover" aria-hidden={!slot.closed}>
        <span className="slot-cover-sign">
          Geschlossen
          <small>opens when a shelf is full</small>
        </span>
      </span>
    </button>
  );
});
