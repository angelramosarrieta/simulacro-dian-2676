import { createHash } from "crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { admin, dbAvailable, newUser } from "./helpers";

// La API de Wompi se reemplaza por una tabla en memoria: así se prueba que el
// webhook verifica firma, re-consulta la transacción y acredita una sola vez.
const transactions = new Map<string, { id: string; status: string; reference: string; amount_in_cents: number; currency: string; payment_method_type: string }>();
vi.mock("@/lib/payments/wompi", () => ({
  wompiEventsSecret: async () => process.env.WOMPI_EVENTS_SECRET,
  fetchTransaction: async (id: string) => {
    const tx = transactions.get(id);
    if (!tx) throw new Error("wompi_http_404");
    return tx;
  },
}));

const ok = await dbAvailable();
const d = ok ? describe : describe.skip;
const SECRET = "test_events_secret_123";

function event(tx: { id: string; status: string; reference: string; amount_in_cents: number }, timestamp = Math.floor(Date.now() / 1000)) {
  const props = ["transaction.id", "transaction.status", "transaction.amount_in_cents"];
  const checksum = createHash("sha256").update(`${tx.id}${tx.status}${tx.amount_in_cents}${timestamp}${SECRET}`).digest("hex");
  return { event: "transaction.updated", data: { transaction: tx }, timestamp, sent_at: new Date().toISOString(), signature: { properties: props, checksum } };
}

async function post(body: unknown) {
  const { POST } = await import("@/app/api/webhooks/wompi/route");
  return POST(new Request("http://localhost/api/webhooks/wompi", { method: "POST", body: JSON.stringify(body) }));
}

d("webhook de Wompi", () => {
  beforeAll(() => {
    process.env.WOMPI_EVENTS_SECRET = SECRET;
  });

  it("acredita un pago aprobado una sola vez aunque el evento llegue repetido", async () => {
    const U = await newUser("wh");
    const { data: order } = await admin().rpc("create_or_reuse_order", { p_user_id: U.id, p_reference: "WH-" + Date.now() });
    const tx = { id: `wh-${order.id}`, status: "APPROVED", reference: order.reference, amount_in_cents: Number(order.amount_in_cents), currency: "COP", payment_method_type: "PSE" };
    transactions.set(tx.id, tx);
    const ev = event(tx);
    const r1 = await post(ev);
    const r2 = await post(ev);
    const r3 = await post(event(tx, ev.timestamp + 5));
    expect([r1.status, r2.status, r3.status]).toEqual([200, 200, 200]);
    const { data: bal } = await U.client.rpc("my_credit_balance");
    expect(bal).toBe(1);
    const { data: o } = await U.client.from("orders").select("status, payment_method_type").single();
    expect(o).toEqual({ status: "approved", payment_method_type: "PSE" });
  });

  it("rechaza eventos con firma inválida", async () => {
    const ev = event({ id: "x", status: "APPROVED", reference: "r", amount_in_cents: 1 });
    ev.signature.checksum = "0".repeat(64);
    expect((await post(ev)).status).toBe(401);
  });

  it("no confía en el estado del payload: usa el de la API de Wompi", async () => {
    const U = await newUser("wh2");
    const { data: order } = await admin().rpc("create_or_reuse_order", { p_user_id: U.id, p_reference: "WH2-" + Date.now() });
    const real = { id: `wh2-${order.id}`, status: "DECLINED", reference: order.reference, amount_in_cents: Number(order.amount_in_cents), currency: "COP", payment_method_type: "CARD" };
    transactions.set(real.id, real);
    // Evento bien firmado pero que dice APPROVED (p. ej. alguien con el secreto filtrado).
    const res = await post(event({ ...real, status: "APPROVED" }));
    expect(res.status).toBe(200);
    const { data: bal } = await U.client.rpc("my_credit_balance");
    expect(bal).toBe(0);
    const { data: o } = await U.client.from("orders").select("status").single();
    expect(o!.status).toBe("declined");
  });

  it("pide reintento (500) si no puede verificar la transacción", async () => {
    const res = await post(event({ id: "desconocida", status: "APPROVED", reference: "nope", amount_in_cents: 1 }));
    expect(res.status).toBe(500);
  });

  it("ignora otros tipos de evento", async () => {
    const res = await post({ event: "nequi_token.updated", data: {} });
    expect(await res.json()).toMatchObject({ ignored: true });
  });
});
