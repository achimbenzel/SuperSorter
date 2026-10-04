import { useEffect, useRef, type RefObject } from 'react';
import { UI_IMAGE } from '../assets';
import { TIMING } from '../config';
import { closeAt } from '../components/pack/timeline';
import type { PackFx } from '../game/pack/types';
import type { FxEvent } from '../game/types';

/** FX-Events beider Spielmodi. */
type AnyFx = FxEvent | PackFx;

const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-7px) rotate(-1.5deg)' },
  { transform: 'translateX(6px) rotate(1.2deg)' },
  { transform: 'translateX(-4px)' },
  { transform: 'translateX(3px)' },
  { transform: 'translateX(0)' },
];

function shake(el: Element | null) {
  (el as HTMLElement | null)?.animate(SHAKE, { duration: TIMING.shake, easing: 'ease-out' });
}

/**
 * Spielt die kurzlebigen FX-Events des Reducers ab (Shake, Münzflug).
 * Bewusst imperativ per Web Animations API: Diese Effekte sind reine Deko und
 * sollen keine zusätzlichen React-Renders auslösen.
 */
export function useFxAnimations(rootRef: RefObject<HTMLElement | null>, fx: AnyFx[], fxSeq: number) {
  const handled = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    for (const ev of fx) {
      if (ev.seq <= handled.current) continue;
      handled.current = ev.seq;
      switch (ev.kind) {
        case 'invalid': {
          const target = 'stack' in ev ? `stack-${ev.stack}` : `${ev.target.kind}-${ev.target.index}`;
          shake(root.querySelector(`[data-target="${target}"]`));
          root.querySelectorAll('.item.is-selected').forEach(shake);
          break;
        }
        case 'denied':
          shake(root.querySelector(`[data-booster="${ev.booster}"]`));
          break;
        case 'gold':
          flyCoins(root, `slot-${ev.slot}`, ev.amount);
          break;
        case 'coins':
          flyCoins(root, ev.coinTarget, ev.amount);
          break;
        case 'combo':
          // Packband: ab dem zweiten Paket im selben Zug "Kombo ×n" beim Zuklappen.
          for (let n = 2; n <= ev.count; n++) floatText(root, `spot-${ev.spot}`, `Kombo ×${n}!`, closeAt(n - 1) + 200);
          break;
        default:
          break;
      }
    }
    // fxSeq als Abhängigkeit: neue Events haben immer eine höhere seq.
  }, [rootRef, fx, fxSeq]);
}

/** Kurzer Schriftzug, der über einem Ziel aufsteigt (z. B. Kombo). */
function floatText(root: HTMLElement, target: string, text: string, delay: number) {
  const from = root.querySelector(`[data-target="${target}"]`)?.getBoundingClientRect();
  if (!from) return;
  const label = document.createElement('div');
  label.className = 'fx-combo';
  label.textContent = text;
  label.style.left = `${from.left + from.width / 2}px`;
  label.style.top = `${from.top + from.height * 0.35}px`;
  root.appendChild(label);
  label
    .animate(
      [
        { transform: 'translate(-50%, -50%) scale(.4) rotate(-8deg)', opacity: 0 },
        { transform: 'translate(-50%, -80%) scale(1.2) rotate(-4deg)', opacity: 1, offset: 0.25 },
        { transform: 'translate(-50%, -110%) scale(1) rotate(-4deg)', opacity: 1, offset: 0.7 },
        { transform: 'translate(-50%, -170%) scale(.9) rotate(-4deg)', opacity: 0 },
      ],
      { duration: 1100, delay, easing: 'ease-out', fill: 'both' },
    )
    .finished.finally(() => label.remove());
}

/** Münzen fliegen vom Fach/Paket zum Münzzähler im HUD, dazu ein "+N". */
function flyCoins(root: HTMLElement, target: string, amount: number) {
  const from = root.querySelector(`[data-target="${target}"]`)?.getBoundingClientRect();
  const to = root.querySelector('#hud-coins')?.getBoundingClientRect();
  if (!from || !to) return;
  const startX = from.left + from.width / 2;
  const startY = from.top + from.height / 2;
  const endX = to.left + to.height / 2;
  const endY = to.top + to.height / 2;

  const label = document.createElement('div');
  label.className = 'fx-plus';
  label.textContent = `+${amount}`;
  label.style.left = `${startX}px`;
  label.style.top = `${startY}px`;
  root.appendChild(label);
  label
    .animate(
      [
        { transform: 'translate(-50%, -50%) scale(.6)', opacity: 0 },
        { transform: 'translate(-50%, -120%) scale(1.15)', opacity: 1, offset: 0.3 },
        { transform: 'translate(-50%, -220%) scale(1)', opacity: 0 },
      ],
      { duration: 1100, delay: TIMING.hop, easing: 'ease-out', fill: 'both' },
    )
    .finished.finally(() => label.remove());

  for (let i = 0; i < 3; i++) {
    const coin = document.createElement('img');
    coin.src = UI_IMAGE.coin;
    coin.className = 'fx-coin';
    coin.style.left = `${startX}px`;
    coin.style.top = `${startY}px`;
    root.appendChild(coin);
    const dx = endX - startX;
    const dy = endY - startY;
    coin
      .animate(
        [
          { transform: 'translate(-50%, -50%) scale(.3)', opacity: 0 },
          { transform: `translate(calc(-50% + ${(i - 1) * 18}px), calc(-50% - 30px)) scale(1)`, opacity: 1, offset: 0.25 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.55)`, opacity: 0.9 },
        ],
        { duration: 800, delay: TIMING.hop + i * 90, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'both' },
      )
      .finished.finally(() => coin.remove());
  }
}
