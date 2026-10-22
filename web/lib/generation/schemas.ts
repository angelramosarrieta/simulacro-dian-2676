import { z } from "zod";
import { MODALIDADES, NIVELES } from "@/lib/generation/constants";

// ---------------- Entrada del usuario (validada en el servidor) ----------------
const clean = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001f<>`]/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().min(2).max(max));

export const generationInputSchema = z.object({
  cargo: clean(120),
  nivel: z.enum(NIVELES),
  opec: z
    .string()
    .trim()
    .regex(/^[0-9]{3,10}$/, "La OPEC debe tener solo números (3 a 10 dígitos)."),
  modalidad: z.enum(MODALIDADES),
});
export type GenerationInput = z.infer<typeof generationInputSchema>;

// ---------------- Fase 1: análisis ----------------
export const analysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "documentos_validos",
    "motivo",
    "proposito",
    "funciones_esenciales",
    "competencias_funcionales",
    "indicadores_comportamentales",
    "ejes",
    "observaciones",
  ],
  properties: {
    documentos_validos: { type: "boolean", description: "false si los archivos no son un manual de funciones y una lista de indicadores legibles" },
    motivo: { type: "string", description: "Si documentos_validos es false, por qué. Si no, cadena vacía." },
    proposito: { type: "string" },
    funciones_esenciales: { type: "array", items: { type: "string" } },
    competencias_funcionales: { type: "array", items: { type: "string" } },
    indicadores_comportamentales: { type: "array", items: { type: "string" } },
    ejes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nombre", "equivalente_banco_comun", "peso", "funciones_relacionadas", "normas", "enfoque"],
        properties: {
          nombre: { type: "string", description: "Nombre del eje tal como aparece en los indicadores (o el nombre exacto del banco común si equivale)" },
          equivalente_banco_comun: { type: "string", description: "Tema exacto del banco común equivalente, o cadena vacía" },
          peso: { type: "integer", enum: [1, 2, 3], description: "3 = muy ligado a las funciones esenciales" },
          funciones_relacionadas: { type: "array", items: { type: "string" } },
          normas: { type: "array", items: { type: "string" } },
          enfoque: { type: "string", description: "Qué tipo de situaciones del cargo evaluar en este eje" },
        },
      },
    },
    observaciones: { type: "string" },
  },
} as const;

export const analysisSchema = z.object({
  documentos_validos: z.boolean(),
  motivo: z.string(),
  proposito: z.string(),
  funciones_esenciales: z.array(z.string()),
  competencias_funcionales: z.array(z.string()),
  indicadores_comportamentales: z.array(z.string()),
  ejes: z.array(
    z.object({
      nombre: z.string().min(2).max(160),
      equivalente_banco_comun: z.string(),
      peso: z.number().int().min(1).max(3),
      funciones_relacionadas: z.array(z.string()),
      normas: z.array(z.string()),
      enfoque: z.string(),
    })
  ),
  observaciones: z.string(),
});
export type Analysis = z.infer<typeof analysisSchema>;

// ---------------- Fase 2: preguntas ----------------
export const questionsJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["preguntas"],
  properties: {
    preguntas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["tipo", "caso", "enunciado", "opciones", "justificaciones", "explicacion", "norma"],
        properties: {
          tipo: { type: "string", enum: ["caso", "directa"] },
          caso: { type: "string", description: "Situación hipotética del cargo (solo tipo caso; vacío en directa)" },
          enunciado: { type: "string" },
          opciones: {
            type: "array",
            items: { type: "string" },
            description: "Exactamente 3 opciones; la PRIMERA es la correcta",
          },
          justificaciones: {
            type: "array",
            items: { type: "string" },
            description: "Tipo caso: 3 justificaciones en el mismo orden de las opciones. Tipo directa: arreglo vacío",
          },
          explicacion: { type: "string", description: "Tipo directa: explicación breve. Tipo caso: cadena vacía" },
          norma: { type: "string", description: "Norma que sustenta la respuesta, ej. 'Ley 1437 de 2011, art. 69'" },
        },
      },
    },
  },
} as const;

const rawQuestion = z.object({
  tipo: z.enum(["caso", "directa"]),
  caso: z.string(),
  enunciado: z.string(),
  opciones: z.array(z.string()),
  justificaciones: z.array(z.string()),
  explicacion: z.string(),
  norma: z.string(),
});
export const questionsBatchSchema = z.object({ preguntas: z.array(z.unknown()) });

/** Pregunta en el formato exacto de la plantilla (const Q). La clave va en la posición 0. */
export type TemplateQuestion =
  | { t: string; p: 1; cs: string; q: string; o: [string, string, string]; a: 0; j: [string, string, string]; r: string }
  | { t: string; q: string; o: [string, string, string]; a: 0; e: string; r: string };

import { fixAcronyms } from "@/lib/generation/names";

const norm = (s: string) => fixAcronyms(s.replace(/\s+/g, " ").trim());

/** La correcta delata la respuesta si es mucho más larga que el distractor más largo. */
export const LENGTH_RATIO_MAX = 1.3;
export function correctIsTooLong(o: string[]) {
  const longest = Math.max(o[1].length, o[2].length);
  return o[0].length > longest * LENGTH_RATIO_MAX && o[0].length - longest > 15;
}

export type RejectReason = "formato" | "largo" | "sin_calculo";

/** Indicadores de calidad del banco: en un banco sano la correcta es la más larga ~1/3 de las veces. */
export function qualityOf(questions: TemplateQuestion[], descartadas: number | null) {
  const longest = questions.filter((q) => q.o[0].length > Math.max(q.o[1].length, q.o[2].length)).length;
  return {
    preguntas: questions.length,
    correcta_mas_larga_pct: questions.length ? Math.round((100 * longest) / questions.length) : null,
    descartadas,
  };
}

/**
 * Valida y convierte una pregunta del modelo. Devuelve null si no cumple
 * (se descarta en vez de entregarle al usuario algo roto).
 */
export function toTemplateQuestion(raw: unknown, eje: string): TemplateQuestion | null {
  const r = checkQuestion(raw, eje);
  return "question" in r ? r.question : null;
}

/** Igual que toTemplateQuestion, pero dice por qué se descartó (para medir la calidad). */
export function checkQuestion(raw: unknown, eje: string): { question: TemplateQuestion } | { reject: RejectReason } {
  const q0 = buildQuestion(raw, eje);
  if (!q0) return { reject: "formato" };
  if (correctIsTooLong(q0.o)) return { reject: "largo" };
  if (/razonamiento matem/i.test(eje) && !/\d/.test(("cs" in q0 ? q0.cs : "") + q0.q + q0.o.join(" "))) return { reject: "sin_calculo" };
  return { question: q0 };
}

function buildQuestion(raw: unknown, eje: string): TemplateQuestion | null {
  const parsed = rawQuestion.safeParse(raw);
  if (!parsed.success) return null;
  const q = parsed.data;
  const opciones = q.opciones.map(norm);
  if (opciones.length !== 3 || opciones.some((o) => o.length < 2 || o.length > 600)) return null;
  if (new Set(opciones.map((o) => o.toLowerCase())).size !== 3) return null;
  const enunciado = norm(q.enunciado);
  const norma = norm(q.norma);
  if (enunciado.length < 10 || enunciado.length > 800 || norma.length < 3 || norma.length > 200) return null;

  if (q.tipo === "caso") {
    const caso = norm(q.caso);
    const j = q.justificaciones.map(norm);
    if (caso.length < 60 || caso.length > 2000 || j.length !== 3 || j.some((x) => x.length < 10 || x.length > 900)) return null;
    return { t: eje, p: 1, cs: caso, q: enunciado, o: opciones as [string, string, string], a: 0, j: j as [string, string, string], r: norma };
  }
  const e = norm(q.explicacion);
  if (e.length < 10 || e.length > 900) return null;
  return { t: eje, q: enunciado, o: opciones as [string, string, string], a: 0, e, r: norma };
}

export function questionFingerprint(q: TemplateQuestion) {
  const base = ("cs" in q ? q.cs + "|" : "") + q.q + "|" + q.o[0];
  return base.toLowerCase().replace(/[^a-z0-9áéíóúñü]/g, "").slice(0, 400);
}
