#!/usr/bin/env bash
# Arma la pista del avatar masculino para montar.sh (TIEMPOS=hombre).
#
#   video-ugc/preparar_avatar_hombre.sh ESC1.mp4 ESC4.mp4 VOZ.wav  → build/avatar.mp4
#
# ESC1/ESC4  clips con sincronía de labios (SadTalker + GFPGAN sobre las fotos
#            de referencia), cada uno con la frase 1 y la 4 desde su segundo 0.
# VOZ.wav    voz completa de 24,95 s con las 5 frases en los tiempos de
#            tiempos/hombre.json ("voz").
# Cada clip se ubica donde empieza su frase. El primer y el último cuadro se
# congelan para cubrir la escena completa del avatar.
set -euo pipefail
cd "$(dirname "$0")"
ESC1=${1:?Uso: preparar_avatar_hombre.sh ESC1.mp4 ESC4.mp4 VOZ.wav}
ESC4=${2:?}
VOZ=${3:?}
mkdir -p build
# Por escena: inicio, congelado inicial (hasta la frase) y duración.
read -r DUR P1A D1 L1 P4A D4 L4 < <(python3 -c '
import json; t = json.load(open("tiempos/hombre.json"))
v = {n: s for s, n in t["voz"]}; (a1, b1, _), (a4, b4, _) = t["persona"]
f = lambda x: f"{x:.3f}"
print(t["dur"], f(a1), f(v["l1"] - a1), f(b1 - a1), f(a4), f(v["l4"] - a4), f(b4 - a4))')

ffmpeg -y -loglevel error -f lavfi -i "color=black:s=1080x1920:r=30:d=$DUR" -i "$ESC1" -i "$ESC4" -i "$VOZ" -filter_complex "
[1:v]fps=30,scale=1080:1920:flags=lanczos,setsar=1,tpad=start_duration=$D1:start_mode=clone:stop_duration=2:stop_mode=clone,trim=0:$L1,setpts=PTS-STARTPTS+$P1A/TB[e1];
[2:v]fps=30,scale=1080:1920:flags=lanczos,setsar=1,tpad=start_duration=$D4:start_mode=clone:stop_duration=2:stop_mode=clone,trim=0:$L4,setpts=PTS-STARTPTS+$P4A/TB[e4];
[0:v][e1]overlay=eof_action=pass[b1];[b1][e4]overlay=eof_action=pass[v]" \
  -map "[v]" -map 3:a -t "$DUR" -c:v libx264 -crf 14 -preset slow -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 build/avatar.mp4
echo "Listo: video-ugc/build/avatar.mp4"
