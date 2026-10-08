import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { playSfx } from '../../audio/sfx';
import { RARITY_LABEL, type CardDef } from '../../game/cards/cards';
import { webglSupported } from '../../three/support';
import { BoosterPack } from '../cards/BoosterPack';
import { CardBack, TcgCard } from '../cards/TcgCard';
import { celebrate, drawPack, OpenButton, PacksNote, PullsSummary, type PacksPageProps } from './packsShared';

// three.js wird erst geladen, wenn die Packs-Seite das erste Mal aufgeht.
const Packs3D = lazy(() => import('../three/Packs3D'));

type Phase = 'idle' | 'tearing' | 'reveal' | 'summary';

const TEAR_MS = 950;

/**
 * Booster-Packs öffnen. Mit WebGL in 3D (three.js, components/three/Packs3D.tsx),
 * sonst die CSS-Variante darunter. Packs sind zum Testen kostenlos.
 */
export function PacksPage(props: PacksPageProps) {
  const [use3d, setUse3d] = useState(webglSupported);
  if (!use3d) return <PacksPageCss {...props} />;
  return (
    <Suspense fallback={<div className="packs" aria-busy="true" />}>
      <Packs3D {...props} onWebglError={() => setUse3d(false)} />
    </Suspense>
  );
}

/**
 * CSS-Variante: Pack antippen -> reißt auf -> Karten einzeln umdrehen
 * (die Rare kommt zuletzt) -> Übersicht.
 */
function PacksPageCss({ packsOpened, onOpened, onViewCollection }: PacksPageProps) {
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
    const pack = drawPack(packsOpened);
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
        celebrate(stageRef.current?.getBoundingClientRect(), true);
      } else if (current.rarity === 'rare') {
        playSfx('card-rare');
        celebrate(stageRef.current?.getBoundingClientRect(), false);
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
    return <PullsSummary cards={cards} newIds={newIds} onOpenAnother={open} onViewCollection={onViewCollection} />;
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
                <TcgCard card={card} faceDown={!(top && flipped)} large>
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
        <PacksNote packsOpened={packsOpened} />
      </div>
    </div>
  );
}
