import { describe, expect, it } from "vitest";
import base from "@/lib/simulator/data/base.json";
import { buildSimData, poolFor, record, sanitizeProgress, score, topicStats, totals, wrongIds, type RawQuestion } from "@/lib/simulator/engine";
import { grade, newSession } from "@/components/simulator/Exam";

const job: RawQuestion[] = [
  { t: "Fiscalización", p: 1, cs: "Caso 1", q: "¿Qué hace?", o: ["bien", "mal", "regular"], a: 0, j: ["sí", "no", "no"], r: "ET 1" },
  { t: "Fiscalización", q: "Directa", o: ["bien", "mal", "regular"], a: 0, e: "porque sí", r: "ET 2" },
];
const d = buildSimData({ cargo: "Gestor", opec: "123", ejes: ["Fiscalización"], jobQuestions: job });

describe("motor del simulador", () => {
  it("usa los mismos ids que la plantilla: el banco común primero y luego las del empleo", () => {
    expect(d.questions).toHaveLength(base.common.length + 2);
    expect(d.questions[base.common.length]).toMatchObject({ id: base.common.length, cs: "Caso 1" });
    expect(d.questions.every((q, i) => q.id === i)).toBe(true);
  });

  it("califica como la CNSC: 0-100 con dos decimales truncados", () => {
    expect(score(2, 3)).toBe(66.66);
    expect(score(0, 0)).toBe(0);
  });

  it("registra aciertos y errores; las afirmaciones comportamentales no cuentan", () => {
    const caso = d.questions[base.common.length];
    const likert = d.questions.find((q) => "lk" in q)!;
    let s = record({}, caso, false);
    s = record(s, likert, true);
    expect(Object.keys(s)).toEqual([String(caso.id)]);
    expect(wrongIds(d, s)).toEqual([caso.id]);
    s = record(s, caso, true);
    expect(wrongIds(d, s)).toEqual([]);
    expect(topicStats(d, s, "Fiscalización")).toEqual({ total: 2, seen: 1, acc: 0.5 });
    expect(totals(d, s)).toMatchObject({ seen: 1, n: 2, ok: 1 });
  });

  it("los modos arman el examen correcto", () => {
    expect(poolFor(d, {}, "cargo", 30).list.map((q) => q.t)).toEqual(["Fiscalización", "Fiscalización"]);
    expect(poolFor(d, {}, "rapida", 30).list).toHaveLength(10);
    expect(poolFor(d, {}, "lk", 30).list.every((q) => "lk" in q)).toBe(true);
    expect(poolFor(d, {}, "pjs", 15).mode).toBe("sim");
  });

  it("un simulacro calcula puntaje, temas y preguntas para repasar", () => {
    const s = newSession(job.map((q, i) => ({ ...q, id: base.common.length + i })), "sim", "Prueba");
    s.list[0].pick = 0;
    s.list[1].pick = 1;
    const r = grade(d, s);
    expect(r).toMatchObject({ ok: 1, n: 2, score: 50, sim: true });
    expect(r.wrong).toHaveLength(1);
    expect(r.byTopic).toEqual([{ t: "Fiscalización", n: 2, ok: 1 }]);
    expect(s.end).toBeGreaterThan(Date.now() + 170_000);
  });

  it("descarta progreso guardado con forma inválida", () => {
    const p = sanitizeProgress({ "1": { n: 2, ok: 1, last: false }, x: { n: 1 }, "2": { n: 1, ok: 5 } }, [{ d: 1, l: "a", s: 50, ok: 1, n: 2 }, "basura"]);
    expect(p.stats).toEqual({ "1": { n: 2, ok: 1, last: false } });
    expect(p.history).toHaveLength(1);
    expect(sanitizeProgress(null, null)).toEqual({ stats: {}, history: [] });
  });
});
