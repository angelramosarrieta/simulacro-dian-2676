"""Música de fondo lo-fi, sintetizada aquí (sin derechos de terceros).

  python3 video-ugc/musica.py build/musica.wav [segundos]

Piano eléctrico suave (Am7 – Fmaj7 – Cmaj7 – G6, 80 bpm), bajo redondo,
hi-hat muy bajo y ruido de vinilo. montar.sh la deja en ≈ -24 dB y la baja
aún más mientras hay voz.
"""
import subprocess
import sys

import numpy as np

SR = 48000
BPM = 80
ACORDES = [  # notas MIDI
    [57, 60, 64, 67],  # Am7
    [53, 57, 60, 64],  # Fmaj7
    [48, 52, 55, 59],  # Cmaj7
    [55, 59, 62, 64],  # G6
]
hz = lambda m: 440 * 2 ** ((m - 69) / 12)


def piano(f, dur):
    t = np.arange(int(dur * SR)) / SR
    env = (1 - np.exp(-t / 0.012)) * np.exp(-t / 1.6)
    s = sum(a * np.sin(2 * np.pi * f * k * t) for k, a in ((1, 1.0), (2, 0.35), (3, 0.12), (4, 0.05)))
    return s * env * (1 + 0.08 * np.sin(2 * np.pi * 4.5 * t))  # trémolo leve


def bajo(f, dur):
    t = np.arange(int(dur * SR)) / SR
    return np.sin(2 * np.pi * f * t) * (1 - np.exp(-t / 0.01)) * np.exp(-t / 0.9)


def main():
    out, dur = sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 26
    n = int(dur * SR)
    mix = np.zeros(n + SR * 3)
    beat = 60 / BPM
    rng = np.random.default_rng(7)
    k = 0
    while k * 4 * beat < dur:
        t0 = int(k * 4 * beat * SR)
        acorde = ACORDES[k % 4]
        for j, m in enumerate(acorde):  # acorde algo arpegiado, como tocado a mano
            s = piano(hz(m), 4 * beat + 1)
            i = t0 + int(j * 0.018 * SR)
            mix[i:i + len(s)] += 0.16 * s
        for b, m in ((0, acorde[0] - 12), (2.5, acorde[0] - 12)):
            s = bajo(hz(m), 1.4)
            i = t0 + int(b * beat * SR)
            mix[i:i + len(s)] += 0.22 * s
        for b in (0.5, 1.5, 2.5, 3.5):  # hi-hat
            i = t0 + int(b * beat * SR)
            ruido = rng.standard_normal(int(0.05 * SR)) * np.exp(-np.arange(int(0.05 * SR)) / (0.008 * SR))
            mix[i:i + len(ruido)] += 0.025 * np.diff(ruido, prepend=0)
        k += 1
    mix = mix[:n]
    vinilo = rng.standard_normal(n) * 0.004 + (rng.random(n) > 0.9997) * rng.standard_normal(n) * 0.12
    mix += np.convolve(vinilo, np.ones(6) / 6, "same")
    fade = int(1.5 * SR)
    mix[:int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))
    mix[-fade:] *= np.linspace(1, 0, fade)
    pcm = (np.clip(mix / np.max(np.abs(mix)) * 0.8, -1, 1) * 32767).astype(np.int16)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    "-af", "lowpass=f=5500,aecho=0.8:0.6:60:0.15,loudnorm=I=-20:TP=-2", "-ac", "2", "-ar", str(SR), out],
                   input=pcm.tobytes(), check=True)
    print(out)


if __name__ == "__main__":
    main()
