import "server-only";
import { readFile } from "fs/promises";
import path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AiError, type AiInputPart, type AiProvider, type AiUsage } from "@/lib/ai/types";
import { budgetExceeded, callOutputBudget, loadLimits, type GenerationLimits } from "@/lib/generation/limits";
import { buildPlan, nextBatch, planProgress, type PlanItem } from "@/lib/generation/plan";
import { analysisInstructions, batchInstructions, NORMATIVE_FRAMEWORK, SYSTEM_PROMPT } from "@/lib/generation/prompts";
import {
  analysisJsonSchema,
  analysisSchema,
  questionFingerprint,
  questionsBatchSchema,
  questionsJsonSchema,
  toTemplateQuestion,
  type Analysis,
  type GenerationInput,
  type TemplateQuestion,
} from "@/lib/generation/schemas";
import { assembleSimulator } from "@/lib/simulator/assemble";
import { notifyGenerationFinished } from "@/lib/email/notify";

/**
 * Worker de generación por etapas. Cada llamada a runStep avanza UNA etapa
 * (análisis, un bloque de preguntas o el armado final) y guarda el estado en
 * la BD, así una generación sobrevive a timeouts y reinicios de funciones.
 * Solo avanza quien tenga el lease de la fila (acquire_generation_lease), lo
 * que evita que dos invocaciones simultáneas dupliquen llamadas a la IA.
 */

type GenerationRow = {
  id: string;
  user_id: string;
  status: string;
  cargo: string;
  nivel: GenerationInput["nivel"];
  opec: string;
  modalidad: GenerationInput["modalidad"];
  target_questions: number;
  manual_path: string | null;
  manual_mime: string | null;
  indicadores_path: string | null;
  indicadores_mime: string | null;
  analysis: Analysis | null;
  plan: PlanItem[] | null;
  questions: TemplateQuestion[];
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  steps_run: number;
  step_attempts: number;
  source: "ia" | "biblioteca";
};

export type StepResult = { state: "advanced" | "completed" | "failed" | "busy" | "idle"; detail?: string };

const ACTIVE = new Set(["queued", "analyzing", "generating", "assembling"]);
const LEASE_SECONDS = 290;

export async function runStep(admin: SupabaseClient, generationId: string, getProvider: () => AiProvider): Promise<StepResult> {
  const { data: token, error: leaseError } = await admin.rpc("acquire_generation_lease", {
    p_generation_id: generationId,
    p_seconds: LEASE_SECONDS,
  });
  if (leaseError) throw new Error(leaseError.message);
  if (!token) {
    const { data } = await admin.from("generations").select("status").eq("id", generationId).maybeSingle();
    return { state: data && ACTIVE.has(data.status) ? "busy" : "idle" };
  }

  try {
    const { data: gen, error } = await admin.from("generations").select("*").eq("id", generationId).single<GenerationRow>();
    if (error || !gen) throw new Error(error?.message ?? "generacion_no_encontrada");
    if (!ACTIVE.has(gen.status)) return { state: "idle" };

    // Empleo que ya está en la biblioteca: se arma sin llamar a la IA.
    if (gen.source === "biblioteca") return await fromBank(admin, gen);

    const limits = await loadLimits(admin);
    const exceeded = budgetExceeded(gen, limits);
    if (exceeded) {
      // Si ya hay suficientes preguntas, se entrega lo que hay en vez de fallar.
      if (gen.questions.length >= Math.ceil(gen.target_questions * 0.6)) return await assemble(admin, gen);
      return await fail(admin, gen, "limite_consumo", exceeded);
    }

    let provider: AiProvider;
    try {
      provider = getProvider();
    } catch (e) {
      const msg = e instanceof AiError ? e.message : "Proveedor de IA no disponible";
      return await fail(admin, gen, "ia_no_configurada", `El servicio de generación no está configurado (${msg}).`);
    }

    if (gen.status === "queued" || gen.status === "analyzing") return await analyze(admin, gen, provider, limits);
    if (gen.status === "generating") return await generateBatch(admin, gen, provider, limits);
    return await assemble(admin, gen);
  } finally {
    await admin.rpc("release_generation_lease", { p_generation_id: generationId, p_token: token });
  }
}

// ------------------------------------------------------------------ etapas

