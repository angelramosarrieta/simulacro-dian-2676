#!/usr/bin/env bash
# Prepara el clip del avatar generado con Gemini (1280×720, 30 s) para montar.sh.
#
#   video-ugc/preparar_avatar.sh GEMINI.mp4   → build/avatar.mp4 (1080×1920, 30 fps, 24,75 s)
#
# - Recorta a 9:16 el panel vertical central donde está la persona.
# - Quita 19,85–25,0 s, donde la voz repite "La verdad, me parece…", y deja
#   el resto con la misma imagen y audio del original, así los labios siguen
#   sincronizados.
# - Difumina la franja de los subtítulos quemados del clip (tienen errores);
#   encima van los subtítulos correctos de componer.py.
set -euo pipefail
cd "$(dirname "$0")"
SRC=${1:?Uso: preparar_avatar.sh GEMINI.mp4}
mkdir -p build

# Máscara con bordes suaves para la franja difuminada (y 1400–1810).
python3 - <<'EOF'
from PIL import Image, ImageDraw
m = Image.new("L", (1080, 410), 0)
d = ImageDraw.Draw(m)
for y in range(410):
    d.line([(0, y), (1080, y)], fill=int(255 * min(1, y / 60, (409 - y) / 60)))
m.save("build/mascara_franja.png")
EOF

ffmpeg -y -loglevel error -i "$SRC" -loop 1 -i build/mascara_franja.png -filter_complex "
[0:v]trim=0:19.85,setpts=PTS-STARTPTS[v1];
[0:v]trim=25.0:29.9,setpts=PTS-STARTPTS[v2];
[v1][v2]concat=n=2:v=1:a=0,fps=30,crop=405:720:437:0,scale=1080:1920:flags=lanczos,unsharp=5:5:0.5,setsar=1,split[base][copia];
[copia]crop=1080:410:0:1400,boxblur=30:3,eq=brightness=-0.06[franja];
[1:v]format=gray,trim=end_frame=1[m];[m]loop=-1:1,setpts=N/30/TB[mascara];
[franja][mascara]alphamerge[franjam];
[base][franjam]overlay=0:1400:shortest=1[v];
[0:a]atrim=0:19.85,asetpts=PTS-STARTPTS,afade=t=out:st=19.82:d=0.03[a1];
[0:a]atrim=25.0:29.9,asetpts=PTS-STARTPTS,afade=t=in:d=0.03[a2];
[a1][a2]concat=n=2:v=0:a=1[a]" \
  -map "[v]" -map "[a]" -t 24.75 -c:v libx264 -crf 14 -preset slow -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 build/avatar.mp4
echo "Listo: video-ugc/build/avatar.mp4"
