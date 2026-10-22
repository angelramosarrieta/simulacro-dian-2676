import { createHash, randomBytes, timingSafeEqual } from "crypto";

/**
 * Lógica pura de Wompi (sin red ni variables de entorno) para poder probarla.
 * Referencia: docs.wompi.co → Widget & Checkout Web y Eventos.
 */

export const WOMPI_CHECKOUT_URL = "https://checkout.wompi.co/p/";

export function wompiApiBase(env: "production" | "sandbox") {
  return env === "production" ? "https://production.wompi.co/v1" : "https://sandbox.wompi.co/v1";
}

/** SHA256(referencia + monto_en_centavos + moneda + secreto_de_integridad). */
export function integritySignature(reference: string, amountInCents: number, currency: string, secret: string) {
  return createHash("sha256").update(`${reference}${amountInCents}${currency}${secret}`).digest("hex");
}

export function newReference() {
  // Única, sin datos personales, legible en el panel de Wompi.
  return `S2676-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function buildCheckoutUrl(p: {
  publicKey: string;
  reference: string;
  amountInCents: number;
  currency: string;
  integritySecret: string;
  redirectUrl: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
}) {
  const params = new URLSearchParams();
  params.set("public-key", p.publicKey);
  params.set("currency", p.currency);
  params.set("amount-in-cents", String(p.amountInCents));
  params.set("reference", p.reference);
  params.set("signature:integrity", integritySignature(p.reference, p.amountInCents, p.currency, p.integritySecret));
  params.set("redirect-url", p.redirectUrl);
  if (p.customerEmail) params.set("customer-data:email", p.customerEmail);
  if (p.customerName) params.set("customer-data:full-name", p.customerName);
  if (p.customerPhone && /^\d{10}$/.test(p.customerPhone)) {
    params.set("customer-data:phone-number", p.customerPhone);
    params.set("customer-data:phone-number-prefix", "+57");
  }
  return `${WOMPI_CHECKOUT_URL}?${params.toString()}`;
}

export type WompiWebhookPayload = {
  event: string;
  data: { transaction: { id: string; status: string; reference: string; amount_in_cents?: number } };
  sent_at?: string;
  timestamp: number;
  signature: { properties: string[]; checksum: string };
  environment?: string;
};

function readPath(data: unknown, path: string): string {
  let v: unknown = data;
  for (const part of path.split(".")) {
    if (v === null || typeof v !== "object") return "";
    v = (v as Record<string, unknown>)[part];
  }
  return v === undefined || v === null ? "" : String(v);
}

/** Checksum del evento: SHA256(valores de signature.properties + timestamp + secreto de eventos). */
export function verifyWebhookSignature(payload: WompiWebhookPayload, secret: string): boolean {
  if (!secret || !payload?.signature?.checksum || !Array.isArray(payload.signature.properties) || !payload.signature.properties.length) {
    return false;
  }
  const joined = payload.signature.properties.map((p) => readPath(payload.data, p)).join("");
  const expected = createHash("sha256").update(`${joined}${payload.timestamp}${secret}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(payload.signature.checksum).toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type WompiTransaction = {
  id: string;
  status: string;
  reference: string;
  amount_in_cents: number;
  currency: string;
  payment_method_type?: string;
};
