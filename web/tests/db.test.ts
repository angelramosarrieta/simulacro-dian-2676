import { beforeAll, describe, expect, it } from "vitest";
import { admin, dbAvailable, grantCredit, newUser } from "./helpers";

const ok = await dbAvailable();
const d = ok ? describe : describe.skip;

d("BD: aislamiento por usuario (RLS) y permisos", () => {
  let A: Awaited<ReturnType<typeof newUser>>;
  let B: Awaited<ReturnType<typeof newUser>>;
  let genB: string;

  beforeAll(async () => {
    A = await newUser("a");
    B = await newUser("b");
    await grantCredit(B.id);
    const { data } = await admin().from("generations").insert({ user_id: B.id, cargo: "Gestor", nivel: "Profesional", opec: "123", modalidad: "Ingreso", target_questions: 20 }).select("id").single();
    genB = data!.id;
  });

  it("crea el perfil al registrarse, con el nombre y la aceptación de términos", async () => {
    const { data } = await A.client.from("profiles").select("*").single();
    expect(data).toMatchObject({ id: A.id, email: A.email, full_name: "Usuario a" });
    expect(data.accepted_terms_at).not.toBeNull();
  });

  it("un usuario no ve compras, créditos, generaciones ni perfil de otro", async () => {
    for (const table of ["orders", "credit_ledger", "generations", "usage_events", "profiles"]) {
      const { data, error } = await A.client.from(table).select("*").eq(table === "profiles" ? "id" : "user_id", B.id);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    }
    const { data: g } = await A.client.from("generations").select("id").eq("id", genB);
    expect(g).toHaveLength(0);
  });

  it("el dueño sí ve lo suyo y su saldo", async () => {
    const { data } = await B.client.from("orders").select("status");
    expect(data).toEqual([{ status: "approved" }]);
    const { data: bal } = await B.client.rpc("my_credit_balance");
    expect(bal).toBe(1);
    const { data: balA } = await A.client.rpc("my_credit_balance");
    expect(balA).toBe(0);
  });

  it("el navegador no puede crear compras, sumarse créditos ni cambiar estados", async () => {
    const ins = await A.client.from("credit_ledger").insert({ user_id: A.id, delta: 10, reason: "admin_adjustment" });
    expect(ins.error).not.toBeNull();
    const ord = await A.client.from("orders").insert({ user_id: A.id, product: "first_generation", amount_in_cents: 100, reference: "hack" });
    expect(ord.error).not.toBeNull();
    const upd = await B.client.from("orders").update({ status: "approved" }).eq("user_id", B.id).select();
    expect(upd.data ?? []).toHaveLength(0);
    const gen = await B.client.from("generations").update({ status: "completed" }).eq("id", genB).select();
    expect(gen.data ?? []).toHaveLength(0);
    const { data: bal } = await A.client.rpc("my_credit_balance");
    expect(bal).toBe(0);
  });

  it("el navegador no puede ejecutar las funciones de negocio", async () => {
    for (const [fn, args] of [
      ["apply_payment_result", { p_reference: "x", p_transaction_id: "x", p_provider_status: "APPROVED", p_amount_in_cents: 1, p_currency: "COP", p_payment_method_type: null }],
      ["start_generation", { p_user_id: B.id, p_generation_id: genB }],
      ["refund_generation", { p_generation_id: genB, p_note: "x" }],
      ["create_or_reuse_order", { p_user_id: A.id, p_reference: "x" }],
      ["credit_balance", { p_user_id: B.id }],
    ] as const) {
      const { error } = await A.client.rpc(fn, args);
      expect(error, fn).not.toBeNull();
    }
  });

  it("el perfil solo permite editar columnas permitidas", async () => {
    const good = await A.client.from("profiles").update({ full_name: "Nuevo Nombre" }).eq("id", A.id).select("full_name");
    expect(good.data).toEqual([{ full_name: "Nuevo Nombre" }]);
    const bad = await A.client.from("profiles").update({ email: "otro@x.com" }).eq("id", A.id);
    expect(bad.error).not.toBeNull();
    const other = await A.client.from("profiles").update({ full_name: "x" }).eq("id", B.id).select();
    expect(other.data ?? []).toHaveLength(0);
  });

  it("solo los precios son públicos en la configuración", async () => {
    const { data } = await A.client.from("app_settings").select("key");
    expect((data ?? []).map((r) => r.key).sort()).toEqual(["price_first_cop", "price_next_cop", "questions_per_generation"]);
    const w = await A.client.from("app_settings").update({ value: 1 }).eq("key", "price_first_cop").select();
    expect(w.data ?? []).toHaveLength(0);
  });

  it("los documentos y simuladores no son accesibles directamente desde el navegador", async () => {
    const put = await admin().storage.from("documents").upload(`${B.id}/${genB}/manual.pdf`, new Blob(["%PDF-1.4"], { type: "application/pdf" }), { upsert: true });
    expect(put.error).toBeNull();
    expect((await admin().storage.from("documents").download(`${B.id}/${genB}/manual.pdf`)).error).toBeNull();
    const dl = await A.client.storage.from("documents").download(`${B.id}/${genB}/manual.pdf`);
    expect(dl.error).not.toBeNull();
    const own = await B.client.storage.from("documents").download(`${B.id}/${genB}/manual.pdf`);
    expect(own.error).not.toBeNull(); // incluso el dueño pasa por el servidor
    const up = await A.client.storage.from("documents").upload(`${A.id}/x/manual.pdf`, new Blob(["%PDF"], { type: "application/pdf" }));
    expect(up.error).not.toBeNull();
  });
});

