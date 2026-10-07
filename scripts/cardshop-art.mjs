// Card-Shop-Waren als Vektorgrafik (Code), gerendert zu WebP wie die übrigen Assets.
//
//   node scripts/cardshop-art.mjs
//
// Schreibt die SVG-Quellen nach assets-src/cardshop/ und die fertigen Bilder
// (216 × 216, Sticker-Stil wie die Original-Waren: dunkle Kontur, weißer Rand,
// Glanz) nach public/assets/items/<id>.webp.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC_DIR = path.join(ROOT, 'assets-src/cardshop');
const OUT_DIR = path.join(ROOT, 'public/assets/items');
const SIZE = 216;
const INK = '#3a2416';

const svg = (body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 216 216">
<defs>
  <filter id="drop" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity="0.28"/></filter>
  ${defs}
</defs>
${body}
</svg>`;

/** Sticker: weißer Rand + Schatten um die Silhouette, darüber die eigentliche Zeichnung. */
const sticker = (silhouette, art) => `
<g filter="url(#drop)">${silhouette.replaceAll('$FILL', '#fff').replaceAll('$STROKE', 'stroke="#fff" stroke-width="20" stroke-linejoin="round"')}</g>
${art}`;

const ol = (w = 6) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const outline = ol();

// ---------------------------------------------------------------- Booster-Packs

/** Booster-Silhouette: oben/unten gezackte Schweißnaht, Seiten leicht bauchig. */
function boosterPath() {
  const [l, r, t, b, depth, step] = [56, 160, 30, 188, 8, 8];
  let d = `M${l},${t + depth}`;
  for (let x = l + step, i = 1; x <= r; x += step, i++) d += ` L${x},${i % 2 ? t : t + depth}`;
  d += ` C${r + 7},72 ${r + 7},146 ${r},${b - depth}`;
  for (let x = r - step, i = 1; x >= l; x -= step, i++) d += ` L${x},${i % 2 ? b : b - depth}`;
  d += ` C${l - 7},146 ${l - 7},72 ${l},${t + depth} Z`;
  return d;
}

function booster({ id, light, dark, label, emblem, labelColor = '#fff' }) {
  const p = boosterPath();
  const defs = `
  <linearGradient id="foil-${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/>
  </linearGradient>
  <linearGradient id="sheen-${id}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <clipPath id="clip-${id}"><path d="${p}"/></clipPath>`;
  const body = sticker(
    `<g transform="rotate(-8 108 108)"><path d="${p}" fill="$FILL" $STROKE/></g>`,
    `<g transform="rotate(-8 108 108)">
      <path d="${p}" fill="url(#foil-${id})"/>
      <g clip-path="url(#clip-${id})">
        <rect x="40" y="30" width="140" height="18" fill="${INK}" opacity=".18"/>
        <rect x="40" y="170" width="140" height="18" fill="${INK}" opacity=".18"/>
        <rect x="30" y="20" width="36" height="200" fill="url(#sheen-${id})" transform="rotate(18 108 108)"/>
        <circle cx="108" cy="104" r="34" fill="#fff" opacity=".92"/>
        <circle cx="108" cy="104" r="34" fill="none" stroke="${dark}" stroke-width="5"/>
        ${emblem}
      </g>
      <path d="${p}" fill="none" ${outline}/>
      <text x="108" y="166" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="900" font-size="24"
        fill="${labelColor}" stroke="${INK}" stroke-width="5" paint-order="stroke" letter-spacing="1">${label}</text>
    </g>`,
  );
  return svg(body, defs);
}

