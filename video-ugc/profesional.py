"""Video profesional sin persona (45,5 s, 1080x1920): locución, motion graphics
con la identidad de la app, capturas reales del simulador y subtítulos.

  python3 video-ugc/profesional.py VOZ.wav MUSICA.wav  → build/dian2676_profesional_1080x1920.mp4

Necesita:
  - build/frames  (TIEMPOS=pro node video-ugc/capturar.mjs): flujo real de una pregunta.
  - build/extra   (node video-ugc/capturar_extra.mjs): inicio claro/oscuro, Practicar, Progreso.
  - VOZ.wav       (python3 video-ugc/voz_pro.py ...): locución en los tiempos de tiempos/pro.json.
Todo el texto en pantalla sale de la landing y las preguntas frecuentes de la web.
"""
import json
import math
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
FRAMES = HERE / "build" / "frames"
EXTRA = HERE / "build" / "extra"
FONTS = HERE.parent / "web" / "node_modules" / "geist" / "dist" / "fonts"
W, H, FPS = 1080, 1920, 30
T = json.loads((HERE / "tiempos" / "pro.json").read_text())
DUR = T["dur"]

# Identidad de la app (web/app/globals.css).
BG = (246, 246, 243)
SURFACE = (255, 255, 255)
LINE = (227, 227, 221)
INK = (21, 23, 27)
MUTED = (92, 98, 106)
FAINT = (150, 155, 162)
BRAND = (14, 107, 88)
BRAND_INK = (11, 92, 75)
BRAND_SOFT = (226, 239, 234)
MINT = (79, 194, 164)
OK = (21, 122, 67)

# Escenas: (inicio, fin, nombre).
ESCENAS = [
    (0.0, 7.25, "intro"),
    (7.25, 11.65, "titular"),
    (11.65, 16.3, "pasos"),
    (16.3, 20.35, "ejes"),
    (20.35, 26.9, "pregunta"),
    (26.9, 36.0, "funciones"),
    (36.0, 39.25, "celular"),
    (39.25, DUR, "cierre"),
]
FUNDIDO = 0.35  # transición entre escenas

# Subtítulos sincronizados con la locución. [x] = resaltado.
CUES = [
    (0.40, 2.57, "¿Te preparas para la prueba escrita"),
    (2.66, 4.82, "de la [DIAN 2676]?"),
    (5.05, 6.95, "Es el domingo 8 de noviembre."),
    (7.51, 8.84, "Aquí practicas con preguntas hechas"),
    (8.84, 9.41, "[para tu empleo],"),
    (9.48, 11.30, "no para cualquiera."),
    (11.90, 13.48, "Subes tu manual de funciones"),
    (13.48, 14.49, "y tus indicadores,"),
    (14.55, 15.46, "y en unos 15 minutos"),
    (15.46, 16.26, "recibes tu simulador,"),
    (16.34, 18.54, "con casos de [juicio situacional]"),
    (18.54, 20.01, "de tus [ejes oficiales]."),
    (20.63, 22.37, "Respondes cada caso"),
    (22.45, 23.84, "y revisas por qué cada opción"),
    (23.96, 25.07, "es correcta o incorrecta,"),
    (25.07, 26.49, "con la [norma] que la sustenta."),
    (27.12, 29.02, "Además, tienes un banco común"),
    (29.02, 30.31, "de [77 preguntas],"),
    (30.59, 31.86, "simulacros [cronometrados]"),
    (31.86, 33.97, "con puntaje frente al [mínimo de 70],"),
    (34.04, 35.67, "y [repaso de tus errores] por eje."),
    (36.20, 37.36, "Todo desde tu celular,"),
    (37.47, 38.85, "en modo claro u oscuro."),
    (39.42, 41.27, "Entra a [centrahoy.online]"),
    (41.33, 42.85, "y prueba el simulador de ejemplo."),
]


# ------------------------------------------------------------------ utilidades
@lru_cache(None)
def font(name, size):
    sub = "geist-mono" if name.startswith("GeistMono") else "geist-sans"
    return ImageFont.truetype(str(FONTS / sub / f"{name}.ttf"), size)


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_io(x):
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def aparece(t, t0, dur=0.5):
    """Progreso 0→1 de una entrada que empieza en t0."""
    return ease_out((t - t0) / dur)


