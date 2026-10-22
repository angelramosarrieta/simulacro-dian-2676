import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** ¿El usuario de la sesión es administrador? (tabla admins, solo legible con service role). */
export const getAdmin = cache(async () => {
  const { user } = await getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return data ? { user, admin } : null;
});

/** Para páginas: quien no es administrador ve un 404 (no se revela que la ruta existe). */
export async function requireAdminPage() {
  const ctx = await getAdmin();
  if (!ctx) notFound();
  return ctx;
}
