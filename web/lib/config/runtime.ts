import "server-only";
import { createClient } from "@supabase/supabase-js";
import { decryptSecret, encryptionAvailable } from "@/lib/config/crypto";

/**
 * Configuración de integraciones en tiempo de ejecución: lo guardado desde
 * /admin/configuracion (tabla app_secrets, cifrado) tiene prioridad sobre las
 * variables de entorno de Vercel. Se cachea 60 s por instancia.
 */
let cache: { at: number; values: Map<string, string> } | null = null;
const TTL_MS = 60_000;

export async function loadRuntimeConfig(force = false): Promise<Map<string, string>> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.values;
  const values = new Map<string, string>();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key && encryptionAvailable()) {
    try {
      const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data } = await sb.from("app_secrets").select("key, ciphertext");
      for (const row of data ?? []) {
        try {
          values.set(row.key, decryptSecret(row.ciphertext));
        } catch {
          console.error(`No se pudo descifrar la llave ${row.key} (¿cambió SECRETS_ENCRYPTION_KEY?)`);
        }
      }
    } catch (e) {
      console.error("No se pudo leer la configuración guardada:", e instanceof Error ? e.message : e);
    }
  }
  cache = { at: Date.now(), values };
  return values;
}

export function invalidateRuntimeConfig() {
  cache = null;
}

/** Valor efectivo (panel > variable de entorno). Llamar después de loadRuntimeConfig(). */
export function cfg(key: string): string | undefined {
  const fromPanel = cache?.values.get(key);
  if (fromPanel) return fromPanel;
  const fromEnv = process.env[key];
  if (fromEnv) return fromEnv;
  // La llave pública de Wompi también puede venir con el prefijo NEXT_PUBLIC_ (configuración anterior).
  if (key === "WOMPI_PUBLIC_KEY") return process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || undefined;
  return undefined;
}

export async function getCfg(key: string) {
  await loadRuntimeConfig();
  return cfg(key);
}

/** De dónde sale cada valor (para el panel de administración). */
export function sourceOf(key: string): "panel" | "vercel" | null {
  if (cache?.values.get(key)) return "panel";
  if (process.env[key] || (key === "WOMPI_PUBLIC_KEY" && process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY)) return "vercel";
  return null;
}
