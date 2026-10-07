import { X } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { playSfx } from '../../audio/sfx';
import { CARD_SET, ELEMENT_LABEL, RARITY_LABEL, SET_NAME, SET_SIZE, type CardDef, type CardElement } from '../../game/cards/cards';
import { ownedCount, type Collection } from '../../game/cards/packs';
import { webglSupported } from '../../three/support';
import { ELEMENT_ICON, TcgCard } from '../cards/TcgCard';
import { GameButton } from '../GameButton';

// 3D-Ansicht (three.js) wird nachgeladen; ohne WebGL bleibt die CSS-Ansicht.
const loadViewer = () => import('../three/CardViewer3D');
const CardViewer3D = lazy(loadViewer);

type Filter = 'all' | CardElement;
const FILTERS: Filter[] = ['all', 'fire', 'water', 'leaf', 'bolt'];

interface CollectionPageProps {
  collection: Collection;
  /** Beim Verlassen: neue Karten gelten als gesehen. */
  onSeen: () => void;
  onOpenPacks: () => void;
}

/** Sammelalbum: alle Karten des Sets, fehlende als nummerierte Lücke. */
export function CollectionPage({ collection, onSeen, onOpenPacks }: CollectionPageProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [detail, setDetail] = useState<CardDef | null>(null);
  // "NEW"-Markierungen dieses Besuchs festhalten, beim Verlassen als gesehen speichern.
  const [unseen] = useState(() => new Set(collection.unseen));
  const [use3d, setUse3d] = useState(webglSupported);
  // Schon vorab laden, damit die erste Karte ohne Wartezeit aufgeht.
  useEffect(() => {
    if (use3d) void loadViewer();
  }, [use3d]);
  const onSeenRef = useRef(onSeen);
  onSeenRef.current = onSeen;
  useEffect(() => () => onSeenRef.current(), []);

  const owned = ownedCount(collection);
  const cards = CARD_SET.filter((c) => filter === 'all' || c.element === filter);

  return (
    <div className="collection">
      <header className="collection-head">
        <div className="collection-title">
          <h2>Collection</h2>
          <span>
            {SET_NAME} · <strong>{owned}</strong>/{SET_SIZE}
          </span>
        </div>
        <div className="collection-bar" aria-hidden="true">
          <span style={{ width: `${(owned / SET_SIZE) * 100}%` }} />
        </div>
        <div className="collection-filters" role="tablist" aria-label="Filter by element">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={`chip${filter === f ? ' is-active' : ''}`}
              onClick={() => {
                setFilter(f);
                playSfx('tab');
              }}
            >
              {f === 'all' ? 'All' : `${ELEMENT_ICON[f]} ${ELEMENT_LABEL[f]}`}
            </button>
          ))}
        </div>
      </header>

      <div className="collection-grid" data-scroll>
        {cards.map((card) => {
          const count = collection.counts[card.id] ?? 0;
          if (count === 0) {
            return (
              <div key={card.id} className="collection-cell is-missing" aria-label={`Card ${card.no} missing`}>
                <span>#{String(card.no).padStart(2, '0')}</span>
              </div>
            );
          }
          return (
            <button
              key={card.id}
              type="button"
              className="collection-cell"
              onClick={() => {
                setDetail(card);
                playSfx('card-flip');
              }}
            >
              <TcgCard card={card}>
                {unseen.has(card.id) && <span className="card-badge card-badge--new">NEW</span>}
                {count > 1 && <span className="card-badge card-badge--count">×{count}</span>}
              </TcgCard>
            </button>
          );
        })}
        {owned === 0 && (
          <div className="collection-empty">
            <p>No cards yet.</p>
            <GameButton variant="green" onClick={onOpenPacks}>
              Open a pack
            </GameButton>
          </div>
        )}
      </div>

      {detail &&
        (use3d ? (
          <Suspense fallback={<CardDetail card={detail} count={collection.counts[detail.id] ?? 0} onClose={() => setDetail(null)} />}>
            <CardViewer3D card={detail} onClose={() => setDetail(null)} onWebglError={() => setUse3d(false)}>
              <CardInfo card={detail} count={collection.counts[detail.id] ?? 0} />
            </CardViewer3D>
          </Suspense>
        ) : (
          <CardDetail card={detail} count={collection.counts[detail.id] ?? 0} onClose={() => setDetail(null)} />
        ))}
    </div>
  );
}

function CardInfo({ card, count }: { card: CardDef; count: number }) {
  return (
    <>
      <strong>{card.name}</strong>
      {RARITY_LABEL[card.rarity]} · {ELEMENT_LABEL[card.element]} · owned ×{count}
    </>
  );
}

/** Große Ansicht einer Karte ohne WebGL; kippt dem Finger nach (Holo-Glanz wandert mit). */
function CardDetail({ card, count, onClose }: { card: CardDef; count: number; onClose: () => void }) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const tilt = (e: PointerEvent) => {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${(-y * 18).toFixed(1)}deg`);
    el.style.setProperty('--ry', `${(x * 22).toFixed(1)}deg`);
    el.style.setProperty('--shine', `${((x + 0.5) * 100).toFixed(0)}%`);
  };
  const reset = () => {
    tiltRef.current?.style.setProperty('--rx', '0deg');
    tiltRef.current?.style.setProperty('--ry', '0deg');
  };

  // Portal: liegt sicher über Menüleiste und Seitenanimationen.
  return createPortal(
    <div className="card-detail" role="dialog" aria-modal="true" aria-label={card.name} onClick={onClose}>
      <button type="button" className="card-detail-close" aria-label="Close" onClick={onClose}>
        <X strokeWidth={3} />
      </button>
      <div className="card-detail-tilt" ref={tiltRef} onPointerMove={tilt} onPointerLeave={reset} onClick={(e) => e.stopPropagation()}>
        <TcgCard card={card} />
      </div>
      <p className="card-detail-info">
        <CardInfo card={card} count={count} />
      </p>
    </div>,
    document.body,
  );
}
