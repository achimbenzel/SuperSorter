// Sound-Wiedergabe per Web Audio API.
//
// - Dateien werden beim Start geladen (fetch) und beim ersten Tap dekodiert.
// - iOS erlaubt Audio erst nach einer Nutzergeste: Der AudioContext wird beim ersten
//   Tap angelegt und bei jedem Tap wieder aufgeweckt (iOS unterbricht ihn z. B. nach
//   dem Wechsel in eine andere App).
// - Hinweis iOS: Web Audio folgt dem Stumm-Schalter – im Lautlos-Modus bleibt es still.
// - An/Aus-Einstellung liegt in localStorage (SOUND_KEY) und gilt sofort.
// - Hintergrundmusik: music.ts (hängt am selben AudioContext, eigener Schalter).

import { SFX_FILE } from '../assets';
import { connectMusic, duckMusic, installMusic, kickMusic } from './music';
import { setSfxHandler, type SfxName } from './sfx';

export const SOUND_KEY = 'super-sorter/sound/v1';

/** Lautstärke je Sound (0–1), damit häufige Klicks leiser sind als Belohnungen. */
const VOLUME: Partial<Record<SfxName, number>> = {
  tap: 0.5,
  select: 0.55,
  place: 0.6,
  tab: 0.4,
  'card-flip': 0.85,
  'card-slide': 0.55,
  reveal: 0.6,
  invalid: 0.7,
};
/** Bei diesen Sounds wird die Musik kurz leiser (ms). */
const DUCK_MS: Partial<Record<SfxName, number>> = { win: 2600, lose: 1800, 'card-holo': 2400, 'card-rare': 1600 };
/** Denselben Sound nicht öfter als alle x ms (Ketten, schnelle Taps). */
const MIN_GAP_MS = 45;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const raw = new Map<string, Promise<ArrayBuffer | null>>();
const buffers = new Map<string, AudioBuffer>();
const lastPlayed = new Map<SfxName, number>();
let enabled = readEnabled();

function readEnabled(): boolean {
  try {
    const v = window.localStorage.getItem(SOUND_KEY);
    return v === null ? true : JSON.parse(v) !== false;
  } catch {
    return true;
  }
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(value: boolean): void {
  enabled = value;
  try {
    window.localStorage.setItem(SOUND_KEY, JSON.stringify(value));
  } catch {
    /* ignorieren */
  }
}

function prefetch() {
  for (const url of Object.values(SFX_FILE).flat()) {
    raw.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null),
    );
  }
}

function decodeAll(context: AudioContext) {
  for (const [url, data] of raw) {
    data.then(async (buf) => {
      if (!buf || buffers.has(url)) return;
      try {
        // slice: decodeAudioData übernimmt den Puffer (detached), Original behalten.
        buffers.set(url, await context.decodeAudioData(buf.slice(0)));
      } catch {
        /* defekte Datei: Sound fehlt einfach */
      }
    });
  }
}

function unlock() {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    decodeAll(ctx);
    connectMusic(ctx);
  }
  if (ctx.state !== 'running') void ctx.resume().catch(() => {});
  kickMusic();
}

function play(name: SfxName) {
  if (!enabled || !ctx || !master || ctx.state !== 'running') return;
  const variants = SFX_FILE[name].map((url) => buffers.get(url)).filter((b): b is AudioBuffer => !!b);
  if (variants.length === 0) return;
  const buffer = variants[Math.floor(Math.random() * variants.length)];
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? -Infinity) < MIN_GAP_MS) return;
  lastPlayed.set(name, now);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = VOLUME[name] ?? 0.8;
  src.connect(gain).connect(master);
  src.start();
  const duck = DUCK_MS[name];
  if (duck) duckMusic(duck);
}

export function installAudio(): void {
  prefetch();
  // Capture-Phase: läuft vor den Klick-Handlern, damit schon der erste Tap klingt.
  for (const type of ['pointerdown', 'touchend', 'keydown'] as const) {
    window.addEventListener(type, unlock, { capture: true, passive: true });
  }
  setSfxHandler(play);
  installMusic();
}
