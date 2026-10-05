// Web Worker: erzeugt Level abseits des Haupt-Threads (siehe levelStore.ts).
// Die Generierung ist deterministisch – der Worker liefert exakt dasselbe Level wie
// ein Aufruf im Haupt-Thread, nur ohne dass das Spiel dabei ruckelt.

import { generateLevel } from './game/generator';
import { getLevelConfig } from './game/levels';
import { generatePackLevel } from './game/pack/generator';
import { getPackLevelConfig } from './game/pack/levels';

export interface LevelRequest {
  mode: 'shelf' | 'pack';
  level: number;
}

self.onmessage = (e: MessageEvent<LevelRequest>) => {
  const { mode, level } = e.data;
  const result = mode === 'pack' ? generatePackLevel(getPackLevelConfig(level)) : generateLevel(getLevelConfig(level));
  (self as unknown as { postMessage(message: unknown): void }).postMessage({ mode, level, result });
};
