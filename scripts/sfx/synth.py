"""Sound-Design als Code: erzeugt alle Spiel-Sounds (eigene Arbeit, frei verwendbar).

    python3 scripts/sfx/synth.py            # schreibt public/assets/sfx/*.mp3

Stil: angelehnt an Sammelkarten-Spiele (Pokémon TCG Pocket, Hearthstone):
echte "Foley"-Anmutung für Karten und Folie (gefiltertes Rauschen), glitzernde
Glocken für Rares und Holos, Marimba/Glocken statt Piepsern für UI und Fanfaren.
Benötigt numpy, scipy und ffmpeg (libmp3lame).
"""

import os
import subprocess
import sys
import tempfile

import numpy as np
import scipy.io.wavfile as wavfile
import scipy.signal as sg

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'sfx')
rng = np.random.default_rng(20261007)

# --------------------------------------------------------------------------- Bausteine


def n_of(d):
    return max(1, int(round(d * SR)))


def t_of(d):
    return np.arange(n_of(d)) / SR


def noise(d):
    return rng.standard_normal(n_of(d))


def butter(x, kind, f, order=2):
    sos = sg.butter(order, f, btype=kind, fs=SR, output='sos')
    return sg.sosfilt(sos, x)


def env_exp(n, attack, decay):
    """Kurzer Anstieg, dann exponentielles Abklingen (Sekunden)."""
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(t - attack, 0) / decay)


def env_hann(n):
    return np.hanning(n)


def svf(x, f_start, f_end, q=1.0, mode='bp'):
    """State-Variable-Filter mit gleitender Frequenz (exponentiell von f_start nach f_end)."""
    n = len(x)
    freqs = f_start * (f_end / f_start) ** (np.arange(n) / max(n - 1, 1))
    f = 2 * np.sin(np.pi * np.minimum(freqs, SR / 6) / SR)
    damp = 1.0 / q
    low = band = 0.0
    out = np.empty(n)
    for i in range(n):
        high = x[i] - low - damp * band
        band += f[i] * high
        low += f[i] * band
        out[i] = band if mode == 'bp' else (low if mode == 'lp' else high)
    return out


def place(total, *parts):
    """parts: (Startzeit s, Signal, Gain) -> Summe."""
    out = np.zeros(n_of(total))
    for start, sig, gain in parts:
        i = n_of(start) if start > 0 else 0
        j = min(len(out), i + len(sig))
        out[i:j] += sig[: j - i] * gain
    return out


def bell(freq, dur, bright=1.0):
    t = t_of(dur)
    ratios = [1.0, 2.0, 2.76, 4.07, 5.4]
    amps = [1.0, 0.45 * bright, 0.32 * bright, 0.16 * bright, 0.08 * bright]
    out = np.zeros_like(t)
    for k, (r, a) in enumerate(zip(ratios, amps)):
        out += a * np.sin(2 * np.pi * freq * r * t + rng.uniform(0, 6.28)) * np.exp(-t / (dur * 0.42 / (1 + k * 0.9)))
    out *= np.clip(t / 0.002, 0, 1)
    return out


def marimba(freq, dur=0.6, soft=1.0):
    t = t_of(dur)
    out = np.sin(2 * np.pi * freq * t) * np.exp(-t / (dur * 0.38))
    out += 0.35 * soft * np.sin(2 * np.pi * freq * 3.99 * t) * np.exp(-t / (dur * 0.11))
    out += 0.10 * soft * np.sin(2 * np.pi * freq * 9.2 * t) * np.exp(-t / (dur * 0.05))
    click = butter(noise(0.004), 'lowpass', 3500) * np.hanning(n_of(0.004)) * 0.25
    out[: len(click)] += click
    return out * np.clip(t / 0.0015, 0, 1)


def coin(freq, dur=0.28):
    t = t_of(dur)
    ratios = [1.0, 1.34, 1.79, 2.25]
    out = np.zeros_like(t)
    for k, r in enumerate(ratios):
        out += np.sin(2 * np.pi * freq * r * t) * np.exp(-t / (dur * 0.35 / (1 + k * 0.6))) / (1 + k * 0.5)
    out[: n_of(0.002)] += noise(0.002) * 0.5
    return out


