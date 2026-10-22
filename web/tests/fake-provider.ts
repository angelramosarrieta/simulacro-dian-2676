import { AiError, type AiJsonRequest, type AiProvider } from "@/lib/ai/types";

const usage = (cost = 0.01) => ({ provider: "fake", model: "fake-model", inputTokens: 1000, outputTokens: 500, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: cost, durationMs: 5 });

export function fakeProvider(opts: { invalidDocs?: boolean; costPerCall?: number; failFirst?: number } = {}): AiProvider & { calls: AiJsonRequest[] } {
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

