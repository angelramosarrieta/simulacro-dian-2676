import { PageHeader } from "@/components/ui/PageHeader";
import { GenerationBadge } from "@/components/ui/StatusBadge";
import { StatusFilter } from "@/components/admin/Filters";
import { requireAdminPage } from "@/lib/admin/auth";
import { emailsFor, userIdsByEmail } from "@/lib/admin/users";
import { compactNumber, dateTime } from "@/lib/format";

const STATES: [string, string][] = [["completed", "Listas"], ["generating", "Generando"], ["analyzing", "Analizando"], ["queued", "En cola"], ["failed", "Fallidas"], ["draft", "Borradores"]];

export default async function Page({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string }> }) {
  const { estado, q } = await searchParams;
  const { admin } = await requireAdminPage();
  const ids = await userIdsByEmail(admin, q);
  let query = admin
    .from("generations")
    .select("id, user_id, status, cargo, opec, nivel, progress, error_code, error_message, cost_usd, input_tokens, output_tokens, steps_run, ai_model, credit_refunded, created_at, started_at, finished_at, target_questions, plan")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(200);
  if (estado && STATES.some(([v]) => v === estado)) query = query.eq("status", estado);
  if (ids) query = query.in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const { data: gens } = await query;
  const emails = await emailsFor(admin, (gens ?? []).map((g) => g.user_id));

  return (
    <>
      <PageHeader eyebrow="Administración" title="Generaciones" description="Estado, consumo y errores de las últimas 200 generaciones." />
      <StatusFilter base="/admin/generaciones" current={estado} options={STATES} q={q} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-[13.5px]">
          <thead className="text-[12px] text-muted"><tr className="border-b border-line">
            {["Creada", "Usuario", "Empleo", "Estado", "Preguntas", "Tokens (ent./sal.)", "Costo", "Duración", "Detalle"].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-line">
            {(gens ?? []).map((g) => {
              const plan = (g.plan ?? []) as { generadas: number }[];
              const done = plan.reduce((s, p) => s + p.generadas, 0);
              const mins = g.started_at && g.finished_at ? ((new Date(g.finished_at).getTime() - new Date(g.started_at).getTime()) / 60000).toFixed(1) : "—";
              return (
                <tr key={g.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted">{dateTime(g.created_at)}</td>
                  <td className="max-w-[180px] truncate px-4 py-2.5">{emails.get(g.user_id) ?? g.user_id}</td>
                  <td className="max-w-[200px] px-4 py-2.5"><span className="line-clamp-2">{g.cargo}</span><span className="text-[12px] text-muted">OPEC {g.opec} · {g.nivel}</span></td>
                  <td className="px-4 py-2.5"><GenerationBadge status={g.status} />{g.credit_refunded && <span className="mt-1 block text-[11.5px] text-muted">Crédito devuelto</span>}</td>
                  <td className="px-4 py-2.5 font-mono">{done}/{g.target_questions}</td>
                  <td className="px-4 py-2.5 font-mono">{compactNumber(Number(g.input_tokens))} / {compactNumber(Number(g.output_tokens))}</td>
                  <td className="px-4 py-2.5 font-mono">US${Number(g.cost_usd).toFixed(3)}</td>
                  <td className="px-4 py-2.5 font-mono">{mins} min</td>
                  <td className="max-w-[260px] px-4 py-2.5 text-[12.5px] text-muted">
                    {g.error_code ? <span className="text-bad">{g.error_code}: {g.error_message}</span> : g.ai_model ?? "—"}
                    <span className="mt-0.5 block font-mono text-[11px] text-faint">{g.id}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!gens?.length && <p className="px-4 py-10 text-center text-muted">Sin generaciones con este filtro.</p>}
      </div>
    </>
  );
}
