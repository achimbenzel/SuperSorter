// Zeitplan einer Packband-Kettenreaktion (alle Werte in ms ab dem Tap).
//
// Ein Tap ist sofort komplett ausgewertet (Reducer), die Anzeige spielt die Kette
// danach Schritt für Schritt ab. Schritt s (= s-tes verschicktes Paket im Zug):
//
//   closeAt(s)            Klappen zu, Klebeband, Häkchen
//   closeAt(s) + FLY      Paket fliegt davon (FLY_DURATION)
//   closeAt(s) + ARRIVE   nächstes Paket fährt vom Band heran (TIMING.boxArrive)
//   closeAt(s) + FEED     Waren springen vom Packtisch hinein (TIMING.hop)
//   closeAt(s + 1)        = closeAt(s) + TIMING.chainStep: nächster Versand
//
// Die CSS-Animationen in pack.css nutzen dieselben Abstände (calc(var(--close) + …)).

import { TIMING } from '../../config';

export const FLY = 560;
export const FLY_DURATION = 380;
export const ARRIVE = 520;
export const FEED = 760;

/** Beginn des Zuklappens für den s-ten Versand im Zug. */
export const closeAt = (chain: number) => TIMING.hop + chain * TIMING.chainStep;
/** Neues Paket nach dem s-ten Versand fährt los. */
export const arriveAt = (chain: number) => closeAt(chain) + ARRIVE;
/** Waren vom Packtisch springen nach dem s-ten Versand los (fed.chain = s + 1). */
export const feedAt = (fedChain: number) => closeAt(fedChain - 1) + FEED;
/** Ab hier ist das s-te Paket weg. */
export const goneAt = (chain: number) => closeAt(chain) + FLY + FLY_DURATION;
