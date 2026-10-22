"""Compone el video UGC de 24,75 s a partir de los cuadros reales de la app
(capturar.mjs) más subtítulos, texto gancho, toques y cierre.

Uso:
  python3 video-ugc/componer.py previa   -> build/previsualizacion.mp4
      Video completo; las escenas de persona (1 y 4) llevan un plano guía.
  python3 video-ugc/componer.py capa     -> build/capa.mov
      Misma pieza en ProRes 4444 con alfa: las escenas de persona quedan
      transparentes (solo subtítulos) para montarla sobre la toma real
      con montar.sh.
"""
import json
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
FRAMES = HERE / "build" / "frames"
FONTS = HERE.parent / "web" / "node_modules" / "geist" / "dist" / "fonts"
EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"

W, H, FPS = 1080, 1920, 30
# Tiempos ajustados a la voz real del clip de avatar (ver preparar_avatar.sh):
# cada subtítulo arranca y termina con la frase dicha.
DUR = 24.75

# Identidad real de la app (web/app/globals.css).
BG = (246, 246, 243)
INK = (21, 23, 27)
MUTED = (92, 98, 106)
FAINT = (150, 155, 162)
BRAND = (14, 107, 88)
MINT = (79, 194, 164)  # brand en modo oscuro: resalta sobre fondo oscuro

# Escenas del avatar (1 y 4): ahí se ve el clip de la persona.
PERSONA = [(0.0, 4.0, 1), (15.5, 19.85, 4)]
CIERRE = 22.4

# Subtítulos con el guion original. [x] = palabra resaltada.
CUES = [
    (0.17, 1.55, "Parce, si te estás preparando"),
    (1.55, 4.00, "para el concurso [DIAN 2676],"),
    (4.12, 4.85, "mira esto"),
    (4.90, 6.25, "Encontré esta plataforma"),
    (6.30, 7.00, "donde puedes practicar"),
    (7.05, 9.50, "preguntas tipo [juicio situacional]"),
    (10.00, 10.62, "Respondes,"),
    (10.66, 11.90, "revisas la [explicación]"),
    (12.15, 13.35, "y puedes entender mejor"),
    (13.55, 14.40, "por qué una opción"),
    (14.40, 15.50, "es más adecuada que otra"),
    (15.74, 16.80, "La verdad, me parece"),
    (16.80, 17.95, "una herramienta interesante"),
    (17.98, 19.65, "para complementar el estudio"),
    (20.11, 20.95, "Te dejo el enlace"),
    (20.95, 22.30, "para que le eches un vistazo"),
]
GANCHO = (0.0, 4.0, "¿Te preparas para la [DIAN 2676]?")
# Centro vertical de los subtítulos: sobre la persona, a la altura del pecho;
# sobre la app, arriba (encabezado), para no tapar el caso ni la explicación.
SUB_Y_PERSONA, SUB_Y_APP = 1600, 172

# Zoom suave por tramo: (t0, t1, zoom0, zoom1, centro_y)
ZOOM = [
    (4.0, 6.3, 1.00, 1.06, 760),
    (6.3, 8.55, 1.00, 1.00, 960),
    (8.55, 10.5, 1.00, 1.04, 900),
    (10.5, 11.6, 1.04, 1.00, 900),
    (11.6, 15.5, 1.00, 1.08, 880),
    (19.85, 22.4, 1.04, 1.00, 760),
]


@lru_cache(None)
def font(name, size):
    sub = "geist-mono" if name.startswith("GeistMono") else "geist-sans"
    return ImageFont.truetype(str(FONTS / sub / f"{name}.ttf"), size)


def ease(x):
    x = min(max(x, 0.0), 1.0)
    return 2 * x * x if x < 0.5 else 1 - (-2 * x + 2) ** 2 / 2


def tokens(text):
    """'a [b c], d' -> palabras como listas de piezas (texto, resaltado).
    La puntuación pegada a un resaltado se une a la palabra anterior sin espacio."""
    out = []
    for part in text.replace("[", "\x00[").replace("]", "]\x00").split("\x00"):
        if not part:
            continue
        hl = part.startswith("[")
        body = part.strip("[]")
        if not hl and out and body[:1] in ",.?!:;":
            glue, body = body.split(" ", 1) if " " in body else (body, "")
            out[-1].append((glue, False))
        # Un resaltado es una sola unidad: nunca se parte entre líneas.
        out += [[(body, True)]] if hl else [[(w, False)] for w in body.split()]
    return out


