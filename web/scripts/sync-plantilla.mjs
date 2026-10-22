// Copia ../plantilla.html (fuente de verdad del simulador, editable en la raíz
// del repo) a lib/simulator/plantilla.html, que es la que empaqueta la app, y
// genera desde ../index.html la demostración de /ejemplo y la copia personal
// de /mi-simulador.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { toDemo, toPersonal } from "./demo-transform.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
copyFileSync(path.join(here, "../../plantilla.html"), path.join(here, "../lib/simulator/plantilla.html"));
const example = readFileSync(path.join(here, "../../index.html"), "utf8");
for (const [dir, html] of [["ejemplo", toDemo(example)], ["mi-simulador", toPersonal(example)]]) {
  mkdirSync(path.join(here, `../public/${dir}`), { recursive: true });
  writeFileSync(path.join(here, `../public/${dir}/index.html`), html);
}
console.log("Sincronizados: lib/simulator/plantilla.html, public/ejemplo (demo) y public/mi-simulador (personal)");
