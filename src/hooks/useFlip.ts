import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { TIMING } from '../config';

/**
 * FLIP-Animation ("First, Last, Invert, Play") für Items, die zwischen Containern
 * wandern (Stapel -> Fach, Stapel -> Wagen, Undo zurück, Mischen).
 *
 * Warum so? React rendert ein bewegtes Item in einem neuen Eltern-Element neu –
 * es "springt" also. Wir merken uns nach jedem Render die Bildschirmposition jedes
 * Items (per data-flip-id). Hat sich ein Item beim nächsten Render bewegt, starten
 * wir am inneren Element eine Web-Animation von der alten Position (als transform)
 * zur neuen. Animiert wird ausschließlich `transform` -> läuft auf der GPU mit 60 fps.
 *
 * Struktur pro Item:  [data-flip-id] (Layout, nie animiert) > .flip (wird animiert)
 * Gemessen wird das äußere Element, damit laufende Animationen die Messung nicht verfälschen.
 */
export function useFlip(rootRef: RefObject<HTMLElement | null>, resetKey: string) {
  const rects = useRef(new Map<string, DOMRect>());
  const lastKey = useRef(resetKey);

  // Bei Größenänderung (Drehen, Adressleiste) verschiebt sich alles -> nicht animieren.
  useEffect(() => {
    const clear = () => rects.current.clear();
    window.addEventListener('resize', clear);
    return () => window.removeEventListener('resize', clear);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (lastKey.current !== resetKey) {
      // Neues Level / Neustart: alte Positionen gehören zu anderen Items (IDs beginnen neu).
      rects.current.clear();
      lastKey.current = resetKey;
    }
    const next = new Map<string, DOMRect>();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    root.querySelectorAll<HTMLElement>('[data-flip-id]').forEach((el) => {
      const id = el.dataset.flipId!;
      const rect = el.getBoundingClientRect();
      next.set(id, rect);
      const prev = rects.current.get(id);
      if (!prev || reduced) return;
      const dx = prev.left - rect.left;
      const dy = prev.top - rect.top;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;

      const inner = el.querySelector<HTMLElement>(':scope > .flip');
      if (!inner) return;
      // Bogen: Je weiter der Weg, desto höher der Sprung (begrenzt).
      const arc = Math.min(90, 24 + Math.hypot(dx, dy) * 0.18);
      inner.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(1.05)` },
          { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - arc}px) scale(1.14)`, offset: 0.5 },
          { transform: 'translate(0, 0) scale(0.94)', offset: 0.86 },
          { transform: 'translate(0, 0) scale(1)' },
        ],
        { duration: TIMING.hop, easing: 'cubic-bezier(.3,.7,.4,1)' },
      );
    });
    rects.current = next;
  });
}
