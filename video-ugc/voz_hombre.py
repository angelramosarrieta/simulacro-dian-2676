"""Genera la voz masculina del guion (Piper es_MX-ald vía sherpa-onnx) y la
ubica en los tiempos de tiempos/hombre.json.

  pip install sherpa-onnx soundfile
  curl -L https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-es_MX-ald-medium.tar.bz2 | tar xj
  python3 video-ugc/voz_hombre.py vits-piper-es_MX-ald-medium build/voz

Salen l1.wav … l5.wav (cada frase, sin silencios en los bordes; l1 y l4
alimentan a SadTalker) y voz_hombre.wav (pista completa, 48 kHz estéreo).

La síntesis VITS varía unas centésimas entre corridas. Las frases exactas del
video final están en voz/*.flac; con --usar-guardadas solo se arma la pista:
  python3 video-ugc/voz_hombre.py --usar-guardadas build/voz
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import sherpa_onnx
import soundfile as sf

HERE = Path(__file__).resolve().parent
# "Dian" en vez de "DIAN" para que no la deletree; el número va en letras.
FRASES = {
    "l1": ("Parce, si te estás preparando para el concurso Dian dos mil seiscientos setenta y seis, mira esto.", 1.30),
    "l2": ("Encontré esta plataforma donde puedes practicar preguntas tipo juicio situacional.", 1.22),
    "l3": ("Respondes, revisas la explicación, y puedes entender mejor por qué una opción es más adecuada que otra.", 1.18),
    "l4": ("La verdad, me parece una herramienta interesante para complementar el estudio.", 1.18),
    "l5": ("Te dejo el enlace para que le eches un vistazo.", 1.12),
}


def main():
    if sys.argv[1] == "--usar-guardadas":
        out = Path(sys.argv[2])
        out.mkdir(parents=True, exist_ok=True)
        for nombre in FRASES:
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", HERE / "voz" / f"{nombre}.flac", out / f"{nombre}.wav"], check=True)
    else:
        sintetizar(Path(sys.argv[1]), Path(sys.argv[2]))
    armar_pista(Path(sys.argv[2]))


def sintetizar(modelo, out):
    out.mkdir(parents=True, exist_ok=True)
    onnx = next(modelo.glob("*.onnx"))
    tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=str(onnx), tokens=str(modelo / "tokens.txt"), data_dir=str(modelo / "espeak-ng-data")),
        num_threads=4)))
    recorte = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
    for nombre, (texto, velocidad) in FRASES.items():
        a = tts.generate(texto, sid=0, speed=velocidad)
        crudo = out / f"{nombre}_crudo.wav"
        sf.write(crudo, np.array(a.samples), a.sample_rate)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", crudo, "-af", recorte, "-ar", "48000", out / f"{nombre}.wav"], check=True)


def armar_pista(out):
    t = json.loads((HERE / "tiempos" / "hombre.json").read_text())
    entradas, filtros = [], []
    for k, (inicio, nombre) in enumerate(t["voz"]):
        entradas += ["-i", out / f"{nombre}.wav"]
        filtros.append(f"[{k}]adelay={round(inicio * 1000)}:all=1[a{k}]")
    n = len(t["voz"])
    mezcla = "".join(f"[a{k}]" for k in range(n)) + f"amix=inputs={n}:normalize=0,apad=whole_dur={t['dur']},atrim=0:{t['dur']},aformat=channel_layouts=stereo"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *entradas, "-filter_complex", ";".join(filtros) + ";" + mezcla, "-ar", "48000", out / "voz_hombre.wav"], check=True)
    print(out / "voz_hombre.wav")


if __name__ == "__main__":
    main()
