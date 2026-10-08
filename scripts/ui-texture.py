"""Kachel für den Hintergrund der Oberfläche: dunkle Stein-/Eisenmaserung.

    python3 scripts/ui-texture.py

Schreibt public/assets/ui/stone.webp (256 × 256, nahtlos kachelbar). Die Kachel ist
schwarz mit wechselnder Deckkraft und liegt im CSS über einem Farbverlauf; sie
dunkelt nur leicht ab (Flecken + feines Korn), die Farbe kommt aus dem Verlauf.
Nahtlos durch Rauschen im Frequenzraum (FFT ist periodisch).
"""

import os

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'public', 'assets', 'ui', 'stone.webp')
SIZE = 256


def periodic_noise(rng, beta):
    """Rauschen mit 1/f^beta-Spektrum, Werte 0–1, an allen Kanten nahtlos."""
    white = rng.standard_normal((SIZE, SIZE))
    f = np.fft.fftfreq(SIZE)
    fx, fy = np.meshgrid(f, f)
    r = np.sqrt(fx * fx + fy * fy)
    r[0, 0] = 1
    spec = np.fft.fft2(white) / r**beta
    spec[0, 0] = 0
    n = np.real(np.fft.ifft2(spec))
    return (n - n.min()) / (n.max() - n.min())


def main():
    rng = np.random.default_rng(7)
    blotch = periodic_noise(rng, 1.6)  # große, weiche Flecken
    grain = periodic_noise(rng, 0.35)  # feines Korn
    a = 0.62 * blotch**1.4 + 0.38 * grain
    a = (a - a.min()) / (a.max() - a.min())
    alpha = (a * 70).astype(np.uint8)
    img = np.dstack([np.zeros_like(alpha)] * 3 + [alpha])
    Image.fromarray(img, 'RGBA').save(OUT, quality=80, alpha_quality=70, method=6)
    print(os.path.relpath(OUT, ROOT), os.path.getsize(OUT), 'Bytes')


if __name__ == '__main__':
    main()
