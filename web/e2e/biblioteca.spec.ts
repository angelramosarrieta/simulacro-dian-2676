import { expect, test } from "@playwright/test";
import { adminDb, uniqueEmail } from "./utils";

const PASSWORD = "Estudio2026";

const question = (n: number, eje: string) => ({
  a: 0,
  p: 1,
  t: eje,
  cs: `Caso de biblioteca ${n}: el contribuyente presenta la declaración fuera de plazo y solicita orientación.`,
  q: `Con base en el caso (${n}), al gestor le corresponde`,
  o: [`opción correcta ${n}.`, `distractor uno ${n}.`, `distractor dos ${n}.`],
  j: ["Correcta. Por la norma.", "Incorrecta. No aplica.", "Incorrecta. Desconoce el plazo."],
  r: "ET art. 641",
});

async function seedBank(opec: string) {
  const questions = Array.from({ length: 12 }, (_, i) => question(i + 1, i < 9 ? "Fiscalización tributaria" : "Razonamiento matemático"));
  const { error } = await adminDb().from("job_banks").insert({
    opec,
    cargo: "Gestor II 302-02",
    nivel: "Profesional",
    modalidad: "Ingreso",
    ejes: ["Fiscalización tributaria", "Razonamiento matemático"],
    plan: [{ eje: "Fiscalización tributaria", cantidad: 9, generadas: 9 }, { eje: "Razonamiento matemático", cantidad: 3, generadas: 3 }],
    questions,
    question_count: questions.length,
  });
  if (error) throw error;
}

async function userWithCredit(tag: string) {
  const db = adminDb();
  const email = uniqueEmail(tag);
  const { data } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: `Aspirante ${tag}` } });
  const id = data.user!.id;
  const { data: order } = await db.rpc("create_or_reuse_order", { p_user_id: id, p_reference: `E2E-B-${Date.now()}-${tag}` });
  await db.rpc("apply_payment_result", { p_reference: order.reference, p_transaction_id: `e2e-b-${order.id}`, p_provider_status: "APPROVED", p_amount_in_cents: order.amount_in_cents, p_currency: "COP", p_payment_method_type: "CARD" });
  return { email, id };
}

async function login(page: import("@playwright/test").Page, user: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo electrónico").fill(user);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/panel/);
}

async function fillJob(page: import("@playwright/test").Page, opec: string) {
  await page.goto("/panel/nueva");
  await page.getByLabel("Denominación, código y grado").fill("Gestor II 302-02");
  await page.getByLabel("Nivel jerárquico").selectOption("Profesional");
  await page.getByLabel("Ingreso", { exact: true }).check();
  await page.getByLabel("OPEC o número de empleo").fill(opec);
  await page.getByRole("button", { name: "Continuar" }).click();
}

test("empleo en la biblioteca: el simulador sale al instante, sin documentos ni IA", async ({ page }) => {
  const opec = String(Math.floor(100000 + Math.random() * 899999));
  await seedBank(opec);
  const U = await userWithCredit("bib");
  await login(page, U.email);
  await fillJob(page, opec);

  await expect(page.getByText("Tu empleo ya está en nuestra biblioteca")).toBeVisible();
  await expect(page.getByLabel(/Usar la biblioteca/)).toBeChecked();
  await expect(page.locator("#file-manual")).toHaveCount(0);
  await page.getByRole("button", { name: "Continuar" }).click();

  // Aunque la IA no esté configurada en este entorno, la biblioteca funciona.
  await page.getByRole("button", { name: "Obtener mi simulador" }).click();
  await page.waitForURL(/\/panel\/simuladores\//);
  const genId = page.url().match(/simuladores\/([0-9a-f-]+)/)![1];
  await expect.poll(async () => (await adminDb().from("generations").select("status").eq("id", genId).single()).data?.status, { timeout: 20_000 }).toBe("completed");
  const { data: gen } = await adminDb().from("generations").select("source, steps_run, questions").eq("id", genId).single();
  expect(gen).toMatchObject({ source: "biblioteca", steps_run: 0 });
  expect(gen!.questions).toHaveLength(12);
  const html = await (await page.request.get(`/s/${genId}?descargar=1`)).text();
  expect(html).toContain(`clave:"${opec}"`);
  expect(html).toContain("Caso de biblioteca 1:");
  expect((await adminDb().rpc("credit_balance", { p_user_id: U.id })).data).toBe(0);
});

test("subir documentos: cada uno explica dónde conseguirlo, con enlaces", async ({ page }) => {
  const opec = String(Math.floor(100000 + Math.random() * 899999));
  await seedBank(opec);
  const U = await userWithCredit("doc");
  await login(page, U.email);
  await fillJob(page, opec);

  await page.getByLabel(/Subir mis documentos/).check();
  await expect(page.locator("#file-manual")).toHaveCount(1);
  await page.getByText("¿Dónde consigo mi manual de funciones?").click();
  await expect(page.getByRole("link", { name: /SIMO/ }).first()).toHaveAttribute("href", /^https:\/\/simo\.cnsc\.gov\.co/);
  await page.getByText("¿Dónde consigo mis indicadores?").click();
  await expect(page.getByText(/indicadores/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Guía/ }).first()).toHaveAttribute("href", /^https:\/\//);
});
