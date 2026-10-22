import { expect, test } from "@playwright/test";
import { adminDb, uniqueEmail } from "./utils";
test("admin ve el acceso en el celular @mobile", async ({ page }) => {
  const email = uniqueEmail("admmov");
  const { data } = await adminDb().auth.admin.createUser({ email, password: "Estudio2026", email_confirm: true, user_metadata: { full_name: "Admin Móvil" } });
  await adminDb().from("admins").insert({ user_id: data.user!.id });
  await page.goto("/ingresar"); await page.getByLabel("Correo electrónico").fill(email); await page.locator("#password").fill("Estudio2026"); await page.getByRole("button", { name: "Ingresar" }).click(); await page.waitForURL(/panel/);
  await page.goto("/panel");
  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/panel/cuenta");
  await expect(page.getByRole("link", { name: /Panel de administración/ })).toBeVisible();
});
