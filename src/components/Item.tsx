import { memo, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ITEM_IMAGE, MYSTERY_IMAGE, UI_IMAGE } from '../assets';
import { ITEM_LABEL } from '../game/items';
import type { Item as ItemModel } from '../game/types';

/** Aufkleber auf einer offenen Ware (derzeit ungenutzt, z. B. für Serien/Events). */
export interface ItemBadge {
  icon: string;
  color: string;
  label: string;
}

/** Je Ware: Hinweis-Symbol auf der Verpackung (hintMode) und Aufkleber. */
export type ItemDecorator = (item: ItemModel) => { hintIcon?: string; badge?: ItemBadge };

interface ItemProps {
  item: ItemModel;
  /** Angehoben + leuchtend (ausgewählt). */
  selected?: boolean;
  /** Hinweis-Symbol auf der Verpackung (Kategorie bzw. Serie), nur bei verpackten Waren. */
  hintIcon?: string;
  /** Aufkleber auf der offenen Ware. */
  badge?: ItemBadge;
  /** Lupe zeigt dieses verpackte Item gerade. */
  peeked?: boolean;
  /** Lupe ist aktiv und dieses Item kann angetippt werden. */
  peekable?: boolean;
  /** Debug: verpackte Items durchsichtig anzeigen. */
  xray?: boolean;
  /** Flug-Animation erst nach so vielen ms starten (siehe useFlip, Packband-Kette). */
  flipDelay?: number;
  style?: CSSProperties;
}

/** Vier Papierfetzen (Ausschnitte der Verpackung), die beim Aufreißen wegfliegen. */
const SHREDS = [
  { clip: 'polygon(0 0, 55% 0, 40% 45%, 0 60%)', dx: -38, dy: -34, rot: -40 },
  { clip: 'polygon(55% 0, 100% 0, 100% 50%, 45% 40%)', dx: 40, dy: -30, rot: 35 },
  { clip: 'polygon(0 60%, 40% 45%, 55% 100%, 0 100%)', dx: -34, dy: 30, rot: -25 },
  { clip: 'polygon(45% 40%, 100% 50%, 100% 100%, 55% 100%)', dx: 36, dy: 34, rot: 30 },
];

/**
 * Eine Ware. Drei Ebenen (siehe useFlip):
 *   [data-flip-id] -> .flip (Flug-Animation) -> .item (Auswahl-Lift, Reveal, Glow)
 * Positioniert wird das äußere Element vom Elternteil (Stapel, Fach, Wagen).
 */
export const Item = memo(function Item({ item, selected, hintIcon, badge, peeked, peekable, xray, flipDelay, style }: ItemProps) {
  // Reveal erkennen: hidden wechselt von true auf false, solange das Item an seinem Platz bleibt.
  const wasHidden = useRef(item.hidden);
  const [revealKey, setRevealKey] = useState(0);
  const [revealedGold, setRevealedGold] = useState(false);
  useLayoutEffect(() => {
    if (wasHidden.current && !item.hidden) {
      setRevealKey((k) => k + 1);
      setRevealedGold(item.gold);
    }
    wasHidden.current = item.hidden;
  }, [item.hidden, item.gold]);

  const wrap = item.gold ? MYSTERY_IMAGE.gold : MYSTERY_IMAGE.paper;
  const classes = [
    'item',
    item.hidden ? 'is-hidden' : 'is-open',
    item.gold && 'is-gold',
    selected && 'is-selected',
    peekable && item.hidden && 'is-peekable',
    revealKey > 0 && 'is-revealing',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="item-pos" data-flip-id={item.id} data-flip-delay={flipDelay} style={style}>
      <div className="flip">
        <div
          className={classes}
          aria-label={item.hidden ? 'verpackte Ware' : `${ITEM_LABEL[item.type]}${badge ? ` (${badge.label})` : ''}`}
        >
          <span className="item-glow" />
          {item.hidden ? (
            <>
              <img className="item-img" src={wrap} alt="" draggable={false} />
              {hintIcon && <span className="item-hint">{hintIcon}</span>}
              {(peeked || xray) && (
                <span className={`item-xray${peeked ? ' is-peek' : ''}`}>
                  <img src={ITEM_IMAGE[item.type]} alt="" draggable={false} />
                </span>
              )}
            </>
          ) : (
            <>
              <img className="item-img" src={ITEM_IMAGE[item.type]} alt="" draggable={false} />
              {item.gold && <img className="item-gold-badge" src={UI_IMAGE.coin} alt="" />}
              {badge && (
                <span className="item-badge" style={{ '--badge': badge.color } as CSSProperties} title={badge.label}>
                  {badge.icon}
                </span>
              )}
            </>
          )}
          {revealKey > 0 && (
            <span className="tear" key={revealKey} aria-hidden="true">
              <img className="tear-paper" src={revealedGold ? MYSTERY_IMAGE.gold : MYSTERY_IMAGE.paper} alt="" />
              <img className="tear-burst" src={MYSTERY_IMAGE.shreds} alt="" />
              {SHREDS.map((s, i) => (
                <span
                  key={i}
                  className="tear-shred"
                  style={
                    {
                      clipPath: s.clip,
                      WebkitClipPath: s.clip,
                      backgroundImage: `url(${revealedGold ? MYSTERY_IMAGE.gold : MYSTERY_IMAGE.paper})`,
                      '--dx': `${s.dx}%`,
                      '--dy': `${s.dy}%`,
                      '--rot': `${s.rot}deg`,
                    } as CSSProperties
                  }
                />
              ))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
