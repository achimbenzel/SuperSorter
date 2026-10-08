import { useId, type CSSProperties, type ReactNode } from 'react';

interface EndPanelProps {
  title: string;
  tone: 'win' | 'lose';
  children: ReactNode;
  actions: ReactNode;
  /** Zusatzzeile unter dem Panel. */
  footer?: ReactNode;
}

/**
 * Gemeinsamer Rahmen für Win- und Lose-Screen: Eisenplatte mit doppeltem Goldrand
 * und Glut-Edelsteinen in den Ecken (wie Kartenrückseite und Pack), Knöpfe darunter.
 */
export function EndPanel({ title, tone, children, actions, footer }: EndPanelProps) {
  return (
    <div className={`overlay overlay--${tone}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="end">
        <div className="end-panel">
          {[0, 1, 2, 3].map((i) => (
            <i key={i} className={`end-gem end-gem--${i}`} aria-hidden="true" />
          ))}
          <div className="end-content">
            <h2 className="end-title">{title}</h2>
            {children}
          </div>
        </div>
        {footer}
        <div className="end-actions">{actions}</div>
      </div>
    </div>
  );
}

/** Facettierter Goldstern (zwei Flächen je Zacke, dunkle Kante). */
export function GoldStar({ on, className = '', style }: { on: boolean; className?: string; style?: CSSProperties }) {
  // useId enthält Doppelpunkte; für url(#…) sicherheitshalber entfernen
  const id = 'gs' + useId().replace(/:/g, '');
  // Außen- und Innenpunkte eines fünfzackigen Sterns um (50, 52)
  const pts: [number, number][] = [];
  for (let k = 0; k < 10; k++) {
    const r = k % 2 === 0 ? 46 : 20;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    pts.push([50 + r * Math.cos(a), 52 + r * Math.sin(a)]);
  }
  const c = [50, 52];
  const outline = pts.map((p) => p.join(',')).join(' ');
  return (
    <svg viewBox="0 0 100 100" className={`gold-star${on ? ' is-on' : ' is-off'} ${className}`} style={style} aria-hidden="true">
      <polygon points={outline} fill="#3a2108" stroke="#2a1606" strokeWidth="6" strokeLinejoin="round" />
      {pts.map((p, k) => {
        const q = pts[(k + 1) % 10];
        // abwechselnd helle und dunkle Facette
        const light = k % 2 === 0;
        return <polygon key={k} points={`${c.join(',')} ${p.join(',')} ${q.join(',')}`} fill={`url(#${id}-${light ? 'l' : 'd'})`} />;
      })}
      <defs>
        <linearGradient id={`${id}-l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6d6" />
          <stop offset="1" stopColor="#f0c060" />
        </linearGradient>
        <linearGradient id={`${id}-d`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d99a3a" />
          <stop offset="1" stopColor="#8a5414" />
        </linearGradient>
      </defs>
    </svg>
  );
}