async function analyze(admin: SupabaseClient, gen: GenerationRow, provider: AiProvider, limits: GenerationLimits): Promise<StepResult> {
  await patch(admin, gen.id, { status: "analyzing", current_step: "Analizando tu manual e indicadores", progress: 5 });
  const parts: AiInputPart[] = [];
  for (const [label, p, mime] of [
    ["Manual de funciones", gen.manual_path, gen.manual_mime],
    ["Indicadores", gen.indicadores_path, gen.indicadores_mime],
  ] as const) {
    if (!p || !mime) return fail(admin, gen, "faltan_documentos", "Faltan documentos para analizar.");
    const { data, error } = await admin.storage.from("documents").download(p);
    if (error || !data) return fail(admin, gen, "documento_no_disponible", `No se pudo leer el archivo "${label}".`);
    const base64 = Buffer.from(await data.arrayBuffer()).toString("base64");
    parts.push({ type: "text", text: `Archivo adjunto: ${label}` });
    if (mime === "application/pdf") parts.push({ type: "pdf", base64, filename: `${label}.pdf` });
    else parts.push({ type: "image", base64, mediaType: mime as "image/png" | "image/jpeg" | "image/webp", filename: label });
  }
  parts.push({ type: "text", text: analysisInstructions(gen) });

  const result = await callAi(admin, gen, provider, limits, "analysis", {
    parts,
    schemaName: "analisis_empleo",
    schema: analysisJsonSchema as unknown as Record<string, unknown>,
  });
  if (result.kind !== "ok") return result.step;

  const parsed = analysisSchema.safeParse(result.data);
  if (!parsed.success) return retryOrFail(admin, gen, limits, "analisis_invalido", "El análisis no tuvo el formato esperado.");
  const analysis = parsed.data;
  if (!analysis.documentos_validos) {
    return fail(
      admin,
      gen,
      "documentos_invalidos",
      analysis.motivo || "Los archivos no parecen ser un manual de funciones y una lista de indicadores legibles."
    );
  }
  const plan = buildPlan(analysis, gen.target_questions);
  if (!plan.length) return fail(admin, gen, "sin_ejes", "No se encontraron ejes de conocimiento en tus indicadores.");

  await patch(admin, gen.id, {
    status: "generating",
    analysis,
    plan,
    step_attempts: 0,
    progress: 12,
    current_step: `Plan listo: ${plan.length} ejes`,
    error_message: null,
  });
  return { state: "advanced", detail: "analysis" };
}

async function generateBatch(admin: SupabaseClient, gen: GenerationRow, provider: AiProvider, limits: GenerationLimits): Promise<StepResult> {
  const plan = (gen.plan ?? []).map((p) => ({ ...p }));
  const next = nextBatch(plan);
  if (!next || !gen.analysis) {
    await patch(admin, gen.id, { status: "assembling", current_step: "Armando tu simulador", progress: 92 });
    return { state: "advanced", detail: "to_assembling" };
  }
  const item = plan[next.index];
  await patch(admin, gen.id, { current_step: `Escribiendo preguntas de "${item.eje}" (${item.generadas}/${item.cantidad})` });

  const previous = gen.questions.filter((q) => q.t === item.eje).map((q) => ("cs" in q ? q.cs : q.q).slice(0, 140));
  const result = await callAi(admin, gen, provider, limits, `batch:${item.eje}`, {
    parts: [{ type: "text", text: batchInstructions({ input: gen, analysis: gen.analysis, eje: item.eje, cantidad: next.size, yaGeneradas: previous }) }],
    schemaName: "preguntas",
    schema: questionsJsonSchema as unknown as Record<string, unknown>,
  });
  if (result.kind !== "ok") return result.step;

  const batch = questionsBatchSchema.safeParse(result.data);
  const seen = new Set(gen.questions.map(questionFingerprint));
  const fresh: TemplateQuestion[] = [];
  for (const raw of batch.success ? batch.data.preguntas : []) {
    const q = toTemplateQuestion(raw, item.eje);
    if (!q) continue;
    const fp = questionFingerprint(q);
    if (seen.has(fp)) continue;
    seen.add(fp);
    fresh.push(q);
    if (fresh.length >= next.size) break;
  }

  item.intentos += 1;
  item.generadas += fresh.length;
  // Si un eje no logra completarse tras varios intentos, se cierra con lo
  // que tenga para no gastar más tokens en él.
  if (item.generadas < item.cantidad && item.intentos >= Math.ceil(item.cantidad / 10) + limits.max_attempts_per_step) {
    item.cantidad = item.generadas;
  }
  const questions = [...gen.questions, ...fresh];
  await patch(admin, gen.id, {
    plan,
    questions,
    step_attempts: 0,
    progress: Math.min(90, 12 + Math.round(planProgress(plan) * 78)),
    error_message: null,
  });
  return { state: "advanced", detail: `batch:${fresh.length}` };
}

