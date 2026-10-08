"""Kartenrahmen und Kartenrückseite aufbereiten (Prototyp-Grafiken).

    python3 scripts/card-design.py RAHMEN_X4.png RUECKSEITE_X4.png

Eingabe: assets-src/card-design/frame-prototype.jpg und card-back.jpg (je 687 × 1024,
Karte auf dunklem Hintergrund), vorher per KI 4-fach hochskaliert (Real-ESRGAN
x4plus, s. docs/ASSETS.md). Das Skript schneidet die Karte aus (Lage im Original:
x 25–662, y 29–994, beide Vorlagen gleich), macht die abgerundeten Ecken transparent
und schreibt nach public/assets/card-design/:

- frame.webp  Kartenrahmen (Vorderseite ohne Inhalt: Namensleiste, Kreis oben
              rechts, Bildfenster, Textfeld)
- back.webp   Kartenrückseite

Je 1024 px breit (Seitenverhältnis der Vorlage, ca. 0,66 – etwas schlanker als
63 : 88), WebP mit Alpha.
"""

import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'public', 'assets', 'card-design')
OUT_W = 1024

# Karte in der Original-Vorlage (687 × 1024): links, oben, rechts, unten (exklusiv), Eckenradius
CARD = (25, 29, 663, 995)
RADIUS = 13


def cut(src, name):
    img = Image.open(src).convert('RGB')
    s = img.width / 687  # Faktor gegenüber dem Original (4 nach dem Hochskalieren)
    box = tuple(round(v * s) for v in CARD)
    card = img.crop(box)
    # Maske mit glatten runden Ecken: 4-fach zeichnen, dann verkleinern
    ss = 4
    mask = Image.new('L', (card.width * ss, card.height * ss), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, mask.width - 1, mask.height - 1), radius=round(RADIUS * s * ss), fill=255)
    mask = mask.resize(card.size, Image.LANCZOS)
    card.putalpha(mask)
    out_h = round(OUT_W * card.height / card.width)
    card = card.resize((OUT_W, out_h), Image.LANCZOS)
    card.save(os.path.join(OUT, f'{name}.webp'), quality=90, alpha_quality=95, method=6)
    print(f'{name}.webp {card.size}')


def main(frame_src, back_src):
    os.makedirs(OUT, exist_ok=True)
    cut(frame_src, 'frame')
    cut(back_src, 'back')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
