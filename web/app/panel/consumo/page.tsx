import type { Metadata } from "next";
import { Activity } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireSession } from "@/lib/data/account";
import { compactNumber, dateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Consumo" };

const STEP = (s: string) => (s === "analysis" ? "Análisis de documentos" : s.startsWith("batch:") ? `Preguntas · ${s.slice(6)}` : s);

export default async function Page() {
  const { supabase } = await requireSession();
  const [{ data: events }, { data: gens }] = await Promise.all([
    supabase.from("usage_events").select("id, generation_id, step, input_tokens, output_tokens, cache_read_tokens, ok, created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("generations").select("id, cargo, opec, status, input_tokens, output_tokens, steps_run, created_at").neq("status", "draft").neq("status", "cancelled").order("created_at", { ascending: false }).limit(50),
  ]);
  const totalIn = (gens ?? []).reduce((s, g) => s + Number(g.input_tokens), 0);
  const totalOut = (gens ?? []).reduce((s, g) => s + Number(g.output_tokens), 0);

  return (
    <>
      <PageHeader eyebrow="Transparencia" title="Consumo" description="Cuánto procesamiento usó cada generación. Cada una tiene un límite fijo, así que nunca se cobra de más por consumo." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><p className="text-[13px] text-muted">Generaciones</p><p className="mt-1 text-[26px] font-semibold">{gens?.length ?? 0}</p></div>
        <div className="card p-5"><p className="text-[13px] text-muted">Tokens leídos</p><p className="mt-1 text-[26px] font-semibold">{compactNumber(totalIn)}</p></div>
        <div className="card p-5"><p className="text-[13px] text-muted">Tokens escritos</p><p className="mt-1 text-[26px] font-semibold">{compactNumber(totalOut)}</p></div>
      </div>

      {!events?.length ? (
        <div className="card"><EmptyState icon={Activity} title="Sin consumo todavía">Cuando generes tu primer simulador verás aquí cada etapa del proceso.</EmptyState></div>
      ) : (
        <section className="card">
          <h2 className="border-b border-line px-5 py-4 font-medium">Operaciones</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[14px]">
              <thead className="text-[12.5px] text-muted">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Fecha</th>
                  <th className="px-5 py-2.5 font-medium">Simulador</th>
                  <th className="px-5 py-2.5 font-medium">Etapa</th>
                  <th className="px-5 py-2.5 text-right font-medium">Entrada</th>
                  <th className="px-5 py-2.5 text-right font-medium">Salida</th>
                  <th className="px-5 py-2.5 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {events.map((e) => {
                  const g = gens?.find((x) => x.id === e.generation_id);
                  return (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap px-5 py-3 text-muted">{dateTime(e.created_at)}</td>
                      <td className="max-w-[180px] truncate px-5 py-3">{g ? `${g.cargo}` : "—"}</td>
                      <td className="max-w-[220px] truncate px-5 py-3">{STEP(e.step)}</td>
                      <td className="px-5 py-3 text-right font-mono">{compactNumber(e.input_tokens + e.cache_read_tokens)}</td>
                      <td className="px-5 py-3 text-right font-mono">{compactNumber(e.output_tokens)}</td>
                      <td className="px-5 py-3">{e.ok ? <span className="badge bg-okSoft text-ok">OK</span> : <span className="badge bg-warnSoft text-warn">Reintento</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
