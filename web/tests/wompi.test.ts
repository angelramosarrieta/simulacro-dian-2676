import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { buildCheckoutUrl, integritySignature, newReference, verifyWebhookSignature, type WompiWebhookPayload } from "@/lib/payments/wompi-core";

describe("Wompi: firma de integridad", () => {
  it("es SHA256(referencia + monto + moneda + secreto)", () => {
    const expected = createHash("sha256").update("S2676-ABC2990000COPsecreto").digest("hex");
    expect(integritySignature("S2676-ABC", 2990000, "COP", "secreto")).toBe(expected);
  });

  it("arma la URL del checkout con monto y firma del servidor", () => {
    const url = new URL(
      buildCheckoutUrl({
        publicKey: "pub_test_x",
        reference: "S2676-R1",
        amountInCents: 2990000,
        currency: "COP",
        integritySecret: "s",
        redirectUrl: "https://app.test/panel/pagos/resultado",
        customerEmail: "a@b.co",
        customerPhone: "3001234567",
      })
    );
    expect(url.origin + url.pathname).toBe("https://checkout.wompi.co/p/");
    expect(url.searchParams.get("amount-in-cents")).toBe("2990000");
    expect(url.searchParams.get("signature:integrity")).toBe(integritySignature("S2676-R1", 2990000, "COP", "s"));
    expect(url.searchParams.get("customer-data:phone-number")).toBe("3001234567");
  });

  it("no envía teléfonos con formato inválido", () => {
    const url = new URL(buildCheckoutUrl({ publicKey: "p", reference: "r", amountInCents: 1, currency: "COP", integritySecret: "s", redirectUrl: "https://x", customerPhone: "+57 300" }));
    expect(url.searchParams.has("customer-data:phone-number")).toBe(false);
  });

  it("genera referencias únicas", () => {
    const refs = new Set(Array.from({ length: 500 }, newReference));
    expect(refs.size).toBe(500);
  });
});

describe("Wompi: verificación del webhook", () => {
  const secret = "test_events_secret";
  function signed(tx: { id: string; status: string; amount_in_cents: number; reference: string }, timestamp = 1700000000): WompiWebhookPayload {
    const props = ["transaction.id", "transaction.status", "transaction.amount_in_cents"];
    const checksum = createHash("sha256").update(`${tx.id}${tx.status}${tx.amount_in_cents}${timestamp}${secret}`).digest("hex");
    return { event: "transaction.updated", data: { transaction: tx }, timestamp, signature: { properties: props, checksum } };
  }

  it("acepta un evento firmado correctamente", () => {
    expect(verifyWebhookSignature(signed({ id: "1-2", status: "APPROVED", amount_in_cents: 2990000, reference: "r" }), secret)).toBe(true);
  });

  it("rechaza si cambian el estado o el monto", () => {
    const p = signed({ id: "1-2", status: "DECLINED", amount_in_cents: 2990000, reference: "r" });
    p.data.transaction.status = "APPROVED";
    expect(verifyWebhookSignature(p, secret)).toBe(false);
  });

  it("rechaza con otro secreto, sin firma o con checksum de otro largo", () => {
    const p = signed({ id: "1", status: "APPROVED", amount_in_cents: 1, reference: "r" });
    expect(verifyWebhookSignature(p, "otro")).toBe(false);
    expect(verifyWebhookSignature({ ...p, signature: { properties: [], checksum: "" } }, secret)).toBe(false);
    expect(verifyWebhookSignature({ ...p, signature: { ...p.signature, checksum: "abc" } }, secret)).toBe(false);
  });
});
