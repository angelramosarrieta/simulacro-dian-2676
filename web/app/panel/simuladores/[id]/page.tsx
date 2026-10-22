import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Download, ExternalLink, Smartphone } from "lucide-react";
import { GenerationProgress } from "@/components/panel/GenerationProgress";
import { GenerationBadge } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { requireSession } from "@/lib/data/account";
import { compactNumber, dateTime } from "@/lib/format";
import { UUID_RE } from "@/lib/security";

export const metadata: Metadata = { title: "Detalle del simulador" };

type Plan = { eje: string; cantidad: number; generadas: number }[];

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nuevo?: string }> }) {
  const { id } = await params;
  const { nuevo } = await searchParams;
  if (!UUID_RE.test(id)) notFound();
  const { supabase } = await requireSession();
  const { data: g } = await supabase
    .from("generations")
    .select("id, status, cargo, nivel, opec, modalidad, progress, current_step, error_message, target_questions, questions, plan, created_at, started_at, finished_at, credit_refunded, input_tokens, output_tokens")
    .eq("id", id)
    .maybeSingle();
  if (!g || g.status === "cancelled") notFound();
  const plan = (g.plan ?? []) as Plan;
  const total = Array.isArray(g.questions) ? g.questions.length : 0;
  const casos = Array.isArray(g.questions) ? g.questions.filter((q: { p?: number }) => q.p === 1).length : 0;

  return (
    <div className="space-y-6">
      <Link href="/panel/simuladores" className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Mis simuladores
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold tracking-tight">{g.cargo}</h1>
          <p className="mt-1 text-[14px] text-muted">OPEC {g.opec} · {g.nivel} · {g.modalidad} · creado el {dateTime(g.created_at)}</p>
        </div>
        <GenerationBadge status={g.status} />
      </div>

      {nuevo && g.status !== "completed" && g.status !== "failed" && (
        <Alert tone="success" title="¡Empezamos!">Estamos leyendo tus documentos. Tarda entre 10 y 20 minutos; puedes cerrar esta página.</Alert>
      )}

      <section className="card p-5 sm:p-6">
        {g.status === "draft" ? (
          <p className="text-[14px] text-muted">
            Este simulador aún no se ha generado. <Link className="link" href="/panel/nueva">Continuar</Link>
          </p>
        ) : (
          <GenerationProgress
            id={g.id}
            showPlan
            initial={{ status: g.status, progress: g.progress, currentStep: g.current_step, errorMessage: g.error_message, creditRefunded: g.credit_refunded, plan, questionsGenerated: total, targetQuestions: g.target_questions }}
          />
        )}
      </section>

      {g.status === "completed" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-5"><p className="text-[13px] text-muted">Preguntas de tu empleo</p><p className="mt-1 text-[26px] font-semibold">{total}</p></div>
            <div className="card p-5"><p className="text-[13px] text-muted">Casos de juicio situacional</p><p className="mt-1 text-[26px] font-semibold">{casos}</p></div>
            <div className="card p-5"><p className="text-[13px] text-muted">Ejes cubiertos</p><p className="mt-1 text-[26px] font-semibold">{plan.filter((p) => p.generadas > 0).length}</p></div>
          </div>
          <section className="card p-5 sm:p-6">
            <h2 className="font-medium">Preguntas por eje</h2>
            <ul className="mt-4 divide-y divide-line text-[14px]">
              {plan.filter((p) => p.generadas > 0).map((p) => (
                <li key={p.eje} className="flex justify-between gap-4 py-2.5">
                  <span>{p.eje}</span>
                  <span className="shrink-0 font-mono text-muted">{p.generadas}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[13px] text-muted">Además incluye el banco común (77 preguntas) y 17 afirmaciones comportamentales.</p>
          </section>
          <section className="card p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href={`/s/${g.id}`} target="_blank" rel="noopener" className="btn-primary">Abrir simulador <ExternalLink className="h-4 w-4" aria-hidden /></a>
              <a href={`/s/${g.id}?descargar=1`} className="btn-secondary"><Download className="h-4 w-4" aria-hidden /> Descargar archivo</a>
            </div>
            <div className="mt-5 flex gap-3 rounded-xl bg-soft/70 p-4 text-[13.5px] text-muted">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-brandInk" aria-hidden />
              <p>
                <b className="text-ink">Agrégalo a tu celular:</b> ábrelo y en iPhone (Safari) toca Compartir → <i>Agregar a pantalla de inicio</i>; en Android (Chrome), menú ⋮ → <i>Agregar a pantalla principal</i>. Tu progreso se guarda en ese dispositivo.
              </p>
            </div>
          </section>
          <p className="text-[12.5px] text-muted">
            Las preguntas las redacta una IA a partir de normas públicas y pueden tener errores, sobre todo en plazos y cifras. Compáralas siempre con la norma citada.
            Consumo de esta generación: {compactNumber(Number(g.input_tokens))} tokens de entrada y {compactNumber(Number(g.output_tokens))} de salida.
          </p>
        </>
      )}
    </div>
  );
}
