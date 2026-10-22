"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  LIKERT,
  SECONDS_PER_QUESTION,
  fmtScore,
  isCase,
  isLikert,
  score,
  shuffle,
  type Question,
  type SimData,
} from "@/lib/simulator/engine";

export type Item = { q: Question; order: number[]; pick: number | null };
export type Session = { list: Item[]; i: number; mode: "sim" | "prac"; label: string; end: number | null };
export type Result = {
  label: string;
  sim: boolean;
  ok: number;
  n: number;
  score: number;
  byTopic: { t: string; n: number; ok: number }[];
  wrong: Item[];
  likert: number;
  likertTop: number;
};

const LETTERS = "ABCD";

export function newSession(list: Question[], mode: "sim" | "prac", label: string): Session {
  const timed = list.filter((q) => !isLikert(q)).length;
  return {
    list: list.map((q) => ({ q, order: isLikert(q) ? [0, 1, 2, 3] : shuffle([0, 1, 2]), pick: null })),
    i: 0,
    mode,
    label,
    end: mode === "sim" ? Date.now() + timed * SECONDS_PER_QUESTION * 1000 : null,
  };
}

export function grade(d: SimData, s: Session): Result {
  const graded = s.list.filter((x) => !isLikert(x.q));
  const likert = s.list.filter((x) => isLikert(x.q) && x.pick !== null);
  const correct = (x: Item) => !isLikert(x.q) && x.pick === x.q.a;
  const ok = graded.filter(correct).length;
  const topicsSeen = [...new Set(d.questions.map((q) => q.t))];
  return {
    label: s.label,
    sim: s.mode === "sim",
    ok,
    n: graded.length,
    score: score(ok, graded.length),
    byTopic: topicsSeen
      .map((t) => {
        const xs = graded.filter((x) => x.q.t === t);
        return { t, n: xs.length, ok: xs.filter(correct).length };
      })
      .filter((x) => x.n),
    wrong: graded.filter((x) => !correct(x)),
    likert: likert.length,
    likertTop: likert.filter((x) => x.pick === 3).length,
  };
}

/** Pantalla completa de examen o práctica: tapa el panel para concentrarse. */
export function Shell({ title, subtitle, onClose, right, progress, footer, children }: {
  title: string;
  subtitle: string;
  onClose: () => void;
  right?: React.ReactNode;
  progress: number;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex flex-col bg-bg" data-shell>
      <header className="border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto grid h-14 max-w-2xl grid-cols-[40px_1fr_auto] items-center gap-2 px-4">
          <button type="button" onClick={onClose} aria-label="Salir" className="grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-soft hover:text-ink">
            <X className="h-5 w-5" aria-hidden />
          </button>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[14.5px] font-medium">{title}</p>
            <p className="font-mono text-[12px] text-muted">{subtitle}</p>
          </div>
          {right ?? <span />}
        </div>
        <div className="h-0.5 bg-line">
          <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto" data-scroll>
        <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">{children}</div>
      </div>
      <footer className="border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2.5 px-4 py-3">{footer}</div>
      </footer>
    </div>
  );
}

function ConfirmBox({ text, yes, onYes, onNo }: { text: string; yes: string; onYes: () => void; onNo: () => void }) {
  return (
    <div role="alertdialog" className="flex flex-col gap-3 rounded-2xl bg-badSoft p-4 text-[14.5px]">
      <p>{text}</p>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary btn-sm" onClick={onNo}>Seguir</button>
        <button type="button" className="btn-sm btn text-bad hover:bg-bad/10" onClick={onYes}>{yes}</button>
      </div>
    </div>
  );
}

