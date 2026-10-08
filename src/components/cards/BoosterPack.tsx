import { useMemo } from 'react';
import { cardArt } from '../../assets';

interface BoosterPackProps {
  /** 'idle' schwebt, 'tearing' reißt oben auf und gibt die Karten frei. */
  state: 'idle' | 'tearing';
  onClick?: () => void;
}

/** Gezackte Schweißnaht als clip-path (oben bzw. unten). */
function crimp(top: boolean, teeth = 14): string {
  const pts: string[] = [];
  for (let i = 0; i <= teeth * 2; i++) {
    const x = (i / (teeth * 2)) * 100;
    const y = i % 2 === 0 ? 0 : 28;
    pts.push(`${x.toFixed(2)}% ${top ? y : 100 - y}%`);
  }
  return top ? `polygon(${pts.join(',')}, 100% 100%, 0% 100%)` : `polygon(0% 0%, 100% 0%, ${pts.reverse().join(',')})`;
}

/** Booster-Pack des Base Sets (Folie mit Logo), komplett in CSS. */
export function BoosterPack({ state, onClick }: BoosterPackProps) {
  const clips = useMemo(() => ({ top: crimp(true), bottom: crimp(false) }), []);
  return (
    <button type="button" className={`bpack is-${state}`} onClick={onClick} aria-label="Booster pack – tap to open">
      <span className="bpack-crimp bpack-crimp--top" style={{ clipPath: clips.top, WebkitClipPath: clips.top }} />
      <span className="bpack-body">
        <span className="bpack-shine" />
        <span className="bpack-logo">
          SUPER SORTER
          <small>Trading Card Game</small>
        </span>
        <img className="bpack-art" src={cardArt('solar-dragon')} alt="" draggable={false} />
        <span className="bpack-info">Base Set · 5 cards</span>
      </span>
      <span className="bpack-crimp bpack-crimp--bottom" style={{ clipPath: clips.bottom, WebkitClipPath: clips.bottom }} />
    </button>
  );
}
