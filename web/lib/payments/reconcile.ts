import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyTransaction } from "@/lib/payments/apply";
import { findTransactionsByReference } from "@/lib/payments/wompi";
import { getCfg } from "@/lib/config/runtime";

/**
 * Concilia órdenes pendientes consultando a Wompi por referencia (respaldo si
 * el webhook no llegó; p. ej. PSE que tarda). Sin `userId` revisa las de todos
 * (cron diario). Requiere WOMPI_PRIVATE_KEY; sin ella no hace nada. Nunca lanza.
 */
export async function reconcilePendingOrders(userId?: string, limit = 5) {
  try {
    if (!(await getCfg("WOMPI_PRIVATE_KEY"))) return 0;
    const admin = createAdminClient();
    const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
    let q = admin.from("orders").select("reference").in("status", ["pending", "expired"]).is("paid_at", null).gte("created_at", since).order("created_at", { ascending: false }).limit(limit);
    if (userId) q = q.eq("user_id", userId);
    const { data: pending } = await q;
    let applied = 0;
    for (const o of pending ?? []) {
      const txs = await findTransactionsByReference(o.reference);
      // Si hay varias (reintentos de pago), primero la aprobada.
      const tx = txs.find((t) => t.status === "APPROVED") ?? txs[0];
      if (tx && tx.reference === o.reference && tx.status !== "PENDING") {
        await applyTransaction(admin, tx);
        applied++;
      }
    }
    return applied;
  } catch {
    return 0;
  }
}
