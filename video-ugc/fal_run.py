"""Cliente mínimo de la cola de fal.ai: envía un trabajo, espera y descarga el resultado.

  FAL_KEY=... python3 video-ugc/fal_run.py MODELO salida.mp4 clave=valor [clave=@archivo] ...

- `clave=@archivo` sube el archivo local como data URI (imagen o audio).
- `clave=valor` se interpreta como JSON si se puede (números, true/false); si no, como texto.
- Descarga el primer archivo del resultado (video, audio o imagen) en `salida` y
  guarda la respuesta completa en `salida.json`.

Ejemplos (los modelos se eligen al correrlo; ver README):
  fal_run.py fal-ai/elevenlabs/tts/multilingual-v2 build/fal/l1.mp3 text="Parce, si te estás…" voice=...
  fal_run.py <modelo-avatar> build/fal/esc1.mp4 image_url=@referencias/avatar_escena1.png audio_url=@build/fal/l1.mp3
"""
import base64
import json
import mimetypes
import os
import sys
import time
import urllib.request
from pathlib import Path

COLA = "https://queue.fal.run"


def pedir(url, datos=None, metodo=None):
    req = urllib.request.Request(url, data=json.dumps(datos).encode() if datos is not None else None, method=metodo)
    req.add_header("Authorization", f"Key {os.environ['FAL_KEY']}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def valor(v):
    if v.startswith("@"):
        p = Path(v[1:])
        tipo = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
        return f"data:{tipo};base64,{base64.b64encode(p.read_bytes()).decode()}"
    try:
        return json.loads(v)
    except ValueError:
        return v


def primer_archivo(res):
    """Busca la primera URL de archivo en la respuesta, venga como venga anidada."""
    if isinstance(res, dict):
        if isinstance(res.get("url"), str) and res["url"].startswith("http"):
            return res["url"]
        for k in ("video", "audio", "audio_file", "image", "images", "output"):
            if k in res and (u := primer_archivo(res[k])):
                return u
        for v in res.values():
            if u := primer_archivo(v):
                return u
    if isinstance(res, list):
        for v in res:
            if u := primer_archivo(v):
                return u
    return None


def main():
    modelo, salida, *args = sys.argv[1:]
    entrada = {k: valor(v) for k, v in (a.split("=", 1) for a in args)}
    trabajo = pedir(f"{COLA}/{modelo}", entrada)
    print("en cola:", trabajo["request_id"], flush=True)
    while True:
        estado = pedir(trabajo["status_url"])
        if estado["status"] == "COMPLETED":
            break
        print("estado:", estado["status"], estado.get("queue_position", ""), flush=True)
        time.sleep(5)
    res = pedir(trabajo["response_url"])
    salida = Path(salida)
    salida.parent.mkdir(parents=True, exist_ok=True)
    Path(f"{salida}.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
    url = primer_archivo(res)
    if not url:
        sys.exit(f"La respuesta no trae archivo; ver {salida}.json")
    urllib.request.urlretrieve(url, salida)
    print(salida)


if __name__ == "__main__":
    main()
