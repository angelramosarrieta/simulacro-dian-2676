import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Ids de usuario cuyo correo contiene `q` (para filtrar listados del admin). */
export async function userIdsByEmail(admin: SupabaseClient, q?: string) {
  if (!q) return null;
  const { data } = await admin.from("profiles").select("id").ilike("email", `%${q.replace(/[%_,()]/g, "")}%`).limit(200);
  return (data ?? []).map((r) => r.id as string);
}

export async function emailsFor(admin: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const { data } = await admin.from("profiles").select("id, email").in("id", [...new Set(ids)]);
  return new Map((data ?? []).map((r) => [r.id as string, r.email as string]));
}
