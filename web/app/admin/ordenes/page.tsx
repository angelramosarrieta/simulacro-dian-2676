import { PageHeader } from "@/components/ui/PageHeader";
import { OrderBadge } from "@/components/ui/StatusBadge";
import { StatusFilter } from "@/components/admin/Filters";
import { requireAdminPage } from "@/lib/admin/auth";
import { emailsFor, userIdsByEmail } from "@/lib/admin/users";
import { cop, dateTime } from "@/lib/format";

const STATES: [string, string][] = [["approved", "Aprobadas"], ["pending", "Pendientes"], ["declined", "Rechazadas"], ["error", "Error"], ["expired", "Vencidas"]];

export default async function Page({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string }> }) {
  const { estado, q } = await searchParams;
  const { admin } = await requireAdminPage();
  const ids = await userIdsByEmail(admin, q);
  let query = admin.from("orders").select("id, user_id, product, amount_in_cents, status, reference, provider_transaction_id, provider_status, payment_method_type, created_at, paid_at").order("created_at", { ascending: false }).limit(200);
  if (estado && STATES.some(([v]) => v === estado)) query = query.eq("status", estado);
  if (ids) query = query.in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const { data: orders } = await query;
  const emails = await emailsFor(admin, (orders ?? []).map((o) => o.user_id));
  const { data: events } = await admin.from("payment_events").select("event_key, reference, error, processed_at, created_at").not("error", "is", null).order("created_at", { ascending: false }).limit(20);

  return (
    <>
      <PageHeader eyebrow="Administración" title="Órdenes" description="Últimas 200 órdenes de pago." />
      <StatusFilter base="/admin/ordenes" current={estado} options={STATES} q={q} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-[13.5px]">
          <thead className="text-[12px] text-muted"><tr className="border-b border-line">
            {["Fecha", "Usuario", "Producto", "Valor", "Medio", "Estado", "Referencia / transacción"].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-line">
            {(orders ?? []).map((o) => (
              <tr key={o.id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted">{dateTime(o.created_at)}</td>
                <td className="max-w-[200px] truncate px-4 py-2.5">{emails.get(o.user_id) ?? o.user_id}</td>
                <td className="px-4 py-2.5">{o.product === "first_generation" ? "Primer simulador" : "Adicional"}</td>
                <td className="px-4 py-2.5 font-medium">{cop(Number(o.amount_in_cents) / 100)}</td>
                <td className="px-4 py-2.5 text-muted">{o.payment_method_type ?? "—"}</td>
                <td className="px-4 py-2.5"><OrderBadge status={o.status} /></td>
                <td className="px-4 py-2.5 font-mono text-[11.5px] text-muted">{o.reference}<br />{o.provider_transaction_id ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders?.length && <p className="px-4 py-10 text-center text-muted">Sin órdenes con este filtro.</p>}
      </div>

      {!!events?.length && (
        <section className="card mt-6">
          <h2 className="border-b border-line px-4 py-3 font-medium">Eventos de Wompi con error</h2>
          <ul className="divide-y divide-line text-[13px]">
            {events.map((e) => (
              <li key={e.event_key} className="px-4 py-2.5">
                <span className="text-muted">{dateTime(e.created_at)}</span> · <span className="font-mono">{e.reference ?? e.event_key}</span> · <span className="text-bad">{e.error}</span>
                {e.processed_at && <span className="text-ok"> · procesado después</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
