// Generierte Level beider Modi, pro Sitzung gecacht.
//
// Ein Level zu erzeugen kostet je nach Tag 5–60 ms (Solver + Simulation), auf
// langsamen Handys mehr. Das aktuelle Level wird bei Bedarf sofort erzeugt; das
// nächste rechnet ein Web Worker im Hintergrund vor, damit das laufende Spiel dabei
// nicht ruckelt. Ohne Worker (alter Browser, Fehler) wird im Leerlauf im
// Haupt-Thread vorgerechnet wie bisher.

import { generateLevel, type GeneratedLevel } from './game/generator';
import { getLevelConfig } from './game/levels';
import { generatePackLevel, type GeneratedPackLevel } from './game/pack/generator';
import { getPackLevelConfig } from './game/pack/levels';
import type { LevelRequest } from './levelWorker';

type Mode = LevelRequest['mode'];

const shelfCache = new Map<number, GeneratedLevel>();
const packCache = new Map<number, GeneratedPackLevel>();
const pending = new Set<string>();

export function getShelfLevel(level: number): GeneratedLevel {
  let g = shelfCache.get(level);
  if (!g) {
    g = generateLevel(getLevelConfig(level));
    shelfCache.set(level, g);
  }
  return g;
}

export function getPackLevel(day: number): GeneratedPackLevel {
  let g = packCache.get(day);
  if (!g) {
    g = generatePackLevel(getPackLevelConfig(day));
    packCache.set(day, g);
  }
  return g;
}

const isCached = (mode: Mode, level: number) => (mode === 'pack' ? packCache : shelfCache).has(level);

let worker: Worker | null | undefined;

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./levelWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<LevelRequest & { result: GeneratedLevel | GeneratedPackLevel }>) => {
      const { mode, level, result } = e.data;
      pending.delete(`${mode}:${level}`);
      if (isCached(mode, level)) return;
      if (mode === 'pack') packCache.set(level, result as GeneratedPackLevel);
      else shelfCache.set(level, result as GeneratedLevel);
    };
    worker.onerror = () => {
      // Worker kaputt: künftig im Haupt-Thread vorrechnen.
      worker?.terminate();
      worker = null;
      pending.clear();
    };
  } catch {
    worker = null;
  }
  return worker;
}

/** Level im Hintergrund vorbereiten (kehrt sofort zurück). */
export function prefetchLevel(mode: Mode, level: number): void {
  const key = `${mode}:${level}`;
  if (isCached(mode, level) || pending.has(key)) return;
  const w = getWorker();
  if (w) {
    pending.add(key);
    w.postMessage({ mode, level } satisfies LevelRequest);
    return;
  }
  window.setTimeout(() => (mode === 'pack' ? getPackLevel(level) : getShelfLevel(level)), 0);
}
