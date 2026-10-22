import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/ResetForm";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nueva contraseña" };

// Se llega desde el enlace del correo de recuperación (/auth/callback crea la sesión).
export default async function Page() {
  const { user } = await getUser();
  if (!user) redirect("/ingresar?error=enlace");
  return (
    <AuthShell title="Crea una contraseña nueva" description={`Para la cuenta ${user.email}.`}>
      <ResetForm redirectTo="/panel" />
    </AuthShell>
  );
}
