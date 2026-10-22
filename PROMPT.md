# Prompt para crear tu propio simulador de concurso CNSC

Copia todo lo que está dentro del bloque de abajo y pégalo en Claude (claude.ai), en una conversación nueva. En el mismo mensaje **adjunta tus documentos**:

1. **Manual de funciones de tu cargo**: la ficha del MERF o del manual específico, en PDF o en pantallazo.
2. **Tus indicadores o ejes temáticos**: la lista que te muestra el operador del concurso con tu número de inscripción. Puedes pegar el texto o enviar un pantallazo.
3. **Guía de Orientación al Aspirante** de tu proceso (PDF), si ya está publicada.

Antes de enviar, reemplaza lo que está entre `[CORCHETES]`.

---

```text
Actúa como experto en concursos de mérito de la CNSC (Colombia), en psicometría de pruebas
de juicio situacional y en desarrollo web. Vas a construir un SIMULADOR DE ESTUDIO para mi
prueba escrita, en un solo archivo HTML que funcione en el celular.

## 1. Mis datos
- Proceso de selección: [ej.: DIAN 2676 / Distrito Capital 4 / Territorial 2026]
- Entidad: [ej.: DIAN]
- Denominación del empleo: [ej.: Analista II]
- Código y grado: [ej.: 202-02]
- Nivel jerárquico: [Asistencial / Técnico / Profesional]
- Número de OPEC o empleo: [ej.: 236762]
- Modalidad: [Ingreso / Ascenso]
- Fecha y hora de la prueba: [ej.: domingo 8 de noviembre de 2026, 8:00 a. m.]
- Adjunto: (a) manual de funciones del cargo, (b) lista de indicadores o ejes a evaluar,
  (c) Guía de Orientación al Aspirante, si existe.

## 2. Antes de escribir código, analiza y muéstrame un resumen
1. Lee los documentos adjuntos y extrae:
   - el propósito del empleo y cada función esencial, numeradas;
   - las competencias funcionales y comportamentales del manual, con su nivel;
   - la lista EXACTA de indicadores o ejes, escrita tal cual aparece en el documento;
   - de la guía: tipos de prueba, carácter (eliminatoria o clasificatoria), pesos
     porcentuales para mi nivel y modalidad, puntaje mínimo aprobatorio, formato de los
     ítems, número de opciones, duración, horario, documentos y elementos permitidos,
     reglas de la hoja de respuestas y fecha de corte normativo.
2. Muéstrame una tabla "eje → normas y temas que cubre → número de preguntas planeadas".
   Reparte las preguntas según el peso real de cada eje para mi cargo: los ejes más ligados
   a las funciones esenciales llevan más preguntas.
3. Si falta un dato o hay ambigüedad, pregúntame antes de seguir. No inventes datos de la
   guía: si algo no está en los documentos, márcalo como "no especificado".

## 3. Banco de preguntas
Total: [200] preguntas calificables + [15-20] afirmaciones comportamentales.

### 3.1 Competencias funcionales (formato de juicio situacional, PJS)
Al menos el 40% en formato PJS completo, igual al de la CNSC:
- **Caso**: una situación hipotética realista del día a día del empleo, coherente con mis
  funciones esenciales y con mi nivel (un técnico apoya, verifica, documenta y reporta; un
  profesional analiza, proyecta y decide; un asistencial atiende, radica y organiza).
- **Enunciado**: una tarea en frase incompleta, por ejemplo "Con base en lo anterior, al
  técnico le corresponde".
- **3 opciones** (A, B, C) que completan el enunciado, empiezan en minúscula y terminan en
  punto. Solo una es la solución efectiva. Las otras dos deben ser plausibles: errores
  típicos de quien conoce el tema a medias, no absurdos evidentes.
- **Justificación de CADA opción**: por qué es correcta o incorrecta, citando la norma
  (ley, decreto, artículo) y conectándola con el caso, al estilo de los ejemplos de la guía.
El resto pueden ser preguntas directas de conocimiento aplicado, también con 3 opciones,
explicación y referencia normativa.

Si el eje es "Razonamiento matemático" o incluye cálculos (porcentajes, regla de tres,
liquidaciones, intereses, promedios ponderados, conversiones), crea casos numéricos del
contexto del cargo. Los distractores deben ser los errores de cálculo más comunes, y la
justificación debe mostrar el paso a paso. Recuerda que en la prueba no se permite
calculadora: usa números que se puedan operar a mano.

### 3.2 Reglas de exactitud (obligatorias)
- Usa SOLO normas vigentes y expedidas hasta la fecha de corte de la guía. Si no estás
  seguro de un artículo, un plazo o una cifra, NO lo uses: cambia la pregunta.
- No uses valores que cambian cada año (UVT, salario mínimo) como dato fijo. Si los
  necesitas, di "use un valor de ejemplo de $X".
- Cada pregunta lleva su referencia corta: "Ley 1437/2011 art. 69", "ET art. 714".
- No copies preguntas reales de la CNSC; son reservadas. Todo debe ser original.
- No repitas preguntas ni enunciados idénticos.
- Al terminar, haz una auditoría: revisa una por una que la clave sea correcta, que
  exactamente una opción sea defendible y que la cita normativa corresponda. Corrige lo
  que falle y dime cuántas corregiste.

### 3.3 Competencias comportamentales e integridad
Formato autoinforme con escala Likert de 4 niveles: "Totalmente en desacuerdo",
"En desacuerdo", "De acuerdo", "Totalmente de acuerdo". Sin respuesta correcta.
- Afirmaciones en primera persona, con un pequeño costo o tensión ("…aunque me tome más
  tiempo"), como en los ejemplos de la guía.
- Cubre cada competencia comportamental de mi manual y los valores del Código de
  Integridad (honestidad, respeto, compromiso, diligencia, justicia).
- Al responder, la app explica que no hay respuesta correcta y advierte que marcar casi
  todo "Totalmente de acuerdo" puede ser detectado por las escalas de control.

### 3.4 Formato de datos (dentro del HTML)
const Q = [
  // pregunta directa
  {t:"<eje exacto>", q:"enunciado", o:["A","B","C"], a:0, e:"explicación", r:"referencia"},
  // caso PJS
  {t:"<eje exacto>", p:1, cs:"caso", q:"enunciado incompleto",
   o:["opción a.","opción b.","opción c."], a:0,
   j:["justificación A","justificación B","justificación C"], r:"referencia"},
  // afirmación Likert
  {t:"Comportamental e integridad", lk:1, k:"<competencia o valor>", q:"afirmación"}
];
- "t" debe ser EXACTAMENTE uno de mis ejes oficiales; usa "Otros temas de apoyo" solo
  para contenido complementario.
- Escribe siempre la clave en la posición 0 ("a":0). La app baraja las opciones al
  mostrarlas, así que la respuesta correcta no queda siempre en la misma letra.
- A cada pregunta asígnale un "id" estable con su índice en el arreglo
  (Q.map((x,i)=>({...x,id:i}))). Agrega preguntas nuevas SIEMPRE al final, para no
  dañar el progreso guardado.

## 4. La aplicación (un solo archivo index.html)
Requisitos técnicos:
- HTML, CSS y JavaScript sin frameworks ni build. Solo se permiten fuentes de Google Fonts.
- Mobile-first (375 px), sin scroll horizontal, áreas táctiles de al menos 44 px,
  respetando las zonas seguras del iPhone (env(safe-area-inset-*)).
- Modo claro y oscuro automático (prefers-color-scheme), con colores en variables CSS.
- Todo lo que se guarda va en localStorage, envuelto en try/catch. Si el almacenamiento
  falla, la app debe seguir funcionando.
- Accesible: foco visible, etiquetas aria y prefers-reduced-motion.

Diseño: profesional, minimalista y sobrio. Fondo neutro, tipografía limpia (por ejemplo
Geist), un solo color de acento, bordes finos, sin emojis ni degradados llamativos.

Pantallas:
1. **Bloqueo con PIN**: la primera vez la persona crea un PIN de 4 dígitos y lo confirma;
   las siguientes veces lo ingresa, con un teclado numérico tipo app bancaria. Guarda
   solo el hash SHA-256 del PIN (crypto.subtle), nunca el PIN en texto. Incluye la opción
   "¿Olvidaste el PIN?", que restablece el PIN borrando el progreso, con confirmación
   dentro de la página (no uses alert ni confirm). Agrega un botón de candado para
   bloquear la app. Aclara en la pantalla que es un bloqueo local del dispositivo.
2. **Navegación con pestañas inferiores**: Inicio, Practicar, Progreso y Guía.
3. **Inicio**: cuenta regresiva de días hasta la prueba; botón principal "Simulacro de mi
   cargo"; indicadores de aciertos, preguntas vistas y preguntas por repasar; los 3 ejes
   con menos aciertos; el último resultado.
4. **Practicar**:
   - selector de tamaño del simulacro: 15, 30 o todas;
   - modos: Casos tipo examen (solo PJS), Simulacro de mi cargo (solo ejes oficiales),
     Simulacro general, Práctica rápida (10 al azar con retroalimentación inmediata),
     Comportamental e integridad (Likert) y Repasar mis errores;
   - lista de ejes oficiales con barra de avance; al tocar uno, se practica ese eje.
5. **Pantalla de pregunta**: barra superior con botón de salir, nombre del modo,
   "n de N" y cronómetro (1,5 minutos por pregunta en los simulacros); barra de progreso;
   bloques "Caso" y "Enunciado"; opciones A, B, C; botones fijos abajo.
   - En práctica: al responder, muestra si acertó, la clave y la justificación de la
     correcta y de la opción elegida.
   - En simulacro: no muestra respuestas hasta el final; permite navegar entre preguntas
     con una cuadrícula numerada.
6. **Resultado**: puntaje en escala de 0 a 100 con dos decimales truncados
   (Math.floor(aciertos*10000/total)/100); comparación con el mínimo aprobatorio de mi
   guía; desglose por eje; lista de preguntas falladas con su justificación; botón
   "Practicar las falladas". Guarda el resultado en un historial (máximo 20).
7. **Progreso**: aciertos por eje (barra roja si van por debajo del mínimo aprobatorio),
   historial de simulacros y opción de borrar el progreso, con confirmación.
8. **Guía**: resumen en secciones desplegables con cómo se califica (pesos de MI nivel y
   modalidad), formato de las preguntas, día del examen (horarios, cierre de puertas,
   permanencia mínima), qué llevar, hoja de respuestas, y resultados y reclamaciones.
   Solo con datos de la guía adjunta.

Incluye un aviso visible: "Herramienta de estudio independiente; no está afiliada a la
entidad, la CNSC ni el operador del concurso".

## 5. Entrega
1. Primero, el resumen del punto 2 y espera mi confirmación.
2. Luego, el archivo index.html completo. Si es muy largo, entrégalo por partes numeradas
   y dime exactamente cómo unirlas.
3. Al final, una tabla con el número de preguntas por eje, cuántas son PJS y el resultado
   de la auditoría.
4. Instrucciones cortas para publicarlo gratis (Vercel o GitHub Pages) y para instalarlo en
   el celular con "Agregar a pantalla de inicio".
```

---

## Consejos

- Si Claude se queda corto, pídele: *"Continúa con las preguntas del eje X hasta completar N"*.
- Para ampliar el banco después, pídele que **agregue las preguntas al final del arreglo** `Q`, así no se pierde tu progreso guardado.
- Revisa las preguntas de cálculo y de plazos contra la norma. Un error en el banco se aprende como verdad.
- Este repositorio trae un ejemplo completo para el cargo **Analista II (DIAN 2676)** en `index.html`.
