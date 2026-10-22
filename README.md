# Simulador de concurso CNSC

Crea **tu propio simulador de la prueba escrita** de un concurso de la CNSC, adaptado a tu cargo, **dentro de Claude**. No necesitas programar, instalar nada ni pagar hosting: le das a Claude tu manual de funciones y tus indicadores, y te entrega una app para practicar desde el celular.

> Herramienta de estudio independiente. No está afiliada a la CNSC, a ninguna entidad ni a los operadores de los concursos. Verifica siempre la información oficial en SIMO y en cnsc.gov.co.

**Ejemplo terminado:** [simulacro.centrahoy.online](https://simulacro.centrahoy.online), el simulador de *Analista II · DIAN 2676*.

---

## Cómo crear el tuyo en 5 pasos

### 1. Descarga la plantilla
Abre **[plantilla.html](plantilla.html)** y toca el botón **Download raw file** (ícono de descarga, arriba a la derecha del archivo).

### 2. Reúne tus documentos
- **Manual de funciones** de tu cargo (ficha del MERF), en PDF o en pantallazo.
- **Indicadores o ejes** de tu empleo: los consultas con tu número de inscripción en la página del operador del concurso.
- **Guía de Orientación al Aspirante** de tu proceso, en PDF, si ya está publicada.

### 3. Abre Claude y adjunta todo
Entra a [claude.ai](https://claude.ai), abre una conversación nueva y adjunta la plantilla y tus documentos.

### 4. Pega el prompt
Copia el prompt de **[PROMPT.md](PROMPT.md)**, llena tus datos donde dice `[ ]` y envíalo.
- Claude primero te muestra un resumen de tu cargo y el plan de preguntas por eje: revísalo y responde **"Confirmo"**.
- Luego crea la app por bloques. Escribe **"Continúa"** hasta completar el banco.

### 5. Ábrela en el celular
Publica o comparte la app desde Claude, abre el enlace en el celular y agrégala a la pantalla de inicio:
- **iPhone (Safari):** Compartir → *Agregar a pantalla de inicio*. Ábrela desde el ícono y crea ahí tu PIN.
- **Android (Chrome):** menú ⋮ → *Agregar a pantalla principal*.

---

## Qué trae la app

- **Bloqueo con PIN** de 4 dígitos. Solo se guarda cifrado en tu dispositivo.
- **Inicio:** cuenta regresiva para la prueba, tus aciertos y los ejes que más debes reforzar.
- **Practicar:**
  - casos tipo examen (caso, enunciado y 3 opciones, como la CNSC);
  - simulacro de tu cargo y simulacro general, cronometrados;
  - práctica rápida con explicación inmediata;
  - repaso de errores;
  - práctica por eje.
- **Comportamental e integridad:** afirmaciones con escala de 4 niveles, sin respuesta correcta, igual que en la prueba real.
- **Resultados** de 0 a 100, con dos decimales truncados, comparados con el puntaje mínimo aprobatorio.
- **Progreso por eje** e historial de simulacros.
- **Guía:** horarios, documentos, hoja de respuestas y reclamaciones, según tu guía.
- Diseño minimalista con modo claro y oscuro.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| [`plantilla.html`](plantilla.html) | La app vacía, lista para que Claude le agregue tus datos y tus preguntas. |
| [`PROMPT.md`](PROMPT.md) | El prompt detallado para crear tu simulador en Claude, con preguntas frecuentes. |
| [`index.html`](index.html) | Ejemplo completo: Analista II · DIAN 2676, con 200 preguntas en 9 ejes oficiales. |

<details>
<summary><b>Para quien sabe programar</b></summary>

La app es un solo archivo HTML, sin frameworks ni proceso de build. Lo que cambia entre cargos está en dos bloques del `<script>`:

- `CONFIG`: datos del cargo, fecha de la prueba, puntaje mínimo, ejes oficiales y resumen de la guía.
- `Q`: el banco de preguntas, con tres formatos:

```js
{t:"Eje", q:"Enunciado", o:["Correcta","Distractor","Distractor"], a:0, e:"Explicación", r:"Norma"}
{t:"Eje", p:1, cs:"Caso", q:"Enunciado…", o:[…3], a:0, j:[…3 justificaciones], r:"Norma"}
{t:COMP, lk:1, k:"Competencia", q:"Afirmación"}
```

La clave correcta va siempre en la posición 0 y la app baraja las opciones al mostrarlas. Las preguntas nuevas se agregan al final, para no alterar el progreso guardado, que va en `localStorage` bajo `simulacro<clave>`.

`plantilla.html` está en formato de Artifact de Claude: sin `<!doctype>`, porque el visor agrega la estructura del documento. `index.html` es un documento completo que se puede publicar como sitio estático en cualquier hosting.
</details>

## Aviso

Las preguntas son originales y se redactan a partir de normas públicas. Las pruebas de la CNSC son reservadas (Ley 909 de 2004, art. 31) y no se reproducen aquí. Lo que genere una IA puede tener errores: compáralo siempre con la norma vigente.