def text_block(text, size, fg, hl, box, pad=(34, 20), radius=26, maxw=920, emoji=None):
    """Renderiza un bloque de texto con fondo redondeado, ajustado a maxw."""
    f = font("Geist-Bold", size)
    space = f.getlength(" ")
    lines, cur, cw = [], [], 0
    for word in tokens(text):
        lw = sum(f.getlength(w) for w, _ in word)
        if cur and cw + space + lw > maxw - 2 * pad[0]:
            lines.append(cur)
            cur, cw = [], 0
        cw += (space if cur else 0) + lw
        cur.append(word)
    lines.append(cur)
    lh = int(size * 1.22)
    wlen = lambda word: sum(f.getlength(w) for w, _ in word)
    widths = [sum(wlen(word) for word in ln) + space * (len(ln) - 1) for ln in lines]
    em = None
    if emoji:
        e = ImageFont.truetype(EMOJI, 109)
        em = Image.new("RGBA", (136, 128), (0, 0, 0, 0))
        ImageDraw.Draw(em).text((0, 0), emoji, font=e, embedded_color=True)
        em = em.crop(em.getbbox()).resize((int(size * 1.05), int(size * 1.05 * em.height / em.width)), Image.LANCZOS)
        widths[-1] += space + em.width
    bw = int(max(widths) + 2 * pad[0])
    bh = int(lh * len(lines) + 2 * pad[1])
    img = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, bw - 1, bh - 1), radius, fill=box)
    y = pad[1] + (lh - size) // 2 - int(size * 0.12)
    for ln, lw in zip(lines, widths):
        x = (bw - lw) / 2
        for word in ln:
            for w, h in word:
                d.text((x, y), w, font=f, fill=hl if h else fg)
                x += f.getlength(w)
            x += space
        y += lh
    if em is not None:
        img.alpha_composite(em, (int(x), int(y - lh + (lh - em.height) / 2 - size * 0.02)))
    return img


@lru_cache(None)
def subtitulo(text):
    return text_block(text, 64, (255, 255, 255), MINT, (14, 17, 20, 205))


@lru_cache(None)
def gancho():
    return text_block(GANCHO[2], 66, INK, BRAND, (255, 255, 255, 245), pad=(38, 24), emoji="👀")


