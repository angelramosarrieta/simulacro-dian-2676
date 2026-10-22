import { expect, test } from "@playwright/test";
import { readFileSync } from "fs";
import path from "path";
import { adminDb, uniqueEmail } from "./utils";
import { assembleSimulator } from "../lib/simulator/assemble";

const PASSWORD = "Estudio2026";

async function makeUser(tag: string, isAdmin = false) {
  const email = uniqueEmail(tag);
  const { data } = await adminDb().auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: `Usuario ${tag}` } });
  if (isAdmin) await adminDb().from("admins").insert({ user_id: data.user!.id });
  return { email, id: data.user!.id };
}

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/panel/);
}

test("un usuario normal no ve la administración (404)", async ({ page }) => {
  const u = await makeUser("normal");
  await login(page, u.email);
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("link", { name: "Administración" })).toHaveCount(0);
  const api = await page.request.post("/api/admin/credits", { data: { userId: u.id, delta: 5, note: "hack" }, headers: { origin: "http://localhost:3000" } });
  expect(api.status()).toBe(404);
});

test("el administrador ve métricas y ajusta créditos con auditoría", async ({ page }) => {
  const a = await makeUser("jefe", true);
  const client = await makeUser("cliente");
  const note = `Cortesía de lanzamiento ${Date.now()}`;
  await login(page, a.email);
  await page.goto("/panel");
  await page.getByRole("link", { name: "Administración" }).click();
  await expect(page.getByRole("heading", { name: "Métricas del negocio" })).toBeVisible();
  await expect(page.getByText("Ingresos totales")).toBeVisible();

  await page.goto(`/admin/usuarios?q=${encodeURIComponent(client.email)}`);
  await page.getByRole("link", { name: new RegExp(client.email) }).click();
  await page.getByLabel("Ajuste").fill("2");
  await page.getByLabel("Motivo (queda en la auditoría)").fill(note);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Aplicar ajuste" }).click();
  await expect(page.getByText("Listo. Nuevo saldo: 2.")).toBeVisible();

  await page.goto("/admin/auditoria");
  await expect(page.getByText(note)).toBeVisible();
  for (const route of ["/admin/ordenes", "/admin/generaciones?estado=failed"]) {
    const r = await page.goto(route);
    expect(r?.status(), route).toBe(200);
  }
});

test("el progreso del simulador se guarda en la cuenta y se recupera en otro dispositivo", async ({ page, browser }) => {
  const u = await makeUser("progreso");
  const db = adminDb();
  const template = readFileSync(path.join(__dirname, "../lib/simulator/plantilla.html"), "utf8");
  const html = assembleSimulator(template, { opec: "777001", cargo: "Gestor Progreso", ejes: [], questions: [] });
  const { data: gen } = await db.from("generations").insert({ user_id: u.id, cargo: "Gestor Progreso", nivel: "Profesional", opec: "777001", modalidad: "Ingreso", target_questions: 20, status: "completed", progress: 100, simulator_html_path: `${u.id}/prog.html`, questions: [] }).select("id").single();
  await db.storage.from("simulators").upload(`${u.id}/prog.html`, new Blob([html], { type: "text/html" }), { upsert: true });

  await login(page, u.email);
  await page.goto(`/s/${gen!.id}`);
  await expect(page.locator("#app")).not.toBeEmpty();
  // Simula que la app guarda aciertos: usa el mismo put() de la plantilla.
  await page.evaluate(() => {
    localStorage.setItem("simulacro777001:v1", JSON.stringify({ "3": { s: 2, c: 1 } }));
    (window as unknown as { __s2676Sync: (k: string) => void }).__s2676Sync("simulacro777001:v1");
  });
  await expect.poll(async () => (await db.from("simulator_progress").select("stats").eq("generation_id", gen!.id).maybeSingle()).data?.stats, { timeout: 15_000 }).toEqual({ "3": { s: 2, c: 1 } });

  // "Otro dispositivo": contexto nuevo, sin localStorage.
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await login(p2, u.email);
  await p2.goto(`/s/${gen!.id}`);
  const restored = await p2.evaluate(() => localStorage.getItem("simulacro777001:v1"));
  expect(JSON.parse(restored!)).toEqual({ "3": { s: 2, c: 1 } });
  await ctx.close();
});
