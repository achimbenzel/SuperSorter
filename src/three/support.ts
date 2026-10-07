// WebGL-Prüfung ohne three.js zu laden (damit three.js nur bei Bedarf nachgeladen wird).

let cached: boolean | null = null;

export function webglSupported(): boolean {
  if (cached !== null) return cached;
  try {
    const c = document.createElement('canvas');
    cached = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    cached = false;
  }
  return cached;
}
