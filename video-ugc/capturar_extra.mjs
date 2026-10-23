// Capturas fijas del simulador de ejemplo para el video profesional:
// inicio (claro y oscuro), lista de Practicar y pestaña Progreso.
// Uso: node video-ugc/capturar_extra.mjs [salida]  (por defecto video-ugc/build/extra)
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../web/package.json"));
const { chromium } = require("@playwright/test");
const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const OUT = resolve(process.argv[2] || join(here, "build/extra"));
mkdirSync(OUT, { recursive: true });
// El encabezado del sitio deja de ser fijo: en una captura quieta su fondo
// translúcido dejaba ver el título de abajo como texto fantasma.
const CLEAN = "nextjs-portal{display:none!important} *{animation:none!important;transition:none!important} body > header, header.sticky{position:static!important}";

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const scheme of ["light", "dark"]) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, colorScheme: scheme });
  await page.goto(BASE + "/ejemplo", { waitUntil: "networkidle" });
  await page.addStyleTag({ content: CLEAN });
  const tabs = page.getByRole("tablist");
  await page.evaluate((y) => window.scrollTo(0, y), (await tabs.boundingBox()).y - 100);
  await page.screenshot({ path: join(OUT, `inicio_${scheme}.png`) });
  if (scheme === "light") {
    await page.getByRole("tab", { name: /Practicar/ }).click();
    await page.screenshot({ path: join(OUT, "practicar.png"), fullPage: true });
    await page.getByRole("tab", { name: /Progreso/ }).click();
    await page.screenshot({ path: join(OUT, "progreso.png") });
  }
  await page.close();
}
await browser.close();
console.log(OUT);
