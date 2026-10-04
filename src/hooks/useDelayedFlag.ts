import { useEffect, useState } from 'react';

/** Wird `true` erst `delay` ms nachdem `value` true wurde; fällt sofort auf false zurück. */
export function useDelayedFlag(value: boolean, delay: number): boolean {
  const [flag, setFlag] = useState(false);
  useEffect(() => {
    if (!value) {
      setFlag(false);
      return;
    }
    const t = window.setTimeout(() => setFlag(true), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return flag;
}
