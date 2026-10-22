# Simulacro DIAN 2676

Simulador de estudio para la **prueba escrita del concurso DIAN 2676 (CNSC)**. Es un solo archivo HTML, funciona en el celular y no necesita servidor ni instalar nada.

> Herramienta de estudio independiente. No está afiliada a la DIAN, la CNSC ni el operador del concurso. Verifica siempre la información oficial en SIMO y en cnsc.gov.co.

## Qué incluye

El ejemplo está hecho para el empleo **Analista II 202-02**, nivel técnico, de Fiscalización y liquidación.

- **200 preguntas calificables**, organizadas por los 9 ejes oficiales del empleo:
  - estructura organizacional de la DIAN;
  - gestión documental y trazabilidad;
  - LA/FT, ROS y denuncias;
  - liquidación de impuestos nacionales;
  - misionalidad de la DIAN;
  - normativa cambiaria;
  - obligaciones formales y sustanciales;
  - fiscalización y liquidación tributaria y aduanera;
  - razonamiento matemático.
- **Casos tipo examen** en formato de juicio situacional (caso, enunciado y 3 opciones), con la justificación de cada opción.
- **17 afirmaciones comportamentales y de integridad**, en escala Likert de 4 niveles y sin calificación, igual que en la prueba real.
- **Simulacros cronometrados**, con puntaje de 0 a 100 (dos decimales truncados) y comparación con el mínimo aprobatorio de 70,00.
- **Progreso por eje**, historial de simulacros y repaso de errores, guardados en el dispositivo.
- **Bloqueo con PIN local**: solo se guarda el hash del PIN.
- **Resumen de la Guía de Orientación al Aspirante**: calificación, horarios, documentos y hoja de respuestas.

## Usarlo en el celular

1. Abre la página publicada en el navegador del celular.
2. **iPhone (Safari):** botón Compartir → *Agregar a pantalla de inicio*.
   **Android (Chrome):** menú ⋮ → *Agregar a pantalla principal*.
3. La primera vez, crea tu PIN de 4 dígitos.

El progreso se guarda en ese navegador y en ese dispositivo.

## Crear tu propio simulador para tu cargo

Abre **[PROMPT.md](PROMPT.md)**, copia el prompt, pégalo en Claude y adjunta:

- el manual de funciones de tu cargo;
- tus indicadores o ejes, que consultas con tu número de inscripción en la página del operador;
- la Guía de Orientación al Aspirante de tu proceso.

Claude te entrega un `index.html` con tu banco de preguntas y esta misma interfaz.

## Publicarlo gratis

**Vercel**
1. Haz un fork de este repositorio y reemplaza `index.html` por el tuyo.
2. En [vercel.com](https://vercel.com) elige *Add New → Project*, importa tu repositorio y despliega.
   No necesitas configurar nada: es un sitio estático.

**GitHub Pages**
Ve a *Settings → Pages → Deploy from a branch → main / root*.

## Estructura

```
index.html   La app completa: estilos, banco de preguntas (const Q) y lógica
PROMPT.md    Prompt detallado para generar un simulador para cualquier cargo
README.md    Este archivo
```

### Formato de las preguntas

```js
// Pregunta directa
{t:"Eje", q:"Enunciado", o:["Correcta","Distractor","Distractor"], a:0, e:"Explicación", r:"Norma"}
// Caso tipo examen (PJS)
{t:"Eje", p:1, cs:"Caso", q:"Enunciado…", o:[…3], a:0, j:[…3 justificaciones], r:"Norma"}
// Afirmación comportamental (Likert)
{t:"Comportamental e integridad", lk:1, k:"Competencia", q:"Afirmación"}
```

La clave siempre va en la posición 0, y la app baraja las opciones al mostrarlas. Agrega las preguntas nuevas **al final** del arreglo para no perder el progreso guardado.

## Aviso

Las preguntas son originales y se redactaron a partir de normas públicas. Las pruebas de la CNSC son reservadas (Ley 909 de 2004, art. 31) y no se reproducen aquí. Pueden existir errores: compara siempre con la norma vigente.
