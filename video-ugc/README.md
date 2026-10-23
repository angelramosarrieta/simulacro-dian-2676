# Video UGC · DIAN 2676 (centrahoy.online)

Video vertical 1080 × 1920, 30 fps. Alterna un avatar de IA que habla a cámara con la **interfaz real** de la app, mostrada dentro de un celular: la landing de centrahoy.online y el simulador de ejemplo (`/ejemplo`), en *Practicar → Práctica rápida*. Hay dos versiones con el mismo guion:

| Versión | Archivo | Avatar y voz | Duración |
|---|---|---|---|
| **Hombre** | `entregables/dian2676_ugc_hombre_1080x1920.mp4` | 4 fotos de referencia (`referencias/`) animadas con SadTalker + GFPGAN, con cortes entre tomas y movimiento de celular en mano; voz sintética masculina en español latino (Piper es_MX-ald) con ambiente de habitación; música lo-fi propia | 24,95 s |
| Gemini | `entregables/dian2676_ugc_final_1080x1920.mp4` | Clip de Gemini (mujer), con su propia voz | 24,75 s |

Los tiempos de cada versión (escenas, subtítulos, zoom y capturas) están en `tiempos/hombre.json` y `tiempos/gemini.json`; todos los scripts los leen según `TIEMPOS=hombre|gemini` (por defecto `hombre`).

| Archivo | Qué es |
|---|---|
| `voz_hombre.py`, `voz/*.flac` | Voz masculina: síntesis de las 5 frases y armado de la pista según `tiempos/hombre.json`. Las frases exactas del video final están en `voz/`. |
| `avatar_hombre.py` | Arma `build/avatar.mp4` con las tomas de `tiempos/hombre.json` ("tomas"): cortes entre fotos, zoom por toma y movimiento de celular en mano. |
| `musica.py` | Música de fondo lo-fi sintetizada aquí (sin derechos de terceros). |
| `fal_run.py`, `fal_hombre.sh` | Generación con fal.ai (voz natural y avatar con movimiento de cuerpo) cuando el entorno tenga `FAL_KEY` y acceso a fal.ai. |
| `preparar_avatar.sh` | Adapta el clip de Gemini: recorte 9:16, quita la frase repetida (19,85–25,0 s del original) y difumina sus subtítulos quemados. |
| `capturar.mjs` | Graba la app real cuadro por cuadro (Playwright, 360 × 640 @3x). |
| `componer.py` | Mockup del celular, zoom, toques, subtítulos, texto gancho y cierre. `previa` → MP4 · `capa` → ProRes 4444 con alfa. |
| `montar.sh` | Pone la capa sobre el clip del avatar y mezcla la voz con la música. |
| `profesional.py`, `voz_pro.py`, `voz_pro/*.flac`, `capturar_extra.mjs` | Video profesional sin persona (ver abajo). |
| `subtitulos.srt`, `subtitulos_gemini.srt` | Subtítulos de cada versión para cargarlos como captions en TikTok, Reels o CapCut. |

## Video profesional (sin persona)

`entregables/dian2676_profesional_1080x1920.mp4`: 45,5 s, 1080 × 1920. Tiene locución masculina neural (Kokoro `em_alex`, audio 48 kHz a -14 LUFS), música de fondo, transiciones con sonido, motion graphics con la identidad de la app y capturas reales del simulador de ejemplo. Todo el texto sale de la landing y las preguntas frecuentes. No menciona precios ni pagos.

| Tiempo | Escena | Locución |
|---|---|---|
| 0–7,25 | Intro en verde de marca: logo, “DIAN 2676”, fecha | ¿Te preparas para la prueba escrita de la DIAN 2676? Es el domingo 8 de noviembre. |
| 7,25–11,65 | Titular de la landing + celular con la landing real | Aquí practicas con preguntas hechas para tu empleo, no para cualquiera. |
| 11,65–16,3 | Cómo funciona: manual de funciones → indicadores → simulador | Subes tu manual de funciones y tus indicadores, y en unos 15 minutos recibes tu simulador, |
| 16,3–20,35 | Celular con la pestaña Progreso (ejes oficiales) | con casos de juicio situacional de tus ejes oficiales. |
| 20,35–26,9 | Celular: caso real, respuesta y explicación con la norma | Respondes cada caso y revisas por qué cada opción es correcta o incorrecta, con la norma que la sustenta. |
| 26,9–36,0 | Qué incluye: 77 preguntas, simulacros 0–100 (mínimo 70,00), repaso de errores + Practicar | Además, tienes un banco común de 77 preguntas, simulacros cronometrados… y repaso de tus errores por eje. |
| 36,0–39,25 | Celulares en modo claro y oscuro | Todo desde tu celular, en modo claro u oscuro. |
| 39,25–45,5 | Cierre en verde: centrahoy.online, “Prueba el simulador de ejemplo”, nota de independencia | Entra a centrahoy.online y prueba el simulador de ejemplo. |