const FLAME = `<path d="M108 76 C 126 94 132 104 128 118 C 124 132 92 132 88 118 C 85 108 92 100 98 96 C 98 104 102 108 106 108 C 104 96 104 86 108 76 Z" fill="#ff7a1a" ${ol(4)}/>
<path d="M109 102 C 118 110 120 118 115 124 C 110 129 102 128 100 122 C 99 116 104 112 109 102 Z" fill="#ffd23f"/>`;
const DROP = `<path d="M108 74 C 120 92 130 104 130 116 C 130 128 120 136 108 136 C 96 136 86 128 86 116 C 86 104 96 92 108 74 Z" fill="#35a7ff" ${ol(4)}/>
<path d="M99 112 C 99 120 104 126 110 127" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85"/>`;
const LEAF = `<path d="M84 128 C 84 96 104 78 132 76 C 134 104 118 128 84 128 Z" fill="#4cc44c" ${ol(4)}/>
<path d="M88 124 C 100 110 112 100 124 86" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
const BOLT = `<path d="M114 72 L 90 110 L 106 110 L 98 138 L 128 96 L 111 96 Z" fill="#ffd400" ${ol(4)}/>`;

// ---------------------------------------------------------------- Zubehör

function deckBox() {
  const sil = `<path d="M50 78 L120 56 L170 74 L170 160 L100 184 L50 162 Z" fill="$FILL" $STROKE/>`;
  const defs = `<linearGradient id="dbf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b57cf2"/><stop offset="1" stop-color="#6d32c2"/></linearGradient>
  <linearGradient id="dbs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b4fd9"/><stop offset="1" stop-color="#4b1f94"/></linearGradient>`;
  const art = `
  <path d="M50 78 L100 96 L100 184 L50 162 Z" fill="url(#dbf)"/>
  <path d="M100 96 L170 74 L170 160 L100 184 Z" fill="url(#dbs)"/>
  <path d="M50 78 L120 56 L170 74 L100 96 Z" fill="#cfa6ff"/>
  <path d="M50 104 L100 122 L170 100" fill="none" ${ol(4)}/>
  <path d="M58 86 L92 98 L92 112 L58 100 Z" fill="#fff" opacity=".25"/>
  <path d="M75 140 l5 -11 l5 11 l12 1 l-9 8 l3 12 l-11 -6 l-11 6 l3 -12 l-9 -8 Z" fill="#ffd23f" ${ol(3)}/>
  <path d="M50 78 L120 56 L170 74 L170 160 L100 184 L50 162 Z M100 96 L100 184 M50 78 L100 96 L170 74" fill="none" ${outline}/>`;
  return svg(sticker(sil, art), defs);
}

function sleeves() {
  const card = (x, y, rot, fill, extra = '') => `<g transform="rotate(${rot} ${x + 34} ${y + 48})">
    <rect x="${x}" y="${y}" width="68" height="96" rx="8" fill="${fill}" ${outline}/>
    <rect x="${x + 8}" y="${y + 8}" width="52" height="80" rx="5" fill="#fff" opacity=".22"/>${extra}</g>`;
  const sil = `<g><rect x="44" y="40" width="128" height="140" rx="22" fill="$FILL" $STROKE/></g>`;
  const art = `
  ${card(52, 54, -16, '#1aa39a')}
  ${card(76, 48, 0, '#24c4b8')}
  ${card(100, 54, 16, '#3ee0d2', `<circle cx="134" cy="102" r="14" fill="#fff" opacity=".9"/><path d="M128 102 l5 5 l8 -10" fill="none" stroke="#1aa39a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`)}
  <rect x="58" y="138" width="100" height="34" rx="8" fill="#ff5d73" ${outline}/>
  <text x="108" y="163" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="900" font-size="18" fill="#fff" stroke="${INK}" stroke-width="4" paint-order="stroke">SLEEVES</text>`;
  return svg(sticker(sil, art));
}

function dice() {
  // D20 von vorne: Sechseck mit Innendreieck
  const hex = 'M108 34 L170 70 L170 146 L108 182 L46 146 L46 70 Z';
  const defs = `<linearGradient id="d20" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7ab6"/><stop offset="1" stop-color="#c2185b"/></linearGradient>`;
  const art = `
  <path d="${hex}" fill="url(#d20)"/>
  <path d="M108 34 L170 70 L134 82 Z M170 70 L170 146 L134 82 Z" fill="#fff" opacity=".18"/>
  <path d="M46 146 L82 82 L108 182 Z M170 146 L134 82 L108 182 Z" fill="#000" opacity=".12"/>
  <path d="M82 82 L134 82 L108 140 Z" fill="#ff9ccb"/>
  <path d="M108 34 L82 82 L46 70 M108 34 L134 82 L170 70 M82 82 L134 82 L108 140 Z M46 146 L82 82 M170 146 L134 82 M108 140 L108 182 M46 146 L108 140 L170 146" fill="none" ${ol(4)}/>
  <path d="${hex}" fill="none" ${outline}/>
  <text x="108" y="118" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="900" font-size="26" fill="#fff" stroke="${INK}" stroke-width="4" paint-order="stroke">20</text>`;
  return svg(sticker(`<path d="${hex}" fill="$FILL" $STROKE/>`, art), defs);
}

