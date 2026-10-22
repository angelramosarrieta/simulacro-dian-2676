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
  if (data) return { user, admin };
  // Correos de administrador configurados (app_settings.admin_emails), solo con correo verificado.
  if (!user.email_confirmed_at) return null;
  const { data: promoted } = await admin.rpc("ensure_admin", { p_user_id: user.id });
  return promoted ? { user, admin } : null;
});

/** Para páginas: quien no es administrador ve un 404 (no se revela que la ruta existe). */
export async function requireAdminPage() {
  const ctx = await getAdmin();
  if (!ctx) notFound();
  return ctx;
}