```bash
TIEMPOS=pro node video-ugc/capturar.mjs          # flujo real de la pregunta
node video-ugc/capturar_extra.mjs                # inicio claro/oscuro, Practicar, Progreso
python3 video-ugc/voz_pro.py --usar-guardadas video-ugc/build/voz_pro
python3 video-ugc/musica.py video-ugc/build/musica_pro.wav 46.5
cd video-ugc && python3 profesional.py build/voz_pro/voz_pro.wav build/musica_pro.wav
```

## Guion y tiempos

Tiempos de la versión Gemini; los de la versión hombre están en `tiempos/hombre.json` (escena 1: 0–5,3 s · app: 5,3–16,45 s · escena 4: 16,45–21,1 s · app: 21,1–23,6 s · cierre: 23,6–24,95 s).

| Tiempo | Imagen | Diálogo (exacto) | Texto en pantalla |
|---|---|---|---|
| 0,0–4,0 | **Avatar** (“mira esto” ya cae sobre el celular), plano medio, mirando a cámara | “Parce, si te estás preparando para el concurso DIAN 2676, mira esto.” | Gancho: “¿Te preparas para la **DIAN 2676**? 👀” |
| 4,0–9,5 | Entra el celular: landing de centrahoy.online → simulador de ejemplo → toque en *Practicar* → toque en *Práctica rápida* | “Encontré esta plataforma donde puedes practicar preguntas tipo juicio situacional.” | **juicio situacional** resaltado |
| 10,0–15,5 | Celular: caso real → opciones → toque en B → *Incorrecto*, clave C y la explicación de cada opción, con zoom suave | “Respondes, revisas la explicación y puedes entender mejor por qué una opción es más adecuada que otra.” | **explicación** resaltado |
| 15,5–19,85 | **Avatar** | “La verdad, me parece una herramienta interesante para complementar el estudio.” | — |
| 19,85–22,4 | Celular: landing de centrahoy.online | “Te dejo el enlace para que le eches un vistazo.” | — |
| 22,4–24,75 | Cierre con la identidad real (logo “26”, verde #0E6B58, Geist) | — | **centrahoy.online** / Preparación para la DIAN 2676 / nota: herramienta independiente, no afiliada a la DIAN ni a la CNSC |

La pregunta, las opciones y la explicación que se ven son las del simulador de ejemplo (caso de *Fiscalización y liquidación tributaria y aduanera*). En las capturas no aparecen precios, pagos ni botones de compra: se evita la parte de la landing que menciona Wompi y el pie con “Precios”.

## El avatar: cómo generarlo

En este entorno no hay ningún generador de video con IA disponible, así que el clip del avatar se genera aparte (HeyGen, Synthesia, Captions, D‑ID o similar) y se inserta con `montar.sh`.

**Configuración del avatar**
- Hombre joven adulto, de apariencia latina y colombiana, entre 25 y 30 años. Look casual‑profesional: camisa o polo liso y sin logos. Espacio bien iluminado con luz natural de ventana: escritorio o habitación de estudio con algún libro o un portátil desenfocado. Nada de estudio con fondo plano.
- Plano medio (pecho hacia arriba), cámara a la altura de los ojos, mirando directo a cámara. Formato **9:16, 1080 × 1920**.
- Gestos naturales y moderados: nada de sonrisa fija ni manos de vendedor. Si la herramienta lo permite, activa los micro‑movimientos y el parpadeo natural, y baja la expresividad.
- Voz en **español de Colombia** (por ejemplo, una voz neural es‑CO masculina). Tono conversacional, velocidad normal a ligeramente rápida y pausas cortas.

**Texto para la voz.** Genera **un solo clip continuo de unos 25 s** con este texto, dejando silencio mientras se ve el celular. Si la herramienta no permite pausas, genera las 5 frases sueltas y únelas con estos tiempos de inicio:

| Inicio | Frase |
|---|---|
| 0,15 s | Parce, si te estás preparando para el concurso DIAN 2676, mira esto. |
| 4,40 s | Encontré esta plataforma donde puedes practicar preguntas tipo juicio situacional. |
| 9,10 s | Respondes, revisas la explicación y puedes entender mejor por qué una opción es más adecuada que otra. |
| 16,10 s | La verdad, me parece una herramienta interesante para complementar el estudio. |
| 20,70 s | Te dejo el enlace para que le eches un vistazo. |

Pronunciación: escribe “DIAN dos mil seiscientos setenta y seis” en el campo de voz si el motor lee mal “2676”. La frase 1 debe caber en 4,1 s.

**Música.** Usa una pista lo‑fi o acústica suave de la biblioteca libre de derechos de TikTok o CapCut. `montar.sh` la deja a ≈ ‑24 dB y la baja aún más cuando hay voz.

## Versión hombre: cómo se generó el avatar

1. **Voz:** `python3 video-ugc/voz_hombre.py --usar-guardadas build/voz` arma la pista con las frases de `voz/` (o las sintetiza de nuevo; ver el docstring).
2. **Animación con sincronía de labios** ([SadTalker](https://github.com/OpenTalker/SadTalker), checkpoints de sus releases en GitHub, CPU):
   `python inference.py --driven_audio voz/l1.wav --source_image referencias/avatar_escena1.png --still --preprocess full --size 256 --cpu`
   (y lo mismo con cada parte de frase y su foto). Con Python 3.13 y numpy 2 hacen falta parches menores: alias `np.float`/`np.int`, `float()` sobre arrays de un elemento en `src/face3d/util/preprocess.py` y `src/utils/preprocess.py`, `audioop-lts` para pydub, `basicsr` 1.4.2 compilado a mano. Además, en `src/utils/paste_pic.py` se cambió `seamlessClone` por un pegado con borde difuminado, porque el recorte de la cara se sale del cuadro.
3. **Nitidez de la cara:** GFPGAN v1.4 (peso 0,5) sobre cada cuadro.
4. **Tomas:** la escena 1 se corta en 3 tomas ("Parce, si te estás preparando" señalando → "para el concurso DIAN 2676" con las manos abiertas → "mira esto" señalando de cerca) y la escena 4 en 2. Las frases se parten en sus silencios naturales y cada parte se anima con su foto (`esc1`, `esc1b`, `esc4`, `esc4b`).
5. `python3 video-ugc/avatar_hombre.py DIR_CLIPS build/voz/voz_hombre.wav`, y luego el montaje de abajo con `TIEMPOS=hombre` y `build/musica.wav` (`python3 video-ugc/musica.py build/musica.wav`).

## Montaje

```bash
# 1. Web local (no necesita Supabase: se usan valores ficticios, sin sesión)
cd web && npm ci
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=x npx next dev -p 3100 &

# 2. Grabar la app real y componer (TIEMPOS=hombre o gemini)
export TIEMPOS=hombre
node video-ugc/capturar.mjs
python3 video-ugc/componer.py previa   # previsualización
python3 video-ugc/componer.py capa     # capa con alfa para el montaje

# 3. Pista del avatar y montaje
python3 video-ugc/avatar_hombre.py DIR_CLIPS build/voz/voz_hombre.wav             # versión hombre
python3 video-ugc/musica.py build/musica.wav
# TIEMPOS=gemini video-ugc/preparar_avatar.sh gemini_generated_video.mp4         # versión Gemini
video-ugc/montar.sh build/avatar.mp4 build/musica.wav
# → video-ugc/build/dian2676_ugc_1080x1920.mp4
```

Si prefieres CapCut: importa `build/capa.mov` (ProRes con alfa) en una pista por encima del clip del avatar, alineada al segundo 0.

## Verificación antes de publicar

- [ ] La duración no pasa de 25 s (24,95 s la versión hombre, 24,75 s la de Gemini), en 1080 × 1920.
- [ ] Todo lo que se ve de la app es una captura real de la landing y de `/ejemplo`.
- [ ] Los subtítulos coinciden palabra por palabra con el guion; los resaltados son DIAN 2676, juicio situacional y explicación.
- [ ] El dominio final es exactamente **centrahoy.online**.
- [ ] No aparecen precios, pagos, compras, promociones ni garantías de aprobar.
- [ ] El avatar no afirma resultados, puntajes ni experiencias personales.
- [ ] **Marca el video como contenido generado con IA** al publicarlo: es la etiqueta “AI‑generated” de TikTok o “Hecho con IA” en Meta. Ambas plataformas la exigen para personas realistas creadas con IA, y además evita que el avatar pase por un usuario real.
