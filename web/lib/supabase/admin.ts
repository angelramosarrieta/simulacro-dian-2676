import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la service role: salta RLS. Solo se usa en el servidor, después
 * de haber verificado al usuario, y siempre filtrando por su id.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
