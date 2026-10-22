import { describe, expect, it } from "vitest";
import { buildPlan, nextBatch, planProgress } from "@/lib/generation/plan";
import { generationInputSchema, questionFingerprint, toTemplateQuestion, type Analysis } from "@/lib/generation/schemas";
import { budgetExceeded, callOutputBudget, DEFAULT_LIMITS, mergeLimits } from "@/lib/generation/limits";
import { costUsd, priceFor } from "@/lib/ai/pricing";
import { sniffMime } from "@/lib/generation/files";
import { safeNext } from "@/lib/routes";

const analysis = (ejes: Partial<Analysis["ejes"][number]>[]): Analysis => ({
  documentos_validos: true,
  motivo: "",
  proposito: "p",
  funciones_esenciales: ["f1"],
  competencias_funcionales: [],
  indicadores_comportamentales: [],
  observaciones: "",
  ejes: ejes.map((e) => ({ nombre: "X", equivalente_banco_comun: "", peso: 2, funciones_relacionadas: [], normas: [], enfoque: "", ...e })),
});

describe("plan de preguntas", () => {
  it("reparte exactamente el total pedido", () => {
    for (const target of [20, 57, 120, 200]) {
      const plan = buildPlan(analysis([{ nombre: "A", peso: 3 }, { nombre: "B", peso: 1 }, { nombre: "C", peso: 2 }, { nombre: "D", peso: 2 }]), target);
      expect(plan.reduce((s, p) => s + p.cantidad, 0)).toBe(target);
    }
  });

  it("da más peso a los ejes ligados a funciones esenciales y menos a los del banco común", () => {
    const plan = buildPlan(analysis([{ nombre: "Fiscalización", peso: 3 }, { nombre: "RAZONAMIENTO MATEMATICO", peso: 3 }, { nombre: "Archivo", peso: 1 }]), 100);
    const by = Object.fromEntries(plan.map((p) => [p.eje, p.cantidad]));
    expect(by["Fiscalización"]).toBeGreaterThan(by["Razonamiento matemático"]);
    expect(by["Razonamiento matemático"]).toBeGreaterThan(by["Archivo"]);
  });

  it("usa el nombre EXACTO del banco común aunque cambien tildes o mayúsculas", () => {
    const plan = buildPlan(analysis([{ nombre: "CONSTITUCION Y ESTADO" }, { nombre: "Otro", equivalente_banco_comun: "peticiones y cpaca" }]), 20);
    expect(plan.map((p) => p.eje)).toEqual(["Constitución y Estado", "Peticiones y CPACA"]);
  });

  it("elimina ejes duplicados y avanza por bloques", () => {
    const plan = buildPlan(analysis([{ nombre: "A" }, { nombre: "a " }]), 25);
    expect(plan).toHaveLength(1);
    expect(nextBatch(plan)).toEqual({ index: 0, size: 10 });
    plan[0].generadas = 20;
    expect(nextBatch(plan)).toEqual({ index: 0, size: 5 });
    plan[0].generadas = 25;
    expect(nextBatch(plan)).toBeNull();
    expect(planProgress(plan)).toBe(1);
  });
});

describe("validación de preguntas", () => {
  const caso = {
    tipo: "caso",
    caso: "Durante una diligencia de verificación, un contribuyente solicita que la notificación se haga solo por correo, aunque no registró dirección.",
    enunciado: "Con base en lo anterior, al gestor le corresponde",
    opciones: ["notificar según la norma.", "aceptar la solicitud.", "suspender la diligencia."],
    justificaciones: ["Correcta. Porque la norma lo exige así.", "Incorrecta. La voluntad no basta.", "Incorrecta. No hay causal de suspensión."],
    explicacion: "",
    norma: "ET art. 565",
  };

  it("convierte un caso al formato de la plantilla con la clave en la posición 0", () => {
    const q = toTemplateQuestion(caso, "Fiscalización");
    expect(q).toMatchObject({ t: "Fiscalización", p: 1, a: 0, r: "ET art. 565" });
    expect(q && "j" in q && q.j).toHaveLength(3);
  });

  it("descarta preguntas rotas", () => {
    expect(toTemplateQuestion({ ...caso, opciones: ["a.", "b."] }, "E")).toBeNull();
    expect(toTemplateQuestion({ ...caso, opciones: ["igual.", "Igual.", "otra."] }, "E")).toBeNull();
    expect(toTemplateQuestion({ ...caso, justificaciones: [] }, "E")).toBeNull();
    expect(toTemplateQuestion({ ...caso, norma: "" }, "E")).toBeNull();
    expect(toTemplateQuestion({ tipo: "directa", caso: "", enunciado: "Pregunta directa válida", opciones: ["a1", "b1", "c1"], justificaciones: [], explicacion: "", norma: "Ley 1 art 1" }, "E")).toBeNull();
    expect(toTemplateQuestion("texto", "E")).toBeNull();
  });

  it("detecta duplicados por huella", () => {
    const a = toTemplateQuestion(caso, "E")!;
    const b = toTemplateQuestion({ ...caso, enunciado: caso.enunciado + "  " }, "E")!;
    expect(questionFingerprint(a)).toBe(questionFingerprint(b));
  });
});

