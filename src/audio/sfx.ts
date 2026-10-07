// Sound-Schnittstelle.
//
// Die UI ruft an allen relevanten Stellen diese Funktionen auf; die eigentliche
// Wiedergabe steckt in `player.ts` (Web Audio API) und wird in main.tsx per
// `setSfxHandler` eingehängt. Sounds: public/assets/sfx/ (CC0, siehe docs/ASSETS.md).

export type SfxName =
  | 'tap'
  | 'select'
  | 'place'
  | 'invalid'
  | 'reveal'
  | 'solved'
  | 'ship'
  | 'gold'
  | 'win'
  | 'lose'
  | 'booster'
  // Menü
  | 'tab'
  | 'button'
  // Booster-Packs
  | 'pack-tear'
  | 'card-flip'
  | 'card-rare'
  | 'card-holo';

export type SfxHandler = (name: SfxName) => void;

let handler: SfxHandler | null = null;

/** Registriert die Audio-Implementierung. `null` schaltet stumm. */
export function setSfxHandler(next: SfxHandler | null): void {
  handler = next;
}

export function playSfx(name: SfxName): void {
  handler?.(name);
}

export const playTap = () => playSfx('tap');
export const playSelect = () => playSfx('select');
export const playPlace = () => playSfx('place');
export const playInvalid = () => playSfx('invalid');
export const playReveal = () => playSfx('reveal');
export const playSolved = () => playSfx('solved');
export const playShip = () => playSfx('ship');
export const playGold = () => playSfx('gold');
export const playWin = () => playSfx('win');
export const playLose = () => playSfx('lose');
export const playBooster = () => playSfx('booster');
