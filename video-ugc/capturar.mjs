// Graba, cuadro por cuadro, las escenas de pantalla del video UGC usando la
// app real (landing y simulador de ejemplo). Requiere la web corriendo en
// local:  cd web && npx next dev -p 3100
// Uso:    node video-ugc/capturar.mjs [salida]   (por defecto video-ugc/build/frames)
// Genera un PNG por cuadro (1080x1920, 30 fps) y manifest.json con los toques.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../web/package.json"));
const { chromium } = require("@playwright/test");

const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const OUT = resolve(process.argv[2] || join(here, "build/frames"));
const FPS = 30;
// Tiempos compartidos con componer.py (TIEMPOS=gemini|hombre).
const T = JSON.parse(readFileSync(join(here, "tiempos", `${process.env.TIEMPOS || "hombre"}.json`), "utf8")).app;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, colorScheme: "light" });
// Azar fijo: la práctica rápida siempre abre el mismo caso de juicio situacional.
await page.addInitScript(() => {
  let s = 11;
  Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
});
const CLEAN = "nextjs-portal{display:none!important} *{animation:none!important;transition:none!important;scroll-behavior:auto!important}";

const manifest = { fps: FPS, frames: {}, taps: [] };
const frame = (t) => Math.round(t * FPS);
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
let last = null;

async function shot(f, scene) {
  const file = `f${String(f).padStart(4, "0")}.png`;
  await page.screenshot({ path: join(OUT, file) });
  manifest.frames[f] = { file, scene };
  last = file;
}
// La práctica abre en un diálogo a pantalla completa con su propio scroll
// ([data-scroll]); fuera de él se desplaza la ventana.
const scrollY = () => page.evaluate(() => (document.querySelector("[data-scroll]") || document.scrollingElement).scrollTop);
const scrollTo = (y) => page.evaluate((v) => ((document.querySelector("[data-scroll]") || document.scrollingElement).scrollTop = v), y);
const docTop = async (loc) => (await loc.boundingBox()).y + (await scrollY());

// Mantiene la pantalla quieta entre t0 y t1 (un solo PNG reutilizado).
async function hold(t0, t1, scene) {
  await shot(frame(t0), scene);
  for (let f = frame(t0) + 1; f < frame(t1); f++) manifest.frames[f] = { file: last, scene };
}
// Desplazamiento suave real de la página entre t0 y t1.
async function scroll(from, to, t0, t1, scene) {
  for (let f = frame(t0); f < frame(t1); f++) {
    const x = (f - frame(t0)) / Math.max(1, frame(t1) - frame(t0) - 1);
    await scrollTo(from + (to - from) * ease(x));
    await shot(f, scene);
  }
}
// Toque real sobre el elemento: se registra dónde y cuándo para dibujar el dedo.
async function tap(loc, t) {
  const bb = await loc.boundingBox();
  const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
  manifest.taps.push({ f: frame(t), x: x * 3, y: y * 3 });
  await page.mouse.click(x, y);
  await page.waitForTimeout(250);
}

async function open(path) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: CLEAN });
}

// ---- Escena 2a: landing de centrahoy.online, arriba del todo.
const [l0, l1] = T.landing;
await open("/");
await hold(l0, l1, "landing");

// ---- Escena 2b: simulador de ejemplo → Practicar → Práctica rápida.
const [e0, e1, e2, e3, e4] = T.ejemplo;
await open("/ejemplo");
const tabs = page.getByRole("tab", { name: /Practicar/ });
const s0 = (await docTop(tabs)) - 240;
await scrollTo(s0);
await hold(e0, e1, "ejemplo");
await tap(tabs, e1);
await hold(e1, e2, "ejemplo");
const rapida = page.getByRole("button", { name: /Práctica rápida/ });
const s1 = (await docTop(rapida)) - 300;
await scroll(s0, s1, e2, e3, "ejemplo");
await hold(e3, e4, "ejemplo");
await tap(rapida, e4);

// ---- Escena 3: caso, opciones, respuesta y explicación.
const [p0, p1, p2, p3, p4, p5, p6] = T.pregunta;
const caso = page.getByText("Caso", { exact: true });
const s2 = (await docTop(caso)) - 150;
await scrollTo(s2);
await hold(p0, p1, "pregunta");
const opts = page.locator("[role=radio]");
const s3 = (await docTop(opts.nth(0))) - 170;
await scroll(s2, s3, p1, p2, "pregunta");
await hold(p2, p3, "pregunta");
await tap(opts.nth(1), p3);
await hold(p3, p4, "pregunta");
const fb = page.getByText("Incorrecto", { exact: true });
const s4 = (await docTop(fb)) - 110;
await scroll(s3, s4, p4, p5, "explicacion");
await hold(p5, p6, "explicacion");

// ---- Escena 5: de vuelta a la landing.
const [f0, f1] = T.landing2;
await open("/");
await hold(f0, f1, "landing");

writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1));
await browser.close();
console.log(`Cuadros: ${Object.keys(manifest.frames).length} · toques: ${manifest.taps.length} · ${OUT}`);
