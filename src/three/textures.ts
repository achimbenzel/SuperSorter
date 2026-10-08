// Canvas-Texturen für die 3D-Ansichten: Booster-Pack (Ersatz-Vorderseite, Rückseite,
// Nähte) und Glühen. Die Karten selbst sind fertige Bilder (public/assets/cards/).

const FONT = 'ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return { c, ctx };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}


// ---------------------------------------------------------------- Booster-Pack

export const PACK_TEX_W = 600;
export const PACK_TEX_H = 900;

/** Ersatz-Vorderseite des Packs, bis die Pack-Grafik geladen ist (`target`: hinein zeichnen). */
export function drawPackFront(target?: HTMLCanvasElement): HTMLCanvasElement {
  const W = PACK_TEX_W;
  const H = PACK_TEX_H;
  const c = target ?? canvas(W, H).c;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#7b3cf0');
  g.addColorStop(0.48, '#2c7bff');
  g.addColorStop(1, '#ff4f9a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // feine Folienlinien
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 3;
  for (let x = -H; x < W; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.lineTo(x + H, 0);
    ctx.stroke();
  }
  const glow = ctx.createRadialGradient(W / 2, H * 0.55, 10, W / 2, H * 0.55, W * 0.55);
  glow.addColorStop(0, 'rgba(255,255,255,0.55)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.font = `900 92px ${FONT}`;
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#2a1050';
  ctx.fillStyle = '#fff';
  for (const [text, y] of [
    ['SUPER', 150],
    ['SORTER', 240],
  ] as const) {
    ctx.strokeText(text, W / 2, y);
    ctx.fillText(text, W / 2, y);
  }
  ctx.font = `900 30px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText('TRADING CARD GAME', W / 2, 310);
  roundRect(ctx, W / 2 - 170, 750, 340, 58, 29);
  ctx.fillStyle = 'rgba(20,0,60,0.4)';
  ctx.fill();
  ctx.font = `900 30px ${FONT}`;
  ctx.fillStyle = '#fff';
  ctx.fillText('BASE SET · 5 CARDS', W / 2, 781);
  return c;
}

/** Rückseite: dunkles gebürstetes Metall mit goldener Schrift (passend zur Vorderseite). */
export function drawPackBack(): HTMLCanvasElement {
  const W = PACK_TEX_W;
  const H = PACK_TEX_H;
  const { c, ctx } = canvas(W, H);
  const rnd = seeded(5);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#4a4c54');
  g.addColorStop(0.5, '#2a2b31');
  g.addColorStop(1, '#3c3e46');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 2) {
    ctx.fillStyle = `rgba(255,255,255,${(rnd() * 0.05).toFixed(3)})`;
    ctx.fillRect(0, y, W, 1);
  }
  ctx.strokeStyle = '#b8924a';
  ctx.lineWidth = 6;
  roundRect(ctx, 34, 34, W - 68, H - 68, 26);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(184,146,74,0.5)';
  ctx.lineWidth = 2;
  roundRect(ctx, 48, 48, W - 96, H - 96, 20);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const gold = ctx.createLinearGradient(0, H * 0.3, 0, H * 0.44);
  gold.addColorStop(0, '#f6dfa0');
  gold.addColorStop(1, '#b07a2e');
  ctx.font = `900 78px ${FONT}`;
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#1c1410';
  ctx.fillStyle = gold;
  for (const [t, y] of [
    ['SUPER', H * 0.33],
    ['SORTER', H * 0.42],
  ] as const) {
    ctx.strokeText(t, W / 2, y);
    ctx.fillText(t, W / 2, y);
  }
  ctx.fillStyle = 'rgba(240,226,190,0.85)';
  ctx.font = `800 28px ${FONT}`;
  ctx.fillText('5 CARDS · 1 RARE OR BETTER', W / 2, H * 0.55);
  ctx.font = `700 22px ${FONT}`;
  ctx.fillStyle = 'rgba(240,226,190,0.55)';
  ctx.fillText('Super Sorter TCG · Base Expansion', W / 2, H * 0.88);
  return c;
}

export const CRIMP_TEX_W = 1024;
export const CRIMP_TEX_H = 140;

/** Kleiner deterministischer Zufall (gleiche Naht bei jedem Start). */
function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/**
 * Silberne Schweißnaht wie bei echten Packs: wenige dezente Rillen, leicht
 * zerknitterte Folie, gezackte Außenkante. Oben zusätzlich die Stanzungen:
 * Aufhängeloch (Euro-Schlitz) in der Mitte und Aufreiß-Kerben an den Seiten.
 * Transparente Stellen schneidet das Material per alphaTest aus.
 */
export function drawCrimp(top: boolean): HTMLCanvasElement {
  const W = CRIMP_TEX_W;
  const H = CRIMP_TEX_H;
  const { c, ctx } = canvas(W, H);
  const rnd = seeded(top ? 7 : 11);
  const outer = top ? 0 : H; // Außenkante
  const inner = H - outer; // Kante zum Pack hin

  // Grundfläche mit gezackter Außenkante
  const teeth = 20;
  const depth = 5;
  ctx.beginPath();
  ctx.moveTo(0, inner);
  for (let i = 0; i <= teeth * 2; i++) {
    const x = (i / (teeth * 2)) * W;
    const d = i % 2 ? depth : 0;
    ctx.lineTo(x, top ? d : H - d);
  }
  ctx.lineTo(W, inner);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#7b828e');
  g.addColorStop(0.35, '#c4c9d2');
  g.addColorStop(0.6, '#a6acb7');
  g.addColorStop(1, '#6f7683');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ctx.clip();
  // Knitter: breite, weiche helle/dunkle Bahnen
  for (let i = 0; i < 12; i++) {
    const x = rnd() * W;
    const w = 20 + rnd() * 70;
    const light = rnd() > 0.5;
    const band = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    const col = light ? '255,255,255' : '40,46,58';
    band.addColorStop(0, `rgba(${col},0)`);
    band.addColorStop(0.5, `rgba(${col},${light ? 0.35 : 0.22})`);
    band.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = band;
    ctx.fillRect(x - w / 2, 0, w, H);
  }
  // dezente Rillen
  for (let x = 20; x < W; x += 44) {
    ctx.fillStyle = 'rgba(30,36,48,0.12)';
    ctx.fillRect(x, 0, 3, H);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x + 3, 0, 3, H);
  }
  // Schatten an der Kante zum Pack
  const sg = ctx.createLinearGradient(0, inner, 0, top ? inner - 18 : inner + 18);
  sg.addColorStop(0, 'rgba(20,22,30,0.55)');
  sg.addColorStop(1, 'rgba(20,22,30,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, top ? inner - 18 : inner, W, 18);
  ctx.restore();

  if (top) {
    // Aufhängeloch: Stadion-Form ausstanzen, mit geprägtem Rand
    const hw = W * 0.2;
    const hh = 40;
    const hx = (W - hw) / 2;
    const hy = H * 0.5 - hh / 2;
    roundRect(ctx, hx - 7, hy - 7, hw + 14, hh + 14, (hh + 14) / 2);
    ctx.fillStyle = 'rgba(60,66,78,0.55)';
    ctx.fill();
    roundRect(ctx, hx - 3, hy - 3, hw + 6, hh + 6, (hh + 6) / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    roundRect(ctx, hx, hy, hw, hh, hh / 2);
    ctx.fill();
    // Aufreiß-Kerben links und rechts
    for (const x of [0, W]) {
      ctx.beginPath();
      ctx.moveTo(x, H * 0.48);
      ctx.lineTo(x + (x ? -22 : 22), H * 0.66);
      ctx.lineTo(x, H * 0.84);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  return c;
}

/** Weicher, runder Lichtfleck (für Glühen hinter Karten). */
export function drawGlow(): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return c;
}
