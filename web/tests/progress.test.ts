import { readFileSync } from "fs";
import path from "path";
import vm from "vm";
import { describe, expect, it } from "vitest";
import { assembleSimulator } from "@/lib/simulator/assemble";
import { injectProgressSync } from "@/lib/simulator/progress";

const template = readFileSync(path.join(__dirname, "../lib/simulator/plantilla.html"), "utf8");
const sim = assembleSimulator(template, { opec: "236762", cargo: "Gestor", ejes: [], questions: [] });

function fakeEnv(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const sent: string[] = [];
  const timers: (() => void)[] = [];
  const ctx = {
    localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, String(v)), removeItem: (k: string) => store.delete(k) },
    navigator: { sendBeacon: (_u: string, b: { text: string }) => (sent.push(b.text), true) },
    Blob: class { text: string; constructor(parts: string[]) { this.text = parts.join(""); } },
    fetch: (_u: string, o: { body: string }) => (sent.push(o.body), Promise.resolve()),
    setTimeout: (fn: () => void) => (timers.push(fn), timers.length),
    clearTimeout: () => {},
    addEventListener: () => {},
    document: { addEventListener: () => {}, visibilityState: "visible" },
    JSON, Number, String, Date,
  } as Record<string, unknown>;
  ctx.window = ctx;
  return { ctx, store, sent, flush: () => timers.splice(0).forEach((f) => f()) };
}

function bootScript(html: string) {
  const i = html.indexOf("<script>(function(){");
  return html.slice(i + 8, html.indexOf("</script>", i));
}

describe("sincronización del progreso", () => {
  it("agrega el gancho en put() y el arranque antes del script de la app", () => {
    const html = injectProgressSync(sim, { generationId: "g1", ns: "simulacro236762", stats: null, history: null, updatedAt: null });
    expect(html).toContain("function put(k,v){try{window.__s2676Sync");
    expect(html.indexOf("window.__S2676")).toBeLessThan(html.indexOf("const CONFIG="));
    const main = html.slice(html.lastIndexOf("<script>") + 8, html.lastIndexOf("</script>"));
    expect(() => new vm.Script(main)).not.toThrow();
  });

  it("carga en el dispositivo la copia del servidor si es más reciente", () => {
    const html = injectProgressSync(sim, { generationId: "g1", ns: "simulacro236762", stats: { "5": { s: 1, c: 1 } }, history: [{ s: 80 }], updatedAt: "2026-10-22T10:00:00Z" });
    const env = fakeEnv({ "simulacro236762:sync": String(Date.parse("2026-10-21T10:00:00Z")), "simulacro236762:v1": "{}" });
    vm.runInNewContext(bootScript(html), env.ctx);
    expect(JSON.parse(env.store.get("simulacro236762:v1")!)).toEqual({ "5": { s: 1, c: 1 } });
    expect(JSON.parse(env.store.get("simulacro236762:hist")!)).toEqual([{ s: 80 }]);
  });

  it("no pisa progreso local más nuevo y envía los cambios al guardar", () => {
    const html = injectProgressSync(sim, { generationId: "g1", ns: "simulacro236762", stats: { old: 1 }, history: [], updatedAt: "2026-10-20T10:00:00Z" });
    const env = fakeEnv({ "simulacro236762:sync": String(Date.parse("2026-10-21T10:00:00Z")), "simulacro236762:v1": '{"local":1}' });
    vm.runInNewContext(bootScript(html), env.ctx);
    expect(env.store.get("simulacro236762:v1")).toBe('{"local":1}');
    (env.ctx.__s2676Sync as (k: string) => void)("simulacro236762:pin"); // otras llaves no se sincronizan
    env.flush();
    expect(env.sent).toHaveLength(0);
    (env.ctx.__s2676Sync as (k: string) => void)("simulacro236762:v1");
    env.flush();
    expect(JSON.parse(env.sent[0])).toEqual({ stats: { local: 1 }, history: [] });
  });

  it("si la plantilla no tiene la marca esperada, sirve el HTML sin cambios", () => {
    expect(injectProgressSync("<html>sin app</html>", { generationId: "g", ns: "n", stats: null, history: null, updatedAt: null })).toBe("<html>sin app</html>");
  });
});
