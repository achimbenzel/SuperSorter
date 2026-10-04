import type { CSSProperties, MouseEvent } from 'react';
import type { Item as ItemModel } from '../game/types';
import { Item, type ItemDecorator } from './Item';

interface StackProps {
  index: number;
  items: ItemModel[];
  /** Anzahl oberster Items, die gerade ausgewählt (angehoben) sind; 0 = nicht ausgewählt. */
  selectedCount: number;
  decorate?: ItemDecorator;
  peekArmed: boolean;
  peekItemId: number | null;
  xray: boolean;
  /** Debug-Hinweis: dieser Stapel ist die Quelle des nächsten Lösungszugs. */
  hinted: boolean;
  onTap: (index: number) => void;
  onPeekItem: (itemId: number) => void;
}

/**
 * Ein Stapel im Lieferkarton. Items liegen übereinander (unten = index 0) und
 * überlappen sich, damit auch hohe Stapel ins Layout passen. Der ganze Stapel ist
 * Tap-Fläche (größeres Ziel für den Daumen als nur das oberste Item).
 */
export function Stack({ index, items, selectedCount, decorate, peekArmed, peekItemId, xray, hinted, onTap, onPeekItem }: StackProps) {
  const handleClick = (e: MouseEvent) => {
    if (peekArmed) {
      // Lupe: Tap auf ein bestimmtes verpacktes Item.
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-flip-id]');
      const id = el ? Number(el.dataset.flipId) : NaN;
      const hit = items.find((it) => it.id === id);
      if (hit?.hidden) {
        onPeekItem(hit.id);
        return;
      }
    }
    onTap(index);
  };

  return (
    <button
      type="button"
      className={`stack${hinted ? ' is-hint' : ''}${items.length === 0 ? ' is-empty' : ''}`}
      data-target={`stack-${index}`}
      style={{ '--h': items.length } as CSSProperties}
      onClick={handleClick}
      aria-label={`Stapel ${index + 1}`}
    >
      {items.map((it, j) => (
        <Item
          key={it.id}
          item={it}
          selected={selectedCount > 0 && j >= items.length - selectedCount}
          {...decorate?.(it)}
          peeked={peekItemId === it.id}
          peekable={peekArmed}
          xray={xray}
          style={{ '--j': j, zIndex: j + 1 } as CSSProperties}
        />
      ))}
    </button>
  );
}
