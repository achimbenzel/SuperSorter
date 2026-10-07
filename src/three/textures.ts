// Canvas-Texturen für die 3D-Ansichten: Kartenvorder- und -rückseite, Booster-Pack.
// Gleiches Design wie die CSS-Karte (components/cards/TcgCard.tsx, styles/cards.css),
// nur als Bild, damit three.js es auf eine Fläche legen und mit dem Holo-Shader
// beleuchten kann.

import { ELEMENT_LABEL, RARITY_LABEL, RARITY_SYMBOL, SET_SIZE, type CardDef, type CardElement } from '../game/cards/cards';

export const CARD_TEX_W = 640;
export const CARD_TEX_H = 894; // 63 : 88
const FONT = 'ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

const ELEMENT_COLORS: Record<CardElement, { a: string; b: string; artA: string; artB: string }> = {
  fire: { a: '#ff9a6b', b: '#d02a1e', artA: '#fff1c9', artB: '#ff9a4d' },
  water: { a: '#84cfff', b: '#1f5fcf', artA: '#e6f7ff', artB: '#6cbcff' },
  leaf: { a: '#a8e88a', b: '#2c8a3b', artA: '#f2ffe6', artB: '#8fd86c' },
  bolt: { a: '#ffe98a', b: '#e09a00', artA: '#fffbe3', artB: '#ffd84a' },
};

const ELEMENT_ICON: Record<CardElement, string> = { fire: '🔥', water: '💧', leaf: '🍃', bolt: '⚡' };

/** Bildbereich der Karte in UV-Koordinaten (für den Holo-Effekt): [u0, v0, u1, v1]. */
export const ART_RECT_UV: [number, number, number, number] = [42 / CARD_TEX_W, 1 - 686 / CARD_TEX_H, 598 / CARD_TEX_W, 1 - 107 / CARD_TEX_H];

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

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight = 900) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (ctx.measureText(text).width > maxW && s > 18) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
}

export function drawCardFront(card: CardDef): HTMLCanvasElement {
  const W = CARD_TEX_W;
  const H = CARD_TEX_H;
  const { c, ctx } = canvas(W, H);
  const col = ELEMENT_COLORS[card.element];
  const special = card.rarity === 'rare' || card.rarity === 'holo';

  // Rahmen + Kartenfläche
  roundRect(ctx, 0, 0, W, H, 30);
  ctx.fillStyle = card.rarity === 'holo' ? '#fde68a' : '#f4cf3d';
  ctx.fill();
  const g = ctx.createLinearGradient(0, 0, W * 0.45, H);
  g.addColorStop(0, col.a);
  g.addColorStop(1, col.b);
  roundRect(ctx, 19, 19, W - 38, H - 38, 14);
  ctx.fillStyle = g;
  ctx.fill();

  // Name + HP
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#2a1a0e';
  ctx.font = `900 30px ${FONT}`;
  const hpNum = String(card.hp);
  ctx.font = `900 44px ${FONT}`;
  const hpW = ctx.measureText(hpNum).width;
  ctx.font = `900 26px ${FONT}`;
  const hpLabelW = ctx.measureText('HP').width;
  fitText(ctx, card.name, W - 84 - hpW - hpLabelW - 20, 46);
  ctx.textAlign = 'left';
  ctx.fillText(card.name, 42, 84);
  ctx.fillStyle = '#b3121f';
  ctx.textAlign = 'right';
  ctx.font = `900 44px ${FONT}`;
  ctx.fillText(hpNum, W - 42, 84);
  ctx.font = `900 26px ${FONT}`;
  ctx.fillText('HP', W - 46 - hpW, 84);

  // Bildfenster
  const ax = 42;
  const ay = 107;
  const aw = W - 84;
  const ah = 686 - 107;
  roundRect(ctx, ax, ay, aw, ah, 14);
  ctx.fillStyle = special ? '#ffd700' : '#e6c058';
  ctx.fill();
  const rg = ctx.createRadialGradient(W / 2, ay + ah * 0.42, 10, W / 2, ay + ah * 0.42, ah * 0.75);
  rg.addColorStop(0, col.artA);
  rg.addColorStop(1, col.artB);
  roundRect(ctx, ax + 10, ay + 10, aw - 20, ah - 20, 8);
  ctx.fillStyle = rg;
  ctx.fill();
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 10;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `250px ${EMOJI_FONT}`;
  ctx.fillText(card.art, W / 2, ay + ah / 2 + 12);
  ctx.restore();

  // Typzeile
  const typeText = `Basic · ${ELEMENT_LABEL[card.element]} · ${RARITY_LABEL[card.rarity]}`;
  ctx.font = `italic 800 26px ${FONT}`;
  const tw = ctx.measureText(typeText).width + 40;
  roundRect(ctx, (W - tw) / 2, 698, tw, 36, 18);
  ctx.fillStyle = 'rgba(255,252,240,0.82)';
  ctx.fill();
  ctx.fillStyle = '#2a1a0e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(typeText, W / 2, 717);

  // Attacke
  roundRect(ctx, 42, 746, W - 84, 70, 16);
  ctx.fillStyle = 'rgba(255,250,236,0.92)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(84, 781, 23, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = `28px ${EMOJI_FONT}`;
  ctx.fillText(ELEMENT_ICON[card.element], 84, 783);
  ctx.fillStyle = '#2a1a0e';
  ctx.textAlign = 'left';
  fitText(ctx, card.attack.name, W - 300, 38);
  ctx.fillText(card.attack.name, 120, 783);
  ctx.textAlign = 'right';
  ctx.font = `900 54px ${FONT}`;
  ctx.fillText(String(card.attack.damage), W - 62, 785);

  // Nummer + Seltenheit
  ctx.font = `800 28px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowOffsetY = 2;
  ctx.textAlign = 'left';
  ctx.fillText(`#${String(card.no).padStart(2, '0')}/${SET_SIZE}`, 42, 846);
  ctx.textAlign = 'right';
  ctx.font = `900 38px ${FONT}`;
  ctx.fillStyle = special ? '#ffe14d' : 'rgba(255,255,255,0.95)';
  ctx.fillText(RARITY_SYMBOL[card.rarity], W - 42, 848);
  ctx.shadowColor = 'transparent';
  return c;
}

