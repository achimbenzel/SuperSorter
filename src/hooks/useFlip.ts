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
 *
 * Optionale Attribute am äußeren Element:
 *   data-flip-kind="box"  gleitet ohne Sprung und skaliert gleichmäßig (Packband:
 *                         Paket fährt von der Vorschau an den Packplatz)
 *   data-flip-delay="ms"  startet später; bis dahin bleibt das Element sichtbar an
 *                         seiner alten Position (Kettenreaktion im Packband)
 */
/** Wie viele Renders ein verschwundenes Item seine letzte Position behält. */
const KEEP_MISSING_RENDERS = 3;

export function useFlip(rootRef: RefObject<HTMLElement | null>, resetKey: string) {
  const rects = useRef(new Map<string, DOMRect>());
  /** Alter (in Renders) von Positionen, deren Item gerade nicht im DOM ist. */
  const missingAge = useRef(new Map<string, number>());
  const lastKey = useRef(resetKey);

  // Bei Größenänderung (Drehen, Adressleiste) verschiebt sich alles -> nicht animieren.
  useEffect(() => {
    const clear = () => {
      rects.current.clear();
      missingAge.current.clear();
    };
    window.addEventListener('resize', clear);
    return () => window.removeEventListener('resize', clear);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (lastKey.current !== resetKey) {
      // Neues Level / Neustart: alte Positionen gehören zu anderen Items (IDs beginnen neu).
      rects.current.clear();
      missingAge.current.clear();
      lastKey.current = resetKey;
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Erst alles messen, dann animieren: Verschachtelte Elemente (Paket > Ware) würden
    // sonst von der gerade gestarteten Animation des Elternteils verfälscht gemessen.
    const measured = Array.from(root.querySelectorAll<HTMLElement>('[data-flip-id]'), (el) => ({
      el,
      id: el.dataset.flipId!,
      rect: el.getBoundingClientRect(),
    }));
    const next = new Map<string, DOMRect>();
    for (const m of measured) {
      next.set(m.id, m.rect);
      missingAge.current.delete(m.id);
    }

    if (!reduced) {
      for (const { el, id, rect } of measured) {
        const prev = rects.current.get(id);
        const inner = prev && el.querySelector<HTMLElement>(':scope > .flip');
        if (!prev || !inner || rect.width === 0) continue;
        // Mittelpunkt-Differenz + Skalierung um die Mitte (Ziel kann kleiner/größer sein).
        const dx = prev.left + prev.width / 2 - (rect.left + rect.width / 2);
        const dy = prev.top + prev.height / 2 - (rect.top + rect.height / 2);
        const box = el.dataset.flipKind === 'box';
        const s = box ? Math.min(prev.width / rect.width, prev.height / rect.height) : prev.width / rect.width;
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && Math.abs(s - 1) < 0.03) continue;
        const delay = Number(el.dataset.flipDelay ?? 0);
        const timing: KeyframeAnimationOptions = { delay, fill: delay > 0 ? 'backwards' : 'none' };

        if (box) {
          // Starker Größenwechsel (Vorschau-Karte <-> Paket): einblenden statt
          // eine winzige Kopie zu zeigen.
          const fade = Math.abs(s - 1) > 0.2;
          inner.animate(
            [
              { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: fade ? 0 : 1 },
              { opacity: 1, offset: fade ? 0.35 : 0.01 },
              { transform: 'translate(0, 0) scale(1.03)', offset: 0.8 },
              { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            ],
            { ...timing, duration: TIMING.boxArrive, easing: 'cubic-bezier(.3,.7,.3,1)' },
          );
          continue;
        }
        // Bogen: Je weiter der Weg, desto höher der Sprung (begrenzt).
        const arc = Math.min(90, 24 + Math.hypot(dx, dy) * 0.18);
        const mid = (s + 1) / 2;
        inner.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(${s * (delay > 0 ? 1 : 1.05)})` },
            { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - arc}px) scale(${mid * 1.14})`, offset: 0.5 },
            { transform: 'translate(0, 0) scale(0.94)', offset: 0.86 },
            { transform: 'translate(0, 0) scale(1)' },
          ],
          { ...timing, duration: TIMING.hop, easing: 'cubic-bezier(.3,.7,.4,1)' },
        );
      }
    }

    // Elemente, die kurz aus dem DOM verschwinden und einen Render später woanders
    // auftauchen (Packband: verschicktes Paket erscheint erst in der "Geist"-Ebene),
    // behalten ihre alte Position ein paar Renders.
    for (const [id, rect] of rects.current) {
      if (next.has(id)) continue;
      const age = (missingAge.current.get(id) ?? 0) + 1;
      if (age > KEEP_MISSING_RENDERS) {
        missingAge.current.delete(id);
        continue;
      }
      missingAge.current.set(id, age);
      next.set(id, rect);
    }
    rects.current = next;
  });
}

/**
 * Spult alle laufenden (endlichen) Animationen unter `root` ans Ende – z. B. wenn der
 * Spieler mitten in einer Kettenreaktion schon den nächsten Zug macht.
 */
export function finishAnimations(root: HTMLElement | null) {
  root?.getAnimations({ subtree: true }).forEach((a) => {
    if (a.effect?.getComputedTiming().endTime === Infinity) return;
    try {
      a.finish();
    } catch {
      /* z. B. pausierte Animation ohne Ende */
    }
  });
}
