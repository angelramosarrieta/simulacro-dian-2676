import { describe, expect, it } from "vitest";
import { admin, dbAvailable, grantCredit, newUser } from "./helpers";
import { runDailyMaintenance } from "@/lib/maintenance/daily";

const ok = await dbAvailable();
const d = ok ? describe : describe.skip;

d("administración", () => {
  it("solo un administrador puede ajustar créditos y queda en la auditoría", async () => {
    const A = await newUser("adm");
    const U = await newUser("cli");
    const no = await admin().rpc("admin_adjust_credits", { p_admin_id: U.id, p_user_id: U.id, p_delta: 5, p_note: "auto regalo" });
    expect(no.error?.message).toContain("no_autorizado");

    await admin().from("admins").insert({ user_id: A.id });
    const yes = await admin().rpc("admin_adjust_credits", { p_admin_id: A.id, p_user_id: U.id, p_delta: 2, p_note: "Cortesía" });
    expect(yes.data).toBe(2);
    const neg = await admin().rpc("admin_adjust_credits", { p_admin_id: A.id, p_user_id: U.id, p_delta: -3, p_note: "Corrección" });
    expect(neg.error?.message).toContain("saldo_negativo");
    const noNote = await admin().rpc("admin_adjust_credits", { p_admin_id: A.id, p_user_id: U.id, p_delta: 1, p_note: " " });
    expect(noNote.error?.message).toContain("nota_requerida");

    const { data: log } = await admin().from("admin_audit_log").select("action, details").eq("target_user_id", U.id);
    expect(log).toEqual([{ action: "ajuste_creditos", details: { delta: 2, nota: "Cortesía", saldo_anterior: 0 } }]);
    const { data: bal } = await U.client.rpc("my_credit_balance");
    expect(bal).toBe(2);
  });

  it("el navegador no puede leer administradores, auditoría ni ejecutar el ajuste", async () => {
    const U = await newUser("snoop");
    expect((await U.client.from("admins").select("*")).data ?? []).toHaveLength(0);
    expect((await U.client.from("admin_audit_log").select("*")).data ?? []).toHaveLength(0);
    const r = await U.client.rpc("admin_adjust_credits", { p_admin_id: U.id, p_user_id: U.id, p_delta: 5, p_note: "hack" });
    expect(r.error).not.toBeNull();
    expect((await U.client.from("admins").insert({ user_id: U.id })).error).not.toBeNull();
  });

  it("los avisos por correo se reclaman una sola vez", async () => {
    const U = await newUser("notice");
    const { order } = await grantCredit(U.id);
    const claims = await Promise.all([1, 2, 3].map(() => admin().rpc("claim_order_receipt", { p_order_id: order.id })));
    expect(claims.filter((c) => c.data === true)).toHaveLength(1);
  });

  it("el progreso solo lo lee su dueño y no se escribe desde el navegador", async () => {
    const U = await newUser("prog1");
    const V = await newUser("prog2");
    const { data: g } = await admin().from("generations").insert({ user_id: U.id, cargo: "G", nivel: "Profesional", opec: "1", modalidad: "Ingreso", target_questions: 20, status: "completed" }).select("id").single();
    await admin().from("simulator_progress").insert({ generation_id: g!.id, user_id: U.id, stats: { a: 1 }, history: [] });
    expect((await U.client.from("simulator_progress").select("stats")).data).toEqual([{ stats: { a: 1 } }]);
    expect((await V.client.from("simulator_progress").select("stats")).data).toEqual([]);
    expect((await U.client.from("simulator_progress").update({ stats: { hack: 1 } }).eq("generation_id", g!.id).select()).data ?? []).toHaveLength(0);
  });
});

