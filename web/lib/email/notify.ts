import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { siteUrl } from "@/lib/env";
import { cop } from "@/lib/format";
import { alertAdmin, sendEmail } from "@/lib/email/send";
import { generationFailedEmail, paymentReceiptEmail, simulatorReadyEmail } from "@/lib/email/templates";

const PRODUCT: Record<string, string> = { first_generation: "Primer simulador", additional_generation: "Generación adicional" };
const METHOD: Record<string, string> = { CARD: "Tarjeta", PSE: "PSE", NEQUI: "Nequi", BANCOLOMBIA_TRANSFER: "Bancolombia", BANCOLOMBIA_QR: "QR Bancolombia", DAVIPLATA: "Daviplata" };

async function recipient(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from("profiles").select("email, full_name").eq("id", userId).maybeSingle();
  return { email: data?.email ?? "", name: (data?.full_name || data?.email?.split("@")[0] || "").split(" ")[0] || "hola" };
}

/** Aviso al terminar una generación (lista o fallida). Se envía una sola vez. Nunca lanza. */
export async function notifyGenerationFinished(admin: SupabaseClient, generationId: string) {
  try {
    const { data: claimed } = await admin.rpc("claim_generation_notice", { p_generation_id: generationId });
    if (!claimed) return;
    const { data: g } = await admin
      .from("generations")
      .select("id, user_id, status, cargo, opec, questions, error_code, error_message, credit_refunded, cost_usd")
      .eq("id", generationId)
      .single();
    if (!g) return;
    const to = await recipient(admin, g.user_id);
    if (g.status === "completed") {
      const mail = simulatorReadyEmail({ name: to.name, cargo: g.cargo, opec: g.opec, questions: Array.isArray(g.questions) ? g.questions.length : 0, url: `${siteUrl()}/panel/simuladores/${g.id}` });
      await sendEmail({ to: to.email, ...mail });
    } else if (g.status === "failed") {
      const mail = generationFailedEmail({ name: to.name, cargo: g.cargo, reason: g.error_message || "Error inesperado", refunded: g.credit_refunded, url: `${siteUrl()}/panel/nueva` });
      await sendEmail({ to: to.email, ...mail });
      // Las fallas por documentos del usuario no necesitan atención del administrador.
      if (g.error_code !== "documentos_invalidos") {
        await alertAdmin(`Generación fallida (${g.error_code})`, [
          `Generación: ${g.id}`,
          `Usuario: ${to.email}`,
          `Empleo: ${g.cargo} · OPEC ${g.opec}`,
          `Error: ${g.error_code} — ${g.error_message}`,
          `Costo IA: US$${Number(g.cost_usd).toFixed(4)} · Crédito devuelto: ${g.credit_refunded ? "sí" : "no"}`,
          `Panel: ${siteUrl()}/admin/generaciones`,
        ]);
      }
    }
  } catch (e) {
    console.error("Aviso de generación no enviado:", e instanceof Error ? e.message : e);
  }
}

/** Comprobante de pago aprobado. Se envía una sola vez. Nunca lanza. */
export async function notifyPaymentApproved(admin: SupabaseClient, orderId: string) {
  try {
    const { data: claimed } = await admin.rpc("claim_order_receipt", { p_order_id: orderId });
    if (!claimed) return;
    const { data: o } = await admin.from("orders").select("user_id, product, amount_in_cents, reference, payment_method_type").eq("id", orderId).single();
    if (!o) return;
    const to = await recipient(admin, o.user_id);
    const mail = paymentReceiptEmail({
      name: to.name,
      product: PRODUCT[o.product] ?? o.product,
      amount: cop(Number(o.amount_in_cents) / 100),
      reference: o.reference,
      method: o.payment_method_type ? METHOD[o.payment_method_type] ?? o.payment_method_type : null,
      url: `${siteUrl()}/panel/nueva`,
    });
    await sendEmail({ to: to.email, ...mail });
  } catch (e) {
    console.error("Comprobante no enviado:", e instanceof Error ? e.message : e);
  }
}
