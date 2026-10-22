import { readFileSync } from "fs";
import path from "path";
import { expect, test } from "@playwright/test";
import { adminDb, uniqueEmail } from "./utils";

const PASSWORD = "Estudio2026";
const q = (n: number) => ({
  t: "Fiscalización tributaria",
  p: 1,
  cs: `Caso propio ${n}: el contribuyente no presentó la declaración.`,
  q: `¿Qué corresponde hacer? (${n})`,
  o: [`correcta ${n}`, `incorrecta uno ${n}`, `incorrecta dos ${n}`],
  a: 0,
  j: ["Correcta por la norma.", "No aplica.", "Tampoco."],
  r: "ET art. 715",
});

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/panel/);
}

test("el simulador se abre dentro del panel y guarda el progreso en la cuenta", async ({ page, browser }) => {
  const db = adminDb();
  const email = uniqueEmail("sim");
  const { data: u } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: "Aspirante Sim" } });
  const { data: gen } = await db
    .from("generations")
    .insert({
      user_id: u.user!.id,
      cargo: "Gestor III 303-03",
      nivel: "Profesional",
      opec: "445566",
      modalidad: "Ingreso",
      status: "completed",
      progress: 100,
      target_questions: 3,
      questions: [q(1), q(2), q(3)],
      plan: [{ eje: "Fiscalización tributaria", cantidad: 3, generadas: 3 }],
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  await login(page, email);
  await page.goto("/panel/simuladores");
  await page.getByRole("link", { name: "Estudiar" }).click();
  await expect(page.getByRole("heading", { name: "Gestor III 303-03" })).toBeVisible();
  // Mismo panel: la navegación de la plataforma sigue ahí.
  await expect(page.getByRole("navigation", { name: "Panel" }).first()).toBeAttached();
  await expect(page.getByText("1 ejes oficiales · 3 preguntas · cronometrado")).toBeVisible();

  await page.getByRole("tab", { name: "Practicar" }).click();
  await page.getByRole("button", { name: /^Fiscalización tributaria/ }).click();
  const wrong = page.getByRole("radio").filter({ hasText: /incorrecta uno/ });
  await wrong.click();
  await expect(page.getByText("Incorrecto")).toBeVisible();
  await expect(page.getByText("ET art. 715")).toBeVisible();
  await page.getByRole("button", { name: "Salir" }).click();
  await page.getByRole("button", { name: "Salir" }).last().click();

  await expect.poll(async () => (await db.from("simulator_progress").select("stats").eq("generation_id", gen!.id).maybeSingle()).data?.stats, { timeout: 15_000 }).toBeTruthy();

  // Otro dispositivo (navegador limpio): el progreso viene de la cuenta.
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await login(p2, email);
  await p2.goto(`/panel/simuladores/${gen!.id}`);
  await expect(p2.getByText("1 preguntas pendientes").first()).toBeVisible();
  await p2.getByRole("tab", { name: "Progreso" }).click();
  await expect(p2.getByText("Se guarda en tu cuenta")).toBeVisible();
  await ctx.close();

  // El enlace antiguo /s/:id lleva al panel; la descarga sigue disponible.
  await page.goto(`/s/${gen!.id}`);
  await expect(page).toHaveURL(new RegExp(`/panel/simuladores/${gen!.id}$`));
});

test("simulacro cronometrado: califica y guarda el historial", async ({ page }) => {
  await page.goto("/ejemplo");
  await page.getByRole("tab", { name: "Practicar" }).click();
  await page.getByRole("button", { name: "15" }).click();
  await page.getByRole("button", { name: /^Casos tipo examen/ }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  for (let i = 0; i < 15; i++) {
    await page.getByRole("radio").first().click();
    if (i < 14) await page.getByRole("button", { name: "Siguiente" }).click();
  }
  await page.getByRole("button", { name: "Terminar y calificar" }).click();
  await expect(page.getByText("de 100")).toBeVisible();
  await expect(page.getByText(/de 15 correctas/)).toBeVisible();
  await page.getByRole("button", { name: "Volver" }).click();
  await page.getByRole("tab", { name: "Progreso" }).click();
  await expect(page.getByText("Casos tipo examen").first()).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Progreso" }).click();
  await expect(page.getByText(/\/15 correctas/)).toBeVisible();
});

test("simulador importado: conserva su banco completo y trae el progreso del original", async ({ page }) => {
  const db = adminDb();
  const demo = JSON.parse(readFileSync(path.join(__dirname, "../lib/simulator/data/demo.json"), "utf8"));
  const email = uniqueEmail("imp");
  const { data: u } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: "Dueño Original" } });
  const counts = demo.ejes.map((e: string) => ({ eje: e, cantidad: 0, generadas: demo.questions.filter((x: { t: string }) => x.t === e).length }));
  const { data: gen } = await db
    .from("generations")
    .insert({ user_id: u.user!.id, cargo: demo.cargo, nivel: "Profesional", opec: demo.opec, modalidad: "Ingreso", status: "completed", progress: 100, source: "importado", analysis: { clave: "2676", banco: "original" }, target_questions: demo.questions.length, questions: [], plan: counts, finished_at: new Date().toISOString() })
    .select("id")
    .single();

  // Progreso que tenía en el simulador original (mismo dominio): pregunta 0 fallada.
  await page.goto("/mi-simulador");
  await page.evaluate(() => localStorage.setItem("simulacro2676:v1", JSON.stringify({ "0": { n: 1, ok: 0, last: false } })));
  await login(page, email);
  await page.goto(`/panel/simuladores/${gen!.id}`);
  await expect(page.getByText(`${demo.questions.length} preguntas`).first()).toBeVisible();
  await expect(page.getByText("1 preguntas pendientes").first()).toBeVisible();
  await expect.poll(async () => (await db.from("simulator_progress").select("stats").eq("generation_id", gen!.id).maybeSingle()).data?.stats, { timeout: 15_000 }).toEqual({ "0": { n: 1, ok: 0, last: false } });
  await page.getByText("Detalles de tu simulador").click();
  await expect(page.getByRole("link", { name: "Abrir versión original" })).toHaveAttribute("href", "/mi-simulador");
});
