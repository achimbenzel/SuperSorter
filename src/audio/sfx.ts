// Sound-Schnittstelle (Platzhalter).
//
// Audio ist bewusst noch nicht Teil des Prototyps. Die UI ruft trotzdem an allen
// relevanten Stellen diese Funktionen auf, damit Sound später ohne Änderungen an
// den Komponenten eingehängt werden kann: einfach `setSfxHandler` mit einer
// Implementierung (z. B. Web Audio API oder Howler.js) aufrufen.
//
// iOS-Hinweis für später: Safari erlaubt Audio erst nach einer Nutzerinteraktion.
// Den AudioContext daher beim ersten Tap entsperren (`resume()`).

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
  | 'booster';

export type SfxHandler = (name: SfxName) => void;

let handler: SfxHandler | null = null;
let enabled = true;

/** Registriert die echte Audio-Implementierung. `null` schaltet zurück auf stumm. */
export function setSfxHandler(next: SfxHandler | null): void {
  handler = next;
}

export function setSfxEnabled(value: boolean): void {
  enabled = value;
}

function play(name: SfxName): void {
  if (enabled && handler) handler(name);
}

export const playTap = () => play('tap');
export const playSelect = () => play('select');
export const playPlace = () => play('place');
export const playInvalid = () => play('invalid');
export const playReveal = () => play('reveal');
export const playSolved = () => play('solved');
export const playShip = () => play('ship');
export const playGold = () => play('gold');
export const playWin = () => play('win');
export const playLose = () => play('lose');
export const playBooster = () => play('booster');
