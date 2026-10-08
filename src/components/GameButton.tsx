import type { ReactNode } from 'react';

interface GameButtonProps {
  /** primary: Glut-Orange (Hauptaktion), secondary: dunkler Stahl. */
  variant?: 'primary' | 'secondary';
  /** Symbol vor dem Text (z. B. lucide-Icon). */
  icon?: ReactNode;
  onClick: () => void;
  children: ReactNode;
}

/**
 * Knopf im Stil von Karten und Packs: Goldrahmen, Füllung aus Glut bzw. Stahl,
 * Rauten an den Enden. Reines CSS (.game-btn in screens.css), passt sich jeder
 * Textlänge an.
 */
export function GameButton({ variant = 'primary', icon, onClick, children }: GameButtonProps) {
  return (
    <button type="button" className={`game-btn game-btn--${variant}`} onClick={onClick}>
      {icon}
      <span>{children}</span>
    </button>
  );
}