def pegar_centrado(canvas, img, cy, alpha=1.0):
    if alpha < 1:
        img = img.copy()
        img.putalpha(img.getchannel("A").point(lambda a: int(a * alpha)))
    canvas.alpha_composite(img, ((W - img.width) // 2, int(cy - img.height / 2)))


@lru_cache(None)
def guia_persona(n):
    """Plano guía (solo previsualización) donde va la toma real de la persona."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    d = ImageDraw.Draw(img)
    for y in range(H):
        k = y / H
        d.line([(0, y), (W, y)], fill=(int(46 - 16 * k), int(42 - 15 * k), int(38 - 14 * k), 255))
    # silueta de plano medio
    d.ellipse((380, 520, 700, 900), outline=(110, 104, 96), width=4)
    d.rounded_rectangle((220, 930, 860, 1500), 160, outline=(110, 104, 96), width=4)
    mono, med = font("GeistMono-Medium", 34), font("Geist-Medium", 40)
    d.text((W / 2, 1600), f"ESCENA {n} · PLANO PERSONA", font=mono, fill=MINT, anchor="mm")
    d.text((W / 2, 1666), "Aquí va la toma real grabada con el celular", font=med, fill=(225, 222, 216), anchor="mm")
    d.text((W / 2, 1718), "plano medio · mirando a cámara · luz natural", font=font("Geist-Regular", 34), fill=(170, 164, 156), anchor="mm")
    return img


@lru_cache(None)
def cierre():
    img = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(img)
    s = 150
    x0, y0 = (W - s) // 2, 640
    d.rounded_rectangle((x0, y0, x0 + s, y0 + s), 46, fill=BRAND)
    d.text((W / 2, y0 + s / 2), "26", font=font("GeistMono-SemiBold", 60), fill=(255, 255, 255), anchor="mm")
    d.text((W / 2, 930), "centrahoy.online", font=font("Geist-SemiBold", 104), fill=INK, anchor="mm")
    d.text((W / 2, 1035), "Preparación para la DIAN 2676", font=font("Geist-Medium", 52), fill=MUTED, anchor="mm")
    d.text((W / 2, 1530), "Herramienta de estudio independiente.", font=font("Geist-Regular", 30), fill=FAINT, anchor="mm")
    d.text((W / 2, 1572), "No está afiliada a la DIAN ni a la CNSC.", font=font("Geist-Regular", 30), fill=FAINT, anchor="mm")
    return img


# Mockup de celular: la app real se ve dentro de un teléfono sobre un fondo
# con los colores de la marca. El teléfono entra con una animación corta al
# comienzo de cada tramo de app (después del avatar).
ESCALA = 0.74
APP_W, APP_H = round(W * ESCALA), round(H * ESCALA)
BARRA = 58  # barra de estado dentro de la pantalla
PANT_W, PANT_H = APP_W, APP_H + BARRA
BISEL = 20
TEL_W, TEL_H = PANT_W + 2 * BISEL, PANT_H + 2 * BISEL
TEL_X, TEL_Y = (W - TEL_W) // 2, 318
ENTRADAS = [4.0, 19.85]


@lru_cache(None)
def fondo():
    img = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(img)
    top, bot = (226, 239, 234), BG
    for y in range(H):
        k = min(1, y / (H * 0.8))
        d.line([(0, y), (W, y)], fill=tuple(int(a + (b - a) * k) for a, b in zip(top, bot)) + (255,))
    return img


@lru_cache(None)
def sombra():
    pad = 90
    img = Image.new("RGBA", (TEL_W + 2 * pad, TEL_H + 2 * pad), (0, 0, 0, 0))
    ImageDraw.Draw(img).rounded_rectangle((pad, pad, pad + TEL_W, pad + TEL_H), 90, fill=(16, 24, 20, 80))
    return img.filter(ImageFilter.GaussianBlur(36)), pad


@lru_cache(None)
def cuerpo():
    img = Image.new("RGBA", (TEL_W, TEL_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, TEL_W - 1, TEL_H - 1), 86, fill=(24, 26, 29, 255))
    d.rounded_rectangle((3, 3, TEL_W - 4, TEL_H - 4), 84, outline=(70, 74, 80, 255), width=2)
    return img


@lru_cache(None)
def mascara():
    m = Image.new("L", (PANT_W, PANT_H), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, PANT_W - 1, PANT_H - 1), 66, fill=255)
    return m


@lru_cache(None)
def barra_estado():
    img = Image.new("RGBA", (PANT_W, BARRA), BG + (255,))
    d = ImageDraw.Draw(img)
    d.text((70, BARRA / 2 + 4), "7:42", font=font("Geist-SemiBold", 27), fill=INK, anchor="mm")
    d.rounded_rectangle((PANT_W / 2 - 78, 12, PANT_W / 2 + 78, 48), 18, fill=(10, 10, 12))  # isla
    x = PANT_W - 150
    for i in range(4):  # señal
        h = 8 + i * 5
        d.rounded_rectangle((x + i * 9, 40 - h, x + i * 9 + 5, 40), 2, fill=INK)
    d.rounded_rectangle((PANT_W - 96, 24, PANT_W - 52, 42), 5, outline=INK, width=2)  # batería
    d.rounded_rectangle((PANT_W - 93, 27, PANT_W - 64, 39), 3, fill=INK)
    d.rectangle((PANT_W - 50, 30, PANT_W - 48, 36), fill=INK)
    return img


def celular(app, t):
    """Pone el cuadro de la app dentro del teléfono, con su entrada animada."""
    canvas = fondo().copy()
    k = 1.0
    for t0 in ENTRADAS:
        if t0 <= t < t0 + 0.4:
            k = ease((t - t0) / 0.4)
    dy = int((1 - k) * 140)
    pant = Image.new("RGBA", (PANT_W, PANT_H), BG + (255,))
    pant.alpha_composite(barra_estado(), (0, 0))
    pant.alpha_composite(app.resize((APP_W, APP_H), Image.LANCZOS), (0, BARRA))
    tel = cuerpo().copy()
    tel.paste(pant, (BISEL, BISEL), mascara())
    capa = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sh, pad = sombra()
    capa.alpha_composite(sh, (TEL_X - pad, TEL_Y - pad + 34 + dy))
    capa.alpha_composite(tel, (TEL_X, TEL_Y + dy))
    if k < 1:
        capa.putalpha(capa.getchannel("A").point(lambda a: int(a * k)))
    canvas.alpha_composite(capa)
    return canvas


MANIFEST = None


@lru_cache(64)
def cuadro_app(file):
    return Image.open(FRAMES / file).convert("RGBA")


def zoom_en(t):
    for t0, t1, z0, z1, cy in ZOOM:
        if t0 <= t < t1:
            return z0 + (z1 - z0) * ease((t - t0) / (t1 - t0)), cy
    return 1.0, H / 2


def pantalla(f, t):
    """Cuadro real de la app con zoom suave y el toque dibujado."""
    src = cuadro_app(MANIFEST["frames"][str(f)]["file"])
    z, cy = zoom_en(t)
    cw, ch = W / z, H / z
    left = (W - cw) / 2
    top = min(max(cy - ch / 2, 0), H - ch)
    img = src.resize((W, H), Image.LANCZOS, box=(left, top, left + cw, top + ch)) if z != 1 else src.copy()
    d = ImageDraw.Draw(img, "RGBA")
    for tap in MANIFEST["taps"]:
        k = f - tap["f"]
        if -7 <= k <= 3:
            x, y = (tap["x"] - left) * z, (tap["y"] - top) * z
            p = (k + 7) / 10
            r = 34 + 40 * p
            d.ellipse((x - 30, y - 30, x + 30, y + 30), fill=(255, 255, 255, int(150 * (1 - p))), outline=(20, 20, 20, int(90 * (1 - p))), width=3)
            d.ellipse((x - r, y - r, x + r, y + r), outline=(255, 255, 255, int(200 * (1 - p))), width=5)
    return img


def componer(f, modo):
    t = f / FPS
    persona = next((n for a, b, n in PERSONA if a <= t < b), None)
    if persona:
        canvas = guia_persona(persona).copy() if modo == "previa" else Image.new("RGBA", (W, H), (0, 0, 0, 0))
    elif t >= CIERRE:
        canvas = cierre().copy()
        ultimo = round(CIERRE * FPS) - 1
        k = f - ultimo
        if k < 7:  # fundido corto desde el último cuadro de la app
            canvas = Image.blend(celular(pantalla(ultimo, ultimo / FPS), ultimo / FPS), canvas, k / 7)
    else:
        canvas = celular(pantalla(f, t), t)

    if GANCHO[0] <= t < GANCHO[1]:
        pegar_centrado(canvas, gancho(), 330, min(1, (t - GANCHO[0]) * FPS / 5 + 0.2))
    for a, b, text in CUES:
        if a <= t < b:
            pegar_centrado(canvas, subtitulo(text), SUB_Y_PERSONA if persona else SUB_Y_APP, min(1, (t - a) * FPS / 3 + 0.34))
    return canvas


def main():
    global MANIFEST
    modo = sys.argv[1] if len(sys.argv) > 1 else "previa"
    MANIFEST = json.loads((FRAMES / "manifest.json").read_text())
    out = HERE / "build" / ("previsualizacion.mp4" if modo == "previa" else "capa.mov")
    if modo == "previa":
        fmt = ["-pix_fmt", "rgb24"]
        enc = ["-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
    else:
        fmt = ["-pix_fmt", "rgba"]
        enc = ["-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le"]
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", *fmt, "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", *enc, str(out)]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for f in range(round(DUR * FPS)):
        img = componer(f, modo)
        ff.stdin.write((img.convert("RGB") if modo == "previa" else img).tobytes())
    ff.stdin.close()
    ff.wait()
    print(out)


if __name__ == "__main__":
    main()
