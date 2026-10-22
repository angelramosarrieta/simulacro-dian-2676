import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Download, Smartphone } from "lucide-react";
import { GenerationProgress } from "@/components/panel/GenerationProgress";
import { GenerationBadge } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { requireSession } from "@/lib/data/account";
import { compactNumber, dateTime } from "@/lib/format";
import { UUID_RE } from "@/lib/security";
import { Simulator } from "@/components/simulator/Simulator";
import { buildSimData, type RawQuestion } from "@/lib/simulator/engine";

export const metadata: Metadata = { title: "Mi simulador" };

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

  if (g.status === "completed") {
    const jobQuestions = (Array.isArray(g.questions) ? g.questions : []) as RawQuestion[];
    const ejes = plan.map((p) => p.eje).filter((e) => jobQuestions.some((q) => q.t === e));
    const data = buildSimData({ cargo: g.cargo, opec: g.opec, ejes, jobQuestions });
    const { data: progress } = await supabase.from("simulator_progress").select("stats, history, updated_at").eq("generation_id", g.id).maybeSingle();
    return (
      <div className="space-y-6">
        <Link href="/panel/simuladores" className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Mis simuladores
        </Link>
        <div className="min-w-0">
          <p className="eyebrow mb-1.5">Simulador · OPEC {g.opec}</p>
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight sm:text-[28px]">{g.cargo}</h1>
          <p className="mt-1 text-[14px] text-muted">{g.nivel} · {g.modalidad} · {data.questions.length} preguntas</p>
        </div>
        <Simulator data={data} persistence={{ kind: "account", generationId: g.id, initial: { stats: progress?.stats ?? null, history: progress?.history ?? null, updatedAt: progress?.updated_at ?? null } }} />
        <details className="card group p-5 sm:p-6">
          <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
            Detalles de tu simulador <span className="text-muted group-open:hidden">· ver</span>
          </summary>
          <div className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-soft/70 p-4"><p className="text-[13px] text-muted">Preguntas de tu empleo</p><p className="mt-1 text-[22px] font-semibold">{total}</p></div>
              <div className="rounded-xl bg-soft/70 p-4"><p className="text-[13px] text-muted">Casos de juicio situacional</p><p className="mt-1 text-[22px] font-semibold">{casos}</p></div>
              <div className="rounded-xl bg-soft/70 p-4"><p className="text-[13px] text-muted">Ejes cubiertos</p><p className="mt-1 text-[22px] font-semibold">{ejes.length}</p></div>
            </div>
            <ul className="divide-y divide-line text-[14px]">
              {plan.filter((p) => p.generadas > 0).map((p) => (
                <li key={p.eje} className="flex justify-between gap-4 py-2.5">
                  <span>{p.eje}</span>
                  <span className="shrink-0 font-mono text-muted">{p.generadas}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 rounded-xl bg-soft/70 p-4 text-[13.5px] text-muted sm:flex-row sm:items-center sm:justify-between">
              <p className="flex gap-3">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-brandInk" aria-hidden />
                <span><b className="text-ink">¿Sin internet el día del examen?</b> Descarga el archivo y ábrelo en tu navegador; ese archivo guarda el progreso solo en ese dispositivo.</span>
              </p>
              <a href={`/s/${g.id}?descargar=1`} className="btn-secondary btn-sm shrink-0"><Download className="h-4 w-4" aria-hidden /> Descargar</a>
            </div>
            <p className="text-[12.5px] text-muted">
              Las preguntas las redacta una IA a partir de normas públicas y pueden tener errores, sobre todo en plazos y cifras. Compáralas siempre con la norma citada.
              {Number(g.input_tokens) > 0 && <> Consumo de esta generación: {compactNumber(Number(g.input_tokens))} tokens de entrada y {compactNumber(Number(g.output_tokens))} de salida.</>}
            </p>
          </div>
        </details>
      </div>
    );
  }

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

    </div>
  );
}
