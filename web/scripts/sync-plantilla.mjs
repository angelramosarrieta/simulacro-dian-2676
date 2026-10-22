// Copia ../plantilla.html (fuente de verdad del simulador, editable en la raíz
// del repo) a lib/simulator/plantilla.html, que es la que empaqueta la app.
import { copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
copyFileSync(path.join(here, "../../plantilla.html"), path.join(here, "../lib/simulator/plantilla.html"));
// El ejemplo publicado en /ejemplo.
copyFileSync(path.join(here, "../../index.html"), path.join(here, "../public/ejemplo/index.html"));
console.log("plantilla.html e index.html sincronizados (lib/simulator/ y public/ejemplo/)");
