import type { CSSProperties, ReactNode } from 'react';
import { UI_IMAGE } from '../assets';

interface GameButtonProps {
  variant?: 'green' | 'red';
  icon?: string;
  onClick: () => void;
  children: ReactNode;
}

/**
 * Glanz-Button aus den Button-Assets. Per border-image wird nur die Mitte des
 * Bildes gestreckt, die abgerundeten Ecken bleiben unverzerrt – so passt ein
 * Asset für beliebige Textlängen.
 */
export function GameButton({ variant = 'green', icon, onClick, children }: GameButtonProps) {
  const src = variant === 'green' ? UI_IMAGE.buttonGreen : UI_IMAGE.buttonRed;
  return (
    <button
      type="button"
      className={`game-btn game-btn--${variant}`}
      style={{ borderImageSource: `url(${src})` } as CSSProperties}
      onClick={onClick}
    >
      {icon && <img src={icon} alt="" />}
      <span>{children}</span>
    </button>
  );
}
