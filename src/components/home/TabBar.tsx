import type { LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';

export interface TabDef {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Zähler-Plakette (z. B. neue Karten); 0/undefined = keine. */
  badge?: number;
}

// Geometrie aus der Vektor-Vorlage (1.svg–5.svg im main-Branch): 1170 × 265 px,
// also 390 pt Breite bei 3x. Alle Werte werden relativ zur Breite umgerechnet
// (cqw), damit die Leiste auf jedem iPhone gleich aussieht.
//   - helle Leiste:   ab y = 39,5 bis unten (#008cff)
//   - aktiver Reiter: 258 breit, ragt 39,5 über die Leiste, Ecken r = 37 (#002bff)
//   - gelber Punkt:   Icon-Mitte, y = 132,5, Durchmesser 114,7
const VIEW_W = 1170;
const SLOT_LEFT = [0, 222, 456, 690, 912];
const ICON_X = [129, 351, 585, 819, 1041];
const cqw = (px: number) => (px / VIEW_W) * 100;

export const TAB_BAR_COLOR = '#008cff';
export const TAB_ACTIVE_COLOR = '#002bff';

/** Lage des aktiven Reiters in Prozent der Leistenbreite (für den Seitenhintergrund). */
export function activeTabSlot(index: number): { left: number; width: number } {
  return { left: cqw(SLOT_LEFT[index]), width: cqw(258) };
}

interface TabBarProps {
  tabs: TabDef[];
  active: number;
  onSelect: (index: number) => void;
}

/**
 * Untere Menüleiste. Alle fünf Icons stehen immer an ihrem festen Platz; der dunkle
 * Reiter gleitet mit leichtem Überschwingen zum gewählten Icon und ploppt dabei auf,
 * das gewählte Icon wird groß.
 */
export function TabBar({ tabs, active, onSelect }: TabBarProps) {
  return (
    <nav className="tabbar" aria-label="Main menu">
      <div className="tabbar-inner" role="tablist">
        <div className="tabbar-bg" />
        <div className="tabbar-active" style={{ '--x': cqw(SLOT_LEFT[active]) } as CSSProperties}>
          {/* key: Bei jedem Wechsel spielt die Plopp-Animation neu. */}
          <div className="tabbar-active-shape" key={active} />
        </div>
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={tab.label}
              className={`tabbar-btn${i === active ? ' is-active' : ''}`}
              style={{ '--cx': cqw(ICON_X[i]) } as CSSProperties}
              onClick={() => onSelect(i)}
            >
              <span className="tabbar-icon">
                <Icon strokeWidth={2.3} aria-hidden="true" />
                {!!tab.badge && <span className="tabbar-badge">{tab.badge > 9 ? '9+' : tab.badge}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
