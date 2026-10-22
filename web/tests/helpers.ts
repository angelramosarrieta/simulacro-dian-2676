import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import path from "path";

/** Las pruebas de BD usan el Supabase local (`npx supabase start`) con las llaves de .env.local. */
function loadEnv() {
  try {
    const raw = readFileSync(path.join(__dirname, "../.env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}
loadEnv();

export const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function dbAvailable() {
  if (!URL_.includes("127.0.0.1") && !URL_.includes("localhost")) return false; // nunca contra producción
  try {
    const r = await fetch(`${URL_}/auth/v1/health`, { headers: { apikey: ANON } });
    return r.ok;
  } catch {
    return false;
  }
}

export const admin = () => createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

export async function newUser(tag: string): Promise<{ id: string; email: string; client: SupabaseClient }> {
  const email = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.local`;
  const password = "Prueba12345";
  const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Usuario ${tag}`, accepted_terms: true } });
  if (error) throw error;
  const client = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return { id: data.user.id, email, client };
}

export async function grantCredit(userId: string, reference = `T-${Math.random().toString(36).slice(2)}`) {
  const a = admin();
  const { data: order, error } = await a.rpc("create_or_reuse_order", { p_user_id: userId, p_reference: reference });
  if (error) throw error;
  const { data, error: e2 } = await a.rpc("apply_payment_result", {
    p_reference: order.reference,
    p_transaction_id: `tx-${order.reference}`,
    p_provider_status: "APPROVED",
    p_amount_in_cents: order.amount_in_cents,
    p_currency: "COP",
    p_payment_method_type: "CARD",
  });
  if (e2) throw e2;
  return { order, result: data[0] };
}
