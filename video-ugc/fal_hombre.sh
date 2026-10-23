#!/usr/bin/env bash
# Genera con fal.ai la voz y las escenas del avatar masculino (requiere FAL_KEY
# y acceso de red a fal.run, queue.fal.run y fal.media).
#
#   video-ugc/fal_hombre.sh            → build/fal/l1..l5.mp3, esc1.mp4, esc4.mp4
#
# Modelos (cámbialos por variable si en fal.ai tienen otro nombre o prefieres otro):
#   FAL_TTS_MODEL     voz        (por defecto fal-ai/elevenlabs/tts/multilingual-v2)
#   FAL_VOZ           nombre o id de una voz masculina de ese modelo
#   FAL_AVATAR_MODEL  foto + audio → video hablando (por defecto fal-ai/bytedance/omnihuman)
# Cada llamada cobra créditos de la cuenta de fal.ai.
set -euo pipefail
cd "$(dirname "$0")"
: "${FAL_KEY:?Falta FAL_KEY (clave de fal.ai en la configuración del entorno)}"
TTS=${FAL_TTS_MODEL:-fal-ai/elevenlabs/tts/multilingual-v2}
AVATAR=${FAL_AVATAR_MODEL:-fal-ai/bytedance/omnihuman}
VOZ_ID=${FAL_VOZ:?Falta FAL_VOZ: el nombre o id de una voz masculina del modelo de voz}
OUT=build/fal
mkdir -p "$OUT"

FRASES=(
  "Parce, si te estás preparando para el concurso DIAN 2676, mira esto."
  "Encontré esta plataforma donde puedes practicar preguntas tipo juicio situacional."
  "Respondes, revisas la explicación y puedes entender mejor por qué una opción es más adecuada que otra."
  "La verdad, me parece una herramienta interesante para complementar el estudio."
  "Te dejo el enlace para que le eches un vistazo."
)
for i in "${!FRASES[@]}"; do
  n=$((i + 1))
  [ -f "$OUT/l$n.mp3" ] || python3 fal_run.py "$TTS" "$OUT/l$n.mp3" text="${FRASES[$i]}" voice="$VOZ_ID"
done

# Escena 1 (señalando) y escena 4 (manos abiertas): foto de referencia + su frase.
[ -f "$OUT/esc1.mp4" ] || python3 fal_run.py "$AVATAR" "$OUT/esc1.mp4" image_url=@referencias/avatar_escena1.png audio_url=@"$OUT/l1.mp3"
[ -f "$OUT/esc4.mp4" ] || python3 fal_run.py "$AVATAR" "$OUT/esc4.mp4" image_url=@referencias/avatar_escena4.png audio_url=@"$OUT/l4.mp3"

echo "Listo: $OUT. Siguiente paso: ajustar tiempos/hombre.json a la duración de las frases nuevas y montar (ver README)."
