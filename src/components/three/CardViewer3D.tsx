import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { CardDef } from '../../game/cards/cards';
import { CardViewer } from '../../three/CardViewer';

interface CardViewer3DProps {
  card: CardDef;
  onClose: () => void;
  /** WebGL ließ sich nicht starten -> Aufrufer zeigt die CSS-Ansicht. */
  onWebglError?: () => void;
  /** Text unter der Karte (Name, Seltenheit …). */
  children?: ReactNode;
}

/**
 * Große Kartenansicht in 3D (Portal über allem): mit dem Finger frei drehen und
 * kippen, mit Schwung loslassen; neben die Karte tippen schließt.
 */
export default function CardViewer3D({ card, onClose, onWebglError, children }: CardViewer3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onClose, onWebglError });
  handlers.current = { onClose, onWebglError };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let viewer: CardViewer;
    try {
      viewer = new CardViewer(host, card, () => handlers.current.onClose());
    } catch {
      handlers.current.onWebglError?.();
      return;
    }
    return () => viewer.dispose();
  }, [card]);

  return createPortal(
    <div className="card-detail card-detail--3d" role="dialog" aria-modal="true" aria-label={card.name}>
      <div className="card3d-host" ref={hostRef} />
      <button type="button" className="card-detail-close" aria-label="Close" onClick={onClose}>
        <X strokeWidth={3} />
      </button>
      <div className="card3d-info">
        <p className="card-detail-info">{children}</p>
        <span className="card3d-hint">Drag to turn · tap outside to close</span>
      </div>
    </div>,
    document.body,
  );
}
