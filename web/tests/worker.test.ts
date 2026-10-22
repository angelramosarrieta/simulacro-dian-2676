import { describe, expect, it } from "vitest";
import { admin, dbAvailable, grantCredit, newUser } from "./helpers";
import { driveGeneration, runStep } from "@/lib/generation/worker";
import { AiError, type AiJsonRequest, type AiProvider } from "@/lib/ai/types";

/**
 * Prueba el worker completo contra el Supabase local con un proveedor de IA
 * FALSO (respuestas fijas). Sirve para verificar estados, límites, créditos y
 * armado; no simula ni reemplaza la integración real con la IA.
 */
const ok = await dbAvailable();
const d = ok ? describe : describe.skip;

const usage = (cost = 0.01) => ({ provider: "fake", model: "fake-model", inputTokens: 1000, outputTokens: 500, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: cost, durationMs: 5 });

function fakeProvider(opts: { invalidDocs?: boolean; costPerCall?: number; failFirst?: number } = {}): AiProvider & { calls: AiJsonRequest[] } {
  let failures = opts.failFirst ?? 0;
  const calls: AiJsonRequest[] = [];
  let n = 0;
  return {
    name: "fake",
    model: "fake-model",
    calls,
    async generateJson(req) {
      calls.push(req);
      if (failures > 0) {
        failures--;
        throw new AiError("rate_limited", "429 de prueba", true, usage(0));
      }
      if (req.step === "analysis") {
        return {
          usage: usage(opts.costPerCall),
          data: {
            documentos_validos: !opts.invalidDocs,
            motivo: opts.invalidDocs ? "El archivo no es un manual de funciones." : "",
            proposito: "Adelantar la fiscalización.",
            funciones_esenciales: ["Adelantar investigaciones", "Proyectar actos"],
            competencias_funcionales: ["Análisis"],
            indicadores_comportamentales: ["HONESTIDAD"],
            ejes: [
              { nombre: "Fiscalización tributaria", equivalente_banco_comun: "", peso: 3, funciones_relacionadas: ["f1"], normas: ["ET"], enfoque: "casos" },
              { nombre: "RAZONAMIENTO MATEMÁTICO", equivalente_banco_comun: "Razonamiento matemático", peso: 1, funciones_relacionadas: [], normas: [], enfoque: "cálculos" },
            ],
            observaciones: "",
          },
        };
      }
      const size = Number(req.parts[0].type === "text" && req.parts[0].text.match(/EXACTAMENTE (\d+)/)?.[1]) || 5;
      const preguntas = Array.from({ length: size }, () => {
        n++;
        return {
          tipo: "caso",
          caso: `Caso número ${n}: durante una diligencia de verificación el contribuyente presenta documentos incompletos y pide un plazo adicional.`,
          enunciado: `Con base en lo anterior (${n}), al gestor le corresponde`,
          opciones: [`opción correcta ${n}.`, `distractor uno ${n}.`, `distractor dos ${n}.`],
          justificaciones: ["Correcta. Por la norma citada.", "Incorrecta. No aplica al caso.", "Incorrecta. Desconoce el plazo."],
          explicacion: "",
          norma: "ET art. 684",
        };
      });
      // Una pregunta rota por bloque: el worker debe descartarla.
      preguntas.push({ ...preguntas[0], opciones: ["solo una."] } as never);
      return { usage: usage(opts.costPerCall), data: { preguntas } };
    },
  };
}

async function prepare(tag: string, target = 20) {
  const U = await newUser(tag);
  await grantCredit(U.id);
  const a = admin();
  const { data: gen } = await a.from("generations").insert({ user_id: U.id, cargo: "Gestor I 301-01", nivel: "Profesional", opec: "236762", modalidad: "Ingreso", target_questions: target }).select("id").single();
  const id = gen!.id as string;
  const manual = `${U.id}/${id}/manual.pdf`;
  const ind = `${U.id}/${id}/indicadores.png`;
  await a.storage.from("documents").upload(manual, new Blob(["%PDF-1.4 manual"], { type: "application/pdf" }));
  await a.storage.from("documents").upload(ind, new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10])], { type: "image/png" }));
  await a.from("generations").update({ manual_path: manual, manual_mime: "application/pdf", indicadores_path: ind, indicadores_mime: "image/png" }).eq("id", id);
  const { error } = await a.rpc("start_generation", { p_user_id: U.id, p_generation_id: id });
  if (error) throw error;
  return { U, id, manual, ind };
}

