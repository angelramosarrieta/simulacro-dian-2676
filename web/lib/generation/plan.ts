import { COMMON_TOPICS, BATCH_SIZE } from "@/lib/generation/constants";
import type { Analysis } from "@/lib/generation/schemas";

export type PlanItem = { eje: string; cantidad: number; generadas: number; intentos: number };

/**
 * Normaliza los ejes del análisis y reparte las preguntas nuevas. Los ejes que
 * ya cubre el banco común reciben la mitad del peso; los ligados a funciones
 * esenciales (peso 3) reciben más.
 */
export function buildPlan(analysis: Analysis, target: number): PlanItem[] {
  const seen = new Set<string>();
  const ejes: { nombre: string; w: number }[] = [];
  for (const e of analysis.ejes) {
    const equivalente = COMMON_TOPICS.find(
      (t) => simplify(t) === simplify(e.equivalente_banco_comun) || simplify(t) === simplify(e.nombre)
    );
    const nombre = (equivalente ?? e.nombre).replace(/\s+/g, " ").trim().slice(0, 160);
    const key = simplify(nombre);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ejes.push({ nombre, w: Math.max(1, Math.min(3, e.peso)) * (equivalente ? 0.5 : 1) });
  }
  if (!ejes.length) return [];
  const total = ejes.reduce((s, e) => s + e.w, 0);
  const raw = ejes.map((e) => ({ ...e, exact: (e.w / total) * target }));
  const plan = raw.map((e) => ({ eje: e.nombre, cantidad: Math.max(2, Math.floor(e.exact)), generadas: 0, intentos: 0 }));
  // Ajusta al total exacto repartiendo el residuo por mayor fracción.
  let diff = target - plan.reduce((s, p) => s + p.cantidad, 0);
  const order = raw.map((e, i) => ({ i, frac: e.exact - Math.floor(e.exact) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; diff > 0 && order.length; k = (k + 1) % order.length, diff--) plan[order[k].i].cantidad++;
  for (let k = plan.length - 1; diff < 0 && k >= 0; k--) {
    if (plan[k].cantidad > 2) {
      plan[k].cantidad--;
      diff++;
      if (k === 0 && diff < 0) k = plan.length;
    }
  }
  return plan;
}

/** Siguiente bloque a generar: el primer eje incompleto. */
export function nextBatch(plan: PlanItem[]): { index: number; size: number } | null {
  const index = plan.findIndex((p) => p.generadas < p.cantidad);
  if (index < 0) return null;
  return { index, size: Math.min(BATCH_SIZE, plan[index].cantidad - plan[index].generadas) };
}

export function planProgress(plan: PlanItem[]) {
  const total = plan.reduce((s, p) => s + p.cantidad, 0);
  const done = plan.reduce((s, p) => s + Math.min(p.generadas, p.cantidad), 0);
  return total ? done / total : 0;
}

function simplify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
