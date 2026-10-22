import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex h-16 max-w-page items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Principal" className="hidden items-center gap-1 text-[14px] text-muted md:flex">
          <Link href="/#como-funciona" className="rounded-lg px-3 py-2 hover:text-ink">Cómo funciona</Link>
          <Link href="/#que-incluye" className="rounded-lg px-3 py-2 hover:text-ink">Qué incluye</Link>
          <Link href="/#precios" className="rounded-lg px-3 py-2 hover:text-ink">Precios</Link>
          <Link href="/#preguntas" className="rounded-lg px-3 py-2 hover:text-ink">Preguntas</Link>
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/panel" className="btn-primary btn-sm">Ir a mi panel</Link>
          ) : (
            <>
              <Link href="/ingresar" className="btn-ghost btn-sm px-2.5 sm:px-3">Ingresar</Link>
              <Link href="/registro" className="btn-primary btn-sm">Crear cuenta</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
