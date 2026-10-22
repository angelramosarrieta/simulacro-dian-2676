import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyTransaction } from "@/lib/payments/apply";
import { findTransactionsByReference } from "@/lib/payments/wompi";

/**
 * Concilia las órdenes pendientes del usuario consultando a Wompi por
 * referencia (respaldo si el webhook no llegó; p. ej. PSE que tarda). Requiere
 * WOMPI_PRIVATE_KEY; sin ella no hace nada. Nunca lanza: es best effort.
 */
export async function reconcilePendingOrders(userId: string) {
  if (!process.env.WOMPI_PRIVATE_KEY) return 0;
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const { data: pending } = await admin
      .from("orders")
      .select("reference")
      .eq("user_id", userId)
      .in("status", ["pending", "expired"])
      .is("paid_at", null)
      .gte("created_at", since)
      .limit(5);
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
