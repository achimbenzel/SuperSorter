import type { CSSProperties, ReactNode } from 'react';
import { cardArt } from '../../assets';
import { ELEMENT_LABEL, RARITY_LABEL, RARITY_SYMBOL, SET_SIZE, type CardDef, type CardElement } from '../../game/cards/cards';

export const ELEMENT_ICON: Record<CardElement, string> = {
  fire: '🔥',
  water: '💧',
  leaf: '🍃',
  bolt: '⚡',
};

interface TcgCardProps {
  card: CardDef;
  /**
   * Nur angeben, wenn die Karte umgedreht werden kann (Pack öffnen): Dann wird sie
   * in 3D mit Rückseite aufgebaut. Ohne Angabe nur die Vorderseite (spart Grafik-
   * ebenen, z. B. in der Sammlung mit 32 Karten).
   */
  faceDown?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * Sammelkarte, komplett in CSS gezeichnet. Alle Maße in cqw (Prozent der
 * Kartenbreite) -> dieselbe Karte funktioniert als Mini-Vorschau und groß.
 */
export function TcgCard({ card, faceDown, className = '', style, children }: TcgCardProps) {
  const flip = faceDown !== undefined;
  return (
    <div
      className={`tcg el-${card.element} r-${card.rarity}${flip ? ' is-flip' : ''}${faceDown ? ' is-down' : ''} ${className}`}
      style={style}
      aria-label={faceDown ? 'Face-down card' : `${card.name}, ${RARITY_LABEL[card.rarity]}, ${ELEMENT_LABEL[card.element]}`}
      role="img"
    >
      <div className="tcg-inner">
        <div className="tcg-face tcg-front">
          <div className="tcg-top">
            <span className="tcg-name">{card.name}</span>
            <span className="tcg-hp">
              <small>HP</small>
              {card.hp}
            </span>
          </div>
          <div className="tcg-art">
            <img className="tcg-illu" src={cardArt(card.art)} alt="" draggable={false} decoding="async" />
            {card.rarity === 'holo' && <span className="tcg-holo" />}
          </div>
          <div className="tcg-type">
            Basic · {ELEMENT_LABEL[card.element]} · {RARITY_LABEL[card.rarity]}
          </div>
          <div className="tcg-attack">
            <span className="tcg-cost">{ELEMENT_ICON[card.element]}</span>
            <span className="tcg-attack-name">{card.attack.name}</span>
            <strong>{card.attack.damage}</strong>
          </div>
          <div className="tcg-bottom">
            <span>
              #{String(card.no).padStart(2, '0')}/{SET_SIZE}
            </span>
            <span className="tcg-rarity">{RARITY_SYMBOL[card.rarity]}</span>
          </div>
          {card.rarity === 'holo' && <span className="tcg-foil" />}
        </div>
        {flip && <CardBackFace />}
      </div>
      {children}
    </div>
  );
}

function CardBackFace() {
  return (
    <div className="tcg-face tcg-back">
      <div className="tcg-back-emblem">
        <span>
          SUPER
          <br />
          SORTER
        </span>
        <small>TRADING CARD GAME</small>
      </div>
    </div>
  );
}

/** Nur die Rückseite (z. B. Karten, die aus dem Pack steigen). */
export function CardBack({ className = '' }: { className?: string }) {
  return (
    <div className={`tcg ${className}`} role="img" aria-label="Card back">
      <div className="tcg-inner">
        <CardBackFace />
      </div>
    </div>
  );
}
