import confetti from 'canvas-confetti';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { playSfx } from '../../audio/sfx';
import { RARITY_LABEL, type CardDef } from '../../game/cards/cards';
import { openCardPack, PACK_PRICE } from '../../game/cards/packs';
import { createRng, hashSeed } from '../../game/random';
import { BoosterPack } from '../cards/BoosterPack';
import { GameButton } from '../GameButton';
import { CardBack, TcgCard } from '../cards/TcgCard';

type Phase = 'idle' | 'tearing' | 'reveal' | 'summary';

interface PacksPageProps {
  packsOpened: number;
  /** Speichert das Pack in der Sammlung; liefert die neuen Karten-IDs. */
  onOpened: (cards: CardDef[]) => string[];
  onViewCollection: () => void;
}

const TEAR_MS = 950;

/**
 * Booster-Packs öffnen: Pack antippen -> reißt auf -> Karten einzeln umdrehen
 * (die Rare kommt zuletzt) -> Übersicht. Packs sind zum Testen kostenlos.
 */
export function PacksPage({ packsOpened, onOpened, onViewCollection }: PacksPageProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [cards, setCards] = useState<CardDef[]>([]);
  const [newIds, setNewIds] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const open = () => {
    if (phase === 'tearing') return;
    const pack = openCardPack(createRng(hashSeed(Date.now() % 2147483647, packsOpened)));
    // Sofort speichern: Wer mitten im Aufdecken die Seite wechselt, behält die Karten.
    setNewIds(onOpened(pack));
    setCards(pack);
    setIndex(0);
    setFlipped(false);
    setPhase('tearing');
    playSfx('pack-tear');
    timer.current = window.setTimeout(() => setPhase('reveal'), TEAR_MS);
  };

  const current = cards[index];
  const tapStack = () => {
    if (phase !== 'reveal' || !current) return;
    if (!flipped) {
      setFlipped(true);
      if (current.rarity === 'holo') {
        playSfx('card-holo');
        celebrate(stageRef.current, true);
      } else if (current.rarity === 'rare') {
        playSfx('card-rare');
        celebrate(stageRef.current, false);
      } else playSfx('card-flip');
      return;
    }
    if (index < cards.length - 1) {
      setIndex(index + 1);
      setFlipped(false);
      playSfx('tap');
    } else {
      setPhase('summary');
      playSfx('button');
    }
  };

  const skip = () => {
    setPhase('summary');
    playSfx('button');
  };

  if (phase === 'summary') {
    return (
      <div className="packs packs--summary">
        <h2 className="packs-title">Your pulls</h2>
        <div className="pulls">
          {cards.map((card, i) => (
            <div className="pull" key={i} style={{ '--i': i } as CSSProperties}>
              <TcgCard card={card}>{newIds.includes(card.id) && <span className="card-badge card-badge--new">NEW</span>}</TcgCard>
            </div>
          ))}
        </div>
        <div className="packs-actions">
          <OpenButton onClick={open} again />
          <button type="button" className="packs-link" onClick={onViewCollection}>
            View collection
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'reveal' && current) {
    const special = current.rarity === 'holo' || current.rarity === 'rare';
    return (
      <div className="packs packs--reveal">
        <div className="reveal-stage" ref={stageRef} onClick={tapStack} role="button" aria-label={flipped ? 'Next card' : 'Reveal card'}>
          {cards.map((card, i) => {
            if (i < index - 1) return null;
            const top = i === index;
            const cls = i === index - 1 ? ' is-leaving' : top ? ' is-top' : '';
            const hint = top && !flipped && special ? ` is-hint-${current.rarity}` : '';
            return (
              <div key={i} className={`reveal-card${cls}${hint}`} style={{ '--depth': Math.max(0, i - index) } as CSSProperties}>
                {top && flipped && special && <span className={`reveal-rays reveal-rays--${current.rarity}`} />}
                <TcgCard card={card} faceDown={!(top && flipped)}>
                  {top && flipped && newIds.includes(card.id) && <span className="card-badge card-badge--new">NEW</span>}
                </TcgCard>
              </div>
            );
          })}
          {flipped && special && (
            <span className={`reveal-banner reveal-banner--${current.rarity}`} key={`banner-${index}`}>
              {current.rarity === 'holo' ? '✨ HOLO RARE! ✨' : '★ RARE! ★'}
            </span>
          )}
        </div>
        <p className="reveal-hint">
          {flipped ? `${current.name} · ${RARITY_LABEL[current.rarity]}` : 'Tap the card to reveal it'}
          <span>
            {index + 1} / {cards.length}
          </span>
        </p>
        <button type="button" className="packs-link" onClick={skip}>
          Skip to all cards
        </button>
      </div>
    );
  }

  return (
    <div className="packs packs--idle">
      <h2 className="packs-title">Booster packs</h2>
      <div className="packs-pack">
        <BoosterPack state={phase === 'tearing' ? 'tearing' : 'idle'} onClick={open} />
        {phase === 'tearing' && (
          <div className="packs-rise" aria-hidden="true">
            <CardBack />
          </div>
        )}
      </div>
      <div className="packs-actions">
        <OpenButton onClick={open} />
        <p className="packs-note">
          {packsOpened} opened · 1 rare or holo rare in every pack
          <br />
          Packs are free while we test – later they will cost coins.
        </p>
      </div>
    </div>
  );
}

function OpenButton({ onClick, again = false }: { onClick: () => void; again?: boolean }) {
  return (
    <GameButton variant="green" onClick={onClick}>
      {again ? 'Open another' : 'Open pack'}
      <em className="packs-price">{PACK_PRICE === 0 ? 'FREE' : `${PACK_PRICE} coins`}</em>
    </GameButton>
  );
}

/** Rare: goldener Funkenregen, Holo Rare: Regenbogen-Konfetti aus der Karte. */
function celebrate(stage: HTMLElement | null, holo: boolean) {
  const rect = stage?.getBoundingClientRect();
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
