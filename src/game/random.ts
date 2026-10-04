// Deterministischer Zufall. Math.random() ist hier tabu: Level müssen pro
// Level-Nummer reproduzierbar sein (gleiche Nummer = gleiches Level auf jedem Gerät).

export type Rng = () => number;

/** Mulberry32: winziger, schneller 32-bit PRNG mit guter Verteilung für Spielzwecke. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mischt mehrere Zahlen zu einem gut verteilten 32-bit-Seed (Variante von splitmix/murmur-Finalizer). */
export function hashSeed(...parts: number[]): number {
  let h = 0x9e3779b9;
  for (const p of parts) {
    h ^= p >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

export function randInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

/** Fisher-Yates, gibt eine neue Liste zurück. */
export function shuffled<T>(rng: Rng, list: readonly T[]): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[randInt(rng, list.length)];
}
