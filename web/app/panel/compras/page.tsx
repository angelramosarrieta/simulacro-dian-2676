import Link from "next/link";
import type { Metadata } from "next";
import { CreditCard, Receipt } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderBadge } from "@/components/ui/StatusBadge";
import { getBalance, getOrders, PRODUCT_LABEL, requireSession } from "@/lib/data/account";
import { cop, dateTime } from "@/lib/format";
import { reconcilePendingOrders } from "@/lib/payments/reconcile";

export const metadata: Metadata = { title: "Compras y créditos" };

const REASON: Record<string, string> = { purchase: "Compra", generation: "Generación", refund: "Generación devuelta", admin_adjustment: "Ajuste" };
const METHOD: Record<string, string> = { CARD: "Tarjeta", PSE: "PSE", NEQUI: "Nequi", BANCOLOMBIA_TRANSFER: "Bancolombia", BANCOLOMBIA_QR: "QR Bancolombia", DAVIPLATA: "Daviplata" };

export default async function Page() {
  const { supabase, user } = await requireSession();
  await reconcilePendingOrders(user.id);
  const [orders, balance, { data: ledger }] = await Promise.all([
    getOrders(100),
    getBalance(),
    supabase.from("credit_ledger").select("id, delta, reason, note, created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  const visibleOrders = orders.filter((o) => o.status !== "expired" || o.paid_at);

  return (
    <>
      <PageHeader eyebrow="Facturación" title="Compras y créditos" description="Cada compra aprobada suma una generación. Cada generación iniciada usa una." action={<Link href="/panel/comprar" className="btn-primary"><CreditCard className="h-4 w-4" aria-hidden /> Comprar generación</Link>} />

      <div className="card mb-6 flex items-center justify-between p-5">
        <div>
          <p className="text-[13px] text-muted">Saldo actual</p>
          <p className="mt-1 text-[28px] font-semibold">{balance} <span className="text-[15px] font-normal text-muted">{balance === 1 ? "generación disponible" : "generaciones disponibles"}</span></p>
        </div>
        {balance === 0 && <p className="hidden max-w-xs text-right text-[13px] text-muted sm:block">Te quedaste sin generaciones. Compra una para crear otro simulador.</p>}
      </div>

      <section className="card mb-6">
        <h2 className="border-b border-line px-5 py-4 font-medium">Compras</h2>
        {visibleOrders.length === 0 ? (
          <EmptyState icon={Receipt} title="Aún no tienes compras">Cuando pagues tu primer simulador aparecerá aquí.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[14px]">
              <thead className="text-[12.5px] text-muted">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Fecha</th>
                  <th className="px-5 py-2.5 font-medium">Producto</th>
                  <th className="px-5 py-2.5 font-medium">Valor</th>
                  <th className="px-5 py-2.5 font-medium">Medio</th>
                  <th className="px-5 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibleOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-5 py-3 text-muted">{dateTime(o.created_at)}</td>
                    <td className="px-5 py-3">
                      {PRODUCT_LABEL[o.product]}
                      <span className="block font-mono text-[11.5px] text-faint">{o.reference}</span>
                    </td>
                    <td className="px-5 py-3 font-medium">{cop(Number(o.amount_in_cents) / 100)}</td>
                    <td className="px-5 py-3 text-muted">{o.payment_method_type ? METHOD[o.payment_method_type] ?? o.payment_method_type : "—"}</td>
                    <td className="px-5 py-3"><OrderBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="border-b border-line px-5 py-4 font-medium">Movimientos de créditos</h2>
        {!ledger?.length ? (
          <p className="px-5 py-8 text-center text-[14px] text-muted">Sin movimientos todavía.</p>
        ) : (
          <ul className="divide-y divide-line">
            {ledger.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 px-5 py-3 text-[14px]">
                <div className="min-w-0">
                  <p>{REASON[m.reason] ?? m.reason}</p>
                  <p className="truncate text-[12.5px] text-muted">{dateTime(m.created_at)} · {m.note}</p>
                </div>
                <span className={`shrink-0 font-mono font-medium ${m.delta > 0 ? "text-ok" : "text-muted"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
