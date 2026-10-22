import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { integrationStatus, siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkoutUrlFor } from "@/lib/payments/wompi";
import { newReference } from "@/lib/payments/wompi-core";

/**
 * Crea (o reutiliza) la orden pendiente del usuario y devuelve la URL del
 * checkout de Wompi. El precio lo decide la BD (quote_for_user): el
 * navegador no envía monto ni producto.
 */
export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const status = integrationStatus();
  if (!status.wompi) return jsonError(503, "pagos_no_configurados", "Los pagos se están configurando. Intenta de nuevo en unas horas.");
  if (status.wompiEnv === "production" && !status.ai) {
    return jsonError(503, "ia_no_configurada", "Estamos terminando de configurar el generador. Aún no se reciben pagos.");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("full_name, phone, email").eq("id", auth.user.id).single();
  const { data: order, error } = await admin.rpc("create_or_reuse_order", { p_user_id: auth.user.id, p_reference: newReference() });
  if (error || !order) return jsonError(500, "orden_no_creada", "No pudimos crear tu orden. Intenta de nuevo.");

  const url = checkoutUrlFor({
    reference: order.reference,
    amountInCents: Number(order.amount_in_cents),
    redirectUrl: `${siteUrl()}/panel/pagos/resultado`,
    email: profile?.email || auth.user.email,
    name: profile?.full_name || undefined,
    phone: profile?.phone || undefined,
  });
  return NextResponse.json({ url, orderId: order.id, amountInCents: Number(order.amount_in_cents), product: order.product });
}
