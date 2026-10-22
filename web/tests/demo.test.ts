import { readFileSync } from "fs";
import path from "path";
import vm from "vm";
import { describe, expect, it } from "vitest";
// @ts-expect-error módulo .mjs sin tipos (script de build)
import { toDemo, toPersonal } from "../scripts/demo-transform.mjs";

const original = readFileSync(path.join(__dirname, "../../index.html"), "utf8");

describe("simulador de ejemplo (/ejemplo) y personal (/mi-simulador)", () => {
  const demo: string = toDemo(original);

  it("la demo usa su propio espacio de guardado y entra sin PIN", () => {
    expect(demo).toContain('clave:"demo-ejemplo",');
    expect(demo).not.toContain('clave:"2676",');
    expect(demo).not.toContain("else{lockScreen()}");
    expect(demo).toContain('Crear el mío</a>');
    const script = demo.slice(demo.indexOf("<script>") + 8, demo.lastIndexOf("</script>"));
    expect(() => new vm.Script(script)).not.toThrow();
  });

  it("los archivos publicados están sincronizados con el index.html de la raíz", () => {
    expect(readFileSync(path.join(__dirname, "../public/ejemplo/index.html"), "utf8")).toBe(demo);
    expect(readFileSync(path.join(__dirname, "../public/mi-simulador/index.html"), "utf8")).toBe(toPersonal(original));
  });

  it("el personal conserva la clave original (PIN y progreso existentes) y no se indexa", () => {
    const personal: string = toPersonal(original);
    expect(personal).toContain('clave:"2676",');
    expect(personal).toContain("else{lockScreen()}");
    expect(personal).toContain('<meta name="robots" content="noindex, nofollow">');
  });
});
