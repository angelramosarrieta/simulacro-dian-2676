/**
 * Lógica del simulador de estudio (sin interfaz). Es la misma de plantilla.html,
 * pasada a TypeScript para usarla dentro de la plataforma: mismos ids de
 * pregunta (posición en el banco), misma calificación y el mismo formato de
 * progreso ({ stats, history }), así el avance guardado sigue sirviendo.
 */
import base from "@/lib/simulator/data/base.json";

export type DirectQ = { t: string; q: string; o: string[]; a: number; e: string; r: string };
export type CaseQ = { t: string; p: 1; cs: string; q: string; o: string[]; a: number; j: string[]; r: string };
export type LikertQ = { t: string; lk: 1; k: string; q: string };
export type RawQuestion = DirectQ | CaseQ | LikertQ;
export type Question = RawQuestion & { id: number };

export type GuideSection = { titulo: string; items: string[] };
export type SimConfig = {
  proceso: string;
  entidad: string;
  examen: string;
  examenTexto: string;
  minimo: number;
  guiaFuente: string;
  guia: GuideSection[];
};

export type SimData = {
  cargo: string;
  opec: string;
  ejes: string[];
  questions: Question[];
  config: SimConfig;
  comp: string;
};

/** Aciertos por id de pregunta. */
export type Stats = Record<string, { n: number; ok: number; last: boolean | null }>;
/** Historial de simulacros: fecha, etiqueta, puntaje, correctas y total. */
export type HistoryEntry = { d: number; l: string; s: number; ok: number; n: number };

export const COMP = base.comp;
export const BASE_CONFIG = base.config as SimConfig;
export const LIKERT = ["Totalmente en desacuerdo", "En desacuerdo", "De acuerdo", "Totalmente de acuerdo"];
export const SECONDS_PER_QUESTION = 90;

export const isLikert = (q: RawQuestion): q is LikertQ => "lk" in q;
export const isCase = (q: RawQuestion): q is CaseQ => "p" in q && (q as CaseQ).p === 1;

/** Banco completo: el común primero y luego las del empleo (los ids son la posición, como en la plantilla). */
export function buildSimData(p: { cargo: string; opec: string; ejes: string[]; jobQuestions: RawQuestion[]; includeCommon?: boolean }): SimData {
  const raw = [...(p.includeCommon === false ? [] : (base.common as RawQuestion[])), ...p.jobQuestions];
  return { cargo: p.cargo, opec: p.opec, ejes: p.ejes, questions: raw.map((q, id) => ({ ...q, id })), config: BASE_CONFIG, comp: COMP };
}

export function shuffle<T>(a: T[], rnd = Math.random): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** Escala 0-100 con dos decimales truncados, como califica la CNSC. */
export const score = (ok: number, n: number) => (n ? Math.floor((ok * 10000) / n) / 100 : 0);
export const fmtScore = (x: number) => x.toFixed(2).replace(".", ",");

export function graded(d: SimData) {
  return d.questions.filter((q) => !isLikert(q));
}
export function inEje(d: SimData, q: Question) {
  return !isLikert(q) && d.ejes.includes(q.t);
}
export function topics(d: SimData) {
  return [...new Set(d.questions.map((q) => q.t))];
}
export function otherTopics(d: SimData) {
  return topics(d).filter((t) => t !== d.comp && !d.ejes.includes(t));
}

export function record(stats: Stats, q: Question, ok: boolean): Stats {
  if (isLikert(q)) return stats;
  const s = stats[q.id] ?? { n: 0, ok: 0, last: null };
  return { ...stats, [q.id]: { n: s.n + 1, ok: s.ok + (ok ? 1 : 0), last: ok } };
}

export function wrongIds(d: SimData, stats: Stats) {
  return graded(d).filter((q) => stats[q.id]?.last === false).map((q) => q.id);
}

export function topicStats(d: SimData, stats: Stats, t: string) {
  const qs = graded(d).filter((q) => q.t === t);
  const seen = qs.filter((q) => stats[q.id]);
  const n = seen.reduce((a, q) => a + stats[q.id].n, 0);
  const ok = seen.reduce((a, q) => a + stats[q.id].ok, 0);
  return { total: qs.length, seen: seen.length, acc: n ? ok / n : null };
}

export function totals(d: SimData, stats: Stats) {
  const seen = graded(d).filter((q) => stats[q.id]);
  const n = seen.reduce((a, q) => a + stats[q.id].n, 0);
  const ok = seen.reduce((a, q) => a + stats[q.id].ok, 0);
  return { seen: seen.length, n, ok, acc: n ? ok / n : null };
}

export function daysLeft(examen: string, now = new Date()) {
  const t = new Date(now);
  t.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${examen}T00:00:00`).getTime() - t.getTime()) / 864e5);
}

/** Normaliza lo que venga guardado (de la cuenta o del navegador) sin confiar en su forma. */
export function sanitizeProgress(stats: unknown, history: unknown): { stats: Stats; history: HistoryEntry[] } {
  const s: Stats = {};
  if (stats && typeof stats === "object" && !Array.isArray(stats)) {
    for (const [k, v] of Object.entries(stats as Record<string, unknown>)) {
      if (!/^\d+$/.test(k) || !v || typeof v !== "object") continue;
      const r = v as Record<string, unknown>;
      const n = Number(r.n), ok = Number(r.ok);
      if (!Number.isFinite(n) || !Number.isFinite(ok) || n < 0 || ok < 0 || ok > n) continue;
      s[k] = { n, ok, last: r.last === true ? true : r.last === false ? false : null };
    }
  }
  const h: HistoryEntry[] = Array.isArray(history)
    ? history
        .filter((x): x is HistoryEntry => !!x && typeof x === "object" && Number.isFinite((x as HistoryEntry).d) && typeof (x as HistoryEntry).l === "string")
        .slice(0, 20)
    : [];
  return { stats: s, history: h };
}

/** Modos de estudio (los mismos de la plantilla). */
export type ModeId = "pjs" | "cargo" | "general" | "rapida" | "lk" | "errores";
export type SimSize = 15 | 30 | "Todas";

export function poolFor(d: SimData, stats: Stats, m: ModeId, size: SimSize, rnd = Math.random) {
  const sim = (pool: Question[], label: string) => ({ list: size === "Todas" ? pool : pool.slice(0, size), mode: "sim" as const, label });
  switch (m) {
    case "pjs":
      return sim(shuffle(d.questions.filter((q) => isCase(q)), rnd), "Casos tipo examen");
    case "cargo":
      return sim(shuffle(d.questions.filter((q) => inEje(d, q)), rnd), "Simulacro de mi cargo");
    case "general":
      return sim(shuffle(graded(d), rnd), "Simulacro general");
    case "rapida":
      return { list: shuffle(graded(d), rnd).slice(0, 10), mode: "prac" as const, label: "Práctica rápida" };
    case "lk":
      return { list: shuffle(d.questions.filter(isLikert), rnd), mode: "prac" as const, label: d.comp };
    case "errores": {
      const w = new Set(wrongIds(d, stats));
      return { list: shuffle(d.questions.filter((q) => w.has(q.id)), rnd), mode: "prac" as const, label: "Repaso de errores" };
    }
  }
}
