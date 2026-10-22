import Link from "next/link";
import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResendConfirmation } from "@/components/auth/ResendConfirmation";

export const metadata: Metadata = { title: "Confirma tu correo" };

export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <AuthShell title="Confirma tu correo" footer={<Link href="/ingresar" className="link">Ya lo confirmé, ingresar</Link>}>
      <div className="card p-6">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-brandSoft text-brandInk">
          <MailCheck className="h-5 w-5" aria-hidden />
        </span>
        <p className="mt-4 text-[15px]">
          Te enviamos un enlace de confirmación{email ? <> a <b className="break-all">{email}</b></> : null}. Ábrelo desde este dispositivo para activar tu cuenta.
        </p>
        <p className="mt-2 text-[14px] text-muted">¿No llega? Revisa la carpeta de spam o promociones. Puede tardar un par de minutos.</p>
        {email && <ResendConfirmation email={email} />}
      </div>
    </AuthShell>
  );
}
