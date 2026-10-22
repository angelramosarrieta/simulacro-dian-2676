# Simulador DIAN 2676

Crea **tu propio simulador de la prueba escrita del concurso DIAN 2676 (CNSC)**, adaptado a tu empleo, **dentro de Claude**. No necesitas programar, instalar nada ni pagar hosting.

En este concurso la guía y el marco normativo son iguales para todos, así que la plantilla ya los trae. **Tú solo aportas tu manual de funciones y tus indicadores**, y Claude completa la app con las preguntas de tu empleo.

> Herramienta de estudio independiente. No está afiliada a la DIAN, la CNSC ni el operador del concurso. Verifica siempre la información oficial en SIMO y en cnsc.gov.co.

> **Nuevo: plataforma web.** En la carpeta [`web/`](web/) está la plataforma comercial: landing, cuentas, pagos con Wompi y generación automática del simulador con IA. Empieza por [web/docs/PUESTA-EN-MARCHA.md](web/docs/PUESTA-EN-MARCHA.md).

**Ejemplo terminado:** [simulacro.centrahoy.online](https://simulacro.centrahoy.online), el simulador de *Analista II, Fiscalización y liquidación*.

---

## Cómo crear el tuyo en 5 pasos

### 1. Descarga la plantilla
Abre **[plantilla.html](plantilla.html)** y toca **Download raw file** (ícono de descarga, arriba a la derecha).

### 2. Reúne tus 2 documentos
- **Manual de funciones** de tu empleo: la ficha del MERF, en PDF o en pantallazo.
- **Tus indicadores**: los consultas con tu número de inscripción en la página del operador. El enlace está en la sección 4.3 de la Guía de Orientación. Toma un pantallazo de la lista completa.

### 3. Abre Claude y adjunta todo
Entra a [claude.ai](https://claude.ai), abre una conversación nueva y adjunta la plantilla, el manual y los indicadores.

### 4. Pega el prompt
Copia el prompt de **[PROMPT.md](PROMPT.md)**, llena tus datos (empleo, nivel, OPEC y modalidad) y envíalo.
- Claude te muestra el análisis de tu empleo y el plan de preguntas por eje: revísalo y responde **"Confirmo"**.
- Luego agrega tus preguntas por bloques. Escribe **"Continúa"** hasta terminar.

### 5. Ábrela en el celular
Publica o comparte la app desde Claude, abre el enlace en el celular y agrégala a la pantalla de inicio:
- **iPhone (Safari):** Compartir → *Agregar a pantalla de inicio*. Ábrela desde el ícono y crea ahí tu PIN.
- **Android (Chrome):** menú ⋮ → *Agregar a pantalla principal*.

---

## Qué ya trae la plantilla (común a todos)

- **La prueba:** domingo 8 de noviembre de 2026; abren a las 7:15 a. m., inicia a las 8:00 a. m. y cierran puertas a las 8:30 a. m. El mínimo aprobatorio es **70,00**.
- **Resumen de la Guía de Orientación:** pesos de cada modalidad, formato de las preguntas, documentos, qué llevar, hoja de respuestas y reclamaciones.
- **Banco común de 77 preguntas** (11 casos tipo examen):
  - Constitución;
  - CPACA y derecho de petición;
  - PQRSF;
  - disciplinario y ética;
  - estructura y misionalidad de la DIAN;
  - evasión, elusión y contrabando;
  - razonamiento matemático.
- **17 afirmaciones comportamentales y de integridad**, en escala de 4 niveles.

## Qué agrega Claude con tus documentos

- Tu empleo, tu OPEC y tus **ejes oficiales**.
- **Preguntas de tus ejes**, la mayoría casos de juicio situacional basados en tus funciones esenciales y tu nivel, con la justificación de cada opción y la norma que la sustenta.

## Qué trae la app

- **Bloqueo con PIN** de 4 dígitos. Solo se guarda cifrado en tu dispositivo.
- **Inicio:** cuenta regresiva, tus aciertos y los ejes que más debes reforzar.
- **Practicar:**
  - casos tipo examen;
  - simulacro de tu cargo y simulacro general, cronometrados;
  - práctica rápida;
  - repaso de errores;
  - práctica por eje.
- **Resultados** de 0 a 100 con dos decimales truncados, frente al mínimo de 70,00.
- **Progreso por eje** e historial de simulacros.
- Diseño minimalista con modo claro y oscuro.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| [`plantilla.html`](plantilla.html) | La app DIAN 2676 con todo lo común. Solo le faltan tu empleo y tus preguntas. |
| [`PROMPT.md`](PROMPT.md) | El prompt detallado para completarla en Claude, con el marco normativo común y preguntas frecuentes. |
| [`index.html`](index.html) | Ejemplo completo: Analista II, con 200 preguntas en 9 ejes. Si compartes ejes con él, puedes adjuntarlo para reutilizar preguntas. |

<details>
<summary><b>Para quien sabe programar</b></summary>

La app es un solo archivo HTML, sin frameworks ni proceso de build. Lo que cambia entre empleos está en dos bloques del `<script>`:

- `CONFIG`: `clave`, `cargo`, `opec` y `ejes` cambian por empleo. `examen`, `minimo` y `guia` son comunes al proceso.
- `Q`: el banco de preguntas. Primero va el banco común y luego las preguntas del empleo.

```js
{t:"Eje", q:"Enunciado", o:["Correcta","Distractor","Distractor"], a:0, e:"Explicación", r:"Norma"}
{t:"Eje", p:1, cs:"Caso", q:"Enunciado…", o:[…3], a:0, j:[…3 justificaciones], r:"Norma"}
{t:COMP, lk:1, k:"Competencia", q:"Afirmación"}
```

La clave correcta va siempre en la posición 0 y la app baraja las opciones al mostrarlas. Las preguntas nuevas se agregan al final, para no alterar el progreso guardado en `localStorage` bajo `simulacro<clave>`.

`plantilla.html` está en formato de Artifact de Claude: sin `<!doctype>`, porque el visor agrega la estructura del documento. `index.html` es un documento completo que se puede publicar en cualquier hosting estático.
</details>

## Aviso

Las preguntas son originales y se redactan a partir de normas públicas vigentes al corte de la guía (19 de junio de 2026). Las pruebas de la CNSC son reservadas (Ley 909 de 2004, art. 31) y no se reproducen aquí. Lo que genere una IA puede tener errores, sobre todo en plazos y cifras: compáralo siempre con la norma.
