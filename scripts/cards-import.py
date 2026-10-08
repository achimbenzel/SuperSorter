"""Neue Kartendesigns übernehmen (vom Projektinhaber: fertige Karten 1024 × 1550 mit
Rahmen, Bild, Name, Element-Symbol und Nummer).

    python3 scripts/cards-import.py QUELLORDNER

QUELLORDNER enthält 01.webp … 32.webp (für Karte 1 gilt 01_new.webp, falls vorhanden)
und Holo-Masken NN_Holomask.webp (weiß = starker Holo-Effekt, schwarz = keiner,
grau = etwas). Schreibt:

  assets-src/cards/NN.webp, NN_Holomask.webp  Originale, unverändert
  public/assets/cards/NN.webp                 Kartenbild für 3D und Großansicht (WebP q82)
  public/assets/cards/thumbs/NN.webp          Vorschau 330 px breit (Sammlungsraster, Übersicht)
  public/assets/cards/NN-holo.webp            Holo-Maske als Alpha: weiß, Alpha = Helligkeit
                                              (so nutzen 3D-Shader und CSS-mask-image dieselbe Datei)

Vorschaubilder sind wichtig: 32 Karten in voller Größe bräuchten dekodiert ~200 MB.
"""

import os
import shutil
import sys

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC_KEEP = os.path.join(ROOT, 'assets-src', 'cards')
OUT = os.path.join(ROOT, 'public', 'assets', 'cards')
COUNT = 32
THUMB_W = 330


def main(src_dir):
    os.makedirs(SRC_KEEP, exist_ok=True)
    os.makedirs(os.path.join(OUT, 'thumbs'), exist_ok=True)
    for n in range(1, COUNT + 1):
        nn = f'{n:02d}'
        src = os.path.join(src_dir, f'{nn}_new.webp')
        if not os.path.exists(src):
            src = os.path.join(src_dir, f'{nn}.webp')
        shutil.copyfile(src, os.path.join(SRC_KEEP, f'{nn}.webp'))
        card = Image.open(src).convert('RGBA')
        card.save(os.path.join(OUT, f'{nn}.webp'), quality=82, alpha_quality=90, method=6)
        thumb = card.resize((THUMB_W, round(THUMB_W * card.height / card.width)), Image.LANCZOS)
        thumb.save(os.path.join(OUT, 'thumbs', f'{nn}.webp'), quality=82, alpha_quality=90, method=6)

        mask_src = os.path.join(src_dir, f'{nn}_Holomask.webp')
        if os.path.exists(mask_src):
            shutil.copyfile(mask_src, os.path.join(SRC_KEEP, f'{nn}_Holomask.webp'))
            m = np.asarray(Image.open(mask_src).convert('RGBA')).astype(np.float32)
            lum = m[..., :3] @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
            alpha = np.clip(lum * (m[..., 3] / 255), 0, 255).astype(np.uint8)
            out = np.dstack([np.full_like(alpha, 255)] * 3 + [alpha])
            Image.fromarray(out, 'RGBA').save(os.path.join(OUT, f'{nn}-holo.webp'), quality=90, alpha_quality=92, method=6)
            print(f'{nn}: Karte + Holo-Maske')
    print(f'{COUNT} Karten -> {os.path.relpath(OUT, ROOT)}/')


if __name__ == '__main__':
    main(sys.argv[1])