def sparkles(dur, count, lo=4200, hi=9000, level=0.25):
    out = np.zeros(n_of(dur))
    for _ in range(count):
        f = rng.uniform(lo, hi)
        s = np.sin(2 * np.pi * f * t_of(0.07)) * np.exp(-t_of(0.07) / 0.018)
        i = rng.integers(0, max(1, len(out) - len(s)))
        out[i : i + len(s)] += s * rng.uniform(0.4, 1.0) * level
    return out


def reverb(x, rt=1.2, wet=0.25, tone=6000):
    ir = noise(rt) * np.exp(-6.9 * t_of(rt) / rt)
    ir = butter(ir, 'lowpass', tone)
    ir[: n_of(0.012)] = 0  # Vorverzögerung
    ir /= np.sqrt(np.sum(ir**2))
    wet_sig = sg.fftconvolve(x, ir)
    out = np.zeros(len(wet_sig))
    out[: len(x)] += x
    return out + wet * wet_sig


def finish(x, peak=0.9, tail_fade=0.03):
    x = x - np.mean(x)
    # Stille am Ende abschneiden (unter -60 dB)
    thresh = np.max(np.abs(x)) * 0.001
    idx = np.nonzero(np.abs(x) > thresh)[0]
    if len(idx):
        x = x[: idx[-1] + 1]
    fi, fo = n_of(0.001), min(len(x) // 3, n_of(tail_fade))
    x[:fi] *= np.linspace(0, 1, fi)
    x[len(x) - fo :] *= np.linspace(1, 0, fo)
    return x / np.max(np.abs(x)) * peak


# --------------------------------------------------------------------------- Karten & Packs


def card_flip(variant=0):
    """Karte schnippt um: kurzes 'Fwip' (Luft, gefiltertes Rauschen) + leises 'Klack'."""
    d = 0.14
    whoosh = svf(noise(0.075), 1400 + variant * 300, 5200 + variant * 400, q=1.4) * env_exp(n_of(0.075), 0.006, 0.03)
    snap = butter(noise(0.006), 'highpass', 2500) * np.hanning(n_of(0.006))
    body = np.sin(2 * np.pi * (230 + variant * 25) * t_of(0.03)) * env_exp(n_of(0.03), 0.001, 0.008)
    x = place(d, (0, whoosh, 1.0), (0.058, snap, 0.55), (0.058, body, 0.35))
    return finish(x, 0.85)


def card_slide():
    """Karte gleitet weg (Wischen)."""
    d = 0.24
    s = svf(noise(d), 700, 3800, q=0.9) * env_hann(n_of(d)) ** 1.5
    return finish(butter(s, 'highpass', 300), 0.7)


def pack_tear():
    """Folie reißt auf: dichter Knister-Riss + heller Glitzer, dazu ein dumpfer 'Plopp'."""
    d = 0.62
    rip = np.zeros(n_of(d))
    tpos = 0.02
    while tpos < 0.5:
        g = butter(noise(rng.uniform(0.002, 0.007)), 'bandpass', [1600, 7000])
        g *= np.hanning(len(g))
        prog = tpos / 0.5
        amp = np.sin(np.pi * min(prog * 1.15, 1)) ** 0.6 * rng.uniform(0.4, 1.0)
        i = n_of(tpos)
        rip[i : i + len(g)] += g * amp
        tpos += rng.uniform(0.003, 0.011) * (1.4 - prog * 0.6)
    zipper = svf(noise(0.45), 1200, 3400, q=2.2) * (0.6 + 0.4 * np.sin(2 * np.pi * 55 * t_of(0.45))) * env_hann(n_of(0.45))
    crinkle = sparkles(0.55, 26, 6000, 11000, 0.5)
    pop = np.sin(2 * np.pi * 110 * t_of(0.08)) * env_exp(n_of(0.08), 0.002, 0.025)
    x = place(d, (0.0, pop, 0.45), (0.0, rip, 1.0), (0.04, zipper, 0.35), (0.05, crinkle, 0.35))
    return finish(reverb(x, 0.5, 0.12), 0.88)


def card_rare():
    """Rare aufgedeckt: helles Glocken-Arpeggio mit Glitzern."""
    notes = [1318.5, 1661.2, 1975.5, 2637.0]
    parts = [(i * 0.065, bell(f, 1.3), 0.55) for i, f in enumerate(notes)]
    parts.append((0.05, sparkles(1.0, 14), 1.0))
    x = place(1.6, *parts)
    return finish(reverb(x, 1.4, 0.32), 0.82)


def card_holo():
    """Holo Rare: aufsteigendes Rauschen, Glitzer-Arpeggio, schimmernder Akkord."""
    rise = svf(noise(0.38), 400, 7000, q=1.1) * np.linspace(0, 1, n_of(0.38)) ** 2
    arp = [880.0, 1108.7, 1318.5, 1480.0, 1760.0, 2217.5, 2637.0]
    parts = [(0.0, rise, 0.5)]
    parts += [(0.3 + i * 0.055, bell(f, 1.4, 0.9), 0.42) for i, f in enumerate(arp)]
    t = t_of(1.6)
    chord = sum(np.sin(2 * np.pi * f * t) + np.sin(2 * np.pi * f * 1.004 * t) for f in [880.0, 1108.7, 1318.5, 1975.5])
    chord *= (0.75 + 0.25 * np.sin(2 * np.pi * 6.5 * t)) * np.minimum(t / 0.25, 1) * np.exp(-t / 0.7)
    parts.append((0.55, chord, 0.08))
    parts.append((0.35, sparkles(1.6, 40, 4500, 10000), 0.9))
    x = place(2.3, *parts)
    return finish(reverb(x, 1.8, 0.38), 0.85)


# --------------------------------------------------------------------------- UI


def tap(variant=0):
    """Weiches 'Tock' (Holz) statt Klick."""
    f0 = 980 + variant * 120
    t = t_of(0.06)
    freq = f0 * (0.62 + 0.38 * np.exp(-t / 0.012))
    tone = np.sin(2 * np.pi * np.cumsum(freq) / SR) * env_exp(len(t), 0.0008, 0.016)
    click = butter(noise(0.003), 'bandpass', [2000, 6000]) * np.hanning(n_of(0.003))
    return finish(place(0.06, (0, tone, 1.0), (0, click, 0.3)), 0.75)


def tab():
    t = t_of(0.05)
    freq = 1500 * (0.7 + 0.3 * np.exp(-t / 0.01))
    tone = np.sin(2 * np.pi * np.cumsum(freq) / SR) * env_exp(len(t), 0.0008, 0.012)
    return finish(tone, 0.6)


def button():
    """Play/Open: zwei warme Marimba-Töne aufwärts."""
    x = place(0.6, (0, marimba(783.99, 0.5), 0.8), (0.075, marimba(1174.66, 0.55), 0.9))
    return finish(reverb(x, 0.6, 0.15), 0.85)


def select():
    return finish(reverb(marimba(880.0, 0.35), 0.4, 0.1), 0.7)


def place_sound(variant=0):
    """Ware landet: weicher Pappe-'Plopp'."""
    t = t_of(0.09)
    f = (170 + variant * 20) * (0.7 + 0.3 * np.exp(-t / 0.02))
    thud = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(len(t), 0.001, 0.025)
    paper = butter(noise(0.035), 'bandpass', [600, 2600]) * env_exp(n_of(0.035), 0.001, 0.008)
    return finish(place(0.09, (0, thud, 1.0), (0, paper, 0.45)), 0.8)


def invalid():
    """Gedämpftes 'Bonk-bonk' abwärts (kein Summer)."""
    a = butter(marimba(293.66, 0.3, 0.5), 'lowpass', 1800)
    b = butter(marimba(220.0, 0.35, 0.5), 'lowpass', 1500)
    return finish(place(0.45, (0, a, 0.9), (0.09, b, 1.0)), 0.8)


def reveal():
    """Packpapier reißt (kürzer, tiefer als Folie)."""
    d = 0.3
    rip = np.zeros(n_of(d))
    tpos = 0.0
    while tpos < 0.22:
        g = butter(noise(rng.uniform(0.003, 0.008)), 'bandpass', [700, 4200])
        g *= np.hanning(len(g))
        i = n_of(tpos)
        rip[i : i + len(g)] += g * np.sin(np.pi * tpos / 0.22) * rng.uniform(0.5, 1)
        tpos += rng.uniform(0.004, 0.012)
    return finish(reverb(rip, 0.3, 0.08), 0.75)


def solved():
    notes = [1046.5, 1318.5, 1568.0]
    x = place(1.1, *[(i * 0.07, bell(f, 0.9), 0.6) for i, f in enumerate(notes)], (0.1, sparkles(0.6, 8), 0.8))
    return finish(reverb(x, 1.0, 0.25), 0.8)


def ship():
    """Klebeband 'Zzzip', dann Paket saust davon."""
    tape = svf(noise(0.17), 1600, 3200, q=3.0) * (0.55 + 0.45 * np.sign(np.sin(2 * np.pi * 75 * t_of(0.17)))) * env_hann(n_of(0.17))
    whoosh = svf(noise(0.32), 3500, 600, q=0.9) * env_hann(n_of(0.32))
    return finish(place(0.55, (0, tape, 0.8), (0.17, whoosh, 0.9)), 0.8)


def gold():
    x = place(0.45, (0, coin(3150), 0.8), (0.07, coin(3480), 0.7), (0.05, sparkles(0.35, 5, 6000, 9500), 0.6))
    return finish(reverb(x, 0.6, 0.15), 0.78)


def win():
    """Fanfare: Marimba-Arpeggio, Glocken-Akkord, Glitzer."""
    arp = [523.25, 659.25, 783.99, 1046.5]
    parts = [(i * 0.1, marimba(f, 0.7), 0.7) for i, f in enumerate(arp)]
    parts += [(0.42, bell(f, 1.6, 0.8), 0.35) for f in [1046.5, 1318.5, 1568.0, 2093.0]]
    parts.append((0.45, sparkles(1.3, 24), 0.8))
    x = place(2.3, *parts)
    return finish(reverb(x, 1.6, 0.3), 0.85)


def lose():
    notes = [659.25, 523.25, 440.0, 349.23]
    x = place(1.1, *[(i * 0.12, butter(marimba(f, 0.6), 'lowpass', 2500), 0.8) for i, f in enumerate(notes)])
    return finish(reverb(x, 0.9, 0.2), 0.75)


def booster():
    """Power-up: magisches Aufrauschen + 'Ding'."""
    rise = svf(noise(0.25), 500, 5000, q=1.2) * np.linspace(0, 1, n_of(0.25)) ** 2
    x = place(1.0, (0, rise, 0.5), (0.22, bell(1760.0, 0.8), 0.6), (0.25, sparkles(0.5, 8), 0.7))
    return finish(reverb(x, 0.9, 0.25), 0.8)


# --------------------------------------------------------------------------- Ausgabe

SOUNDS = {
    'tap': lambda: tap(0),
    'tap-2': lambda: tap(1),
    'tab': tab,
    'button': button,
    'select': select,
    'place': lambda: place_sound(0),
    'place-2': lambda: place_sound(1),
    'invalid': invalid,
    'reveal': reveal,
    'solved': solved,
    'ship': ship,
    'gold': gold,
    'win': win,
    'lose': lose,
    'booster': booster,
    'pack-tear': pack_tear,
    'card-flip': lambda: card_flip(0),
    'card-flip-2': lambda: card_flip(1),
    'card-slide': card_slide,
    'card-rare': card_rare,
    'card-holo': card_holo,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    with tempfile.TemporaryDirectory() as tmp:
        for name, make in SOUNDS.items():
            if only and name not in only:
                continue
            x = make()
            wav = os.path.join(tmp, f'{name}.wav')
            wavfile.write(wav, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
            mp3 = os.path.join(OUT, f'{name}.mp3')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-b:a', '96k', '-codec:a', 'libmp3lame', mp3], check=True)
            print(f'{name:12s} {len(x) / SR:5.2f}s  {os.path.getsize(mp3) // 1024:3d} KB')


if __name__ == '__main__':
    main()