def con_alfa(img, a):
    if a >= 1:
        return img
    img = img.copy()
    img.putalpha(img.getchannel("A").point(lambda v: int(v * a)))
    return img


def pegar(canvas, img, x, y, a=1.0):
    if a <= 0:
        return
    canvas.alpha_composite(con_alfa(img, a), (int(x), int(y)))


def entrar(canvas, img, x, y, t, t0, dy=46, dur=0.55):
    """Entrada con fundido y subida suave."""
    p = aparece(t, t0, dur)
    pegar(canvas, img, x, y + (1 - p) * dy, p)


@lru_cache(None)
def texto(s, size, peso="Geist-SemiBold", color=INK, hl=BRAND, maxw=940, interlinea=1.12, centro=True):
    """Bloque de texto con palabras resaltadas ([x]) y ajuste de línea."""
    f = font(peso, size)
    palabras = []
    for parte in s.replace("[", "\x00[").replace("]", "]\x00").split("\x00"):
        if parte:
            r = parte.startswith("[")
            for w in parte.strip("[]").split():
                if w[0] in ",.?!:;" and palabras:  # puntuación pegada a la palabra anterior
                    palabras[-1] = (palabras[-1][0] + w, palabras[-1][1])
                else:
                    palabras.append((w, r))
    esp = f.getlength(" ")
    lineas, cur, ancho = [], [], 0
    for w, r in palabras:
        lw = f.getlength(w)
        if cur and ancho + esp + lw > maxw:
            lineas.append(cur)
            cur, ancho = [], 0
        ancho += (esp if cur else 0) + lw
        cur.append((w, r))
    lineas.append(cur)
    lh = int(size * interlinea)
    anchos = [sum(f.getlength(w) for w, _ in ln) + esp * (len(ln) - 1) for ln in lineas]
    bw = int(max(anchos)) + 8
    img = Image.new("RGBA", (bw, lh * len(lineas) + int(size * 0.3)), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for i, (ln, la) in enumerate(zip(lineas, anchos)):
        x = (bw - la) / 2 if centro else 0
        for w, r in ln:
            d.text((x, i * lh), w, font=f, fill=hl if r else color)
            x += f.getlength(w) + esp
    return img


def centrar_x(img):
    return (W - img.width) / 2


@lru_cache(None)
def fondo_claro():
    img = Image.new("RGBA", (W, H), BG + (255,))
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse((-300, -700, W + 300, 700), fill=70)
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    img.paste(Image.new("RGBA", (W, H), BRAND_SOFT + (255,)), (0, 0), glow)
    return img


@lru_cache(None)
def fondo_marca():
    img = Image.new("RGBA", (W, H), BRAND + (255,))
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse((-200, -500, W + 200, 800), fill=60)
    glow = glow.filter(ImageFilter.GaussianBlur(170))
    img.paste(Image.new("RGBA", (W, H), (255, 255, 255, 255)), (0, 0), glow)
    return img


@lru_cache(None)
def logo(size=120, invertido=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, size - 1, size - 1), int(size * 0.31), fill=SURFACE if invertido else BRAND)
    d.text((size / 2, size / 2), "26", font=font("GeistMono-SemiBold", int(size * 0.4)), fill=BRAND if invertido else SURFACE, anchor="mm")
    return img


@lru_cache(None)
def tarjeta(w, h, radio=36, color=SURFACE, borde=LINE, sombra=True):
    pad = 40
    img = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    if sombra:
        s = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(s).rounded_rectangle((pad, pad + 14, pad + w, pad + h + 14), radio, fill=(16, 24, 20, 38))
        img.alpha_composite(s.filter(ImageFilter.GaussianBlur(18)))
    ImageDraw.Draw(img).rounded_rectangle((pad, pad, pad + w, pad + h), radio, fill=color, outline=borde, width=2)
    return img, pad


def pildora(s, size=34, fg=BRAND_INK, bg=BRAND_SOFT, mono=False):
    f = font("GeistMono-Medium" if mono else "Geist-Medium", size)
    w = int(f.getlength(s)) + 2 * int(size * 0.8)
    h = int(size * 1.9)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, w - 1, h - 1), h // 2, fill=bg)
    d.text((w / 2, h / 2), s, font=f, fill=fg, anchor="mm")
    return img


