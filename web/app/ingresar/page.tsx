import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { Alert } from "@/components/ui/Alert";
import { safeNext } from "@/lib/routes";

export const metadata: Metadata = { title: "Ingresar" };

const NOTICES: Record<string, string> = {
  "contrasena-actualizada": "Tu contraseña se actualizó. Ingresa con la nueva.",
  "sesion-cerrada": "Cerraste sesión.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; aviso?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell
      title="Ingresa a tu cuenta"
      description="Continúa con tu simulador donde lo dejaste."
      footer={<>¿No tienes cuenta? <Link href="/registro" className="link">Créala gratis</Link></>}
    >
      {sp.error === "enlace" && (
        <div className="mb-5">
          <Alert tone="error">El enlace no es válido o ya venció. Intenta de nuevo.</Alert>
        </div>
      )}
      <LoginForm next={safeNext(sp.next)} notice={sp.aviso ? NOTICES[sp.aviso] : undefined} />
    </AuthShell>
  );
}
