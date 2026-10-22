import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WompiTransaction } from "@/lib/payments/wompi-core";
import { notifyPaymentApproved } from "@/lib/email/notify";

/** Aplica una transacción ya verificada contra Wompi (idempotente en la BD). */
export async function applyTransaction(admin: SupabaseClient, tx: WompiTransaction) {
  const { data, error } = await admin.rpc("apply_payment_result", {
    p_reference: tx.reference,
    p_transaction_id: tx.id,
    p_provider_status: tx.status,
    p_amount_in_cents: tx.amount_in_cents,
    p_currency: tx.currency,
    p_payment_method_type: tx.payment_method_type ?? null,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as { order_id: string; user_id: string; status: string; credited: boolean };
  if (row?.status === "approved") await notifyPaymentApproved(admin, row.order_id);
  return row;
}
