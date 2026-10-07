import { Pointer } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { playSfx } from '../../audio/sfx';
import { ELEMENT_LABEL, RARITY_LABEL, type CardDef } from '../../game/cards/cards';
import { PackOpening, type PackHint, type TearLine } from '../../three/PackOpening';
import { celebrate, drawPack, OpenButton, PacksNote, PullsSummary, type PacksPageProps } from '../home/packsShared';
import CardViewer3D from './CardViewer3D';

type Phase = 'pack' | 'reveal' | 'summary';

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Shown {
  index: number;
  card: CardDef;
  /** Lage der Karte im Container (für Banner, NEW-Markierung, Strahlen). */
  rect: Rect;
}

/**
 * Packs-Seite in 3D: three.js zeichnet Pack und Karten (three/PackOpening.ts),
 * React legt Hinweise, Banner, Zähler und die Übersicht darüber.
 */
export default function Packs3D({ packsOpened, onOpened, onViewCollection, onWebglError }: PacksPageProps & { onWebglError: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<PackOpening | null>(null);
  const [phase, setPhase] = useState<Phase>('pack');
  const [hint, setHint] = useState<PackHint>(null);
  const [tearLine, setTearLine] = useState<TearLine | null>(null);
  const [cards, setCards] = useState<CardDef[]>([]);
  const [newIds, setNewIds] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState<Shown | null>(null);
  const [detail, setDetail] = useState<CardDef | null>(null);
  const latest = useRef({ packsOpened, onOpened, onWebglError });
  latest.current = { packsOpened, onOpened, onWebglError };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let stage: PackOpening;
    try {
      stage = new PackOpening(host, {
        requestCards: () => {
          const pack = drawPack(latest.current.packsOpened);
          // Sofort speichern: Wer mitten im Aufdecken die Seite wechselt, behält die Karten.
          setNewIds(latest.current.onOpened(pack));
          setCards(pack);
          setIndex(0);
          setShown(null);
          setPhase('reveal');
          return pack;
        },
        onHint: setHint,
        onTearLine: setTearLine,
        onCardShown: (i, card) => {
          const rect = stage.cardRect();
          setShown({ index: i, card, rect });
          if (card.rarity === 'holo' || card.rarity === 'rare') {
            const h = host.getBoundingClientRect();
            celebrate({ ...rect, left: rect.left + h.left, top: rect.top + h.top }, card.rarity === 'holo');
          }
        },
        onCardGone: (i) => {
          setShown(null);
          setIndex(i + 1);
        },
        onFinished: () => {
          setPhase('summary');
          stage.setPaused(true);
        },
      });
    } catch {
      latest.current.onWebglError();
      return;
    }
    stageRef.current = stage;
    return () => {
      stageRef.current = null;
      stage.dispose();
    };
  }, []);

  const skip = () => {
    stageRef.current?.skip();
    stageRef.current?.setPaused(true);
    setShown(null);
    setPhase('summary');
    playSfx('button');
  };

  const openAnother = () => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.setPaused(false);
    stage.reset();
    setShown(null);
    setIndex(0);
    setPhase('pack');
    playSfx('button');
  };

  const special = shown && (shown.card.rarity === 'holo' || shown.card.rarity === 'rare') ? shown.card.rarity : null;

  return (
    <div className={`packs3d is-${phase}`}>
      {/* Strahlen hinter der Rare (liegen unter der durchsichtigen Zeichenfläche) */}
      {phase === 'reveal' && shown && special && (
        <div className="packs3d-rays" style={rectStyle(shown.rect)} key={`rays-${shown.index}`}>
          <span className={`reveal-rays reveal-rays--${special}`} />
        </div>
      )}

      <div className="packs3d-stage" ref={hostRef} />

      {phase === 'pack' && (
        <>
          <h2 className="packs-title packs3d-title">Booster packs</h2>
          {hint === 'swipe' && tearLine && <SwipeHint line={tearLine} />}
          <div className="packs3d-foot">
            <OpenButton onClick={() => void stageRef.current?.tear(1)} />
            <PacksNote packsOpened={packsOpened} />
          </div>
        </>
      )}

      {phase === 'reveal' && (
        <>
          <div className="packs3d-count" aria-live="polite">
            {Math.min(index + 1, cards.length)} / {cards.length}
          </div>
          {shown && special && (
            <span className={`reveal-banner reveal-banner--${special}`} style={{ top: Math.max(4, shown.rect.top - 46) }} key={`banner-${shown.index}`}>
              {special === 'holo' ? '✨ HOLO RARE! ✨' : '★ RARE! ★'}
            </span>
          )}
          {shown && newIds.includes(shown.card.id) && (
            <span className="packs3d-new" style={{ left: shown.rect.left + shown.rect.width - 22, top: shown.rect.top - 10 }} key={`new-${shown.index}`}>
              NEW
            </span>
          )}
          <div className="packs3d-foot">
            <p className="reveal-hint">
              {shown ? `${shown.card.name} · ${RARITY_LABEL[shown.card.rarity]}` : hint === 'flip' ? 'Tap the card to flip it' : ' '}
              <span>{hint === 'next' ? 'Drag to tilt · tap or swipe for the next card' : ' '}</span>
            </p>
            <button type="button" className="packs-link" onClick={skip}>
              Skip to all cards
            </button>
          </div>
        </>
      )}

      {phase === 'summary' && (
        <div className="packs3d-summary" data-scroll>
          <PullsSummary
            cards={cards}
            newIds={newIds}
            onOpenAnother={openAnother}
            onViewCollection={onViewCollection}
            onSelect={(card) => {
              setDetail(card);
              playSfx('card-flip');
            }}
          />
        </div>
      )}

      {detail && (
        <CardViewer3D card={detail} onClose={() => setDetail(null)}>
          <strong>{detail.name}</strong>
          {RARITY_LABEL[detail.rarity]} · {ELEMENT_LABEL[detail.element]}
        </CardViewer3D>
      )}
    </div>
  );
}

function rectStyle(r: Rect): CSSProperties {
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/** Gestrichelte Linie über der oberen Naht, ein Finger zeigt die Wischbewegung. */
function SwipeHint({ line }: { line: TearLine }) {
  const width = line.x1 - line.x0;
  return (
    <div className="swipe-hint" style={{ left: line.x0, top: line.y, width, '--w': `${width}px` } as CSSProperties} aria-hidden="true">
      <span className="swipe-hint-label">Swipe across to open</span>
      <span className="swipe-hint-line" />
      <span className="swipe-hint-finger">
        <Pointer strokeWidth={2.2} />
      </span>
    </div>
  );
}
