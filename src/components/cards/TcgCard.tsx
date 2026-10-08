import type { CSSProperties, ReactNode } from 'react';
import { CARD_BACK, cardHoloMask, cardImage, cardThumb } from '../../assets';
import { ELEMENT_LABEL, RARITY_LABEL, type CardDef, type CardElement } from '../../game/cards/cards';

export const ELEMENT_ICON: Record<CardElement, string> = {
  fire: '🔥',
  water: '💧',
  leaf: '🍃',
  bolt: '⚡',
};

interface TcgCardProps {
  card: CardDef;
  /**
   * Nur angeben, wenn die Karte umgedreht werden kann (Pack öffnen ohne WebGL):
   * Dann wird sie in 3D mit Rückseite aufgebaut.
   */
  faceDown?: boolean;
  /** Großansicht: volles Bild statt 330-px-Vorschau. */
  large?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * Sammelkarte als fertiges Bild – Rahmen, Name, Element und Nummer sind Teil des
 * Bildes. Klein (Raster, Übersicht) wird die Vorschau geladen: 32 Karten in voller
 * Größe bräuchten auf dem iPhone ~200 MB Speicher. Holo Rares bekommen eine
 * Regenbogenfolie nur dort, wo ihre Holo-Maske hell ist; Rares einen Glanz.
 */
export function TcgCard({ card, faceDown, large = false, className = '', style, children }: TcgCardProps) {
  const flip = faceDown !== undefined;
  const holo = card.rarity === 'holo';
  return (
    <div
      className={`tcg r-${card.rarity}${flip ? ' is-flip' : ''}${faceDown ? ' is-down' : ''} ${className}`}
      style={style}
      aria-label={faceDown ? 'Face-down card' : `${card.name}, ${RARITY_LABEL[card.rarity]}, ${ELEMENT_LABEL[card.element]}`}
      role="img"
    >
      <div className="tcg-inner">
        <div className="tcg-face tcg-front">
          <img className="tcg-img" src={large ? cardImage(card.no) : cardThumb(card.no)} alt="" draggable={false} decoding="async" />
          {holo && <span className="tcg-holo" style={{ '--holo-mask': `url(${cardHoloMask(card.no)})` } as CSSProperties} />}
          {(holo || card.rarity === 'rare') && <span className="tcg-foil" />}
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
      <img className="tcg-img" src={CARD_BACK} alt="" draggable={false} decoding="async" />
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
