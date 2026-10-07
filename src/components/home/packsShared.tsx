// Teile der Packs-Seite, die die 3D- und die CSS-Variante gemeinsam nutzen.

import confetti from 'canvas-confetti';
import type { CSSProperties } from 'react';
import type { CardDef } from '../../game/cards/cards';
import { openCardPack, PACK_PRICE } from '../../game/cards/packs';
import { createRng, hashSeed } from '../../game/random';
import { TcgCard } from '../cards/TcgCard';
import { GameButton } from '../GameButton';

export interface PacksPageProps {
  packsOpened: number;
  /** Speichert das Pack in der Sammlung; liefert die neuen Karten-IDs. */
  onOpened: (cards: CardDef[]) => string[];
  onViewCollection: () => void;
}

/** Inhalt eines neuen Packs (Zufall aus Uhrzeit + Anzahl geöffneter Packs). */
export function drawPack(packsOpened: number): CardDef[] {
  return openCardPack(createRng(hashSeed(Date.now() % 2147483647, packsOpened)));
}

export function OpenButton({ onClick, again = false }: { onClick: () => void; again?: boolean }) {
  return (
    <GameButton variant="green" onClick={onClick}>
      {again ? 'Open another' : 'Open pack'}
      <em className="packs-price">{PACK_PRICE === 0 ? 'FREE' : `${PACK_PRICE} coins`}</em>
    </GameButton>
  );
}

export function PacksNote({ packsOpened }: { packsOpened: number }) {
  return (
    <p className="packs-note">
      {packsOpened} opened · 1 rare or holo rare in every pack
      <br />
      Packs are free while we test – later they will cost coins.
    </p>
  );
}

/** Rare: goldener Funkenregen, Holo Rare: Regenbogen-Konfetti aus der Karte. */
export function celebrate(rect: { left: number; top: number; width: number; height: number } | undefined, holo: boolean) {
  if (!rect) return;
  const origin = { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height * 0.45) / window.innerHeight };
  confetti({
    particleCount: holo ? 120 : 50,
    spread: holo ? 100 : 70,
    startVelocity: holo ? 38 : 28,
    scalar: holo ? 1 : 0.8,
    origin,
    zIndex: 150,
    colors: holo ? ['#ff4fa3', '#ffd400', '#3ee0d2', '#7c5cff', '#4cc44c', '#ffffff'] : ['#ffd23f', '#ffb000', '#fff3b0'],
    disableForReducedMotion: true,
  });
}

interface PullsSummaryProps {
  cards: CardDef[];
  newIds: string[];
  onOpenAnother: () => void;
  onViewCollection: () => void;
  /** Karte antippen (z. B. groß in 3D ansehen). */
  onSelect?: (card: CardDef) => void;
}

/** Übersicht nach dem Öffnen. */
export function PullsSummary({ cards, newIds, onOpenAnother, onViewCollection, onSelect }: PullsSummaryProps) {
  return (
    <div className="packs packs--summary">
      <h2 className="packs-title">Your pulls</h2>
      <div className="pulls">
        {cards.map((card, i) => {
          const content = <TcgCard card={card}>{newIds.includes(card.id) && <span className="card-badge card-badge--new">NEW</span>}</TcgCard>;
          return onSelect ? (
            <button type="button" className="pull" key={i} style={{ '--i': i } as CSSProperties} onClick={() => onSelect(card)}>
              {content}
            </button>
          ) : (
            <div className="pull" key={i} style={{ '--i': i } as CSSProperties}>
              {content}
            </div>
          );
        })}
      </div>
      <div className="packs-actions">
        <OpenButton onClick={onOpenAnother} again />
        <button type="button" className="packs-link" onClick={onViewCollection}>
          View collection
        </button>
      </div>
    </div>
  );
}
