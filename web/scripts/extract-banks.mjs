// Extrae de los HTML de la raíz los datos que usa el simulador integrado en la
// plataforma, para que plantilla.html siga siendo la fuente de verdad:
//   lib/simulator/data/base.json  ← plantilla.html: configuración común (fecha
//                                    de la prueba, guía…) y banco común.
//   lib/simulator/data/demo.json  ← index.html: el simulador de ejemplo completo.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const END = "].map((x,i)=>({...x,id:i}));";

/** Evalúa (en una caja aislada) el bloque CONFIG … Q de un simulador. */
export function readSimulator(html) {
  const start = html.indexOf("const CONFIG={");
  const end = html.indexOf(END);
  if (start < 0 || end < 0) throw new Error("No se encontró CONFIG o Q en el simulador");
  const code = html.slice(start, end) + "];\n({CONFIG, Q, COMP});";
  const { CONFIG, Q, COMP } = vm.runInNewContext(code, { Date }, { timeout: 2000 });
  return { config: CONFIG, questions: JSON.parse(JSON.stringify(Q)), comp: COMP };
}

const COMMON_KEYS = ["proceso", "entidad", "examen", "examenTexto", "minimo", "guiaFuente", "guia"];

export function extract(root = path.join(here, "../..")) {
  const base = readSimulator(readFileSync(path.join(root, "plantilla.html"), "utf8"));
  const demo = readSimulator(readFileSync(path.join(root, "index.html"), "utf8"));
  const config = Object.fromEntries(COMMON_KEYS.map((k) => [k, base.config[k]]));
  return {
    base: { comp: base.comp, config, common: base.questions },
    demo: { cargo: demo.config.cargo, opec: demo.config.opec, ejes: demo.config.ejes, questions: demo.questions },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { base, demo } = extract();
  writeFileSync(path.join(here, "../lib/simulator/data/base.json"), JSON.stringify(base));
  writeFileSync(path.join(here, "../lib/simulator/data/demo.json"), JSON.stringify(demo));
  console.log(`Banco común: ${base.common.length} preguntas · Ejemplo: ${demo.questions.length} preguntas (${demo.cargo})`);
}
