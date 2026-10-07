import { memo, type CSSProperties } from 'react';
import { ITEM_IMAGE } from '../../assets';
import { ITEM_LABEL, type ItemType } from '../../game/items';
import type { Item as ItemModel, PackBox as PackBoxModel } from '../../game/pack/types';
import { Item } from '../Item';
import type { PackPlan } from './plan';

interface PackBoxProps {
  box: PackBoxModel;
  filled: (ItemModel | null)[];
  plan: PackPlan;
  /** Verschickt: klappt bei `close` (ms nach dem Tap) zu und fliegt davon. */
  close?: number;
}

/** Kurzbeschreibung, z. B. "3 × Cola" oder "Brot, Käse, Milch". */
export function describeNeeds(needs: ItemType[]): string {
  const uniform = needs.every((t) => t === needs[0]);
  return uniform ? `${needs.length} × ${ITEM_LABEL[needs[0]]}` : needs.map((t) => ITEM_LABEL[t]).join(', ');
}

interface FaceProps {
  box: PackBoxModel;
  layer: 'shell' | 'contents';
  filled?: (ItemModel | null)[];
  plan?: PackPlan;
  lid?: boolean;
}

/**
 * Dasselbe Layout liegt zweimal übereinander: als Karton (Zettel, Pappe, graue
 * Silhouetten der fehlenden Waren) und nur mit den Waren. So kann der Karton vom Band
 * heranfahren, ohne die Waren mitzunehmen, die noch auf dem Packtisch warten.
 */
function Face({ box, layer, filled, plan, lid }: FaceProps) {
  return (
    <div className="pk-face">
      <div className="pk-ticket">
        <span className="pk-avatar" aria-hidden="true">
          {box.avatar}
        </span>
        <span className="pk-name">{box.customer}</span>
      </div>
      <div className="pk-package" style={{ '--cols': box.needs.length } as CSSProperties}>
        <div className="pk-grid">
          {box.needs.map((type, j) => {
            const it = filled?.[j];
            return (
              <div className="pk-cell" key={j}>
                {layer === 'shell' ? (
                  <img className="pk-need" src={ITEM_IMAGE[type]} alt="" draggable={false} />
                ) : (
                  it && <Item item={it} flipDelay={plan?.itemDelay.get(it.id)} />
                )}
              </div>
            );
          })}
        </div>
        {lid && (
          <>
            <span className="flap flap-top" />
            <span className="flap flap-bottom" />
            <span className="tape" />
            <span className="ship-label">✓</span>
          </>
        )}
      </div>
    </div>
  );
}

/** Kundenpaket am Packplatz (aktiv oder als verschickter "Geist"). */
export const PackBox = memo(function PackBox({ box, filled, plan, close }: PackBoxProps) {
  const ghost = close !== undefined;
  return (
    <div
      className={`pk-box${ghost ? ' is-ghost' : ''}`}
      style={ghost ? ({ '--close': `${close}ms` } as CSSProperties) : undefined}
      role={ghost ? undefined : 'img'}
      aria-label={ghost ? undefined : `Parcel for ${box.customer}: ${describeNeeds(box.needs)}`}
      aria-hidden={ghost || undefined}
    >
      <div className="pk-shell" data-flip-id={`b${box.id}`} data-flip-kind="box" data-flip-delay={plan.boxDelay.get(box.id)}>
        <div className="flip">
          <Face box={box} layer="shell" />
        </div>
      </div>
      <div className="pk-contents">
        <Face box={box} layer="contents" filled={filled} plan={plan} lid={ghost} />
      </div>
    </div>
  );
});
