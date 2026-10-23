"""Locución del video profesional: voz neural Kokoro (em_alex, español) vía
sherpa-onnx, ubicada en los tiempos de tiempos/pro.json.

  pip install sherpa-onnx soundfile
  curl -L https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_0.tar.bz2 | tar xj
  python3 video-ugc/voz_pro.py kokoro-multi-lang-v1_0 build/voz_pro      # sintetiza y arma
  python3 video-ugc/voz_pro.py --usar-guardadas build/voz_pro           # usa voz_pro/*.flac

Kokoro se come la primera sílaba de cada frase; una pausa inicial ("... ")
lo evita y luego se recorta el silencio. La síntesis varía un poco entre
corridas: las frases exactas del video final están en voz_pro/.
"""
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
VOZ = 29  # em_alex (masculina, español) en kokoro-multi-lang-v1_0
VELOCIDAD = 1.05
# Texto hablado (números en letras; "Dian" y "centra hoy punto online" para que los pronuncie bien).
FRASES = {
    "n1": "¿Te preparas para la prueba escrita de la Dian, dos mil seiscientos setenta y seis? Es el domingo ocho de noviembre.",
    "n2": "Aquí practicas con preguntas hechas para tu empleo, no para cualquiera.",
    "n3": "Subes tu manual de funciones y tus indicadores, y en unos quince minutos recibes tu simulador, con casos de juicio situacional de tus ejes oficiales.",
    "n4": "Respondes cada caso y revisas por qué cada opción es correcta o incorrecta, con la norma que la sustenta.",
    "n5": "Además, tienes un banco común de setenta y siete preguntas, simulacros cronometrados con puntaje frente al mínimo de setenta, y repaso de tus errores por eje.",
    "n6": "Todo desde tu celular, en modo claro u oscuro.",
    "n7": "Entra a centra hoy punto online, y prueba el simulador de ejemplo.",
}
RECORTE = ("silenceremove=start_periods=1:start_threshold=-60dB:start_silence=0.05,areverse,"
           "silenceremove=start_periods=1:start_threshold=-60dB:start_silence=0.12,areverse")


def sintetizar(modelo, out):
    import numpy as np
    import sherpa_onnx
    import soundfile as sf
    d = str(modelo) + "/"
    tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(model=d + "model.onnx", voices=d + "voices.bin", tokens=d + "tokens.txt",
                                                      data_dir=d + "espeak-ng-data", dict_dir=d + "dict",
                                                      lexicon=d + "lexicon-us-en.txt," + d + "lexicon-zh.txt", lang="es"),
        num_threads=4)))
    for nombre, texto in FRASES.items():
        a = tts.generate("... " + texto, sid=VOZ, speed=VELOCIDAD)
        crudo = out / f"{nombre}_crudo.wav"
        sf.write(crudo, np.array(a.samples), a.sample_rate)
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", crudo, "-af", RECORTE, out / f"{nombre}.wav"], check=True)


def armar_pista(out):
    t = json.loads((HERE / "tiempos" / "pro.json").read_text())
    entradas, filtros = [], []
    for k, (inicio, nombre) in enumerate(t["voz"]):
        entradas += ["-i", out / f"{nombre}.wav"]
        filtros.append(f"[{k}]aresample=48000:resampler=soxr,adelay={round(inicio * 1000)}:all=1[a{k}]")
    n = len(t["voz"])
    mezcla = "".join(f"[a{k}]" for k in range(n)) + f"amix=inputs={n}:normalize=0,apad=whole_dur={t['dur']},atrim=0:{t['dur']},aformat=channel_layouts=stereo"
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", *entradas, "-filter_complex", ";".join(filtros) + ";" + mezcla,
                    "-ar", "48000", out / "voz_pro.wav"], check=True)
    print(out / "voz_pro.wav")


def main():
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    if sys.argv[1] == "--usar-guardadas":
        for nombre in FRASES:
            subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", HERE / "voz_pro" / f"{nombre}.flac", out / f"{nombre}.wav"], check=True)
    else:
        sintetizar(Path(sys.argv[1]), out)
    armar_pista(out)


if __name__ == "__main__":
    main()
