"""Booster-Pack-Textur für die 3D-Ansicht aufbereiten.

    python3 scripts/pack-texture.py HOCHSKALIERT.png

Eingabe: die Pack-Vorderseite (assets-src/pack/pack-front.jpg), vorher per KI
4-fach hochskaliert (Real-ESRGAN x4plus, s. docs/ASSETS.md). Ausgabe nach
public/assets/pack/:

- front.webp  Farbtextur, 1536 px breit
- maps.png    Materialkarte für three.js, halbe Auflösung, je Kanal:
                R = Höhe (Relief für bumpMap: Ornamente und Schrift treten hervor)
                G = Rauheit (roughnessMap)
                B = Metall (metalnessMap)

Metall wird aus der Farbe geschätzt: graue/silberne Flächen (wenig Sättigung)
und goldene Töne (Schrift, Plaketten, Rahmen) glänzen metallisch, das Gemälde in
der Mitte bleibt matt (Maske über seinen Bereich).
"""

import os
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'public', 'assets', 'pack')
FRONT_W = 1536
MAP_W = 768

# Innenfeld (dunkler Grund hinter dem Titel + Gemälde) in Anteilen der Bildgröße:
# x0, y0, x1, y1 – kein graues Metall, nur goldene Schrift glänzt
PANEL = (0.105, 0.14, 0.895, 0.79)
# Gemälde (Kampfszene) – ganz matt, auch Gold (Lava, Funken) ist dort kein Metall
PAINTING = (0.105, 0.318, 0.895, 0.79)
# Plaketten, die ins Gemälde ragen ("Trading Card Game", "Additional Card Pack") – Metall
PLAQUES = [(0.285, 0.338, 0.715, 0.39), (0.695, 0.705, 0.895, 0.805)]


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def main(src):
    os.makedirs(OUT, exist_ok=True)
    img = Image.open(src).convert('RGB')
    front = img.resize((FRONT_W, round(FRONT_W * img.height / img.width)), Image.LANCZOS)
    front.save(os.path.join(OUT, 'front.webp'), quality=90, method=6)

    small = front.resize((MAP_W, round(MAP_W * front.height / front.width)), Image.LANCZOS)
    rgb = np.asarray(small).astype(np.float32) / 255
    h, w, _ = rgb.shape
    hsv = np.asarray(small.convert('HSV')).astype(np.float32) / 255
    hue, sat, val = hsv[..., 0] * 360, hsv[..., 1], hsv[..., 2]

    grey = smoothstep(0.32, 0.14, sat)
    gold = smoothstep(12, 22, hue) * smoothstep(60, 48, hue) * smoothstep(0.2, 0.32, sat) * smoothstep(0.3, 0.45, val)

    def region(box):
        mask = Image.new('L', (w, h), 0)
        x0, y0, x1, y1 = box
        mask.paste(255, (round(x0 * w), round(y0 * h), round(x1 * w), round(y1 * h)))
        for px0, py0, px1, py1 in PLAQUES:
            mask.paste(0, (round(px0 * w), round(py0 * h), round(px1 * w), round(py1 * h)))
        return np.asarray(mask.filter(ImageFilter.GaussianBlur(w * 0.012))).astype(np.float32) / 255

    panel = region(PANEL)
    paint = region(PAINTING)
    metal = np.maximum(grey * (1 - panel), gold * 0.95 * (1 - paint * 0.92))
    rough = 0.6 - 0.32 * metal - 0.08 * gold
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    height = np.asarray(Image.fromarray((lum * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255
    height = 0.5 + (height - 0.5) * (1 - paint * 0.85)

    maps = np.stack([height, rough, metal], axis=-1)
    Image.fromarray((np.clip(maps, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, 'maps.png'), optimize=True)
    print(f'front.webp {front.size}, maps.png {(w, h)} -> {os.path.relpath(OUT, ROOT)}/')


if __name__ == '__main__':
    main(sys.argv[1])
