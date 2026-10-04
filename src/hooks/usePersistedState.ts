import { useCallback, useState } from 'react';

/**
 * useState, das seinen Wert in localStorage spiegelt.
 *
 * Fehler beim Lesen/Schreiben (z. B. privater Modus, Speicher voll, kaputtes JSON)
 * werden geschluckt: Das Spiel soll dann einfach ohne Speicherstand laufen statt
 * abzustürzen. Unbekannte/fehlende Felder werden mit dem Default aufgefüllt, damit
 * ältere Speicherstände nach einem Update weiter funktionieren.
 */
export function usePersistedState<T extends object>(key: string, defaults: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) return { ...defaults, ...(JSON.parse(raw) as Partial<T>) };
    } catch {
      /* ignorieren: ohne Speicherstand starten */
    }
    return defaults;
  });

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* ignorieren */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update] as const;
}
