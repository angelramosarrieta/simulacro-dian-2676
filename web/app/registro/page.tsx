import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function Page() {
  return (
    <AuthShell
      title="Crea tu cuenta"
      description="Gratis y en menos de un minuto."
      footer={<>¿Ya tienes cuenta? <Link href="/ingresar" className="link">Ingresa</Link></>}
    >
      <RegisterForm />
    </AuthShell>
  );
}
