import { describe, expect, it, vi } from "vitest";
import { dbAvailable, grantCredit, newUser } from "./helpers";
import { integritySignature } from "@/lib/payments/wompi-core";

// La sesión se reemplaza por un usuario real de la BD local (requireUser lee cookies de Next).
let current: { id: string; email: string } | null = null;
vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, requireUser: async () => (current ? { user: { id: current.id, email: current.email } } : { error: real.jsonError(401, "no_autenticado", "x") }) };
});

const ok = await dbAvailable();
const d = ok ? describe : describe.skip;

d("POST /api/checkout", () => {
  it("sin Wompi configurado responde 503 y no crea órdenes", async () => {
    delete process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
    const U = await newUser("co0");
    current = U;
    const { POST } = await import("@/app/api/checkout/route");
    const res = (await POST(new Request("http://localhost/api/checkout", { method: "POST" })))!;
    expect(res.status).toBe(503);
  });

  it("arma el checkout con el precio que decide la BD (primera vez y siguientes)", async () => {
    process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY = "pub_test_dummy";
    process.env.WOMPI_INTEGRITY_SECRET = "test_integrity";
    process.env.WOMPI_EVENTS_SECRET = "test_events";
    process.env.NEXT_PUBLIC_SITE_URL = "https://simulacro.test";
    const U = await newUser("co1");
    current = U;
    const { POST } = await import("@/app/api/checkout/route");
    const r1 = await ((await POST(new Request("http://localhost/api/checkout", { method: "POST" })))!).json();
    const u1 = new URL(r1.url);
    expect(u1.searchParams.get("amount-in-cents")).toBe("2990000");
    expect(u1.searchParams.get("redirect-url")).toBe("https://simulacro.test/panel/pagos/resultado");
    expect(u1.searchParams.get("signature:integrity")).toBe(integritySignature(u1.searchParams.get("reference")!, 2990000, "COP", "test_integrity"));
    expect(u1.searchParams.get("customer-data:email")).toBe(U.email);

    // Segundo clic: misma orden (misma referencia).
    const r2 = await ((await POST(new Request("http://localhost/api/checkout", { method: "POST" })))!).json();
    expect(r2.orderId).toBe(r1.orderId);

    // Tras una compra aprobada, el siguiente precio es el de generación adicional.
    await grantCredit(U.id);
    const r3 = await ((await POST(new Request("http://localhost/api/checkout", { method: "POST" })))!).json();
    expect(r3.product).toBe("additional_generation");
    expect(new URL(r3.url).searchParams.get("amount-in-cents")).toBe("2000000");
  });

  it("en producción no vende si la IA no está configurada", async () => {
    process.env.WOMPI_ENV = "production";
    delete process.env.ANTHROPIC_API_KEY;
    const U = await newUser("co2");
    current = U;
    const { POST } = await import("@/app/api/checkout/route");
    const res = (await POST(new Request("http://localhost/api/checkout", { method: "POST" })))!;
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("ia_no_configurada");
    delete process.env.WOMPI_ENV;
  });
});