describe("entrada del usuario", () => {
  it("valida y limpia los datos del empleo", () => {
    const ok = generationInputSchema.parse({ cargo: "  Gestor I <b>301-01</b> ", nivel: "Profesional", opec: "236762", modalidad: "Ingreso" });
    expect(ok.cargo).toBe("Gestor I b 301-01 /b");
    expect(generationInputSchema.safeParse({ cargo: "G", nivel: "Profesional", opec: "236762", modalidad: "Ingreso" }).success).toBe(false);
    expect(generationInputSchema.safeParse({ cargo: "Gestor", nivel: "Director", opec: "236762", modalidad: "Ingreso" }).success).toBe(false);
    expect(generationInputSchema.safeParse({ cargo: "Gestor", nivel: "Técnico", opec: "23a", modalidad: "Ingreso" }).success).toBe(false);
  });
});

describe("límites de consumo", () => {
  it("usa valores por defecto e ignora valores inválidos", () => {
    expect(mergeLimits(null)).toEqual(DEFAULT_LIMITS);
    expect(mergeLimits({ max_cost_usd: -1, max_steps: "x", max_output_tokens: 1000 })).toEqual({ ...DEFAULT_LIMITS, max_output_tokens: 1000 });
  });
  it("corta cuando se agota cualquier presupuesto", () => {
    const base = { input_tokens: 0, output_tokens: 0, cost_usd: 0, steps_run: 0 };
    expect(budgetExceeded(base, DEFAULT_LIMITS)).toBeNull();
    expect(budgetExceeded({ ...base, cost_usd: 3 }, DEFAULT_LIMITS)).toMatch(/costo/);
    expect(budgetExceeded({ ...base, input_tokens: 400_000 }, DEFAULT_LIMITS)).toMatch(/entrada/);
    expect(budgetExceeded({ ...base, steps_run: 30 }, DEFAULT_LIMITS)).toMatch(/pasos/);
  });
  it("la salida por llamada nunca pasa el tope total", () => {
    expect(callOutputBudget({ input_tokens: 0, output_tokens: 150_000, cost_usd: 0, steps_run: 0 }, DEFAULT_LIMITS)).toBe(10_000);
    expect(callOutputBudget({ input_tokens: 0, output_tokens: 0, cost_usd: 0, steps_run: 0 }, DEFAULT_LIMITS)).toBe(16_000);
  });
  it("calcula costos y usa precios altos para modelos desconocidos", () => {
    expect(costUsd("claude-opus-5-5", { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBe(24);
    expect(priceFor("modelo-raro").output).toBe(50);
  });
});

describe("seguridad de utilidades", () => {
  it("evita redirecciones abiertas", () => {
    expect(safeNext("/panel/cuenta")).toBe("/panel/cuenta");
    expect(safeNext("//evil.com")).toBe("/panel");
    expect(safeNext("https://evil.com")).toBe("/panel");
    expect(safeNext("/\\evil.com")).toBe("/panel");
    expect(safeNext(null)).toBe("/panel");
  });
  it("reconoce el tipo real del archivo", () => {
    expect(sniffMime(new TextEncoder().encode("%PDF-1.7 ..."))).toBe("application/pdf");
    expect(sniffMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]))).toBe("image/png");
    expect(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffMime(new TextEncoder().encode("<html>"))).toBeNull();
  });
});

import { cleanAiData } from "@/lib/generation/worker";

describe("limpieza de la respuesta de la IA", () => {
  it("quita el carácter nulo, controles invisibles y sustitutos sueltos que Postgres rechaza", () => {
    const dirty = { preguntas: [{ enunciado: "Hola\u0000 mundo\u0007", opciones: ["a\uD800b", "ok 😀", "línea\nnueva\tcon tab"] }], "cla\u0000ve": 1 };
    expect(cleanAiData(dirty)).toEqual({ preguntas: [{ enunciado: "Hola mundo", opciones: ["ab", "ok 😀", "línea\nnueva\tcon tab"] }], clave: 1 });
    expect(JSON.stringify(cleanAiData(dirty))).not.toMatch(/\\u0000/);
  });
});
