import { expect, test } from "@playwright/test";
import { adminDb, uniqueEmail } from "./utils";

const PASSWORD = "Estudio2026";

test("las visitas anónimas aparecen en Admin → Visitas", async ({ page, browser }) => {
  // Un visitante anónimo llega desde una campaña y ve dos páginas.
  const ctx = await browser.newContext();
  const anon = await ctx.newPage();
  const campaign = `prueba${Date.now()}`;
  await anon.goto(`/?utm_source=${campaign}&utm_campaign=lanzamiento`);
  await anon.waitForLoadState("networkidle");
  await anon.goto("/ejemplo");
  await anon.waitForLoadState("networkidle");
  const db = adminDb();
  await expect.poll(async () => (await db.from("page_views").select("id").eq("utm_source", campaign)).data?.length ?? 0, { timeout: 15_000 }).toBeGreaterThan(0);
  const { data: rows } = await db.from("page_views").select("visitor_id, device, path").eq("utm_source", campaign);
  await ctx.close();

  const email = uniqueEmail("visitas");
  const { data: u } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: "Admin Visitas" } });
  await db.from("admins").insert({ user_id: u.user!.id });
  await page.goto("/ingresar");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/panel/);
  await page.goto("/admin/visitas?dias=1");
  await expect(page.getByRole("heading", { name: "Visitas", exact: true })).toBeVisible();
  await expect(page.getByText(campaign).first()).toBeVisible();
  await expect(page.getByText("Visitantes únicos por día")).toBeVisible();
  expect(rows!.every((r) => r.visitor_id === rows![0].visitor_id)).toBe(true);
  // Las páginas de administración no se registran.
  const { data: adminViews } = await db.from("page_views").select("id").like("path", "/admin%");
  expect(adminViews ?? []).toHaveLength(0);
});
