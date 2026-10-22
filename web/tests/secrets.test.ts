import { beforeAll, describe, expect, it } from "vitest";
import { admin, dbAvailable, newUser } from "./helpers";
import { decryptSecret, encryptSecret } from "@/lib/config/crypto";
import { cfg, invalidateRuntimeConfig, loadRuntimeConfig, sourceOf } from "@/lib/config/runtime";
import { CONFIG_FIELDS } from "@/lib/config/catalog";

describe("cifrado de llaves", () => {
  beforeAll(() => {
    process.env.SECRETS_ENCRYPTION_KEY ||= "a".repeat(64);
  });
  it("cifra y descifra; el texto cifrado no contiene la llave", () => {
    const c = encryptSecret("sk-ant-secreto-123456789012345");
    expect(c.startsWith("v1:")).toBe(true);
    expect(c).not.toContain("secreto");
    expect(decryptSecret(c)).toBe("sk-ant-secreto-123456789012345");
    expect(encryptSecret("x")).not.toBe(encryptSecret("x")); // IV aleatorio
  });
  it("detecta manipulación", () => {
    const c = encryptSecret("valor");
    const raw = Buffer.from(c.slice(3), "base64");
    raw[raw.length - 1] ^= 1;
    expect(() => decryptSecret(`v1:${raw.toString("base64")}`)).toThrow();
  });
  it("valida formatos de las llaves conocidas", () => {
    const f = (k: string) => CONFIG_FIELDS.find((x) => x.key === k)!.pattern!;
    expect(f("ANTHROPIC_API_KEY").test("sk-ant-api03-abcdefghijklmnopqrstuvwxyz")).toBe(true);
    expect(f("ANTHROPIC_API_KEY").test("hola")).toBe(false);
    expect(f("WOMPI_PUBLIC_KEY").test("pub_test_ABCdef123")).toBe(true);
    expect(f("WOMPI_PRIVATE_KEY").test("pub_test_ABCdef123")).toBe(false);
    expect(f("RESEND_API_KEY").test("re_123456789abc")).toBe(true);
  });
});

const ok = await dbAvailable();
const d = ok ? describe : describe.skip;

d("llaves guardadas desde el panel", () => {
  it("el valor del panel tiene prioridad sobre Vercel y no es legible desde el navegador", async () => {
    process.env.WOMPI_ENV = "sandbox";
    await admin().from("app_secrets").upsert({ key: "WOMPI_ENV", ciphertext: encryptSecret("production"), hint: "production" });
    invalidateRuntimeConfig();
    await loadRuntimeConfig();
    expect(cfg("WOMPI_ENV")).toBe("production");
    expect(sourceOf("WOMPI_ENV")).toBe("panel");

    const U = await newUser("secretsnoop");
    const { data, error } = await U.client.from("app_secrets").select("*");
    expect(error !== null || (data ?? []).length === 0).toBe(true);
    expect((await U.client.from("app_secrets").insert({ key: "X", ciphertext: "y" })).error).not.toBeNull();

    await admin().from("app_secrets").delete().eq("key", "WOMPI_ENV");
    invalidateRuntimeConfig();
    await loadRuntimeConfig();
    expect(cfg("WOMPI_ENV")).toBe("sandbox");
    expect(sourceOf("WOMPI_ENV")).toBe("vercel");
  });
});
