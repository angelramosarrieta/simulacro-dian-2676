# Video UGC · DIAN 2676 (centrahoy.online)

Video vertical 1080 × 1920, 30 fps, **24,8 s**. Alterna un avatar de IA fotorrealista que habla a cámara con la **interfaz real** de la app mostrada dentro de un celular: la landing de centrahoy.online y el simulador de ejemplo (`/ejemplo`), en *Practicar → Práctica rápida*.

| Archivo | Qué es |
|---|---|
| `entregables/previsualizacion_avatar_pendiente.mp4` | Corte completo con tiempos, subtítulos, mockup del celular y cierre. Las escenas 1 y 4 tienen un plano guía en el lugar del avatar. Sin audio. |
| `capturar.mjs` | Graba la app real cuadro por cuadro (Playwright, 360 × 640 @3x). |
| `componer.py` | Mockup del celular, zoom, toques, subtítulos, texto gancho y cierre. `previa` → MP4 · `capa` → ProRes 4444 con alfa. |
| `montar.sh` | Pone la capa sobre el clip del avatar y mezcla la voz con la música. |
| `subtitulos.srt` | Subtítulos para cargar como captions en TikTok, Reels o CapCut. |

## Guion y tiempos

| Tiempo | Imagen | Diálogo (exacto) | Texto en pantalla |
|---|---|---|---|
| 0,0–4,3 | **Avatar**, plano medio, mirando a cámara | “Parce, si te estás preparando para el concurso DIAN 2676, mira esto.” | Gancho: “¿Te preparas para la **DIAN 2676**? 👀” |
| 4,3–9,0 | Entra el celular: landing de centrahoy.online → simulador de ejemplo → toque en *Practicar* → toque en *Práctica rápida* | “Encontré esta plataforma donde puedes practicar preguntas tipo juicio situacional.” | **juicio situacional** resaltado |
| 9,0–16,0 | Celular: caso real → opciones → toque en B → *Incorrecto*, clave C y la explicación de cada opción, con zoom suave | “Respondes, revisas la explicación y puedes entender mejor por qué una opción es más adecuada que otra.” | **explicación** resaltado |
| 16,0–20,6 | **Avatar** | “La verdad, me parece una herramienta interesante para complementar el estudio.” | — |
| 20,6–23,0 | Celular: landing de centrahoy.online | “Te dejo el enlace para que le eches un vistazo.” | — |
| 23,0–24,8 | Cierre con la identidad real (logo “26”, verde #0E6B58, Geist) | — | **centrahoy.online** / Preparación para la DIAN 2676 / nota: herramienta independiente, no afiliada a la DIAN ni a la CNSC |

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

## Montaje

```bash
# 1. Web local (no necesita Supabase: se usan valores ficticios, sin sesión)
cd web && npm ci
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=x npx next dev -p 3100 &

# 2. Grabar la app real y componer
node video-ugc/capturar.mjs
python3 video-ugc/componer.py previa   # previsualización
python3 video-ugc/componer.py capa     # capa con alfa para el montaje

# 3. Montar sobre el clip del avatar
video-ugc/montar.sh avatar.mp4 musica.mp3 [inicio_seg]
# → video-ugc/build/dian2676_ugc_1080x1920.mp4
```

Si prefieres CapCut: importa `build/capa.mov` (ProRes con alfa) en una pista por encima del clip del avatar, alineada al segundo 0.

## Verificación antes de publicar

- [ ] La duración es de 24,8 s, en 1080 × 1920.
- [ ] Todo lo que se ve de la app es una captura real de la landing y de `/ejemplo`.
- [ ] Los subtítulos coinciden palabra por palabra con el guion; los resaltados son DIAN 2676, juicio situacional y explicación.
- [ ] El dominio final es exactamente **centrahoy.online**.
- [ ] No aparecen precios, pagos, compras, promociones ni garantías de aprobar.
- [ ] El avatar no afirma resultados, puntajes ni experiencias personales.
- [ ] **Marca el video como contenido generado con IA** al publicarlo: es la etiqueta “AI‑generated” de TikTok o “Hecho con IA” en Meta. Ambas plataformas la exigen para personas realistas creadas con IA, y además evita que el avatar pase por un usuario real.
