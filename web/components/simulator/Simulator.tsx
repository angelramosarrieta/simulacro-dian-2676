"use client";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, ChevronRight, Home, ListChecks, LineChart } from "lucide-react";
import {
  daysLeft,
  fmtScore,
  graded,
  inEje,
  isCase,
  isLikert,
  otherTopics,
  poolFor,
  record,
  sanitizeProgress,
  topicStats,
  totals,
  wrongIds,
  shuffle,
  type HistoryEntry,
  type ModeId,
  type Question,
  type SimData,
  type SimSize,
  type Stats,
} from "@/lib/simulator/engine";
import { ExamView, Meter, ResultView, grade, newSession, type Result, type Session } from "@/components/simulator/Exam";

/**
 * Simulador de estudio integrado en la plataforma (mismos estilos que el panel).
 * - "account": el progreso se guarda en la cuenta (y en el navegador como copia).
 * - "local": demostración pública; el progreso solo vive en este navegador.
 * Las claves del navegador son las mismas de plantilla.html ("simulacro"+OPEC),
 * así se recupera lo que el aspirante estudió en la versión anterior.
 */
export type Persistence =
  | {
      kind: "account";
      generationId: string;
      initial: { stats: unknown; history: unknown; updatedAt: string | null };
      /** Espacio del navegador de un simulador anterior (importado) del que se recupera el progreso una vez. */
      legacyNamespace?: string;
    }
  | { kind: "local"; namespace: string };

type Tab = "inicio" | "practicar" | "progreso" | "guia";
const TABS: [Tab, string, typeof Home][] = [
  ["inicio", "Inicio", Home],
  ["practicar", "Practicar", ListChecks],
  ["progreso", "Progreso", LineChart],
  ["guia", "Guía", BookOpen],
];

function readLocal(ns: string) {
  try {
    const stats = JSON.parse(localStorage.getItem(`${ns}:v1`) ?? "null");
    const hist = JSON.parse(localStorage.getItem(`${ns}:hist`) ?? "null");
    const at = Number(localStorage.getItem(`${ns}:sync`) ?? 0);
    return { stats, hist, at };
  } catch {
    return { stats: null, hist: null, at: 0 };
  }
}
function writeLocal(ns: string, stats: Stats, hist: HistoryEntry[]) {
  try {
    localStorage.setItem(`${ns}:v1`, JSON.stringify(stats));
    localStorage.setItem(`${ns}:hist`, JSON.stringify(hist));
    localStorage.setItem(`${ns}:sync`, String(Date.now()));
  } catch {}
}

