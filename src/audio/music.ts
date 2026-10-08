// Hintergrundmusik in Dauerschleife (public/assets/music/shop-theme.mp3).
//
// - Ein <audio>-Element streamt die Datei. Den 5-Minuten-Track komplett für Web
//   Audio zu dekodieren, bräuchte rund 100 MB Speicher – zu viel fürs iPhone.
// - Die Lautstärke läuft trotzdem über Web Audio (MediaElementSource → Gain), weil
//   iOS `audio.volume` ignoriert. So gibt es Ein-/Ausblenden und das kurze Leiser-
//   werden ("Ducking") bei Fanfaren.
// - iOS startet Audio erst nach einer Nutzergeste: player.ts ruft kickMusic() bei
//   jedem Tap auf (läuft schon -> nichts zu tun).
// - Seite im Hintergrund -> Pause; zurück -> weiter.
// - An/Aus getrennt von den Sounds, gespeichert unter MUSIC_KEY.
// - Der Service Worker cacht die Datei nicht (zu groß, und Safari spielt Medien
//   aus dem Cache nur mit Range-Unterstützung): offline gibt es keine Musik.

import { MUSIC_FILE } from '../assets';

export const MUSIC_KEY = 'super-sorter/music/v1';
const VOLUME = 0.3;
const FADE_IN_S = 1.6;
const FADE_OUT_S = 0.35;

let el: HTMLAudioElement | null = null;
let gain: GainNode | null = null;
let context: AudioContext | null = null;
let enabled = readEnabled();
let duckUntil = 0;

function readEnabled(): boolean {
  try {
    const v = window.localStorage.getItem(MUSIC_KEY);
    return v === null ? true : JSON.parse(v) !== false;
  } catch {
    return true;
  }
}

export function isMusicEnabled(): boolean {
  return enabled;
}

export function setMusicEnabled(value: boolean): void {
  enabled = value;
  try {
    window.localStorage.setItem(MUSIC_KEY, JSON.stringify(value));
  } catch {
    /* ignorieren */
  }
  if (value) kickMusic();
  else
    fadeTo(0, FADE_OUT_S, () => {
      if (!enabled) el?.pause();
    });
}

function element(): HTMLAudioElement {
  if (!el) {
    el = new Audio(MUSIC_FILE);
    el.loop = true;
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
  }
  return el;
}

/** Einmal aufrufen, sobald der AudioContext existiert (beim ersten Tap). */
export function connectMusic(ctx: AudioContext): void {
  if (context) return;
  context = ctx;
  try {
    gain = ctx.createGain();
    gain.gain.value = 0;
    ctx.createMediaElementSource(element()).connect(gain).connect(ctx.destination);
  } catch {
    gain = null; // ohne Web Audio: Element spielt direkt (Lautstärke über volume)
  }
}

function target(): number {
  return performance.now() < duckUntil ? VOLUME * 0.35 : VOLUME;
}

function fadeTo(value: number, seconds: number, done?: () => void) {
  if (gain && context) {
    const g = gain.gain;
    const now = context.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(value, now + seconds);
  } else if (el) el.volume = Math.min(1, value);
  if (done) window.setTimeout(done, seconds * 1000 + 30);
}

/** Bei jeder Nutzergeste: Musik starten bzw. nach einer Unterbrechung fortsetzen. */
export function kickMusic(): void {
  if (!enabled || document.hidden) return;
  const audio = element();
  if (!audio.paused) return;
  if (gain) gain.gain.value = 0;
  else audio.volume = 0;
  audio
    .play()
    .then(() => fadeTo(target(), FADE_IN_S))
    .catch(() => {
      /* ohne Geste abgelehnt: nächster Tap versucht es wieder */
    });
}

/** Musik für `ms` leiser, damit Fanfaren und Rare-Sounds durchkommen. */
export function duckMusic(ms: number): void {
  if (!enabled || !el || el.paused) return;
  duckUntil = performance.now() + ms;
  fadeTo(VOLUME * 0.35, 0.12);
  window.setTimeout(() => {
    if (performance.now() >= duckUntil && enabled && el && !el.paused) fadeTo(VOLUME, 0.8);
  }, ms + 20);
}

export function installMusic(): void {
  // iOS 16.4+: "ambient" = mischt sich mit anderer Musik (z. B. Spotify) und folgt
  // dem Stumm-Schalter – wie bei Spielen üblich.
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session) {
    try {
      session.type = 'ambient';
    } catch {
      /* ignorieren */
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (!el) return;
    if (document.hidden) el.pause();
    else kickMusic();
  });
}
