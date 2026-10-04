#!/usr/bin/env node
// Erzeugt alle App-Icons (iOS Homescreen, PWA-Manifest, Favicon) aus dem
// App-Icon-Original in assets-src/.
//
// - apple-touch-icon-180.png: iOS ignoriert Transparenz nicht sauber (schwarzer
//   Hintergrund), deshalb wird hier explizit auf die Hintergrundfarbe geflattet
//   und der Alpha-Kanal entfernt.
// - pwa-maskable-512.png: Android/Chrome schneiden maskable Icons auf einen Kreis
//   bzw. eine Squircle zu. Die "Safe Zone" ist ein Kreis mit 40 % Radius, daher wird
//   das Motiv auf 78 % verkleinert und mit der Hintergrundfarbe aufgefüllt.
//
// Aufruf: npm run assets:icons

import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { APP_ICON_SRC } from './asset-map.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets-src', APP_ICON_SRC);
const OUT_DIR = join(root, 'public', 'assets', 'icons');

/** Hintergrundfarbe des App-Icons (aus der Ecke des Originals gemessen). */
const ICON_BG = { r: 0x63, g: 0xb0, b: 0xda };
const MASKABLE_SCALE = 0.78;

async function plain(size, name) {
  const out = join(OUT_DIR, name);
  await sharp(SRC).resize(size, size).flatten({ background: ICON_BG }).removeAlpha().png({ compressionLevel: 9 }).toFile(out);
  return `${name} (${size}x${size})`;
}

async function maskable(size, name) {
  const inner = Math.round(size * MASKABLE_SCALE);
  const pad = Math.floor((size - inner) / 2);
  const logo = await sharp(SRC).resize(inner, inner).png().toBuffer();
  const out = join(OUT_DIR, name);
  await sharp({ create: { width: size, height: size, channels: 3, background: ICON_BG } })
    .composite([{ input: logo, left: pad, top: pad }])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(out);
  return `${name} (${size}x${size}, maskable)`;
}

await mkdir(OUT_DIR, { recursive: true });
const made = await Promise.all([
  plain(180, 'apple-touch-icon-180.png'),
  plain(192, 'pwa-192.png'),
  plain(512, 'pwa-512.png'),
  maskable(512, 'pwa-maskable-512.png'),
  plain(64, 'favicon-64.png'),
]);
console.log('Icons erzeugt:\n  ' + made.join('\n  '));