function Timer({ end, onTimeout }: { end: number; onTimeout: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = end - now;
  useEffect(() => {
    if (ms <= 0 && !fired.current) {
      fired.current = true;
      onTimeout();
    }
  }, [ms, onTimeout]);
  const left = Math.max(0, ms);
  const m = Math.floor(left / 6e4), s = Math.floor(left / 1e3) % 60;
  return (
    <span role="timer" aria-label="Tiempo restante" className={`rounded-full px-2.5 py-1 font-mono text-[13px] tabular-nums ${left < 12e4 ? "bg-badSoft text-bad" : "bg-soft"}`}>
      {m}:{String(s).padStart(2, "0")}
    </span>
  );
}

export function ExamView({ session, setSession, onAnswer, onFinish, onExit }: {
  session: Session;
  setSession: (s: Session) => void;
  /** Práctica: registra el primer intento de cada pregunta. */
  onAnswer: (q: Question, ok: boolean) => void;
  onFinish: () => void;
  onExit: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const S = session;
  const it = S.list[S.i];
  const q = it.q;
  const n = S.list.length;
  const sim = S.mode === "sim";
  const answered = it.pick !== null;
  const likert = isLikert(q);
  const locked = answered && !sim && !likert;
  const done = S.list.filter((x) => x.pick !== null).length;
  const last = S.i === n - 1;
  const scrollTop = () => document.querySelector("[data-scroll]")?.scrollTo({ top: 0 });

  function pick(oi: number) {
    if (locked) return;
    const first = it.pick === null;
    const list = S.list.slice();
    list[S.i] = { ...it, pick: oi };
    setSession({ ...S, list });
    if (!sim && first && !likert) onAnswer(q, oi === q.a);
  }
  const goTo = (i: number) => {
    setSession({ ...S, i });
    scrollTop();
  };

  const texts = likert ? LIKERT : q.o;
  return (
    <Shell
      title={S.label}
      subtitle={`${S.i + 1} de ${n}`}
      onClose={() => setConfirm(true)}
      right={S.end ? <Timer end={S.end} onTimeout={onFinish} /> : undefined}
      progress={(sim ? done : S.i + (answered ? 1 : 0)) / n}
      footer={
        <>
          {sim && (
            <button type="button" className="btn-secondary flex-1" disabled={S.i === 0} onClick={() => goTo(S.i - 1)}>
              Anterior
            </button>
          )}
          {!last ? (
            <button type="button" className="btn-primary flex-1" disabled={!sim && !answered} onClick={() => goTo(S.i + 1)}>
              Siguiente
            </button>
          ) : (
            <button type="button" className="btn-primary flex-1" disabled={!sim && !answered} onClick={onFinish}>
              {sim ? "Terminar y calificar" : "Ver resultado"}
            </button>
          )}
        </>
      }
    >
      {confirm && (
        <ConfirmBox
          text={sim ? "¿Salir del simulacro? No se calificará." : "¿Salir? Tus respuestas ya quedaron guardadas."}
          yes="Salir"
          onYes={onExit}
          onNo={() => setConfirm(false)}
        />
      )}
      <p className="eyebrow">{q.t}</p>
      {isCase(q) && (
        <div className="card flex flex-col gap-1.5 p-4">
          <span className="eyebrow">Caso</span>
          <p className="text-[15px]">{q.cs}</p>
        </div>
      )}
      {isCase(q) && <span className="eyebrow -mb-2">Enunciado</span>}
      {likert && <span className="eyebrow -mb-2">Afirmación · {q.k}</span>}
      <p className="text-[18px] font-medium leading-snug tracking-tight">{q.q}</p>

      <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Opciones">
        {it.order.map((oi, k) => {
          let tone = "border-line bg-surface";
          let letter = "bg-soft text-muted";
          if (answered) {
            if (sim || likert) {
              if (it.pick === oi) {
                tone = "border-brand bg-brandSoft/40";
                letter = "bg-brand text-onBrand";
              }
            } else if (oi === q.a) {
              tone = "border-ok bg-okSoft";
              letter = "bg-ok text-surface";
            } else if (it.pick === oi) {
              tone = "border-bad bg-badSoft";
              letter = "bg-bad text-surface";
            }
          }
          return (
            <button
              key={oi}
              type="button"
              role="radio"
              aria-checked={it.pick === oi}
              disabled={locked}
              onClick={() => pick(oi)}
              className={`grid grid-cols-[28px_1fr] items-start gap-3 rounded-xl border p-3.5 text-left text-[15px] transition ${tone} ${locked ? "cursor-default" : "hover:border-muted"}`}
            >
              <span className={`grid h-7 w-7 place-items-center rounded-lg font-mono text-[13px] ${letter}`}>{LETTERS[k]}</span>
              <span>{texts[oi]}</span>
            </button>
          );
        })}
      </div>

      {answered && !sim && <Feedback it={it} />}

      {sim && (
        <div className="flex flex-col gap-2.5">
          <span className="eyebrow">{done} de {n} respondidas</span>
          <div className="flex flex-wrap gap-1.5">
            {S.list.map((x, k) => (
              <button
                key={k}
                type="button"
                aria-label={`Pregunta ${k + 1}`}
                aria-current={k === S.i ? "step" : undefined}
                onClick={() => goTo(k)}
                className={`h-9 w-9 rounded-lg border font-mono text-[12px] ${k === S.i ? "border-brand text-brandInk" : "border-line"} ${x.pick !== null ? "bg-soft text-ink" : "bg-surface text-muted"}`}
              >
                {k + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

function Feedback({ it }: { it: Item }) {
  const q = it.q;
  if (isLikert(q)) {
    return (
      <div className="flex flex-col gap-1.5 rounded-xl border-l-[3px] border-brand bg-surface p-4 text-[14.5px]">
        <strong>Sin respuesta correcta</strong>
        <span>Competencia: {q.k}.</span>
        <span className="text-muted">
          Elige lo que de verdad haces normalmente. Si respondes casi todo con &quot;Totalmente de acuerdo&quot;, las escalas de control pueden marcarlo como deseabilidad social.
        </span>
      </div>
    );
  }
  const ok = it.pick === q.a;
  return (
    <div className={`flex flex-col gap-2 rounded-xl border-l-[3px] bg-surface p-4 text-[14.5px] ${ok ? "border-ok" : "border-bad"}`}>
      <strong className={ok ? "text-ok" : "text-bad"}>{ok ? "Correcto" : "Incorrecto"}</strong>
      {!ok && (
        <span>
          Clave <b>{LETTERS[it.order.indexOf(q.a)]}</b> · {q.o[q.a]}
        </span>
      )}
      {isCase(q) ? (
        <>
          <span className="text-muted">{q.j[q.a]}</span>
          {!ok && it.pick !== null && (
            <span className="text-muted">
              <b className="text-ink">Tu opción {LETTERS[it.order.indexOf(it.pick)]}:</b> {q.j[it.pick]}
            </span>
          )}
        </>
      ) : (
        <span className="text-muted">{q.e}</span>
      )}
      <span className="font-mono text-[12px] text-muted">{q.r}</span>
    </div>
  );
}

export function ResultView({ r, minimo, onClose, onRetry }: { r: Result; minimo: number; onClose: () => void; onRetry: (() => void) | null }) {
  return (
    <Shell
      title="Resultado"
      subtitle={r.label}
      onClose={onClose}
      progress={1}
      footer={
        <>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Volver</button>
          {onRetry && (
            <button type="button" className="btn-primary flex-1" onClick={onRetry}>
              Practicar las {r.wrong.length} falladas
            </button>
          )}
        </>
      }
    >
      {r.n ? (
        <section className="flex flex-col gap-2">
          <p className="text-[56px] font-semibold leading-none tracking-tight tabular-nums">
            {fmtScore(r.score)}
            <small className="ml-2 text-[17px] font-medium tracking-normal text-muted">de 100</small>
          </p>
          <p className="flex flex-wrap items-center gap-2 text-[15px]">
            {r.ok} de {r.n} correctas
            {r.score >= minimo ? (
              <span className="badge bg-okSoft text-ok">Supera el mínimo de {fmtScore(minimo)}</span>
            ) : (
              <span className="badge bg-badSoft text-bad">Por debajo de {fmtScore(minimo)}</span>
            )}
          </p>
        </section>
      ) : (
        <section className="flex flex-col gap-2">
          <h2 className="text-[26px] font-semibold tracking-tight">Listo</h2>
          <p className="text-muted">
            Respondiste {r.likert} {r.likert === 1 ? "afirmación" : "afirmaciones"} y marcaste &quot;Totalmente de acuerdo&quot; en {r.likertTop}.
            {r.likert && r.likertTop / r.likert > 0.8 ? " Es una proporción muy alta: en la prueba real puede leerse como deseabilidad social." : ""}
          </p>
        </section>
      )}
      {r.byTopic.length > 1 && (
        <section className="flex flex-col gap-2.5">
          <h3 className="eyebrow">Por tema</h3>
          <div className="card divide-y divide-line overflow-hidden">
            {r.byTopic.map((b) => (
              <div key={b.t} className="px-4 py-3">
                <div className="flex justify-between gap-3 text-[14.5px]">
                  <span className="font-medium">{b.t}</span>
                  <span className="font-mono text-muted">{Math.round((b.ok / b.n) * 100)}%</span>
                </div>
                <p className="text-[13px] text-muted">{b.ok} de {b.n}</p>
                <Meter acc={b.ok / b.n} minimo={minimo} />
              </div>
            ))}
          </div>
        </section>
      )}
      {r.wrong.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h3 className="eyebrow">Para repasar · {r.wrong.length}</h3>
          <div className="card divide-y divide-line overflow-hidden">
            {r.wrong.map((x) => {
              const q = x.q;
              if (isLikert(q)) return null;
              return (
                <div key={q.id} className="flex flex-col gap-1.5 p-4 text-[14.5px]">
                  <span className="eyebrow">{q.t}</span>
                  {isCase(q) && <span className="text-muted">{q.cs}</span>}
                  <b className="font-medium">{q.q}</b>
                  {x.pick !== null ? <span className="text-bad">Tu respuesta: {q.o[x.pick]}</span> : <span className="text-muted">Sin responder</span>}
                  <span className="font-medium text-ok">Correcta: {q.o[q.a]}</span>
                  <span className="text-muted">{isCase(q) ? q.j[q.a] : q.e}</span>
                  <span className="font-mono text-[12px] text-muted">{q.r}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </Shell>
  );
}

export function Meter({ acc, minimo }: { acc: number | null; minimo: number }) {
  return (
    <div className="mt-2 h-1 overflow-hidden rounded-full bg-soft" aria-hidden>
      {acc != null && <div className={`h-full rounded-full ${acc < minimo / 100 ? "bg-bad" : "bg-brand"}`} style={{ width: `${Math.round(acc * 100)}%` }} />}
    </div>
  );
}
