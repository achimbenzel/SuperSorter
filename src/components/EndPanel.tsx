import type { ReactNode } from 'react';
import { UI_IMAGE } from '../assets';

interface EndPanelProps {
  title: string;
  tone: 'win' | 'lose';
  children: ReactNode;
  actions: ReactNode;
  /** Deko hinter dem Panel (z. B. Konfetti-Bild). */
  backdrop?: ReactNode;
  /** Zusatzzeile unter dem Panel. */
  footer?: ReactNode;
}

/** Gemeinsamer Rahmen für Win- und Lose-Screen (Zierrahmen-Asset + Buttons darunter). */
export function EndPanel({ title, tone, children, actions, backdrop, footer }: EndPanelProps) {
  return (
    <div className={`overlay overlay--${tone}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="end">
        <div className="end-panel">
          {backdrop}
          <img className="end-panel-bg" src={UI_IMAGE.panel} alt="" />
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
