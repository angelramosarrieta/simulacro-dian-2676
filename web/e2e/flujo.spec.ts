import { expect, test } from "@playwright/test";
import path from "path";
import { writeFileSync, mkdirSync } from "fs";
import { adminDb, lastEmailLink, uniqueEmail } from "./utils";

const PASSWORD = "Estudio2026";
const tmp = path.join(__dirname, ".tmp");
mkdirSync(tmp, { recursive: true });
const pdf = path.join(tmp, "manual.pdf");
const png = path.join(tmp, "indicadores.png");
writeFileSync(pdf, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
writeFileSync(png, Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex"));

test.describe.configure({ mode: "serial" });

const email = uniqueEmail("flujo");

test("landing: propuesta, precios y CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("para tu empleo");
  await expect(page.locator("#precios")).toContainText("$ 29.900");
  await expect(page.locator("#precios")).toContainText("$ 20.000");
  await page.getByRole("link", { name: "Crear mi simulador" }).first().click();
  await expect(page).toHaveURL(/\/registro$/);
});

test("rutas privadas redirigen a ingresar", async ({ page }) => {
  await page.goto("/panel/compras");
  await expect(page).toHaveURL(/\/ingresar\?next=%2Fpanel%2Fcompras/);
});

test("registro con verificación de correo y perfil inicial", async ({ page }) => {
  await page.goto("/registro");
  await page.getByLabel("Nombre completo").fill("Laura Prueba");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill("corta");
  await page.getByLabel("Nombre completo").click();
  await page.getByRole("button", { name: "Crear cuenta gratis" }).click();
  await expect(page.getByText("Usa al menos 8 caracteres.")).toBeVisible();
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta gratis" }).click();
  await expect(page.getByText("Debes aceptar los términos")).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear cuenta gratis" }).click();
  await expect(page).toHaveURL(/verifica-tu-correo/);

  // Sin confirmar no puede ingresar.
  await page.goto("/ingresar");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Primero confirma tu correo")).toBeVisible();

  const link = await lastEmailLink(email);
  await page.goto(link);
  await expect(page).toHaveURL(/\/panel\/bienvenida/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Laura");
  await page.getByLabel("Celular").fill("3001234567");
  await page.getByLabel("Denominación, código y grado").fill("Gestor I 301-01");
  await page.getByLabel("Nivel").selectOption("Profesional");
  await page.getByLabel("Modalidad").selectOption("Ingreso");
  await page.getByRole("button", { name: "Guardar y continuar" }).click();
  await expect(page).toHaveURL(/\/panel\/nueva/);
});

test("asistente: datos, subida de documentos y pago (sin pasarela configurada)", async ({ page }) => {
  await login(page);
  await page.goto("/panel/nueva");
  await expect(page.getByLabel("Denominación, código y grado")).toHaveValue("Gestor I 301-01");
  await page.getByLabel("OPEC o número de empleo").fill("98a7651");
  await expect(page.getByLabel("OPEC o número de empleo")).toHaveValue("987651");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Sube tus 2 documentos" })).toBeVisible();
  await page.locator("#file-manual").setInputFiles(pdf);
  await expect(page.getByText("manual.pdf")).toBeVisible();
  // Un archivo con tipo no permitido se rechaza en el navegador.
  const bad = path.join(tmp, "notas.txt");
  writeFileSync(bad, "hola");
  await page.locator("#file-indicadores").setInputFiles(bad);
  await expect(page.getByText("Formato no admitido")).toBeVisible();
  await page.locator("#file-indicadores").setInputFiles(png);
  await expect(page.getByText("indicadores.png")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByText("$ 29.900")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pagar con Wompi" })).toBeDisabled();
  await expect(page.getByText("Los pagos se habilitan en las próximas horas.")).toBeVisible();

  // Volver al paso 1 sin cambiar datos no pierde los documentos subidos.
  await page.getByRole("button", { name: "Atrás" }).click();
  await page.getByRole("button", { name: "Atrás" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("manual.pdf")).toBeVisible();
  await expect(page.getByText("indicadores.png")).toBeVisible();

  // El borrador quedó guardado con los documentos en el bucket privado.
  const db = adminDb();
  const { data: user } = await db.from("profiles").select("id").eq("email", email).single();
  const { data: gen } = await db.from("generations").select("status, opec, manual_path, indicadores_path").eq("user_id", user!.id).eq("status", "draft").single();
  expect(gen).toMatchObject({ status: "draft", opec: "987651" });
  expect((await db.storage.from("documents").download(gen!.manual_path!)).error).toBeNull();
  expect((await db.storage.from("documents").download(gen!.indicadores_path!)).error).toBeNull();
});

test("con crédito pero sin IA configurada: no consume el crédito", async ({ page }) => {
  const db = adminDb();
  const { data: user } = await db.from("profiles").select("id").eq("email", email).single();
  const { data: order } = await db.rpc("create_or_reuse_order", { p_user_id: user!.id, p_reference: "E2E-" + Date.now() });
  await db.rpc("apply_payment_result", { p_reference: order.reference, p_transaction_id: "e2e-" + order.id, p_provider_status: "APPROVED", p_amount_in_cents: order.amount_in_cents, p_currency: "COP", p_payment_method_type: "NEQUI" });

  await login(page);
  await page.goto("/panel/nueva");
  await expect(page.getByText("Usarás 1 de tus 1 generación disponible.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Generar mi simulador" })).toBeDisabled();
  const res = await page.request.post(`/api/generations/${(await db.from("generations").select("id").eq("user_id", user!.id).eq("status", "draft").single()).data!.id}/start`, { headers: { origin: "http://localhost:3000" } });
  expect(res.status()).toBe(503);
  const { data: bal } = await db.rpc("credit_balance", { p_user_id: user!.id });
  expect(bal).toBe(1);

  await page.goto("/panel/compras");
  await expect(page.getByText("Primer simulador")).toBeVisible();
  await expect(page.getByText("Aprobado")).toBeVisible();
  await expect(page.getByText("Nequi")).toBeVisible();
  await page.goto("/panel");
  await expect(page.getByText("Generaciones disponibles")).toBeVisible();
});

test("otro usuario no puede abrir mi simulador ni mis generaciones", async ({ page, browser }) => {
  const db = adminDb();
  const { data: user } = await db.from("profiles").select("id").eq("email", email).single();
  const { data: gen } = await db
    .from("generations")
    .insert({ user_id: user!.id, cargo: "Gestor I 301-01", nivel: "Profesional", opec: "236762", modalidad: "Ingreso", target_questions: 20, status: "completed", progress: 100, simulator_html_path: `${user!.id}/e2e.html`, questions: [] })
    .select("id")
    .single();
  await db.storage.from("simulators").upload(`${user!.id}/e2e.html`, new Blob(["<!doctype html><title>Simulador</title><p>Simulador de prueba</p>"], { type: "text/html" }), { upsert: true });

  await login(page);
  await page.goto(`/s/${gen!.id}`);
  await expect(page.getByText("Simulador de prueba")).toBeVisible();

  const other = uniqueEmail("otro");
  await db.auth.admin.createUser({ email: other, password: PASSWORD, email_confirm: true });
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await login(p2, other);
  const r = await p2.goto(`/s/${gen!.id}`);
  expect(r?.status()).toBe(404);
  const api = await p2.request.get(`/api/generations/${gen!.id}`);
  expect(api.status()).toBe(404);
  await ctx.close();
});

test("recuperación de contraseña por correo", async ({ page }) => {
  await page.goto("/recuperar");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByText("Revisa tu correo")).toBeVisible();
  await page.waitForTimeout(1500);
  const link = await lastEmailLink(email);
  await page.goto(link);
  await expect(page).toHaveURL(/\/restablecer/);
  await page.getByLabel("Contraseña nueva").fill("NuevaClave2026");
  await page.getByLabel("Confirma la contraseña").fill("NuevaClave2026");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page).toHaveURL(/\/panel$/);
  // Cerrar sesión y entrar con la nueva.
  await page.goto("/panel/cuenta");
  await page.getByRole("button", { name: "Cerrar sesión" }).last().click();
  await expect(page).toHaveURL(/aviso=sesion-cerrada/);
  await login(page, email, "NuevaClave2026");
  await expect(page).toHaveURL(/\/panel/);
});

test("panel en el celular @mobile", async ({ page }) => {
  const mobileUser = uniqueEmail("movil");
  await adminDb().auth.admin.createUser({ email: mobileUser, password: PASSWORD, email_confirm: true, user_metadata: { full_name: "Ana Móvil" } });
  await login(page, mobileUser);
  await page.goto("/panel");
  await expect(page.getByRole("navigation", { name: "Panel" }).last()).toBeVisible();
  for (const route of ["/panel", "/panel/nueva", "/panel/compras", "/panel/consumo", "/panel/cuenta", "/panel/simuladores", "/"]) {
    await page.goto(route);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, route).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
});

async function login(page: import("@playwright/test").Page, user = email, pass = PASSWORD) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo electrónico").fill(user);
  await page.locator("#password").fill(pass);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/panel/);
}
