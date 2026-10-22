import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Cifrado de las llaves guardadas desde el panel (AES-256-GCM). La clave
 * maestra es SECRETS_ENCRYPTION_KEY (64 caracteres hex = 32 bytes) y solo vive
 * en las variables del servidor. Formato: "v1:" + base64(iv[12] | tag[16] | datos).
 */
function masterKey(): Buffer | null {
  const hex = process.env.SECRETS_ENCRYPTION_KEY ?? "";
  return /^[0-9a-fA-F]{64}$/.test(hex) ? Buffer.from(hex, "hex") : null;
}

export function encryptionAvailable() {
  return masterKey() !== null;
}

export function encryptSecret(plain: string): string {
  const key = masterKey();
  if (!key) throw new Error("Falta SECRETS_ENCRYPTION_KEY");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1:${Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const key = masterKey();
  if (!key) throw new Error("Falta SECRETS_ENCRYPTION_KEY");
  if (!payload.startsWith("v1:")) throw new Error("Formato de secreto desconocido");
  const raw = Buffer.from(payload.slice(3), "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}
