import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyTransaction } from "@/lib/payments/apply";
import { fetchTransaction } from "@/lib/payments/wompi";
import { requireSession } from "@/lib/data/account";
import { cop } from "@/lib/format";
import { RefreshButton } from "@/components/panel/RefreshButton";

export const metadata: Metadata = { title: "Resultado del pago" };

/**
 * Wompi redirige aquí con ?id=<transacción>. El estado se verifica en el
 * servidor contra la API de Wompi (nunca se confía en la URL) y solo se
 * aplica si la referencia pertenece a una orden de este usuario. El webhook
 * hace lo mismo en paralelo; la BD garantiza que no se acredite dos veces.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const { user } = await requireSession();
  let state: "approved" | "pending" | "failed" | "unknown" = "unknown";
  let amount = 0;

  if (id) {
    try {
      const tx = await fetchTransaction(id);
      const admin = createAdminClient();
      const { data: order } = await admin.from("orders").select("id, user_id, amount_in_cents").eq("reference", tx.reference).maybeSingle();
      if (order && order.user_id === user.id) {
        const applied = await applyTransaction(admin, tx);
        amount = Number(order.amount_in_cents) / 100;
        state = applied.status === "approved" ? "approved" : applied.status === "pending" ? "pending" : "failed";
      }
    } catch {
      state = "unknown";
    }
  }

  const view = {
    approved: { icon: CheckCircle2, color: "text-ok bg-okSoft", title: "¡Pago aprobado!", text: `Recibimos tu pago${amount ? ` de ${cop(amount)}` : ""}. Ya tienes una generación disponible.` },
    pending: { icon: Clock, color: "text-warn bg-warnSoft", title: "Tu pago está en proceso", text: "Algunos medios (como PSE) tardan unos minutos en confirmar. Te avisaremos en tu panel apenas se apruebe; no necesitas pagar de nuevo." },
    failed: { icon: XCircle, color: "text-bad bg-badSoft", title: "El pago no se completó", text: "La transacción fue rechazada o anulada y no se hizo ningún cobro. Puedes intentarlo de nuevo con otro medio de pago." },
    unknown: { icon: Clock, color: "text-muted bg-soft", title: "Estamos verificando tu pago", text: "No pudimos confirmar el estado todavía. Si ya pagaste, en unos minutos aparecerá en Compras y créditos." },
  }[state];

  return (
    <div className="mx-auto max-w-lg py-6 text-center">
      <span className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${view.color}`}>
        <view.icon className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="mt-5 text-[26px] font-semibold tracking-tight">{view.title}</h1>
      <p className="mt-2 text-[15px] text-muted">{view.text}</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {state === "approved" && <Link href="/panel/nueva" className="btn-primary">Continuar con mi simulador</Link>}
        {state === "failed" && <Link href="/panel/nueva" className="btn-primary">Intentar de nuevo</Link>}
        {(state === "pending" || state === "unknown") && <RefreshButton />}
        <Link href="/panel/compras" className="btn-secondary">Ver mis compras</Link>
      </div>
    </div>
  );
}