/** Los ítems de la guía traen <b> e <i> (contenido propio): se convierten a elementos sin usar HTML crudo. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(<\/?[bi]>)/);
  const out: React.ReactNode[] = [];
  let bold = false, italic = false;
  parts.forEach((p, i) => {
    if (p === "<b>") bold = true;
    else if (p === "</b>") bold = false;
    else if (p === "<i>") italic = true;
    else if (p === "</i>") italic = false;
    else if (p) {
      let node: React.ReactNode = p;
      if (italic) node = <i>{node}</i>;
      if (bold) node = <b className="font-semibold">{node}</b>;
      out.push(<Fragment key={i}>{node}</Fragment>);
    }
  });
  return <>{out}</>;
}

export function Simulator({ data, persistence }: { data: SimData; persistence: Persistence }) {
  const ns = persistence.kind === "local" ? persistence.namespace : `simulacro${data.opec}`;
  const [tab, setTab] = useState<Tab>("inicio");
  const [stats, setStats] = useState<Stats>(() => (persistence.kind === "account" ? sanitizeProgress(persistence.initial.stats, persistence.initial.history).stats : {}));
  const [history, setHistory] = useState<HistoryEntry[]>(() => (persistence.kind === "account" ? sanitizeProgress(persistence.initial.stats, persistence.initial.history).history : []));
  const [size, setSize] = useState<SimSize>(30);
  const [session, setSession] = useState<Session | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const loaded = useRef(false);
  const dirty = useRef(false);
  const saved = useRef(JSON.stringify([stats, history]));
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ stats, history });
  latest.current = { stats, history };

  // Al montar: fecha local (evita diferencias servidor/cliente) y progreso del navegador si es más reciente.
  useEffect(() => {
    setNow(new Date());
    let local = readLocal(ns);
    // Simulador importado: si en este navegador hay progreso del original y la cuenta aún no tiene nada, se trae.
    if (!local.stats && persistence.kind === "account" && persistence.legacyNamespace && !persistence.initial.stats) {
      const old = readLocal(persistence.legacyNamespace);
      if (old.stats) local = { ...old, at: Date.now() };
    }
    const serverAt = persistence.kind === "account" && persistence.initial.updatedAt ? Date.parse(persistence.initial.updatedAt) : 0;
    if (local.stats && (persistence.kind === "local" || local.at > serverAt)) {
      const p = sanitizeProgress(local.stats, local.hist);
      setStats(p.stats);
      setHistory(p.history);
      if (persistence.kind === "account") dirty.current = true;
    }
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = useCallback(
    (beacon: boolean) => {
      if (persistence.kind !== "account" || !dirty.current) return;
      dirty.current = false;
      const url = `/api/simulators/${persistence.generationId}/progress`;
      const body = JSON.stringify({ stats: latest.current.stats, history: latest.current.history });
      try {
        if (beacon && navigator.sendBeacon) {
          navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
          return;
        }
      } catch {}
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, credentials: "same-origin", keepalive: true }).catch(() => {
        dirty.current = true;
      });
    },
    [persistence]
  );

  // Guardar: copia en el navegador al instante y en la cuenta con pausa de 3 s.
  useEffect(() => {
    if (!loaded.current) return;
    const key = JSON.stringify([stats, history]);
    if (key === saved.current) return;
    saved.current = key;
    writeLocal(ns, stats, history);
    if (persistence.kind !== "account") return;
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => send(false), 3000);
  }, [stats, history, ns, persistence.kind, send]);

  useEffect(() => {
    const hide = () => send(true);
    const vis = () => document.visibilityState === "hidden" && send(true);
    addEventListener("pagehide", hide);
    document.addEventListener("visibilitychange", vis);
    return () => {
      removeEventListener("pagehide", hide);
      document.removeEventListener("visibilitychange", vis);
      send(false);
    };
  }, [send]);

  const d = data;
  const cfg = d.config;
  const QG = useMemo(() => graded(d), [d]);
  const wrong = wrongIds(d, stats);
  const T = totals(d, stats);
  const nCargo = d.questions.filter((q) => inEje(d, q)).length;
  const nCasos = d.questions.filter((q) => isCase(q)).length;
  const nLikert = d.questions.filter(isLikert).length;
  const others = otherTopics(d);
  const days = now ? daysLeft(cfg.examen, now) : null;
  const daysLabel = days == null ? "" : days > 1 ? `${days} días` : days === 1 ? "Mañana" : days === 0 ? "Hoy" : "Finalizado";

  function startMode(m: ModeId) {
    const p = poolFor(d, stats, m, size);
    if (p.list.length) setSession(newSession(p.list, p.mode, p.label));
  }
  function startTopic(t: string) {
    const list = shuffle(d.questions.filter((q) => q.t === t));
    if (list.length) setSession(newSession(list, "prac", t));
  }
  const onAnswer = useCallback((q: Question, ok: boolean) => setStats((s) => record(s, q, ok)), []);
  const finish = useCallback(() => {
    const S = sessionRef.current;
    if (!S) return;
    sessionRef.current = null;
    const r = grade(d, S);
    if (S.mode === "sim") {
      const at = Date.now();
      setStats((s) => S.list.reduce((acc, x) => (x.pick !== null ? record(acc, x.q, !isLikert(x.q) && x.pick === x.q.a) : acc), s));
      if (r.n) setHistory((h) => [{ d: at, l: S.label, s: r.score, ok: r.ok, n: r.n }, ...h.filter((x) => x.d !== at)].slice(0, 20));
    }
    setSession(null);
    setResult(r);
  }, [d]);

  if (session) {
    return <ExamView session={session} setSession={setSession} onAnswer={onAnswer} onFinish={finish} onExit={() => setSession(null)} />;
  }
  if (result) {
    return (
      <ResultView
        r={result}
        minimo={cfg.minimo}
        onClose={() => setResult(null)}
        onRetry={
          result.wrong.length
            ? () => {
                const list = shuffle(result.wrong.map((x) => x.q));
                setResult(null);
                setSession(newSession(list, "prac", "Repaso de errores"));
              }
            : null
        }
      />
    );
  }

  const topicRow = (t: string) => {
    if (t === d.comp) {
      return (
        <Row key={t} onClick={() => startTopic(t)} title={t} detail={`${nLikert} afirmaciones · sin calificación`} />
      );
    }
    const s = topicStats(d, stats, t);
    return (
      <Row
        key={t}
        onClick={() => startTopic(t)}
        title={t}
        detail={`${s.seen}/${s.total} vistas${s.acc != null ? ` · ${Math.round(s.acc * 100)}% de aciertos` : ""}`}
        meter={<Meter acc={s.acc} minimo={cfg.minimo} />}
      />
    );
  };

  const weak = d.ejes
    .map((t) => [t, topicStats(d, stats, t)] as const)
    .filter(([, s]) => s.acc != null)
    .sort((a, b) => (a[1].acc ?? 0) - (b[1].acc ?? 0))
    .slice(0, 3)
    .map(([t]) => t);
  const lastResult = history[0];
  const hour = now?.getHours() ?? 12;
  const saludo = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  const kpis = (items: [string, React.ReactNode][]) => (
    <div className="card grid grid-cols-3 divide-x divide-line">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0 px-4 py-3.5">
          <p className="text-[22px] font-semibold tracking-tight tabular-nums">{value}</p>
          <p className="text-[12.5px] text-muted">{label}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Secciones del simulador" className="grid grid-cols-4 gap-1 rounded-xl bg-soft p-1">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[13.5px] font-medium transition ${tab === id ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"}`}
          >
            <Icon className="hidden h-4 w-4 sm:block" aria-hidden /> {label}
          </button>
        ))}
      </div>

      {tab === "inicio" && (
        <div className="space-y-6 animate-fade-up">
          <section className="card overflow-hidden">
            <div className="flex flex-col gap-1 p-5 sm:p-6">
              <p className="text-[14px] text-muted">{saludo}</p>
              <p className="text-[48px] font-semibold leading-none tracking-tight tabular-nums">
                {days == null ? "—" : Math.max(days, 0)}
                <small className="ml-2 text-[16px] font-medium tracking-normal text-muted">{days === 1 ? "día" : "días"} para la prueba</small>
              </p>
              <p className="text-[14px] text-muted">{cfg.examenTexto}</p>
            </div>
            <button type="button" onClick={() => startMode("cargo")} className="flex w-full items-center justify-between gap-4 bg-brand px-5 py-4 text-left text-onBrand transition hover:bg-brand/90 sm:px-6">
              <span>
                <b className="block text-[16px] font-semibold">Simulacro de mi cargo</b>
                <span className="text-[13.5px] opacity-80">{d.ejes.length} ejes oficiales · {nCargo} preguntas · cronometrado</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
            </button>
          </section>
          {kpis([
            ["Aciertos", T.acc == null ? "—" : `${Math.round(T.acc * 100)}%`],
            ["Vistas", <>{T.seen}<span className="text-[13px] font-normal text-muted">/{QG.length}</span></>],
            ["Por repasar", wrong.length],
          ])}
          <Section title="Para reforzar">
            {weak.length ? <List>{weak.map(topicRow)}</List> : <Empty>Cuando practiques, aquí aparecerán los ejes con menos aciertos.</Empty>}
          </Section>
          <Section title="Accesos rápidos">
            <List>
              <Row onClick={() => startMode("pjs")} title="Casos tipo examen" detail="Caso, enunciado y 3 opciones" badge="Formato real" />
              <Row onClick={() => startMode("errores")} disabled={!wrong.length} title="Repasar mis errores" detail={wrong.length ? `${wrong.length} preguntas pendientes` : "Sin errores pendientes"} />
            </List>
          </Section>
          {lastResult && (
            <Section title="Último resultado">
              <List>
                <HistoryRow h={lastResult} minimo={cfg.minimo} />
              </List>
            </Section>
          )}
        </div>
      )}

      {tab === "practicar" && (
        <div className="space-y-6 animate-fade-up">
          <p className="text-[14.5px] text-muted">Los simulacros dan 1,5 minutos por pregunta y muestran las respuestas al final.</p>
          <Section title="Preguntas por simulacro">
            <div role="group" aria-label="Preguntas por simulacro" className="grid max-w-sm grid-cols-3 gap-1 rounded-xl bg-soft p-1">
              {([15, 30, "Todas"] as SimSize[]).map((n) => (
                <button key={n} type="button" aria-pressed={size === n} onClick={() => setSize(n)} className={`rounded-lg py-1.5 text-[13.5px] font-medium ${size === n ? "bg-surface text-ink shadow-card" : "text-muted"}`}>
                  {n}
                </button>
              ))}
            </div>
            <List>
              <Row onClick={() => startMode("pjs")} title="Casos tipo examen" detail={`${nCasos} casos · formato de la prueba`} badge="Formato real" />
              <Row onClick={() => startMode("cargo")} title="Simulacro de mi cargo" detail={`${nCargo} preguntas de tus ${d.ejes.length} ejes · cronometrado`} />
              <Row onClick={() => startMode("general")} title="Simulacro general" detail={`${QG.length} preguntas de todos los temas · cronometrado`} />
              <Row onClick={() => startMode("rapida")} title="Práctica rápida" detail="10 preguntas al azar con explicación inmediata" />
              <Row onClick={() => startMode("lk")} title={d.comp} detail={`${nLikert} afirmaciones en escala de 4 niveles`} />
              <Row onClick={() => startMode("errores")} disabled={!wrong.length} title="Repasar mis errores" detail={wrong.length ? `${wrong.length} preguntas pendientes` : "Sin errores pendientes"} />
            </List>
          </Section>
          <Section title="Ejes oficiales de tu empleo" aside={<span className="font-mono text-[12.5px] text-muted">OPEC {d.opec}</span>}>
            <List>{d.ejes.map(topicRow)}</List>
          </Section>
          <Section title="Competencias comportamentales">
            <List>{topicRow(d.comp)}</List>
          </Section>
          {others.length > 0 && (
            <Section title="Otros temas de apoyo">
              <List>{others.map(topicRow)}</List>
            </Section>
          )}
        </div>
      )}

      {tab === "progreso" && (
        <div className="space-y-6 animate-fade-up">
          <p className="text-[14.5px] text-muted">
            {persistence.kind === "account" ? "Se guarda en tu cuenta: sigue donde quedaste en cualquier dispositivo." : "Se guarda solo en este navegador."}
          </p>
          {kpis([
            ["Aciertos", T.acc == null ? "—" : `${Math.round(T.acc * 100)}%`],
            ["Respuestas", T.n],
            ["Simulacros", history.length],
          ])}
          <Section title="Por eje oficial">
            <List>{d.ejes.map(topicRow)}</List>
            <p className="text-[13px] text-muted">La barra se pone roja cuando los aciertos están por debajo del {cfg.minimo}%.</p>
          </Section>
          <Section title="Historial">
            {history.length ? (
              <List>
                {history.map((h) => (
                  <HistoryRow key={h.d} h={h} minimo={cfg.minimo} withTime />
                ))}
              </List>
            ) : (
              <Empty>Aún no has hecho simulacros cronometrados.</Empty>
            )}
          </Section>
          <div className="space-y-3">
            {!confirmReset ? (
              <button type="button" className="text-[14px] text-muted underline underline-offset-4 hover:text-ink" onClick={() => setConfirmReset(true)}>
                Borrar mi progreso
              </button>
            ) : (
              <div role="alertdialog" className="flex flex-col gap-3 rounded-2xl bg-badSoft p-4 text-[14.5px]">
                <p>¿Borrar aciertos, errores e historial? No se puede deshacer.</p>
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirmReset(false)}>Cancelar</button>
                  <button
                    type="button"
                    className="btn btn-sm text-bad hover:bg-bad/10"
                    onClick={() => {
                      setStats({});
                      setHistory([]);
                      setConfirmReset(false);
                    }}
                  >
                    Borrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "guia" && (
        <div className="space-y-5 animate-fade-up">
          <p className="text-[14.5px] text-muted">Lo esencial de la {cfg.guiaFuente}.</p>
          <div className="card divide-y divide-line overflow-hidden">
            {cfg.guia.map((g, i) => (
              <details key={g.titulo} open={i === 0} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-medium [&::-webkit-details-marker]:hidden">
                  {g.titulo}
                  <ChevronRight className="h-4 w-4 text-muted transition group-open:rotate-90" aria-hidden />
                </summary>
                <ul className="mx-5 mb-5 list-disc space-y-2 pl-4 text-[14.5px] marker:text-faint">
                  {g.items.map((x, k) => (
                    <li key={k}>
                      <RichText text={x} />
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
          <p className="text-[13px] text-muted">
            Las preguntas son originales, redactadas a partir de las normas y de los ejes de tu empleo; las pruebas de la CNSC son reservadas. Herramienta de estudio independiente: no está afiliada a {cfg.entidad}, la CNSC ni el operador del concurso. Verifica siempre la información oficial en SIMO y en cnsc.gov.co.
          </p>
        </div>
      )}
      {daysLabel && <p className="sr-only">Faltan {daysLabel} para la prueba.</p>}
    </div>
  );
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="eyebrow">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
function List({ children }: { children: React.ReactNode }) {
  return <div className="card divide-y divide-line overflow-hidden">{children}</div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line p-4 text-[14px] text-muted">{children}</p>;
}
function Row({ title, detail, onClick, disabled, badge, meter }: { title: string; detail: string; onClick: () => void; disabled?: boolean; badge?: string; meter?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-soft/60 disabled:cursor-not-allowed disabled:opacity-50">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{title}</span>
        <span className="block text-[13px] text-muted">{detail}</span>
        {meter}
      </span>
      {badge && <span className="badge bg-brandSoft text-brandInk">{badge}</span>}
      <ChevronRight className="h-4 w-4 shrink-0 text-faint" aria-hidden />
    </button>
  );
}
function HistoryRow({ h, minimo, withTime }: { h: HistoryEntry; minimo: number; withTime?: boolean }) {
  const date = new Date(h.d).toLocaleString("es-CO", withTime ? { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short" });
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{h.l}</span>
        <span className="block text-[13px] text-muted">{date} · {h.ok}/{h.n} correctas</span>
      </span>
      <span className={`badge ${h.s >= minimo ? "bg-okSoft text-ok" : "bg-badSoft text-bad"}`}>{fmtScore(h.s)}</span>
    </div>
  );
}
