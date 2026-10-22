import { readFileSync } from "fs";
import path from "path";
import vm from "vm";
import { describe, expect, it } from "vitest";
import { assembleSimulator, jsLiteral } from "@/lib/simulator/assemble";
import type { TemplateQuestion } from "@/lib/generation/schemas";

const template = readFileSync(path.join(__dirname, "../lib/simulator/plantilla.html"), "utf8");

function extractQ(html: string) {
  const start = html.indexOf("const CONFIG=");
  const end = html.indexOf("].map((x,i)=>({...x,id:i}));") + "].map((x,i)=>({...x,id:i}));".length;
  const ctx: Record<string, unknown> = {};
  vm.runInNewContext(html.slice(start, end) + "\nthis.CONFIG=CONFIG; this.Q=Q;", ctx);
  return ctx as { CONFIG: { clave: string; cargo: string; opec: string; ejes: string[] }; Q: (TemplateQuestion & { id: number })[] };
}

describe("armado del simulador", () => {
  const questions: TemplateQuestion[] = [
    { t: "Fiscalización", p: 1, cs: "Caso con </script><script>alert(1)</script> y comillas \"dobles\"", q: "Enunciado", o: ["a.", "b.", "c."], a: 0, j: ["Correcta.", "Incorrecta.", "Incorrecta."], r: "ET art. 1" },
    { t: "Liquidación", q: "Directa\u2028con separador", o: ["x", "y", "z"], a: 0, e: "Explicación", r: "Ley 1" },
  ];
  const html = assembleSimulator(template, { opec: "236762", cargo: "Gestor I 301-01", ejes: ["Fiscalización", "Liquidación"], questions });

  it("llena CONFIG y agrega las preguntas después del banco común", () => {
    const { CONFIG, Q } = extractQ(html);
    expect(CONFIG).toMatchObject({ clave: "236762", cargo: "Gestor I 301-01", opec: "236762", ejes: ["Fiscalización", "Liquidación"] });
    expect(Q).toHaveLength(94 + 2);
    expect(Q.at(-2)).toMatchObject({ t: "Fiscalización", cs: questions[0].p === 1 ? (questions[0] as { cs: string }).cs : "" });
    expect(Q.at(-1)?.id).toBe(95);
  });

  it("no permite cerrar la etiqueta <script> con el contenido", () => {
    const scriptBody = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
    expect(scriptBody).not.toContain("</script>");
    expect(jsLiteral("</script>")).toBe('"\\u003c/script\\u003e"');
  });

  it("produce un documento completo, sin el PIN local y con todo el JS válido", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(html).not.toContain("lockScreen()}\n</script>");
    const script = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
    expect(() => new vm.Script(script)).not.toThrow();
  });

  it("falla con una plantilla incompatible en vez de producir algo roto", () => {
    expect(() => assembleSimulator(template.replace('clave:"[OPEC]",', ""), { opec: "1", cargo: "c", ejes: [], questions: [] })).toThrow(/plantilla_incompatible/);
  });
});