d("worker de generación (proveedor falso)", () => {
  it("completa la generación, arma el simulador, registra el consumo y borra los documentos", async () => {
    const { U, id, manual } = await prepare("full", 20);
    const provider = fakeProvider();
    const last = await driveGeneration(admin(), id, () => provider, 600_000);
    expect(last.state).toBe("completed");

    const { data: g } = await U.client.from("generations").select("*").eq("id", id).single();
    expect(g.status).toBe("completed");
    expect(g.progress).toBe(100);
    expect(g.questions).toHaveLength(20);
    expect(g.plan.map((p: { eje: string }) => p.eje)).toEqual(["Fiscalización tributaria", "Razonamiento matemático"]);
    expect(g.steps_run).toBe(provider.calls.length);
    expect(Number(g.input_tokens)).toBe(provider.calls.length * 1000);

    const { data: events } = await U.client.from("usage_events").select("step, ok").eq("generation_id", id);
    expect(events).toHaveLength(provider.calls.length);

    const html = await admin().storage.from("simulators").download(g.simulator_html_path);
    const text = await html.data!.text();
    expect(text).toContain('clave:"236762"');
    expect(text).toContain("Caso número 1:");
    expect((await admin().storage.from("documents").download(manual)).error).not.toBeNull();

    const { data: bal } = await U.client.rpc("my_credit_balance");
    expect(bal).toBe(0);
    // Ya terminada, no se vuelve a procesar.
    expect((await runStep(admin(), id, () => provider)).state).toBe("idle");
  });

  it("documentos inválidos: falla con mensaje claro y devuelve el crédito", async () => {
    const { U, id } = await prepare("bad");
    const last = await driveGeneration(admin(), id, () => fakeProvider({ invalidDocs: true }), 600_000);
    expect(last).toMatchObject({ state: "failed", detail: "documentos_invalidos" });
    const { data: g } = await U.client.from("generations").select("status, error_message, credit_refunded").eq("id", id).single();
    expect(g).toMatchObject({ status: "failed", credit_refunded: true });
    expect(g.error_message).toContain("no es un manual");
    const { data: bal } = await U.client.rpc("my_credit_balance");
    expect(bal).toBe(1);
  });

  it("corta al alcanzar el límite de costo y reembolsa si no hay suficientes preguntas", async () => {
    const { U, id } = await prepare("cost", 100);
    const last = await driveGeneration(admin(), id, () => fakeProvider({ costPerCall: 1.6 }), 600_000);
    expect(last.state).toBe("failed");
    const { data: g } = await U.client.from("generations").select("error_code, cost_usd, steps_run").eq("id", id).single();
    expect(g.error_code).toBe("limite_consumo");
    expect(Number(g.cost_usd)).toBeLessThan(3 + 1.6);
    const { data: bal } = await U.client.rpc("my_credit_balance");
    expect(bal).toBe(1);
  });

  it("reintenta errores transitorios del proveedor y luego continúa", async () => {
    const { U, id } = await prepare("retry", 10);
    const provider = fakeProvider({ failFirst: 2 });
    const last = await driveGeneration(admin(), id, () => provider, 600_000);
    expect(last.state).toBe("completed");
    const { data: ev } = await U.client.from("usage_events").select("ok").eq("generation_id", id);
    expect(ev!.filter((e) => !e.ok)).toHaveLength(2);
  });

  it("sin proveedor configurado falla sin cobrar", async () => {
    const { U, id } = await prepare("noai");
    const last = await runStep(admin(), id, () => {
      throw new AiError("not_configured", "Falta ANTHROPIC_API_KEY", false);
    });
    expect(last).toMatchObject({ state: "failed", detail: "ia_no_configurada" });
    const { data: bal } = await U.client.rpc("my_credit_balance");
    expect(bal).toBe(1);
  });
});
