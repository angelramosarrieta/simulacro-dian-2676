#!/usr/bin/env bash
# Monta el video final sobre la toma real de la persona.
#
#   video-ugc/montar.sh TOMA.mp4 [MUSICA.mp3] [INICIO_SEG]
#
# TOMA.mp4   toma vertical continua (≥ 24,8 s) donde la persona dice el guion
#            completo con los tiempos del README. Su imagen se ve en las escenas
#            1 y 4; su voz suena durante todo el video.
# MUSICA     opcional; queda muy baja (≈ -24 dB) y se atenúa bajo la voz.
# INICIO_SEG opcional; segundo de la toma donde empieza "Parce…" menos 0,15 s.
#
# Necesita build/capa.mov (python3 video-ugc/componer.py capa).
# Sale en build/dian2676_ugc_1080x1920.mp4
set -euo pipefail
cd "$(dirname "$0")"

TOMA=${1:?Uso: montar.sh TOMA.mp4 [MUSICA.mp3] [INICIO_SEG]}
MUSICA=${2:-}
INICIO=${3:-0}
DUR=24.8
CAPA=build/capa.mov
OUT=build/dian2676_ugc_1080x1920.mp4
[ -f "$CAPA" ] || { echo "Falta $CAPA: corre python3 video-ugc/componer.py capa" >&2; exit 1; }

# Voz: limpia graves, compresión suave y volumen estándar de redes (-14 LUFS).
VOZ="[0:a]atrim=0:$DUR,asetpts=PTS-STARTPTS,highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,loudnorm=I=-14:TP=-1.5:LRA=7[voz]"
IMG="[0:v]trim=0:$DUR,setpts=PTS-STARTPTS,fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[base];[base][1:v]overlay=0:0:format=auto[v]"

if [ -n "$MUSICA" ]; then
  FILTRO="$IMG;$VOZ;[voz]asplit=2[voz1][voz2];[2:a]atrim=0:$DUR,asetpts=PTS-STARTPTS,volume=-24dB,afade=t=in:d=0.4,afade=t=out:st=$(echo "$DUR-1.2" | bc):d=1.2[mus];[mus][voz2]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=300[musd];[voz1][musd]amix=inputs=2:duration=first:normalize=0[a]"
  ffmpeg -y -ss "$INICIO" -i "$TOMA" -i "$CAPA" -stream_loop -1 -i "$MUSICA" -filter_complex "$FILTRO" \
    -map "[v]" -map "[a]" -t $DUR -c:v libx264 -preset slow -crf 17 -profile:v high -pix_fmt yuv420p -r 30 \
    -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$OUT"
else
  ffmpeg -y -ss "$INICIO" -i "$TOMA" -i "$CAPA" -filter_complex "$IMG;$VOZ" \
    -map "[v]" -map "[voz]" -t $DUR -c:v libx264 -preset slow -crf 17 -profile:v high -pix_fmt yuv420p -r 30 \
    -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$OUT"
fi
echo "Listo: video-ugc/$OUT"