# Íconos sencillos dibujados con trazos (estilo de línea como lucide).
def icono(nombre, s=64, c=BRAND_INK):
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    k = s / 24
    lw = max(3, int(2 * k))
    P = lambda *xy: [(x * k, y * k) for x, y in zip(xy[::2], xy[1::2])]
    if nombre == "doc":
        d.line(P(14, 2, 6, 2, 4, 4, 4, 20, 6, 22, 18, 22, 20, 20, 20, 8, 14, 2, 14, 8, 20, 8), fill=c, width=lw, joint="curve")
        for y in (13, 17):
            d.line(P(8, y, 16, y), fill=c, width=lw)
    elif nombre == "lista":
        for y in (6, 12, 18):
            d.ellipse((3 * k, (y - 1.4) * k, 5.8 * k, (y + 1.4) * k), fill=c)
            d.line(P(9, y, 21, y), fill=c, width=lw)
    elif nombre == "chispa":
        d.line(P(12, 3, 13.8, 10.2, 21, 12, 13.8, 13.8, 12, 21, 10.2, 13.8, 3, 12, 10.2, 10.2, 12, 3), fill=c, width=lw, joint="curve")
    elif nombre == "balanza":
        d.line(P(12, 3, 12, 21), fill=c, width=lw)
        d.line(P(7, 21, 17, 21), fill=c, width=lw)
        d.line(P(4, 7, 20, 7), fill=c, width=lw)
        d.arc((1 * k, 7 * k, 9 * k, 15 * k), 0, 180, fill=c, width=lw)
        d.arc((15 * k, 7 * k, 23 * k, 15 * k), 0, 180, fill=c, width=lw)
    elif nombre == "reloj":
        d.ellipse((3 * k, 3 * k, 21 * k, 21 * k), outline=c, width=lw)
        d.line(P(12, 7, 12, 12, 15.5, 14), fill=c, width=lw, joint="curve")
    elif nombre == "repaso":
        d.arc((3 * k, 3 * k, 21 * k, 21 * k), 40, 330, fill=c, width=lw)
        d.line(P(3, 4, 3.5, 9.5, 9, 9), fill=c, width=lw, joint="curve")
    elif nombre == "check":
        d.line(P(5, 12.5, 10, 17.5, 19, 7), fill=c, width=lw + 1, joint="curve")
    return img


