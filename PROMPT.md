# Prompt: crea tu simulador DIAN 2676 dentro de Claude

Este prompt es para aspirantes del **Proceso de Selección DIAN 2676** (CNSC). En este concurso la guía y el marco normativo son iguales para todos, y la plantilla ya los trae:

- fecha y horario de la prueba;
- mínimo aprobatorio de 70,00;
- pesos de cada modalidad;
- resumen de la Guía de Orientación al Aspirante;
- un **banco común de 77 preguntas y 17 afirmaciones comportamentales**: Constitución, CPACA, peticiones, disciplinario, estructura y misionalidad de la DIAN, razonamiento matemático, comportamentales e integridad.

**Lo único que cambia entre aspirantes es tu manual de funciones y tus indicadores.** Con ellos, Claude completa la app con las preguntas propias de tu empleo. No necesitas programar ni tener hosting.

## Antes de empezar: reúne 3 archivos

| # | Archivo | Dónde lo consigues |
|---|---|---|
| 1 | **`plantilla.html`** | En este repositorio: abre [plantilla.html](plantilla.html) y toca **Download raw file** (ícono de descarga, arriba a la derecha). |
| 2 | **Manual de funciones de tu empleo** | La ficha del MERF (Resolución DIAN 067 de 2024) de tu empleo, en PDF o en pantallazo. |
| 3 | **Tus indicadores** | En la consulta de indicadores del operador, con tu número de inscripción. El enlace está en la sección 4.3 de la Guía de Orientación. Toma un pantallazo de la lista completa. |

*Opcional:* [`index.html`](index.html), el ejemplo de Analista II. Si tu empleo comparte ejes con él (fiscalización, liquidación de impuestos, normativa cambiaria, LA/FT o gestión documental), Claude puede reutilizar esas preguntas.

## Pasos

