import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { getAdmin } from "@/lib/admin/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileForm } from "@/components/panel/ProfileForm";
import { EmailForm } from "@/components/panel/EmailForm";
import { ResetForm } from "@/components/auth/ResetForm";
import { getBalance, getProfile, getQuote, requireSession } from "@/lib/data/account";
import { BRAND } from "@/lib/brand";
import { dateOnly } from "@/lib/format";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function Page() {
  const [{ user }, profile, balance, quote, isAdmin] = await Promise.all([requireSession(), getProfile(), getBalance(), getQuote(), getAdmin()]);
  return (
    <>
      <PageHeader eyebrow="Configuración" title="Mi cuenta" description="Tus datos, tu seguridad y el estado de tu cuenta." />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {isAdmin && (
            <Link href="/admin" className="card flex items-center gap-3 border-warn/40 p-5 hover:bg-warnSoft sm:p-6">
              <ShieldCheck className="h-5 w-5 text-warn" aria-hidden />
              <span>
                <span className="block font-medium">Panel de administración</span>
                <span className="text-[13px] text-muted">Métricas, órdenes, biblioteca, llaves y configuración.</span>
              </span>
            </Link>
          )}
          <section className="card p-5 sm:p-6">
            <h2 className="mb-5 font-medium">Perfil y preferencias</h2>
            <ProfileForm
              initial={{
                full_name: profile.full_name,
                phone: profile.phone,
                city: profile.city,
                default_cargo: profile.default_cargo,
                default_nivel: profile.default_nivel,
                default_modalidad: profile.default_modalidad,
                marketing_opt_in: profile.marketing_opt_in,
              }}
            />
          </section>
          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 font-medium">Correo electrónico</h2>
            <EmailForm current={user.email ?? profile.email} />
          </section>
          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 font-medium">Contraseña</h2>
            <ResetForm redirectTo="" submitLabel="Actualizar contraseña" />
          </section>
        </div>
        <aside className="space-y-4">
          <section className="card p-5 text-[14px]">
            <h2 className="font-medium">Estado de la cuenta</h2>
            <dl className="mt-4 space-y-3">
              <div className="flex justify-between gap-3"><dt className="text-muted">Estado</dt><dd><span className="badge bg-okSoft text-ok">Activa</span></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Correo verificado</dt><dd>{user.email_confirmed_at ? "Sí" : "Pendiente"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Miembro desde</dt><dd>{dateOnly(profile.created_at)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Generaciones disponibles</dt><dd className="font-medium">{balance}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Plan</dt><dd>{quote.hasPaid ? "Activado" : "Sin activar"}</dd></div>
            </dl>
          </section>
          <section className="card p-5 text-[14px]">
            <h2 className="font-medium">Tus datos</h2>
            <p className="mt-2 text-muted">
              Para descargar o eliminar tu información escríbenos a <a className="link break-all" href={`mailto:${BRAND.supportEmail}?subject=Solicitud%20sobre%20mis%20datos`}>{BRAND.supportEmail}</a>. Respondemos en máximo 15 días hábiles (Ley 1581 de 2012).
            </p>
          </section>
          <form action="/auth/salir" method="post">
            <button className="btn-secondary w-full"><LogOut className="h-4 w-4" aria-hidden /> Cerrar sesión</button>
          </form>
        </aside>
      </div>
    </>
  );
}
