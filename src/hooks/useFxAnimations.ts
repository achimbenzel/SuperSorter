import { useEffect, useRef, type RefObject } from 'react';
import { UI_IMAGE } from '../assets';
import { TIMING } from '../config';
import type { ShopFx } from '../game/shop/types';
import type { FxEvent } from '../game/types';

/** FX-Events beider Spielmodi. */
type AnyFx = FxEvent | ShopFx;

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
        case 'invalid':
        case 'blocked': {
          shake(root.querySelector(`[data-target="${ev.target.kind}-${ev.target.index}"]`));
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
        default:
          break;
      }
    }
    // fxSeq als Abhängigkeit: neue Events haben immer eine höhere seq.
  }, [rootRef, fx, fxSeq]);
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
