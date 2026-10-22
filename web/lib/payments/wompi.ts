import "server-only";
import { cfg, loadRuntimeConfig } from "@/lib/config/runtime";
import { buildCheckoutUrl, wompiApiBase, type WompiTransaction } from "@/lib/payments/wompi-core";

// Las llaves pueden venir del panel de administración o de las variables de entorno.
async function conf() {
  await loadRuntimeConfig();
  return {
    env: cfg("WOMPI_ENV") === "production" ? ("production" as const) : ("sandbox" as const),
    publicKey: cfg("WOMPI_PUBLIC_KEY"),
    privateKey: cfg("WOMPI_PRIVATE_KEY"),
    integritySecret: cfg("WOMPI_INTEGRITY_SECRET"),
    eventsSecret: cfg("WOMPI_EVENTS_SECRET"),
  };
}

export async function wompiEventsSecret() {
  return (await conf()).eventsSecret;
}

export async function checkoutUrlFor(p: {
  reference: string;
  amountInCents: number;
  redirectUrl: string;
  email?: string;
  name?: string;
  phone?: string;
}) {
  const c = await conf();
  if (!c.publicKey || !c.integritySecret) throw new Error("wompi_no_configurado");
  return buildCheckoutUrl({
    publicKey: c.publicKey,
    integritySecret: c.integritySecret,
    reference: p.reference,
    amountInCents: p.amountInCents,
    currency: "COP",
    redirectUrl: p.redirectUrl,
    customerEmail: p.email,
    customerName: p.name,
    customerPhone: p.phone,
  });
}

/**
 * Consulta la transacción en la API de Wompi. Nunca se confía en el estado
 * que trae el navegador o el payload del webhook: siempre se re-consulta.
 */
export async function fetchTransaction(transactionId: string): Promise<WompiTransaction> {
  if (!/^[A-Za-z0-9-]{4,64}$/.test(transactionId)) throw new Error("transaccion_invalida");
  const c = await conf();
  const key = c.privateKey || c.publicKey;
  const res = await fetch(`${wompiApiBase(c.env)}/transactions/${encodeURIComponent(transactionId)}`, {
    headers: key ? { Authorization: `Bearer ${key}` } : {},
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`wompi_http_${res.status}`);
  const body = (await res.json()) as { data: WompiTransaction };
  return body.data;
}

/** Busca transacciones por referencia (requiere llave privada). Para conciliar órdenes pendientes. */
export async function findTransactionsByReference(reference: string): Promise<WompiTransaction[]> {
  const c = await conf();
  if (!c.privateKey) return [];
  const res = await fetch(`${wompiApiBase(c.env)}/transactions?reference=${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${c.privateKey}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`wompi_http_${res.status}`);
  const body = (await res.json()) as { data: WompiTransaction[] };
  return body.data ?? [];
}

/** Verifica que las llaves funcionen consultando el comercio en Wompi (sin cobrar nada). */
export async function testWompi(): Promise<{ ok: boolean; message: string }> {
  const c = await conf();
  if (!c.publicKey) return { ok: false, message: "Falta la llave pública." };
  const prefix = c.env === "production" ? "pub_prod_" : "pub_test_";
  if (!c.publicKey.startsWith(prefix)) return { ok: false, message: `El ambiente es ${c.env} pero la llave pública no empieza por ${prefix}.` };
  const res = await fetch(`${wompiApiBase(c.env)}/merchants/${encodeURIComponent(c.publicKey)}`, { cache: "no-store" }).catch(() => null);
  if (!res?.ok) return { ok: false, message: `Wompi no reconoce la llave pública (${res?.status ?? "sin conexión"}).` };
  const body = (await res.json()) as { data?: { name?: string } };
  const missing = [!c.privateKey && "llave privada", !c.integritySecret && "secreto de integridad", !c.eventsSecret && "secreto de eventos"].filter(Boolean);
  return { ok: missing.length === 0, message: `Comercio: ${body.data?.name ?? "encontrado"}.${missing.length ? ` Falta: ${missing.join(", ")}.` : ""}` };
}
