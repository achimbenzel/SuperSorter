#!/usr/bin/env node
// Erzeugt aus den Originalen in assets-src/ verkleinerte, beschnittene WebP-Dateien
// unter public/assets/. Die Originale bleiben unverändert.
//
// Warum WebP? iOS Safari kann WebP seit iOS 14; die Dateien sind bei gleicher
// Qualität ca. 5-10x kleiner als die Original-PNGs. Das hält den Offline-Cache
// des Service Workers klein und die Ladezeit auf dem iPhone kurz.
//
// Aufruf: npm run assets:optimize

import { mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ASSET_MAP } from './asset-map.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(root, 'assets-src');
const OUT_DIR = join(root, 'public', 'assets');
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
/** Rand um Sprites, damit Glow/Outline beim Skalieren nicht abgeschnitten wird. */
const SPRITE_PADDING = 0.03;

/** Setzt fast transparente Pixel (Freistellungs-Reste) auf voll transparent. */
async function cleanAlpha(buffer, threshold) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < threshold) data[i] = 0;
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

async function processEntry(entry) {
  const srcPath = join(SRC_DIR, entry.src);
  let buf = await sharp(srcPath).ensureAlpha().png().toBuffer();

  if (entry.crop) buf = await sharp(buf).extract(entry.crop).png().toBuffer();
  if (entry.cleanAlpha) buf = await cleanAlpha(buf, entry.cleanAlpha);
  // Transparente Ränder entfernen, damit alle Sprites ihre Box gleichmäßig füllen.
  if (!entry.noTrim && !entry.crop) buf = await sharp(buf).trim({ threshold: 1 }).png().toBuffer();

  let pipeline;
  if (entry.kind === 'sprite') {
    const inner = Math.round(entry.size * (1 - 2 * SPRITE_PADDING));
    const pad = Math.floor((entry.size - inner) / 2);
    const resized = await sharp(buf)
      .resize(inner, inner, { fit: 'contain', background: TRANSPARENT })
      .png()
      .toBuffer();
    pipeline = sharp(resized).extend({
      top: pad,
      bottom: entry.size - inner - pad,
      left: pad,
      right: entry.size - inner - pad,
      background: TRANSPARENT,
    });
  } else {
    pipeline = sharp(buf).resize({ width: entry.size, withoutEnlargement: true });
  }

  const outPath = join(OUT_DIR, `${entry.out}.webp`);
  await mkdir(dirname(outPath), { recursive: true });
  const info = await pipeline.webp({ quality: 88, alphaQuality: 95, effort: 6 }).toFile(outPath);
  const srcSize = (await stat(srcPath)).size;
  return { ...entry, width: info.width, height: info.height, bytes: info.size, srcBytes: srcSize };
}

const results = [];
for (const entry of ASSET_MAP) {
  results.push(await processEntry(entry));
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log('| Original | Ziel | Größe (px) | Datei |');
console.log('|---|---|---|---|');
for (const r of results) {
  console.log(`| ${r.src} (${kb(r.srcBytes)}) | assets/${r.out}.webp | ${r.width}x${r.height} | ${kb(r.bytes)} |`);
}
const total = results.reduce((s, r) => s + r.bytes, 0);
console.log(`\n${results.length} Dateien, gesamt ${kb(total)}`);