d("mantenimiento diario", () => {
  it("vence y reembolsa generaciones atascadas y limpia borradores viejos con sus archivos", async () => {
    const U = await newUser("maint");
    await grantCredit(U.id);
    const a = admin();
    const { data: stuck } = await a.from("generations").insert({ user_id: U.id, cargo: "G", nivel: "Profesional", opec: "1", modalidad: "Ingreso", target_questions: 20, manual_path: "x", indicadores_path: "y" }).select("id").single();
    await a.rpc("start_generation", { p_user_id: U.id, p_generation_id: stuck!.id });
    await a.from("generations").update({ status: "generating", started_at: new Date(Date.now() - 4 * 3_600_000).toISOString() }).eq("id", stuck!.id);

    const draftPath = `${U.id}/old/manual.pdf`;
    await a.storage.from("documents").upload(draftPath, new Blob(["%PDF-1.4"], { type: "application/pdf" }));
    const { data: draft } = await a.from("generations").insert({ user_id: U.id, cargo: "G", nivel: "Profesional", opec: "1", modalidad: "Ingreso", target_questions: 20, manual_path: draftPath }).select("id").single();
    // updated_at viejo: se simula corriendo el mantenimiento "dos días después".
    const report = await runDailyMaintenance(a, Date.now() + 2 * 86_400_000);

    expect(report.expired).toBeGreaterThanOrEqual(1);
    const { data: g } = await a.from("generations").select("status, error_code, credit_refunded").eq("id", stuck!.id).single();
    expect(g).toEqual({ status: "failed", error_code: "tiempo_agotado", credit_refunded: true });
    const { data: dr } = await a.from("generations").select("status").eq("id", draft!.id).single();
    expect(dr!.status).toBe("cancelled");
    expect((await a.storage.from("documents").download(draftPath)).error).not.toBeNull();
    const { data: bal } = await U.client.rpc("my_credit_balance");
    expect(bal).toBe(1);
  });
});

d("administradores por correo y configuración", () => {
  it("promueve solo correos verificados de la lista", async () => {
    const a = admin();
    const email = `jefa-${Date.now()}@test.local`;
    const { data: cur } = await a.from("app_settings").select("value").eq("key", "admin_emails").single();
    await a.from("app_settings").update({ value: [...(cur!.value as string[]), email.toUpperCase()] }).eq("key", "admin_emails");

    const { data: unverified } = await a.auth.admin.createUser({ email: `x${email}`, password: "Prueba12345", email_confirm: false });
    expect((await a.rpc("ensure_admin", { p_user_id: unverified.user!.id })).data).toBe(false);

    const { data: pending } = await a.auth.admin.createUser({ email, password: "Prueba12345", email_confirm: false });
    expect((await a.rpc("ensure_admin", { p_user_id: pending.user!.id })).data).toBe(false); // en la lista pero sin verificar
    await a.auth.admin.updateUserById(pending.user!.id, { email_confirm: true });
    expect((await a.rpc("ensure_admin", { p_user_id: pending.user!.id })).data).toBe(true);
    expect((await a.from("admins").select("user_id").eq("user_id", pending.user!.id)).data).toHaveLength(1);

    const other = await newUser("noadmin");
    expect((await a.rpc("ensure_admin", { p_user_id: other.id })).data).toBe(false);
    expect((await other.client.rpc("ensure_admin", { p_user_id: other.id })).error).not.toBeNull();
  });

  it("solo un administrador cambia la configuración, con auditoría y llaves permitidas", async () => {
    const a = admin();
    const A = await newUser("cfg");
    await a.from("admins").insert({ user_id: A.id });
    const U = await newUser("cfgno");
    expect((await a.rpc("admin_update_setting", { p_admin_id: U.id, p_key: "price_next_cop", p_value: 1 })).error?.message).toContain("no_autorizado");
    expect((await a.rpc("admin_update_setting", { p_admin_id: A.id, p_key: "otra_cosa", p_value: 1 })).error?.message).toContain("llave_invalida");

    const { data: before } = await a.from("app_settings").select("value").eq("key", "price_next_cop").single();
    expect((await a.rpc("admin_update_setting", { p_admin_id: A.id, p_key: "price_next_cop", p_value: 21000 })).error).toBeNull();
    const { data: quote } = await a.rpc("quote_for_user", { p_user_id: (await grantCredit(U.id)).order.user_id });
    expect(quote[0]).toMatchObject({ product: "additional_generation", amount_cop: 21000 });
    const { data: log } = await a.from("admin_audit_log").select("details").eq("admin_id", A.id).eq("action", "configuracion").single();
    expect(log!.details).toEqual({ antes: before!.value, despues: 21000 });
    await a.from("app_settings").update({ value: before!.value }).eq("key", "price_next_cop");
  });
});