d("BD: precios, órdenes y pagos", () => {
  it("cobra $29.900 la primera vez y $20.000 después", async () => {
    const U = await newUser("p");
    const first = await grantCredit(U.id);
    expect(first.order.product).toBe("first_generation");
    expect(Number(first.order.amount_in_cents)).toBe(2_990_000);
    const { data: second } = await admin().rpc("create_or_reuse_order", { p_user_id: U.id, p_reference: "R-2-" + Date.now() });
    expect(second.product).toBe("additional_generation");
    expect(Number(second.amount_in_cents)).toBe(2_000_000);
  });

  it("reutiliza la orden pendiente: dos clics simultáneos no crean dos órdenes", async () => {
    const U = await newUser("dup");
    const results = await Promise.all(Array.from({ length: 5 }, (_, i) => admin().rpc("create_or_reuse_order", { p_user_id: U.id, p_reference: `DUP-${U.id}-${i}` })));
    const ids = new Set(results.map((r) => r.data.id));
    expect(ids.size).toBe(1);
    const { count } = await admin().from("orders").select("id", { count: "exact", head: true }).eq("user_id", U.id);
    expect(count).toBe(1);
  });

  it("aprobar dos veces acredita una sola vez; un evento tardío no revierte la aprobación", async () => {
    const U = await newUser("idem");
    const { order } = await grantCredit(U.id);
    const again = await admin().rpc("apply_payment_result", { p_reference: order.reference, p_transaction_id: `tx-${order.reference}`, p_provider_status: "APPROVED", p_amount_in_cents: order.amount_in_cents, p_currency: "COP", p_payment_method_type: "CARD" });
    expect(again.data[0].credited).toBe(false);
    const late = await admin().rpc("apply_payment_result", { p_reference: order.reference, p_transaction_id: `tx-${order.reference}`, p_provider_status: "DECLINED", p_amount_in_cents: order.amount_in_cents, p_currency: "COP", p_payment_method_type: "CARD" });
    expect(late.data[0].status).toBe("approved");
    const { data: bal } = await U.client.rpc("my_credit_balance");
    expect(bal).toBe(1);
  });

  it("un pago pendiente o rechazado no habilita créditos", async () => {
    const U = await newUser("pend");
    const { data: order } = await admin().rpc("create_or_reuse_order", { p_user_id: U.id, p_reference: "PEND-" + Date.now() });
    for (const status of ["PENDING", "DECLINED", "ERROR", "VOIDED"]) {
      await admin().rpc("apply_payment_result", { p_reference: order.reference, p_transaction_id: `tx-${status}-${order.id}`, p_provider_status: status, p_amount_in_cents: order.amount_in_cents, p_currency: "COP", p_payment_method_type: "PSE" });
    }
    const { data: bal } = await U.client.rpc("my_credit_balance");
    expect(bal).toBe(0);
  });

  it("un monto o moneda distintos al de la orden no acreditan", async () => {
    const U = await newUser("amt");
    const { data: order } = await admin().rpc("create_or_reuse_order", { p_user_id: U.id, p_reference: "AMT-" + Date.now() });
    const r = await admin().rpc("apply_payment_result", { p_reference: order.reference, p_transaction_id: "tx-amt-" + order.id, p_provider_status: "APPROVED", p_amount_in_cents: 100, p_currency: "COP", p_payment_method_type: "CARD" });
    expect(r.data[0].status).toBe("error");
    const { data: bal } = await U.client.rpc("my_credit_balance");
    expect(bal).toBe(0);
  });

  it("una orden vencida que Wompi aprueba después igual se acredita (el usuario sí pagó)", async () => {
    const U = await newUser("exp");
    const { data: order } = await admin().rpc("create_or_reuse_order", { p_user_id: U.id, p_reference: "EXP-" + Date.now() });
    await admin().from("orders").update({ status: "expired" }).eq("id", order.id);
    const r = await admin().rpc("apply_payment_result", { p_reference: order.reference, p_transaction_id: "tx-exp-" + order.id, p_provider_status: "APPROVED", p_amount_in_cents: order.amount_in_cents, p_currency: "COP", p_payment_method_type: "NEQUI" });
    expect(r.data[0]).toMatchObject({ status: "approved", credited: true });
  });
});

