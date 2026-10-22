# Prompt: crea tu simulador de concurso CNSC dentro de Claude

Con este prompt, Claude te arma **tu propio simulador** de la prueba escrita, adaptado a tu cargo, como una app que abres desde el celular. No necesitas saber programar ni tener hosting: todo pasa dentro de Claude.

## Antes de empezar: reúne 4 archivos

| # | Archivo | Dónde lo consigues |
|---|---|---|
| 1 | **`plantilla.html`** | En este repositorio: abre [plantilla.html](plantilla.html) y toca **Download raw file** (ícono de descarga, arriba a la derecha). |
| 2 | **Manual de funciones de tu cargo** | La ficha del MERF o del manual específico de tu entidad, en PDF o en pantallazo. Suele estar en SIMO, en el detalle de tu empleo. |
| 3 | **Indicadores o ejes de tu empleo** | En la página del operador del concurso, con tu número de inscripción (la Guía de Orientación trae el enlace). Pantallazo o texto copiado. |
| 4 | **Guía de Orientación al Aspirante** | PDF publicado en SIMO o en cnsc.gov.co, en la convocatoria de tu proceso. Si aún no existe, sigue sin ella. |

## Pasos

1. Entra a [claude.ai](https://claude.ai) y abre una **conversación nueva**.
2. **Adjunta los 4 archivos** con el clip.
3. Copia el prompt del bloque de abajo, **llena tus datos** donde dice `[ ]` y envíalo.
4. Claude primero te muestra un resumen de tu cargo y un plan de preguntas. **Revísalo y responde "Confirmo"**, o corrige lo que esté mal.
5. Claude crea la app por bloques. Cuando termine un bloque, escribe **"Continúa"** hasta completar el banco.
6. Al final, abre la app, toca **Publicar** o **Compartir** para obtener el enlace y ábrelo en el celular. Luego agrégala a la pantalla de inicio:
   - **iPhone (Safari):** Compartir → *Agregar a pantalla de inicio*. Ábrela desde el ícono y crea ahí tu PIN.
   - **Android (Chrome):** menú ⋮ → *Agregar a pantalla principal*.

---

```text
Actúa como experto en concursos de mérito de la CNSC (Colombia), en pruebas de juicio
situacional y en desarrollo web. Vas a crear MI SIMULADOR DE ESTUDIO para la prueba escrita,
usando la plantilla HTML adjunta, y lo vas a entregar como un Artifact HTML (una app que
pueda abrir en el celular).

ARCHIVOS ADJUNTOS
1. plantilla.html: la app ya construida (diseño, PIN, pestañas, simulacros, progreso y
   guía). Solo le faltan mis datos y mis preguntas.
2. Manual de funciones de mi cargo.
3. Indicadores o ejes oficiales de mi empleo.
4. Guía de Orientación al Aspirante (si no la adjunto, no inventes sus datos).

MIS DATOS
- Proceso de selección: [ej.: Distrito Capital 6 / DIAN 2676]
- Entidad: [ej.: Secretaría de Hacienda de Bogotá]
- Denominación, código y grado del empleo: [ej.: Técnico Operativo 314-05]
- Nivel jerárquico: [Asistencial / Técnico / Profesional]
- OPEC o número de empleo: [ej.: 123456]
- Modalidad: [Ingreso / Ascenso]
- Fecha y hora de la prueba: [ej.: domingo 8 de noviembre de 2026, 8:00 a. m.]
- Total de preguntas que quiero: [150 a 200] más [15 a 20] afirmaciones comportamentales

======================================================================
FASE 1: ANÁLISIS (no escribas código todavía)
======================================================================
Lee los adjuntos y muéstrame:
1. Propósito del empleo y funciones esenciales, numeradas.
2. Competencias funcionales y comportamentales del manual, con su nivel.
3. La lista EXACTA de ejes o indicadores, copiada tal cual del documento.
4. De la guía: pruebas que se aplican, carácter, pesos para MI nivel y modalidad,
   puntaje mínimo aprobatorio, formato de los ítems, horario, cierre de puertas,
   documentos válidos, elementos permitidos, reglas de la hoja de respuestas, plazos de
   reclamación y fecha de corte normativo.
5. Una tabla "eje → normas y temas que cubre → número de preguntas", repartiendo más
   preguntas en los ejes más ligados a las funciones esenciales. Si hay un eje de
   razonamiento matemático o de cálculo, inclúyelo con casos numéricos del cargo.
Si falta algún dato o algo es ambiguo, pregúntame. Marca como "no especificado" lo que no
esté en los documentos. Espera a que yo escriba "Confirmo" antes de pasar a la fase 2.

======================================================================
FASE 2: CONSTRUCCIÓN DE LA APP
======================================================================
REGLA DE ORO: no cambies el diseño, el CSS ni la lógica de la plantilla. Solo vas a
reemplazar dos bloques del <script>: CONFIG y el arreglo Q. Todo lo demás se copia igual,
para que la app funcione desde el primer intento.

A) BLOQUE CONFIG: reemplaza cada valor entre [CORCHETES]:
   - clave: identificador corto y único, por ejemplo los dígitos de la OPEC. No lo cambies
     después, porque de él dependen el PIN y el progreso guardados.
   - marca (2 o 3 caracteres), titulo, proceso, entidad (con artículo), cargo, opec.
   - examen: "AAAA-MM-DD". examenTexto: "Domingo 8 de noviembre · inicia 8:00 a. m. ·
     puertas cierran 8:30 a. m.", con los datos de la guía.
   - minimo: el puntaje mínimo aprobatorio de la guía (por lo general, 70).
   - ejes: la lista EXACTA de mis ejes oficiales. Si hay ejes comportamentales o de
     integridad (por ejemplo "Adaptabilidad nivel 2" u "Honestidad"), NO van aquí: se
     practican con las afirmaciones Likert.
   - guiaFuente y guia: 6 secciones (Cómo se califica, Formato de las preguntas, Día del
     examen, Qué llevar, Hoja de respuestas, Resultados y reclamaciones), con viñetas
     cortas basadas SOLO en la guía adjunta. Puedes usar <b> para resaltar cifras.

B) ARREGLO Q: el banco de preguntas. Borra las 3 preguntas de ejemplo y usa EXACTAMENTE
   estos tres formatos (la clave correcta SIEMPRE en la posición 0, a:0; la app baraja
   las opciones al mostrarlas):

   1) Pregunta directa:
   {t:"<eje exacto>",q:"enunciado",o:["correcta","distractor","distractor"],a:0,
    e:"explicación breve de por qué",r:"Ley 1437/2011 art. 69"}

   2) Caso tipo examen (juicio situacional, como la CNSC). Al menos el 40% del banco:
   {t:"<eje exacto>",p:1,cs:"caso: situación hipotética realista del cargo",
    q:"enunciado en frase incompleta, ej.: Con base en lo anterior, al técnico le corresponde",
    o:["opción en minúscula terminada en punto.","…","…"],a:0,
    j:["Correcta. Por qué, con la norma…","Incorrecta. Por qué…","Incorrecta. Por qué…"],
    r:"referencia normativa"}

   3) Afirmación comportamental o de integridad (sin respuesta correcta):
   {t:COMP,lk:1,k:"<competencia o valor>",q:"afirmación en primera persona"}

   Termina el arreglo con: ].map((x,i)=>({...x,id:i}));

CALIDAD DE LAS PREGUNTAS
- El campo t debe ser IDÉNTICO a uno de CONFIG.ejes. Usa otro texto solo para temas de
  apoyo (Constitución, CPACA y similares), que la app muestra en "Otros temas de apoyo".
- Los casos reflejan MIS funciones esenciales y MI nivel: un asistencial atiende, radica y
  organiza; un técnico apoya, verifica, documenta y reporta; un profesional analiza,
  proyecta y decide.
- Las tres opciones deben ser plausibles. Los distractores son errores típicos de alguien
  que conoce el tema a medias, nunca absurdos evidentes.
- Cada justificación explica por qué la opción es correcta o incorrecta en ESE caso, con
  la norma que lo sustenta.
- En las preguntas de cálculo, usa números que se puedan operar a mano (en la prueba no se
  permite calculadora). Los distractores deben ser los errores de cálculo más comunes, y la
  explicación debe mostrar el paso a paso.
- Las afirmaciones Likert llevan una tensión o costo ("…aunque me tome más tiempo"). Cubre
  todas las competencias comportamentales del manual y los valores del Código de
  Integridad: honestidad, respeto, compromiso, diligencia y justicia.

EXACTITUD (obligatorio)
- Usa solo normas vigentes y expedidas hasta la fecha de corte de la guía.
- Si no estás SEGURO de un artículo, un plazo, un porcentaje o una cifra, no lo uses:
  cambia la pregunta por otra de la que sí estés seguro.
- No uses la UVT ni el salario mínimo como valores fijos. Si los necesitas, escribe "use
  un valor de ejemplo de $X".
- No copies preguntas reales de la CNSC, que son reservadas. Todo debe ser original.
- No repitas enunciados.

CÓMO ENTREGAR (es un archivo largo)
- Bloque 1: crea el Artifact con la plantilla completa, CONFIG lleno y las primeras
  30 a 40 preguntas.
- Bloques siguientes: cada vez que escriba "Continúa", ACTUALIZA EL MISMO Artifact
  agregando 30 a 40 preguntas más AL FINAL del arreglo Q, sin borrar ni reordenar las
  anteriores. Al terminar cada bloque, dime cuántas llevas por eje.
- Si el Artifact se corta o deja de funcionar, avísame y repáralo antes de seguir.

======================================================================
FASE 3: CIERRE
======================================================================
1. Audita el banco completo: que cada clave sea correcta, que solo una opción sea
   defendible, que la cita normativa corresponda y que cada t coincida con un eje. Corrige
   y dime cuántas preguntas corregiste.
2. Muéstrame la tabla final: preguntas por eje, cuántas son casos y cuántas afirmaciones.
3. Recuérdame cómo publicar el Artifact y agregarlo a la pantalla de inicio del celular.
```

---

## Preguntas frecuentes

**¿Claude se detuvo a mitad del banco?**
Escribe "Continúa". Si dice que llegaste al límite de mensajes, vuelve más tarde y escribe "Continúa agregando preguntas al final del arreglo Q del Artifact".

**¿Quiero más preguntas de un eje?**
Escribe: *"Agrega 20 casos más del eje [nombre exacto] al final del arreglo Q, en el mismo Artifact."*

**¿Encontré una pregunta con un error?**
Escribe: *"La pregunta que empieza '[primeras palabras]' tiene un error: [explicación]. Corrígela sin cambiar su posición en el arreglo."*

**¿No me pide PIN o no guarda mi progreso?**
Algunos visores no permiten guardar datos. La práctica funciona igual, pero sin PIN ni historial. Abre el enlace publicado del Artifact en Safari o Chrome y agrégalo a la pantalla de inicio.

**¿Se borró mi progreso al actualizar la app?**
No se borra mientras la `clave` de CONFIG sea la misma y las preguntas nuevas se agreguen al final.

**¿Puedo ver un ejemplo terminado?**
Sí: [index.html](index.html) es el simulador completo de *Analista II · DIAN 2676*, con 200 preguntas en 9 ejes.

> Las preguntas que genere la IA pueden tener errores. Compara siempre con la norma vigente y con la información oficial en SIMO y cnsc.gov.co. Esta herramienta no está afiliada a la CNSC ni a ninguna entidad.
