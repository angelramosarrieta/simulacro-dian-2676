import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, dbAvailable, grantCredit, newUser } from "./helpers";
import { notifyGenerationFinished, notifyPaymentApproved } from "@/lib/email/notify";

const ok = await dbAvailable();
const d = ok ? describe : describe.skip;

// Se interceptan solo las llamadas a Resend; Supabase sigue usando la red local.
const sent: { to: string[]; subject: string; html: string; text: string }[] = [];
const realFetch = globalThis.fetch;

d("avisos por correo (Resend interceptado)", () => {
  beforeAll(() => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.ADMIN_ALERT_EMAIL = "admin@test.local";
    process.env.NEXT_PUBLIC_SITE_URL = "https://simulacro.test";
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith("https://api.resend.com")) {
        sent.push(JSON.parse(String(init?.body)));
        return new Response("{}", { status: 200 });
      }
      return realFetch(input, init);
    }) as typeof fetch;
  });
  afterAll(() => {
    globalThis.fetch = realFetch;
    delete process.env.RESEND_API_KEY;
  });

  it("envía el comprobante de pago una sola vez", async () => {
    const U = await newUser("mailpay");
    const { order } = await grantCredit(U.id);
    sent.length = 0;
    await Promise.all([notifyPaymentApproved(admin(), order.id), notifyPaymentApproved(admin(), order.id)]);
    const mine = sent.filter((m) => m.to[0] === U.email);
    expect(mine).toHaveLength(1);
    expect(mine[0].subject).toContain("Recibimos tu pago");
    expect(mine[0].html).toContain("$ 29.900");
    expect(mine[0].text).toContain(order.reference);
  });

  it("avisa al usuario cuando su simulador está listo, con enlace al panel", async () => {
    const U = await newUser("mailok");
    const { data: g } = await admin().from("generations").insert({ user_id: U.id, cargo: "Gestor <b>I</b>", nivel: "Profesional", opec: "236762", modalidad: "Ingreso", target_questions: 20, status: "completed", questions: [{ t: "x" }, { t: "y" }] }).select("id").single();
    sent.length = 0;
    await notifyGenerationFinished(admin(), g!.id);
    await notifyGenerationFinished(admin(), g!.id);
    expect(sent).toHaveLength(1);
    expect(sent[0].html).toContain(`https://simulacro.test/panel/simuladores/${g!.id}`);
    expect(sent[0].html).toContain("Gestor &lt;b&gt;I&lt;/b&gt;"); // escapado
  });

  it("si falla por el sistema avisa al usuario y alerta al administrador", async () => {
    const U = await newUser("mailfail");
    const { data: g } = await admin().from("generations").insert({ user_id: U.id, cargo: "Gestor", nivel: "Profesional", opec: "1", modalidad: "Ingreso", target_questions: 20, status: "failed", error_code: "ia_provider_error", error_message: "500", credit_refunded: true }).select("id").single();
    sent.length = 0;
    await notifyGenerationFinished(admin(), g!.id);
    expect(sent.map((m) => m.to[0]).sort()).toEqual(["admin@test.local", U.email].sort());
    expect(sent.find((m) => m.to[0] === U.email)!.text).toContain("Te devolvimos la generación");
  });

  it("si fallan los documentos del usuario no molesta al administrador", async () => {
    const U = await newUser("maildoc");
    const { data: g } = await admin().from("generations").insert({ user_id: U.id, cargo: "Gestor", nivel: "Profesional", opec: "1", modalidad: "Ingreso", target_questions: 20, status: "failed", error_code: "documentos_invalidos", error_message: "No es un manual" }).select("id").single();
    sent.length = 0;
    await notifyGenerationFinished(admin(), g!.id);
    expect(sent.map((m) => m.to[0])).toEqual([U.email]);
  });
});
