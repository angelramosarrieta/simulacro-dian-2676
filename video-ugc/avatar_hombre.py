"""Arma la pista del avatar masculino (build/avatar.mp4) con cortes entre tomas.

  python3 video-ugc/avatar_hombre.py DIR_CLIPS VOZ.wav

DIR_CLIPS tiene un .mp4 por clip animado (SadTalker + GFPGAN), con el nombre
que usa "tomas" en tiempos/hombre.json: esc1, esc1b, esc4, esc4b. Cada toma dice
qué clip mostrar entre "desde" y "hasta". "inicio_clip" es el segundo del video
en que ese clip arranca (donde empieza su audio); fuera de su duración se
congela el primer o el último cuadro. Encima va un leve movimiento de celular
en mano y el zoom de cada toma, que también disimula los cortes.
"""
import json
import math
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
W, H, FPS = 1080, 1920, 30


def leer_clip(ruta):
    """Decodifica el clip a 30 fps y 1080x1920 (lista de cuadros RGB)."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", ruta, "-vf", f"fps={FPS},scale={W}:{H}:flags=lanczos,setsar=1",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], check=True, capture_output=True).stdout
    return [Image.frombuffer("RGB", (W, H), raw[i:i + W * H * 3]) for i in range(0, len(raw), W * H * 3)]


def mano(t):
    """Movimiento suave de celular sostenido: desplazamiento (px) y giro (grados)."""
    dx = 6 * math.sin(2 * math.pi * 0.31 * t) + 3 * math.sin(2 * math.pi * 0.77 * t + 1.3)
    dy = 5 * math.sin(2 * math.pi * 0.23 * t + 0.7) + 2.5 * math.sin(2 * math.pi * 0.91 * t)
    giro = 0.3 * math.sin(2 * math.pi * 0.19 * t + 0.4)
    return dx, dy, giro


def encuadre(img, t, zoom):
    dx, dy, giro = mano(t)
    z = 1.05 * zoom  # margen para que el movimiento nunca muestre bordes
    out = img.rotate(giro, resample=Image.BICUBIC, center=(W / 2, H * 0.4))
    cw, ch = W / z, H / z
    left = (W - cw) / 2 - dx
    top = (H - ch) * 0.35 - dy  # el zoom se ancla arriba: la cara queda en cuadro
    return out.resize((W, H), Image.LANCZOS, box=(left, top, left + cw, top + ch))


def main():
    clips_dir, voz = Path(sys.argv[1]), sys.argv[2]
    t = json.loads((HERE / "tiempos" / "hombre.json").read_text())
    tomas = t["tomas"]
    clips = {n: leer_clip(clips_dir / f"{n}.mp4") for n in {x["clip"] for x in tomas}}
    out = HERE / "build" / "avatar.mp4"
    out.parent.mkdir(exist_ok=True)
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-i", voz, "-map", "0:v", "-map", "1:a", "-t", str(t["dur"]), "-c:v", "libx264", "-crf", "14", "-preset", "slow",
                           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", out], stdin=subprocess.PIPE)
    negro = Image.new("RGB", (W, H))
    for f in range(round(t["dur"] * FPS)):
        s = f / FPS
        toma = next((x for x in tomas if x["desde"] <= s < x["hasta"]), None)
        if toma is None:  # tramos de la app: los tapa la capa
            img = negro
        else:
            cuadros = clips[toma["clip"]]
            k = min(max(round((s - toma["inicio_clip"]) * FPS), 0), len(cuadros) - 1)
            img = encuadre(cuadros[k], s, toma.get("zoom", 1.0))
        ff.stdin.write(img.tobytes())
    ff.stdin.close()
    ff.wait()
    print(out)


if __name__ == "__main__":
    main()
