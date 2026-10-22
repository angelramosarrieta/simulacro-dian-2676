import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { RecoverForm } from "@/components/auth/RecoverForm";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function Page() {
  return (
    <AuthShell title="Recupera tu contraseña" description="Te enviaremos un enlace para crear una nueva." footer={<Link href="/ingresar" className="link">Volver a ingresar</Link>}>
      <RecoverForm />
    </AuthShell>
  );
}