async function fromBank(admin: SupabaseClient, gen: GenerationRow): Promise<StepResult> {
  const { data: bank } = await admin.from("job_banks").select("questions, plan, analysis, uses").eq("opec", gen.opec).eq("enabled", true).maybeSingle();
  if (!bank || !Array.isArray(bank.questions) || !bank.questions.length) {
    return fail(admin, gen, "biblioteca_no_disponible", "El banco de este empleo ya no está disponible. Intenta de nuevo subiendo tus documentos.");
  }
  gen.questions = bank.questions as TemplateQuestion[];
  gen.plan = bank.plan as PlanItem[];
  gen.analysis = bank.analysis as Analysis | null;
  gen.target_questions = gen.questions.length;
  await patch(admin, gen.id, {
    status: "assembling",
    questions: gen.questions,
    plan: gen.plan,
    analysis: gen.analysis,
    target_questions: gen.target_questions,
    progress: 90,
    current_step: "Armando tu simulador desde la biblioteca",
  });
  await admin.from("job_banks").update({ uses: Number(bank.uses) + 1 }).eq("opec", gen.opec);
  return assemble(admin, gen);
}

async function assemble(admin: SupabaseClient, gen: GenerationRow): Promise<StepResult> {
  const minimum = Math.ceil(gen.target_questions * 0.6);
  if (gen.questions.length < minimum) {
    return fail(admin, gen, "preguntas_insuficientes", "No se lograron generar suficientes preguntas válidas.");
  }
  const template = await readFile(path.join(process.cwd(), "lib/simulator/plantilla.html"), "utf8");
  const ejes = (gen.plan ?? []).map((p) => p.eje).filter((e) => gen.questions.some((q) => q.t === e));
  const html = assembleSimulator(template, { opec: gen.opec, cargo: gen.cargo, ejes, questions: gen.questions });
  const htmlPath = `${gen.user_id}/${gen.id}.html`;
  const { error } = await admin.storage
    .from("simulators")
    .upload(htmlPath, new Blob([html], { type: "text/html" }), { contentType: "text/html", upsert: true });
  if (error) throw new Error(`No se pudo guardar el simulador: ${error.message}`);

  await patch(admin, gen.id, {
    status: "completed",
    simulator_html_path: htmlPath,
    progress: 100,
    current_step: "Listo",
    finished_at: new Date().toISOString(),
    error_message: null,
  });
  await deleteDocuments(admin, gen);
  // Lo generado con IA alimenta la biblioteca para los siguientes aspirantes de la misma OPEC.
  if (gen.source !== "biblioteca") await admin.rpc("save_job_bank", { p_generation_id: gen.id });
  await notifyGenerationFinished(admin, gen.id);
  return { state: "completed" };
}

// ------------------------------------------------------------------ apoyo

type CallOutcome = { kind: "ok"; data: unknown } | { kind: "stop"; step: StepResult };

async function callAi(
  admin: SupabaseClient,
  gen: GenerationRow,
  provider: AiProvider,
  limits: GenerationLimits,
  step: string,
  req: { parts: AiInputPart[]; schemaName: string; schema: Record<string, unknown> }
): Promise<CallOutcome> {
  const maxOutputTokens = callOutputBudget(gen, limits);
  if (maxOutputTokens < 2000) return { kind: "stop", step: await fail(admin, gen, "limite_consumo", "Presupuesto de tokens agotado.") };
  try {
    const res = await provider.generateJson({
      step,
      system: SYSTEM_PROMPT,
      cacheableContext: NORMATIVE_FRAMEWORK,
      parts: req.parts,
      schemaName: req.schemaName,
      schema: req.schema,
      maxOutputTokens,
    });
    await recordUsage(admin, gen, step, res.usage, true);
    return { kind: "ok", data: res.data };
  } catch (e) {
    const err = e instanceof AiError ? e : new AiError("provider_error", e instanceof Error ? e.message : "Error desconocido", true);
    await recordUsage(admin, gen, step, err.usage, false, `${err.code}: ${err.message}`);
    if (err.code === "not_configured") return { kind: "stop", step: await fail(admin, gen, "ia_no_configurada", err.message) };
    if (!err.retryable) return { kind: "stop", step: await fail(admin, gen, `ia_${err.code}`, err.message) };
    return { kind: "stop", step: await retryOrFail(admin, gen, limits, `ia_${err.code}`, err.message) };
  }
}

