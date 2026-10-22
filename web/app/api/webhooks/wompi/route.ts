import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyTransaction } from "@/lib/payments/apply";
import { fetchTransaction } from "@/lib/payments/wompi";
import { verifyWebhookSignature, type WompiWebhookPayload } from "@/lib/payments/wompi-core";
import { alertAdmin } from "@/lib/email/send";

/**
 * Webhook de eventos de Wompi (URL a configurar en el panel de Wompi:
 * https://<dominio>/api/webhooks/wompi). La autenticidad se valida con el
 * checksum del evento y, además, el estado nunca se toma del payload: se
 * vuelve a consultar la transacción en la API de Wompi.
 */
export async function POST(request: Request) {
  const secret = process.env.WOMPI_EVENTS_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });

  const raw = await request.text();
  if (raw.length > 100_000) return NextResponse.json({ error: "Payload muy grande" }, { status: 413 });
  let payload: WompiWebhookPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (payload?.event !== "transaction.updated" || !payload?.data?.transaction?.id) {
    return NextResponse.json({ received: true, ignored: true });
  }
  if (!verifyWebhookSignature(payload, secret)) return NextResponse.json({ error: "Firma inválida" }, { status: 401 });

  const admin = createAdminClient();
  const tx = payload.data.transaction;
  const eventKey = `wompi:${tx.id}:${tx.status}:${payload.timestamp}`;
  const { data: existing } = await admin.from("payment_events").select("id, processed_at").eq("event_key", eventKey).maybeSingle();
  if (existing?.processed_at) return NextResponse.json({ received: true, duplicate: true });

  let eventId = existing?.id as string | undefined;
  if (!eventId) {
    const { data, error } = await admin
      .from("payment_events")
      .insert({ event_key: eventKey, transaction_id: tx.id, reference: tx.reference, payload })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ received: true, duplicate: true });
      return NextResponse.json({ error: "No se pudo registrar" }, { status: 500 });
    }
    eventId = data.id;
  }

  try {
    const verified = await fetchTransaction(tx.id);
    const { data: order } = await admin.from("orders").select("id").eq("reference", verified.reference).maybeSingle();
    if (order) await applyTransaction(admin, verified);
    await admin.from("payment_events").update({ processed_at: new Date().toISOString(), error: order ? null : "orden_desconocida" }).eq("id", eventId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "error";
    await admin.from("payment_events").update({ error: message.slice(0, 500) }).eq("id", eventId);
    await alertAdmin("Error procesando un webhook de Wompi", [`Transacción: ${tx.id}`, `Referencia: ${tx.reference}`, `Estado informado: ${tx.status}`, `Error: ${message}`, "Wompi reintentará el envío; la conciliación diaria también lo revisa."]);
    // 500 para que Wompi reintente: un pago aprobado no se puede perder.
    return NextResponse.json({ error: "Reintentar" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