let backCanvas: HTMLCanvasElement | null = null;

/** Rückseite (für alle Karten gleich, wird einmal gezeichnet). */
export function drawCardBack(): HTMLCanvasElement {
  if (backCanvas) return backCanvas;
  const W = CARD_TEX_W;
  const H = CARD_TEX_H;
  const { c, ctx } = canvas(W, H);
  roundRect(ctx, 0, 0, W, H, 30);
  ctx.fillStyle = '#1d3f9a';
  ctx.fill();
  const g = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, H * 0.62);
  g.addColorStop(0, '#3b78ea');
  g.addColorStop(0.55, '#1b45ac');
  g.addColorStop(1, '#0c2466');
  roundRect(ctx, 19, 19, W - 38, H - 38, 14);
  ctx.fillStyle = g;
  ctx.fill();
  // Strahlen
  ctx.save();
  roundRect(ctx, 19, 19, W - 38, H - 38, 14);
  ctx.clip();
  ctx.translate(W / 2, H / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, H, (i * 2 * Math.PI) / 30, ((i + 0.5) * 2 * Math.PI) / 30);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Emblem
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.beginPath();
  ctx.ellipse(0, 0, 250, 192, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  const eg = ctx.createRadialGradient(0, -60, 10, 0, 0, 260);
  eg.addColorStop(0, '#ffe680');
  eg.addColorStop(0.6, '#ffb21a');
  eg.addColorStop(1, '#f07c00');
  ctx.beginPath();
  ctx.ellipse(0, 0, 234, 176, 0, 0, Math.PI * 2);
  ctx.fillStyle = eg;
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 74px ${FONT}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#d0102b';
  for (const [text, y] of [
    ['SUPER', -48],
    ['SORTER', 26],
  ] as const) {
    ctx.strokeText(text, 0, y);
    ctx.fillText(text, 0, y);
  }
  ctx.font = `900 24px ${FONT}`;
  ctx.fillStyle = '#6a1b00';
  ctx.fillText('TRADING CARD GAME', 0, 92);
  ctx.restore();
  backCanvas = c;
  return c;
}

// ---------------------------------------------------------------- Booster-Pack

export const PACK_TEX_W = 600;
export const PACK_TEX_H = 900;

export function drawPackFront(): HTMLCanvasElement {
  const W = PACK_TEX_W;
  const H = PACK_TEX_H;
  const { c, ctx } = canvas(W, H);
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
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 14;
  ctx.font = `250px ${EMOJI_FONT}`;
  ctx.fillText('🐉', W / 2, 545);
  ctx.restore();
  roundRect(ctx, W / 2 - 170, 750, 340, 58, 29);
  ctx.fillStyle = 'rgba(20,0,60,0.4)';
  ctx.fill();
  ctx.font = `900 30px ${FONT}`;
  ctx.fillStyle = '#fff';
  ctx.fillText('BASE SET · 5 CARDS', W / 2, 781);
  return c;
}

export function drawPackBack(): HTMLCanvasElement {
  const W = PACK_TEX_W;
  const H = PACK_TEX_H;
  const { c, ctx } = canvas(W, H);
  const g = ctx.createLinearGradient(W, 0, 0, H);
  g.addColorStop(0, '#5a2cc0');
  g.addColorStop(1, '#1f5ad6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `900 46px ${FONT}`;
  ctx.fillText('5 CARDS', W / 2, H * 0.42);
  ctx.font = `800 28px ${FONT}`;
  ctx.fillText('1 RARE OR BETTER IN EVERY PACK', W / 2, H * 0.5);
  ctx.font = `700 22px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('Super Sorter TCG · Base Set', W / 2, H * 0.9);
  return c;
}

/** Silberne Schweißnaht mit Zacken (Alpha) – oben bzw. unten am Pack. */
export function drawCrimp(top: boolean): HTMLCanvasElement {
  const W = 512;
  const H = 96;
  const { c, ctx } = canvas(W, H);
  const teeth = 16;
  ctx.beginPath();
  if (top) {
    ctx.moveTo(0, H);
    for (let i = 0; i <= teeth * 2; i++) ctx.lineTo((i / (teeth * 2)) * W, i % 2 ? H * 0.22 : 0);
    ctx.lineTo(W, H);
  } else {
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    for (let i = teeth * 2; i >= 0; i--) ctx.lineTo((i / (teeth * 2)) * W, i % 2 ? H * 0.78 : H);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#f2f4f8');
  g.addColorStop(0.5, '#c4cad6');
  g.addColorStop(1, '#e8ebf1');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(70,80,100,0.22)';
  for (let x = 0; x < W; x += 9) ctx.fillRect(x, 0, 3, H);
  ctx.restore();
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