1. Entra a [claude.ai](https://claude.ai) y abre una **conversación nueva**.
2. **Adjunta los archivos** con el clip.
3. Copia el prompt del bloque de abajo, **llena tus datos** donde dice `[ ]` y envíalo.
4. Claude te muestra el análisis de tu empleo y el plan de preguntas. Revísalo y responde **"Confirmo"**.
5. Claude crea la app por bloques. Escribe **"Continúa"** hasta terminar.
6. Publica o comparte el Artifact, abre el enlace en el celular y agrégalo a la pantalla de inicio:
   - **iPhone (Safari):** Compartir → *Agregar a pantalla de inicio*. Ábrela desde el ícono y crea ahí tu PIN.
   - **Android (Chrome):** menú ⋮ → *Agregar a pantalla principal*.

---

```text
Actúa como experto en el concurso DIAN 2676 de la CNSC, en pruebas de juicio situacional y
en desarrollo web. Vas a completar MI SIMULADOR DE ESTUDIO para la prueba escrita usando la
plantilla HTML adjunta, y lo vas a entregar como un Artifact HTML que pueda abrir en el
celular.

ARCHIVOS ADJUNTOS
1. plantilla.html: la app completa del proceso DIAN 2676. Ya trae TODO lo común a los
   aspirantes: fecha y horario, mínimo aprobatorio, pesos por modalidad, resumen de la
   guía y un banco común de preguntas. Solo le faltan los datos de mi empleo y las
   preguntas de mis ejes.
2. El manual de funciones de mi empleo (ficha del MERF).
3. Mis indicadores, de la consulta del operador.
4. (Opcional) index.html: un ejemplo terminado para Analista II, del que puedes
   reutilizar preguntas.

MIS DATOS
- Denominación, código y grado: [ej.: Gestor I 301-01]
- Nivel jerárquico: [Asistencial / Técnico / Profesional]
- OPEC o número de empleo: [ej.: 236762]
- Modalidad: [Ingreso / Ascenso]
- Total de preguntas que quiero: [200] (incluidas las del banco común)

MARCO NORMATIVO DE REFERENCIA DIAN 2676 (común a todos los empleos)
Corte normativo de la guía: solo normas vigentes y expedidas hasta el 19 de junio de 2026.
- Constitución Política de 1991.
- Estatuto Tributario (Decreto 624 de 1989) y DUR tributario 1625 de 2016.
- Régimen de aduanas: Decreto 1165 de 2019. Régimen sancionatorio y de decomiso: Decreto 920 de 2023.
- Régimen cambiario: Ley 9 de 1991, Resolución Externa 1 de 2018 de la Junta Directiva del
  Banco de la República y Decreto 2245 de 2011 (régimen sancionatorio cambiario a cargo de la DIAN).
- Estructura de la DIAN: Decreto 1742 de 2020. Manual de funciones: Resolución DIAN 067 de 2024.
- Carrera DIAN: Decreto Ley 927 de 2023 (el Decreto 1083 de 2015 se aplica en lo no regulado).
- Procedimiento administrativo: Ley 1437 de 2011 (CPACA). Derecho de petición: Ley 1755 de 2015.
- Transparencia: Ley 1712 de 2014. Archivos: Ley 594 de 2000 y normas del AGN.
- Disciplinario: Ley 1952 de 2019, modificada por la Ley 2094 de 2021. Anticorrupción: Ley 1474 de 2011.
- MIPG: Decreto 1499 de 2017. Código de Integridad del servicio público.
- LA/FT: Ley 526 de 1999 (UIAF) y Código Penal (lavado de activos, contrabando, delitos tributarios).
Usa estas normas como base. Si un indicador mío necesita otra norma, menciónala en la
fase 1 para que yo la vea.

======================================================================
FASE 1: ANÁLISIS (no escribas código todavía)
======================================================================
Muéstrame:
1. Propósito del empleo y funciones esenciales, numeradas.
2. Competencias funcionales y comportamentales del manual, con su nivel.
3. Mis indicadores separados en dos grupos:
   a) Ejes de conocimiento: van a CONFIG.ejes.
   b) Comportamentales y de integridad (por ejemplo "ADAPTABILIDAD NIVEL 2" o
      "HONESTIDAD"): se practican con las afirmaciones Likert y NO van a CONFIG.ejes.
4. Una tabla "mi eje → tema equivalente del banco común (si existe) → normas →
   preguntas que ya cubre el banco común → preguntas nuevas a crear".
   - Si un eje mío equivale a un tema del banco común (aunque cambien las mayúsculas o
     las tildes, por ejemplo "RAZONAMIENTO MATEMATICO" y "Razonamiento matemático"),
     usa en CONFIG.ejes el nombre EXACTO del banco común, para que esas preguntas cuenten
     en mi eje.
   - Reparte las preguntas nuevas dando más peso a los ejes ligados a mis funciones
     esenciales, hasta llegar al total que pedí.
   - Si adjunté index.html, señala qué ejes del ejemplo coinciden con los míos y cuántas
     preguntas se pueden reutilizar.
5. Las normas que usarás para cada eje.
Si algo falta o es ambiguo, pregúntame. Espera a que escriba "Confirmo".

======================================================================
FASE 2: CONSTRUCCIÓN
======================================================================
REGLA DE ORO: copia la plantilla COMPLETA y no cambies el diseño, el CSS, la lógica, la
guía ni el banco común. Solo haces dos cosas:

A) En CONFIG, reemplaza ÚNICAMENTE estos 4 campos:
   - clave: mi OPEC. No la cambies después: de ella dependen el PIN y el progreso.
   - cargo: la denominación de mi empleo.
   - opec: mi OPEC.
   - ejes: mis ejes de conocimiento, con los nombres decididos en la fase 1.
   No toques examen, examenTexto, minimo, guia ni los demás campos: son comunes a todos.

B) En el arreglo Q, CONSERVA todas las preguntas del banco común y AGREGA AL FINAL (justo
   antes de "].map((x,i)=>({...x,id:i}));") las preguntas de mis ejes, con estos formatos.
   La clave correcta va SIEMPRE en la posición 0 (a:0); la app baraja las opciones.

   1) Caso tipo examen (juicio situacional). Al menos el 50% de las preguntas nuevas:
   {t:"<eje exacto>",p:1,cs:"caso: situación hipotética realista de MI empleo",
    q:"enunciado en frase incompleta, ej.: Con base en lo anterior, al gestor le corresponde",
    o:["opción en minúscula terminada en punto.","…","…"],a:0,
    j:["Correcta. Por qué, con la norma…","Incorrecta. Por qué…","Incorrecta. Por qué…"],
    r:"ET art. 714"}

   2) Pregunta directa:
   {t:"<eje exacto>",q:"enunciado",o:["correcta","distractor","distractor"],a:0,
    e:"explicación breve",r:"Ley 1437/2011 art. 69"}

   3) Si mis competencias comportamentales tienen algo que el banco común no cubre,
   agrega afirmaciones Likert:
   {t:COMP,lk:1,k:"<competencia>",q:"afirmación en primera persona con una tensión o costo"}

   Si adjunté index.html, puedes copiar TAL CUAL las preguntas del ejemplo cuyo eje
   coincida con uno mío, ajustando solo el campo t.

CALIDAD
- t debe ser IDÉNTICO a un elemento de CONFIG.ejes.
- Los casos reflejan MIS funciones esenciales y MI nivel: un asistencial atiende, radica
  y organiza; un técnico apoya, verifica, documenta y reporta; un profesional analiza,
  proyecta, decide y sustancia.
- Las 3 opciones deben ser plausibles: los distractores son errores típicos de quien
  conoce el tema a medias.
- Cada justificación explica por qué la opción es correcta o incorrecta en ESE caso, con
  la norma.
- En los cálculos, usa números operables a mano (no hay calculadora en la prueba) y
  muestra el paso a paso.

EXACTITUD (obligatorio)
- Usa solo normas del marco de referencia o las que aprobé en la fase 1, vigentes al 19
  de junio de 2026.
- Si no estás SEGURO de un artículo, un plazo, un porcentaje o una cifra, no lo uses:
  cambia la pregunta.
- No uses la UVT ni el salario mínimo como valores fijos. Escribe "use un valor de
  ejemplo de $X".
- No copies preguntas reales de la CNSC, que son reservadas. No repitas enunciados.

ENTREGA POR BLOQUES (el archivo es largo)
- Bloque 1: crea el Artifact con la plantilla completa, los 4 campos de CONFIG llenos y
  las primeras 30 a 40 preguntas nuevas al final de Q.
- Cada vez que escriba "Continúa", ACTUALIZA EL MISMO Artifact agregando 30 a 40
  preguntas más AL FINAL de Q, sin borrar ni reordenar nada. Dime cuántas llevas por eje.
- Si el Artifact se rompe o se corta, repáralo antes de seguir.

======================================================================
FASE 3: CIERRE
======================================================================
1. Audita las preguntas NUEVAS: clave correcta, una sola opción defendible, cita normativa
   que corresponda y t igual a un eje. Corrige y dime cuántas corregiste.
2. Muéstrame la tabla final: preguntas por eje (banco común + nuevas), cuántas son casos
   y cuántas afirmaciones Likert.
3. Recuérdame cómo publicar el Artifact y agregarlo a la pantalla de inicio del celular.
```

---

## Preguntas frecuentes

**¿Claude se detuvo a mitad del banco?**
Escribe "Continúa". Si llegaste al límite de mensajes, vuelve más tarde y escribe "Continúa agregando preguntas al final del arreglo Q del Artifact".

**¿Quiero más preguntas de un eje?**
Escribe: *"Agrega 20 casos más del eje [nombre exacto] al final del arreglo Q, en el mismo Artifact."*

**¿Encontré una pregunta con un error?**
Escribe: *"La pregunta que empieza '[primeras palabras]' tiene un error: [explicación]. Corrígela sin cambiar su posición en el arreglo."*

**¿No me pide PIN o no guarda mi progreso?**
Algunos visores no permiten guardar datos. La práctica funciona igual. Abre el enlace publicado del Artifact en Safari o Chrome y agrégalo a la pantalla de inicio.

**¿Sirve para otro concurso que no sea DIAN 2676?**
Sí, pero tendrías que pedirle a Claude que también cambie en CONFIG la fecha, el mínimo, la guía y el proceso, que reemplace el banco común con el de tu entidad y que use tu Guía de Orientación.

> Las preguntas que genere la IA pueden tener errores, sobre todo en plazos y cifras. Compáralas siempre con la norma vigente. Esta herramienta no está afiliada a la DIAN, la CNSC ni el operador del concurso.
