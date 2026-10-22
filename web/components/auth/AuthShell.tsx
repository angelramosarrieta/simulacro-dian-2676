import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function AuthShell({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,520px)]">
      <aside className="relative hidden overflow-hidden bg-brand p-12 text-onBrand lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_10%,rgb(255_255_255/0.14),transparent)]" />
        <Link href="/" className="relative inline-flex items-center gap-2.5 text-[15px] font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-white/15 font-mono text-[13px]">26</span>
          Simulacro 2676
        </Link>
        <div className="relative max-w-md">
          <p className="text-[30px] font-semibold leading-tight tracking-tight">Practica con casos de tu empleo y llega con ritmo al examen.</p>
          <ul className="mt-8 space-y-3 text-[15px] opacity-90">
            <li>· Preguntas creadas desde tu manual de funciones</li>
            <li>· Repartidas por tus ejes oficiales</li>
            <li>· Cada opción justificada con la norma</li>
          </ul>
        </div>
        <p className="relative text-[12.5px] opacity-75">Herramienta independiente, sin afiliación con la DIAN ni la CNSC.</p>
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1.5 text-[15px] text-muted">{description}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-[14px] text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
