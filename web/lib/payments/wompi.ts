import "server-only";
import { buildCheckoutUrl, wompiApiBase, type WompiTransaction } from "@/lib/payments/wompi-core";

function env() {
  return process.env.WOMPI_ENV === "production" ? ("production" as const) : ("sandbox" as const);
}

export function wompiConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY && process.env.WOMPI_INTEGRITY_SECRET && process.env.WOMPI_EVENTS_SECRET);
}

export function checkoutUrlFor(p: {
  reference: string;
  amountInCents: number;
  redirectUrl: string;
  email?: string;
  name?: string;
  phone?: string;
}) {
  const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!publicKey || !integritySecret) throw new Error("wompi_no_configurado");
  return buildCheckoutUrl({
    publicKey,
    integritySecret,
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
  const key = process.env.WOMPI_PRIVATE_KEY || process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
  const res = await fetch(`${wompiApiBase(env())}/transactions/${encodeURIComponent(transactionId)}`, {
    headers: key ? { Authorization: `Bearer ${key}` } : {},
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`wompi_http_${res.status}`);
  const body = (await res.json()) as { data: WompiTransaction };
  return body.data;
}

/** Busca transacciones por referencia (requiere llave privada). Para conciliar órdenes pendientes. */
export async function findTransactionsByReference(reference: string): Promise<WompiTransaction[]> {
  const key = process.env.WOMPI_PRIVATE_KEY;
  if (!key) return [];
  const res = await fetch(`${wompiApiBase(env())}/transactions?reference=${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`wompi_http_${res.status}`);
  const body = (await res.json()) as { data: WompiTransaction[] };
  return body.data ?? [];
}