d("BD: consumo de créditos al generar", () => {
  async function draft(userId: string) {
    const { data } = await admin()
      .from("generations")
      .insert({ user_id: userId, cargo: "Gestor", nivel: "Profesional", opec: "123", modalidad: "Ingreso", target_questions: 20, manual_path: `${userId}/m.pdf`, indicadores_path: `${userId}/i.png` })
      .select("id")
      .single();
    return data!.id as string;
  }

  it("sin créditos no inicia", async () => {
    const U = await newUser("nocred");
    const { error } = await admin().rpc("start_generation", { p_user_id: U.id, p_generation_id: await draft(U.id) });
    expect(error?.message).toContain("sin_creditos");
  });

  it("solicitudes simultáneas gastan un solo crédito e inician una sola generación", async () => {
    const U = await newUser("race");
    await grantCredit(U.id);
    const g1 = await draft(U.id);
    const g2 = await draft(U.id);
    const results = await Promise.all([g1, g1, g2, g2].map((g) => admin().rpc("start_generation", { p_user_id: U.id, p_generation_id: g })));
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    const { data: bal } = await U.client.rpc("my_credit_balance");
    expect(bal).toBe(0);
  });

  it("no inicia la generación de otro usuario", async () => {
    const U = await newUser("own1");
    const V = await newUser("own2");
    await grantCredit(U.id);
    const { error } = await admin().rpc("start_generation", { p_user_id: U.id, p_generation_id: await draft(V.id) });
    expect(error?.message).toContain("generacion_no_encontrada");
  });

  it("el reembolso devuelve el crédito una sola vez", async () => {
    const U = await newUser("refund");
    await grantCredit(U.id);
    const g = await draft(U.id);
    await admin().rpc("start_generation", { p_user_id: U.id, p_generation_id: g });
    await Promise.all([1, 2, 3].map(() => admin().rpc("refund_generation", { p_generation_id: g, p_note: "x" })));
    const { data: bal } = await U.client.rpc("my_credit_balance");
    expect(bal).toBe(1);
  });

  it("el lease impide que dos workers avancen la misma generación", async () => {
    const U = await newUser("lease");
    await grantCredit(U.id);
    const g = await draft(U.id);
    await admin().rpc("start_generation", { p_user_id: U.id, p_generation_id: g });
    const tokens = await Promise.all([1, 2, 3, 4].map(() => admin().rpc("acquire_generation_lease", { p_generation_id: g, p_seconds: 60 })));
    expect(tokens.filter((t) => t.data)).toHaveLength(1);
  });
});