function figure() {
  // Sammelfigur: kleiner Feuerfuchs auf rundem Sockel
  const sil = `<g><ellipse cx="108" cy="170" rx="58" ry="20" fill="$FILL" $STROKE/><circle cx="108" cy="104" r="54" fill="$FILL" $STROKE/></g>`;
  const defs = `<radialGradient id="fur" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffb347"/><stop offset="1" stop-color="#f06b0f"/></radialGradient>`;
  const art = `
  <ellipse cx="108" cy="172" rx="56" ry="18" fill="#4a4f5c" ${outline}/>
  <ellipse cx="108" cy="166" rx="56" ry="16" fill="#6b7280" ${outline}/>
  <path d="M146 140 C 176 132 178 104 160 92 C 162 112 150 124 136 128 Z" fill="url(#fur)" ${ol(5)}/>
  <path d="M160 92 C 168 100 168 112 160 118 C 158 108 156 100 160 92 Z" fill="#fff"/>
  <ellipse cx="108" cy="140" rx="34" ry="24" fill="url(#fur)" ${ol(5)}/>
  <ellipse cx="108" cy="146" rx="16" ry="12" fill="#fff4e0"/>
  <path d="M72 70 L80 36 L100 62 Z M144 70 L136 36 L116 62 Z" fill="url(#fur)" ${ol(5)}/>
  <path d="M80 48 L84 62 L92 60 Z M136 48 L132 62 L124 60 Z" fill="#ffd9b0"/>
  <circle cx="108" cy="92" r="40" fill="url(#fur)" ${ol(5)}/>
  <path d="M80 104 C 90 124 126 124 136 104 C 126 112 90 112 80 104 Z" fill="#fff4e0"/>
  <ellipse cx="94" cy="90" rx="6" ry="8" fill="${INK}"/><ellipse cx="122" cy="90" rx="6" ry="8" fill="${INK}"/>
  <circle cx="96" cy="87" r="2.4" fill="#fff"/><circle cx="124" cy="87" r="2.4" fill="#fff"/>
  <ellipse cx="108" cy="104" rx="5" ry="3.5" fill="${INK}"/>
  <circle cx="84" cy="102" r="5" fill="#ff7a7a" opacity=".6"/><circle cx="132" cy="102" r="5" fill="#ff7a7a" opacity=".6"/>
  <path d="M84 70 C 90 62 100 58 106 58" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55"/>`;
  return svg(sticker(sil, art), defs);
}

export const ART = {
  'pack-fire': booster({ id: 'fire', light: '#ff6a4d', dark: '#c8102e', label: 'FIRE', emblem: FLAME }),
  'pack-water': booster({ id: 'water', light: '#5cc8ff', dark: '#1659c7', label: 'WATER', emblem: DROP }),
  'pack-leaf': booster({ id: 'leaf', light: '#8ee06a', dark: '#23893a', label: 'LEAF', emblem: LEAF }),
  'pack-bolt': booster({ id: 'bolt', light: '#ffe45c', dark: '#f29f05', label: 'BOLT', emblem: BOLT }),
  'deck-box': deckBox(),
  sleeves: sleeves(),
  dice: dice(),
  figure: figure(),
};

fs.mkdirSync(SRC_DIR, { recursive: true });
for (const [id, source] of Object.entries(ART)) {
  fs.writeFileSync(path.join(SRC_DIR, `${id}.svg`), source);
  await sharp(Buffer.from(source), { density: 144 }).resize(SIZE, SIZE).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(OUT_DIR, `${id}.webp`));
  console.log('✓', id);
}
