import type { Metadata } from "next";
import { LogOut, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { BottomNav, SideNav } from "@/components/panel/Nav";
import { getBalance, getProfile } from "@/lib/data/account";
import { getAdmin } from "@/lib/admin/auth";
import Link from "next/link";

export const metadata: Metadata = { title: "Panel", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const [profile, balance, isAdmin] = await Promise.all([getProfile(), getBalance(), getAdmin()]);
  const initials = (profile.full_name || profile.email).split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <div className="px-2">
          <Logo href="/panel" />
        </div>
        <div className="mt-8 flex-1">
          <SideNav />
          {isAdmin && (
            <Link href="/admin" className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] text-warn hover:bg-warnSoft">
              <ShieldCheck className="h-[18px] w-[18px]" aria-hidden /> Administración
            </Link>
          )}
        </div>
        <div className="rounded-2xl border border-line p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-soft text-[13px] font-medium">{initials}</span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium">{profile.full_name || "Tu cuenta"}</p>
              <p className="truncate text-[12.5px] text-muted">{profile.email}</p>
            </div>
          </div>
          <form action="/auth/salir" method="post" className="mt-3">
            <button className="btn-ghost btn-sm w-full justify-start text-muted">
              <LogOut className="h-4 w-4" aria-hidden /> Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
          <Logo href="/panel" />
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link href="/admin" className="badge bg-warnSoft text-warn">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Admin
              </Link>
            )}
            <span className="badge bg-brandSoft text-brandInk" title="Generaciones disponibles">
              {balance} {balance === 1 ? "generación" : "generaciones"}
            </span>
          </div>
        </header>
        <main id="contenido" className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
