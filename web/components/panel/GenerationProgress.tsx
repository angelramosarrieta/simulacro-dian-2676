"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

type Status = {
  id: string;
  status: string;
  progress: number;
  currentStep: string | null;
  errorMessage: string | null;
  questionsGenerated: number;
  targetQuestions: number;
  creditRefunded: boolean;
  plan: { eje: string; cantidad: number; generadas: number }[] | null;
};

const ACTIVE = ["queued", "analyzing", "generating", "assembling"];

/** Progreso en vivo de una generación: consulta el estado cada pocos segundos. */
export function GenerationProgress({ id, initial, showPlan = false }: { id: string; initial: Partial<Status> & { status: string }; showPlan?: boolean }) {
  const [s, setS] = useState<Partial<Status> & { status: string }>(initial);
  const [netError, setNetError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const res = await fetch(`/api/generations/${id}`, { cache: "no-store" });
        if (res.ok) {
          const data: Status = await res.json();
          setS(data);
          setNetError(false);
          if (!ACTIVE.includes(data.status)) return;
        } else setNetError(true);
      } catch {
        setNetError(true);
      }
      if (!stop) timer.current = setTimeout(poll, document.hidden ? 15000 : 4000);
    }
    if (ACTIVE.includes(initial.status)) poll();
    return () => {
      stop = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [id, initial.status]);

  if (s.status === "completed")
    return (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 font-medium text-ok">
          <CheckCircle2 className="h-5 w-5" aria-hidden /> Tu simulador está listo
        </p>
        <a href={`/panel/simuladores/${id}`} className="btn-primary">
          Empezar a estudiar <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
      </div>
    );

  if (s.status === "failed")
    return (
      <div>
        <p className="flex items-center gap-2 font-medium text-bad">
          <XCircle className="h-5 w-5" aria-hidden /> No se pudo completar
        </p>
        {s.errorMessage && <p className="mt-1 text-[14px] text-muted">{s.errorMessage}</p>}
        <p className="mt-2 text-[14px] text-muted">
          {s.creditRefunded !== false ? "Te devolvimos el crédito: puedes intentarlo de nuevo sin pagar." : ""}
        </p>
        <Link href="/panel/nueva" className="btn-secondary btn-sm mt-4">
          <RotateCcw className="h-4 w-4" aria-hidden /> Intentar de nuevo
        </Link>
      </div>
    );

  const pct = Math.max(3, Math.min(100, s.progress ?? 3));
  return (
    <div aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-[14px]">
        <p className="flex min-w-0 items-center gap-2 font-medium">
          <Spinner className="h-4 w-4 shrink-0 text-brandInk" />
          <span className="truncate">{s.currentStep || "Preparando…"}</span>
        </p>
        <span className="font-mono text-muted">{pct}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-soft" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[13px] text-muted">
        {s.questionsGenerated ? `${s.questionsGenerated} de ${s.targetQuestions} preguntas · ` : ""}
        Puedes cerrar esta página: seguimos trabajando y tu simulador aparecerá aquí.
      </p>
      {s.errorMessage && <p className="mt-2 text-[13px] text-warn">{s.errorMessage}</p>}
      {netError && <p className="mt-2 text-[13px] text-warn">Sin conexión. Reintentando…</p>}
      {showPlan && s.plan && s.plan.length > 0 && (
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {s.plan.map((p) => (
            <li key={p.eje} className="rounded-xl border border-line px-3 py-2.5 text-[13px]">
              <div className="flex justify-between gap-2">
                <span className="truncate">{p.eje}</span>
                <span className="shrink-0 font-mono text-muted">
                  {p.generadas}/{p.cantidad}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-soft">
                <div className="h-full bg-brand" style={{ width: `${p.cantidad ? Math.min(100, (p.generadas / p.cantidad) * 100) : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