def cuadrito_icono(nombre, s=96):
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(img).rounded_rectangle((0, 0, s - 1, s - 1), int(s * 0.29), fill=BRAND_SOFT)
    ic = icono(nombre, int(s * 0.56))
    img.alpha_composite(ic, ((s - ic.width) // 2, (s - ic.height) // 2))
    return img


# ------------------------------------------------------------- teléfono
@lru_cache(None)
def telefono_base(escala):
    aw, ah = round(W * escala), round(H * escala)
    barra = round(78 * escala)
    bis = max(10, round(26 * escala))
    pw, ph = aw, ah + barra
    tw, th = pw + 2 * bis, ph + 2 * bis
    cuerpo = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    d = ImageDraw.Draw(cuerpo)
    d.rounded_rectangle((0, 0, tw - 1, th - 1), round(112 * escala) + bis, fill=(24, 26, 29))
    d.rounded_rectangle((3, 3, tw - 4, th - 4), round(112 * escala) + bis - 2, outline=(74, 78, 84), width=2)
    mascara = Image.new("L", (pw, ph), 0)
    ImageDraw.Draw(mascara).rounded_rectangle((0, 0, pw - 1, ph - 1), round(112 * escala), fill=255)
    pad = 90
    sombra = Image.new("RGBA", (tw + 2 * pad, th + 2 * pad), (0, 0, 0, 0))
    ImageDraw.Draw(sombra).rounded_rectangle((pad, pad + 30, pad + tw, pad + th + 30), round(112 * escala) + bis, fill=(16, 24, 20, 70))
    sombra = sombra.filter(ImageFilter.GaussianBlur(40))
    return dict(aw=aw, ah=ah, barra=barra, bis=bis, pw=pw, ph=ph, tw=tw, th=th, cuerpo=cuerpo, mascara=mascara, sombra=sombra, pad=pad)


@lru_cache(None)
def barra_estado(pw, alto, oscuro):
    fondo = (13, 15, 18) if oscuro else BG
    tinta = (236, 237, 239) if oscuro else INK
    img = Image.new("RGBA", (pw, alto), fondo + (255,))
    d = ImageDraw.Draw(img)
    s = alto / 78
    d.text((95 * s, alto / 2 + 4 * s), "9:41", font=font("Geist-SemiBold", int(36 * s)), fill=tinta, anchor="mm")
    d.rounded_rectangle((pw / 2 - 105 * s, 14 * s, pw / 2 + 105 * s, 62 * s), 24 * s, fill=(8, 8, 10))
    x = pw - 200 * s
    for i in range(4):
        hh = (10 + i * 6) * s
        d.rounded_rectangle((x + i * 12 * s, 52 * s - hh, x + i * 12 * s + 7 * s, 52 * s), 2, fill=tinta)
    d.rounded_rectangle((pw - 128 * s, 31 * s, pw - 70 * s, 55 * s), 6 * s, outline=tinta, width=max(2, int(2.5 * s)))
    d.rounded_rectangle((pw - 124 * s, 35 * s, pw - 84 * s, 51 * s), 4 * s, fill=tinta)
    return img


def telefono(app, escala, oscuro=False):
    """Teléfono con la captura real dentro y su sombra. Devuelve (img, x_pantalla, y_pantalla)."""
    b = telefono_base(escala)
    pant = Image.new("RGBA", (b["pw"], b["ph"]), (0, 0, 0, 255))
    pant.alpha_composite(barra_estado(b["pw"], b["barra"], oscuro), (0, 0))
    pant.alpha_composite(app.resize((b["aw"], b["ah"]), Image.LANCZOS), (0, b["barra"]))
    tel = b["cuerpo"].copy()
    tel.paste(pant, (b["bis"], b["bis"]), b["mascara"])
    out = b["sombra"].copy()
    out.alpha_composite(tel, (b["pad"], b["pad"]))
    return out, b["pad"] + b["bis"], b["pad"] + b["bis"] + b["barra"]


@lru_cache(64)
def captura(path):
    return Image.open(path).convert("RGBA")


@lru_cache(None)
def manifest():
    return json.loads((FRAMES / "manifest.json").read_text())


def cuadro_app(f):
    m = manifest()
    ks = sorted(int(k) for k in m["frames"])
    f = min(max(f, ks[0]), ks[-1])
    while str(f) not in m["frames"]:
        f -= 1
    return captura(FRAMES / m["frames"][str(f)]["file"]).copy()


def con_toques(app, f):
    d = ImageDraw.Draw(app, "RGBA")
    for tap in manifest()["taps"]:
        k = f - tap["f"]
        if -7 <= k <= 3:
            p = (k + 7) / 10
            x, y, r = tap["x"], tap["y"], 34 + 40 * p
            d.ellipse((x - 30, y - 30, x + 30, y + 30), fill=(255, 255, 255, int(150 * (1 - p))), outline=(20, 20, 20, int(90 * (1 - p))), width=3)
            d.ellipse((x - r, y - r, x + r, y + r), outline=(255, 255, 255, int(200 * (1 - p))), width=5)
    return app


def recorte_scroll(path, desplaz):
    """Ventana de 1080x1920 de una captura alta, desplazada `desplaz` px."""
    img = captura(path)
    y = int(clamp(desplaz, 0, img.height - H))
    return img.crop((0, y, W, y + H))


# ------------------------------------------------------------------ escenas
def flotar(t, amp=8, vel=0.35):
    return amp * math.sin(2 * math.pi * vel * t)


def esc_intro(t):
    c = fondo_marca().copy()
    lg = logo(150, invertido=True)
    p = aparece(t, 0.15, 0.6)
    pegar(c, lg, centrar_x(lg), 470 + (1 - p) * 40, p)
    eb = texto("PRUEBA ESCRITA · CNSC", 38, "GeistMono-Medium", (210, 236, 228), maxw=1000)
    entrar(c, eb, centrar_x(eb), 700, t, 0.45)
    t1 = texto("DIAN 2676", 190, "Geist-Bold", SURFACE, maxw=1040)
    p = aparece(t, 0.75, 0.7)
    big = t1.resize((int(t1.width * (0.92 + 0.08 * p)), int(t1.height * (0.92 + 0.08 * p))), Image.LANCZOS)
    pegar(c, big, centrar_x(big), 780 + (t1.height - big.height) / 2, p)
    sub = texto("¿Te estás preparando?", 66, "Geist-Medium", (226, 242, 236), maxw=1000)
    entrar(c, sub, centrar_x(sub), 1010, t, 2.3)
    pil = pildora("Domingo 8 de noviembre de 2026", 40, BRAND_INK, SURFACE)
    entrar(c, pil, centrar_x(pil), 1150, t, 5.0)
    return c


def esc_titular(t, t0):
    c = fondo_claro().copy()
    lt = t - t0
    eb = texto("PARA TU EMPLEO", 36, "GeistMono-Medium", BRAND_INK)
    entrar(c, eb, centrar_x(eb), 150, lt, 0.05)
    h = texto("Practica con preguntas hechas [para tu empleo], no para cualquiera.", 82, "Geist-SemiBold", INK, BRAND, maxw=940)
    entrar(c, h, centrar_x(h), 220, lt, 0.2)
    tel, _, _ = telefono(cuadro_app(round(t * FPS)), 0.62)
    p = aparece(lt, 0.35, 0.8)
    pegar(c, tel, centrar_x(tel), 600 + (1 - p) * 300 + flotar(lt), p)
    return c


def esc_pasos(t, t0):
    c = fondo_claro().copy()
    lt = t - t0
    eb = texto("CÓMO FUNCIONA", 36, "GeistMono-Medium", BRAND_INK)
    entrar(c, eb, centrar_x(eb), 190, lt, 0.05)
    h = texto("Sube 2 documentos y recibe tu simulador", 80, "Geist-SemiBold", INK, maxw=920)
    entrar(c, h, centrar_x(h), 260, lt, 0.15)
    pasos = [
        ("doc", "Tu manual de funciones", "La ficha del MERF de tu empleo, en PDF o imagen", 0.25),
        ("lista", "Tus indicadores", "El pantallazo de la consulta con tu número de inscripción", 1.85),
        ("chispa", "Tu simulador, listo", "En unos 15 minutos, con preguntas de tus ejes", 2.9),
    ]
    for i, (ic, tit, det, ta) in enumerate(pasos):
        card, pad = tarjeta(920, 280)
        card = card.copy()
        card.alpha_composite(cuadrito_icono(ic, 110), (pad + 50, pad + 85))
        d = ImageDraw.Draw(card)
        d.text((pad + 204, pad + 44), f"0{i + 1}", font=font("GeistMono-Medium", 30), fill=FAINT)
        d.text((pad + 204, pad + 84), tit, font=font("Geist-SemiBold", 52), fill=INK)
        dt = texto(det, 34, "Geist-Regular", MUTED, maxw=660, centro=False)
        card.alpha_composite(dt, (pad + 204, pad + 154))
        entrar(c, card, centrar_x(card), 540 + i * 340, lt, ta, dy=60)
    return c


def esc_ejes(t, t0):
    c = fondo_claro().copy()
    lt = t - t0
    eb = texto("TUS EJES OFICIALES", 36, "GeistMono-Medium", BRAND_INK)
    entrar(c, eb, centrar_x(eb), 150, lt, 0.05)
    h = texto("Casos de [juicio situacional] repartidos por tus ejes", 78, "Geist-SemiBold", INK, BRAND, maxw=940)
    entrar(c, h, centrar_x(h), 220, lt, 0.15)
    app = recorte_scroll(EXTRA / "progreso.png", 0)
    tel, _, _ = telefono(app, 0.6)
    p = aparece(lt, 0.3, 0.8)
    pegar(c, tel, centrar_x(tel), 560 + (1 - p) * 300 + flotar(lt), p)
    return c


def esc_pregunta(t, t0):
    c = fondo_claro().copy()
    lt = t - t0
    eb = texto("RESPUESTAS JUSTIFICADAS", 36, "GeistMono-Medium", BRAND_INK)
    entrar(c, eb, centrar_x(eb), 150, lt, 0.05)
    h = texto("Cada opción explica por qué, con [la norma]", 78, "Geist-SemiBold", INK, BRAND, maxw=940)
    entrar(c, h, centrar_x(h), 220, lt, 0.15)
    e1 = pildora("Correcta o incorrecta, siempre con el porqué", 32, SURFACE, BRAND)
    entrar(c, e1, centrar_x(e1), 425, lt, 3.3)
    f = round(t * FPS)
    tel, _, _ = telefono(con_toques(cuadro_app(f), f), 0.6)
    p = aparece(lt, 0.2, 0.7)
    pegar(c, tel, centrar_x(tel), 430 + (1 - p) * 300 + flotar(lt, 5), p)
    return c


def esc_funciones(t, t0):
    c = fondo_claro().copy()
    lt = t - t0
    eb = texto("QUÉ INCLUYE", 36, "GeistMono-Medium", BRAND_INK)
    entrar(c, eb, centrar_x(eb), 150, lt, 0.05)
    h = texto("Todo para llegar con ritmo al 8 de noviembre", 74, "Geist-SemiBold", INK, maxw=940)
    entrar(c, h, centrar_x(h), 220, lt, 0.15)
    app = recorte_scroll(EXTRA / "practicar.png", 1300 + 260 * ease_io((lt - 3.5) / 4))
    tel, _, _ = telefono(app, 0.46)
    p = aparece(lt, 0.25, 0.8)
    pegar(c, tel, 600, 470 + (1 - p) * 300 + flotar(lt, 6), p)
    items = [
        ("lista", "77", "preguntas en el banco común", 0.4),
        ("reloj", "0–100", "simulacros cronometrados · mínimo 70,00", 3.75),
        ("repaso", "Errores", "repaso de lo que fallaste, por eje", 7.1),
    ]
    for i, (ic, num, det, ta) in enumerate(items):
        card, pad = tarjeta(520, 330, radio=32)
        card = card.copy()
        card.alpha_composite(cuadrito_icono(ic, 84), (pad + 36, pad + 36))
        d = ImageDraw.Draw(card)
        d.text((pad + 36, pad + 140), num, font=font("Geist-Bold", 84 if len(num) < 6 else 70), fill=BRAND)
        dt = texto(det, 32, "Geist-Medium", MUTED, maxw=450, centro=False)
        card.alpha_composite(dt, (pad + 36, pad + 240))
        entrar(c, card, 40, 520 + i * 350, lt, ta, dy=50)
    return c


def esc_celular(t, t0):
    c = fondo_claro().copy()
    lt = t - t0
    eb = texto("EN TU CELULAR", 36, "GeistMono-Medium", BRAND_INK)
    entrar(c, eb, centrar_x(eb), 150, lt, 0.05)
    h = texto("Modo claro y oscuro. Tu progreso queda guardado.", 74, "Geist-SemiBold", INK, maxw=940)
    entrar(c, h, centrar_x(h), 220, lt, 0.15)
    claro, _, _ = telefono(captura(EXTRA / "inicio_light.png"), 0.43)
    oscuro, _, _ = telefono(captura(EXTRA / "inicio_dark.png"), 0.43, oscuro=True)
    p1, p2 = aparece(lt, 0.2, 0.7), aparece(lt, 1.25, 0.7)
    pegar(c, claro, 40 - (1 - p1) * 120, 560 + flotar(lt, 6), p1)
    pegar(c, oscuro, W - oscuro.width - 40 + (1 - p2) * 120, 640 - flotar(lt, 6), p2)
    return c


def esc_cierre(t, t0):
    c = fondo_marca().copy()
    lt = t - t0
    lg = logo(150, invertido=True)
    entrar(c, lg, centrar_x(lg), 560, lt, 0.1)
    dom = texto("centrahoy.online", 112, "Geist-Bold", SURFACE, maxw=1040)
    entrar(c, dom, centrar_x(dom), 760, lt, 0.3)
    s = texto("Tu simulador personalizado para la prueba escrita DIAN 2676", 46, "Geist-Medium", (226, 242, 236), maxw=860)
    entrar(c, s, centrar_x(s), 920, lt, 0.55)
    b = pildora("Prueba el simulador de ejemplo", 42, BRAND_INK, SURFACE)
    entrar(c, b, centrar_x(b), 1110, lt, 2.1)
    n = texto("Herramienta de estudio independiente. No está afiliada a la DIAN, la CNSC ni al operador del concurso.", 28,
              "Geist-Regular", (190, 222, 212), maxw=820)
    entrar(c, n, centrar_x(n), 1430, lt, 1.2)
    return c


DIBUJO = {"titular": esc_titular, "pasos": esc_pasos, "ejes": esc_ejes, "pregunta": esc_pregunta,
          "funciones": esc_funciones, "celular": esc_celular, "cierre": esc_cierre}


def escena(nombre, t, t0):
    return esc_intro(t) if nombre == "intro" else DIBUJO[nombre](t, t0)


@lru_cache(None)
def subtitulo(s):
    tx = texto(s, 54, "Geist-SemiBold", SURFACE, MINT, maxw=900)
    w, h = tx.width + 64, tx.height + 22
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(img).rounded_rectangle((0, 0, w - 1, h - 1), 22, fill=(14, 17, 20, 215))
    img.alpha_composite(tx, (32, 14))
    return img


def cuadro(f):
    t = f / FPS
    i = next(k for k, (a, b, _) in enumerate(ESCENAS) if a <= t < b or k == len(ESCENAS) - 1)
    a, b, nombre = ESCENAS[i]
    c = escena(nombre, t, a)
    if i > 0 and t - a < FUNDIDO:  # transición: la escena anterior se desliza y se funde
        pa, pb, pn = ESCENAS[i - 1]
        k = ease_io((t - a) / FUNDIDO)
        prev = escena(pn, t, pa)
        c = Image.blend(prev, c, k)
    for ca, cb, s in CUES:
        if ca <= t < cb:
            sub = subtitulo(s)
            pegar(c, sub, centrar_x(sub), 1690, min(1, (t - ca) * FPS / 3 + 0.3))
    return c


def main():
    voz, musica = sys.argv[1], sys.argv[2]
    out = HERE / "build" / "dian2676_profesional_1080x1920.mp4"
    sfx = HERE / "build" / "transiciones.wav"
    hacer_transiciones(sfx)
    voz_fx = ("[1:a]aresample=48000:resampler=soxr,highpass=f=70,equalizer=f=180:t=q:w=1:g=1.5,"
              "equalizer=f=3500:t=q:w=1.4:g=2,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=150[v];"
              "[v]asplit=2[v1][v2];"
              f"[2:a]atrim=0:{DUR},volume=-21dB,afade=t=in:d=0.6,afade=t=out:st={DUR - 2.5}:d=2.5[m];"
              "[m][v2]sidechaincompress=threshold=0.02:ratio=5:attack=30:release=400[md];"
              "[3:a]volume=-6dB[fx];"
              "[v1][md][fx]amix=inputs=3:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]")
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-i", voz, "-stream_loop", "-1", "-i", musica, "-i", sfx, "-filter_complex", voz_fx,
                           "-map", "0:v", "-map", "[a]", "-t", str(DUR), "-c:v", "libx264", "-preset", "slow", "-crf", "16",
                           "-profile:v", "high", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
                           "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    for f in range(round(DUR * FPS)):
        ff.stdin.write(cuadro(f).convert("RGB").tobytes())
    ff.stdin.close()
    ff.wait()
    print(out)


def hacer_transiciones(path):
    """Barridos suaves de ruido filtrado en cada cambio de escena."""
    import numpy as np
    sr = 48000
    pista = np.zeros(int(DUR * sr))
    rng = np.random.default_rng(3)
    for a, _, _ in ESCENAS[1:]:
        n = int(0.5 * sr)
        ruido = rng.standard_normal(n)
        env = np.sin(np.linspace(0, np.pi, n)) ** 2
        corte = np.linspace(0.02, 0.35, n)  # filtro que se abre: sensación de "whoosh"
        y, acc = np.zeros(n), 0.0
        for i in range(n):
            acc += corte[i] * (ruido[i] - acc)
            y[i] = acc
        i0 = int((a - 0.3) * sr)
        pista[i0:i0 + n] += y * env * 0.18
    pcm = (np.clip(pista, -1, 1) * 32767).astype(np.int16)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(sr), "-ac", "1", "-i", "-", "-ac", "2", str(path)],
                   input=pcm.tobytes(), check=True)


if __name__ == "__main__":
    main()
