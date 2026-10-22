// Copia ../plantilla.html (fuente de verdad del simulador, editable en la raíz
// del repo) a lib/simulator/plantilla.html (archivo descargable), extrae los
// bancos que usa el simulador integrado (lib/simulator/data) y genera desde
// ../index.html la copia personal de /mi-simulador.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { toPersonal } from "./demo-transform.mjs";
import { extract } from "./extract-banks.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
copyFileSync(path.join(here, "../../plantilla.html"), path.join(here, "../lib/simulator/plantilla.html"));
const example = readFileSync(path.join(here, "../../index.html"), "utf8");
for (const [dir, html] of [["mi-simulador", toPersonal(example)]]) {
  mkdirSync(path.join(here, `../public/${dir}`), { recursive: true });
  writeFileSync(path.join(here, `../public/${dir}/index.html`), html);
}
const { base, demo } = extract();
writeFileSync(path.join(here, "../lib/simulator/data/base.json"), JSON.stringify(base));
writeFileSync(path.join(here, "../lib/simulator/data/demo.json"), JSON.stringify(demo));
console.log("Sincronizados: lib/simulator/plantilla.html, lib/simulator/data (bancos) y public/mi-simulador (personal)");
