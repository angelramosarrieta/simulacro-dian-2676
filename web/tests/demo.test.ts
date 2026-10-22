import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
// @ts-expect-error módulos .mjs sin tipos (scripts de build)
import { toPersonal } from "../scripts/demo-transform.mjs";
// @ts-expect-error módulos .mjs sin tipos (scripts de build)
import { extract } from "../scripts/extract-banks.mjs";
import base from "@/lib/simulator/data/base.json";
import demo from "@/lib/simulator/data/demo.json";

const original = readFileSync(path.join(__dirname, "../../index.html"), "utf8");

describe("datos del simulador integrado y simulador personal (/mi-simulador)", () => {
  it("los bancos publicados están sincronizados con plantilla.html e index.html", () => {
    const fresh = extract(path.join(__dirname, "../.."));
    expect(base).toEqual(fresh.base);
    expect(demo).toEqual(fresh.demo);
  });

  it("el banco común trae preguntas directas, casos y afirmaciones comportamentales", () => {
    expect(base.common.length).toBeGreaterThan(50);
    expect(base.common.some((q: { lk?: number }) => q.lk === 1)).toBe(true);
    expect(base.config.minimo).toBe(70);
    expect(base.config.guia.length).toBeGreaterThan(3);
  });

  it("el ejemplo es un simulador completo con sus ejes", () => {
    expect(demo.cargo).toBe("Analista II");
    expect(demo.ejes.length).toBeGreaterThan(3);
    for (const e of demo.ejes) expect(demo.questions.some((q: { t: string }) => q.t === e)).toBe(true);
  });

  it("el personal conserva la clave original (PIN y progreso existentes) y no se indexa", () => {
    const personal: string = toPersonal(original);
    expect(personal).toContain('clave:"2676",');
    expect(personal).toContain("else{lockScreen()}");
    expect(personal).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(readFileSync(path.join(__dirname, "../public/mi-simulador/index.html"), "utf8")).toBe(personal);
  });
});