async function retryOrFail(admin: SupabaseClient, gen: GenerationRow, limits: GenerationLimits, code: string, message: string): Promise<StepResult> {
  const attempts = gen.step_attempts + 1;
  gen.step_attempts = attempts;
  if (attempts >= limits.max_attempts_per_step) return fail(admin, gen, code, message);
  await patch(admin, gen.id, { step_attempts: attempts, error_message: `Reintentando (${attempts}/${limits.max_attempts_per_step}): ${message}` });
  return { state: "advanced", detail: `retry:${code}` };
}

async function recordUsage(admin: SupabaseClient, gen: GenerationRow, step: string, usage: AiUsage | undefined, ok: boolean, error?: string) {
  const u = usage ?? { provider: "unknown", model: "unknown", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0, durationMs: 0 };
  await admin.from("usage_events").insert({
    user_id: gen.user_id,
    generation_id: gen.id,
    step: step.slice(0, 200),
    provider: u.provider,
    model: u.model,
    input_tokens: u.inputTokens + u.cacheWriteTokens,
    output_tokens: u.outputTokens,
    cache_read_tokens: u.cacheReadTokens,
    cost_usd: u.costUsd,
    ok,
    error: error?.slice(0, 500) ?? null,
    duration_ms: u.durationMs,
  });
  // Totales acumulados (solo el dueño del lease escribe esta fila).
  gen.input_tokens = Number(gen.input_tokens) + u.inputTokens + u.cacheWriteTokens + u.cacheReadTokens;
  gen.output_tokens = Number(gen.output_tokens) + u.outputTokens;
  gen.cost_usd = Number(gen.cost_usd) + u.costUsd;
  gen.steps_run = gen.steps_run + 1;
  await patch(admin, gen.id, {
    input_tokens: gen.input_tokens,
    output_tokens: gen.output_tokens,
    cost_usd: Math.round(gen.cost_usd * 1e6) / 1e6,
    steps_run: gen.steps_run,
    ai_provider: u.provider !== "unknown" ? u.provider : undefined,
    ai_model: u.model !== "unknown" ? u.model : undefined,
  });
}

async function fail(admin: SupabaseClient, gen: GenerationRow, code: string, message: string): Promise<StepResult> {
  await patch(admin, gen.id, {
    status: "failed",
    error_code: code,
    error_message: message.slice(0, 500),
    current_step: "No se pudo completar",
    finished_at: new Date().toISOString(),
  });
  // Toda falla de una generación ya pagada devuelve el crédito (una sola vez,
  // lo garantiza el índice único del libro de créditos).
  await admin.rpc("refund_generation", { p_generation_id: gen.id, p_note: `Reembolso: ${code}` });
  await deleteDocuments(admin, gen);
  await notifyGenerationFinished(admin, gen.id);
  return { state: "failed", detail: code };
}

async function deleteDocuments(admin: SupabaseClient, gen: GenerationRow) {
  const paths = [gen.manual_path, gen.indicadores_path].filter((p): p is string => Boolean(p));
  if (paths.length) await admin.storage.from("documents").remove(paths);
}

async function patch(admin: SupabaseClient, id: string, values: Record<string, unknown>) {
  const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));
  const { error } = await admin.from("generations").update({ ...clean, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(`No se pudo actualizar la generación: ${error.message}`);
}

/** Avanza etapas hasta terminar o hasta agotar el tiempo disponible de la invocación. */
export async function driveGeneration(admin: SupabaseClient, generationId: string, getProvider: () => AiProvider, budgetMs: number) {
  const deadline = Date.now() + budgetMs;
  let last: StepResult = { state: "idle" };
  // Cada etapa puede tardar ~1-2 min; no se empieza otra si no queda margen.
  while (Date.now() < deadline - 100_000) {
    last = await runStep(admin, generationId, getProvider);
    if (last.state !== "advanced") break;
  }
  return last;
}
