import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { BRAND } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-page gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">
            Simuladores de estudio personalizados para la prueba escrita del Proceso de Selección DIAN 2676.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-3">Producto</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="text-muted hover:text-ink" href="/#como-funciona">Cómo funciona</Link></li>
            <li><Link className="text-muted hover:text-ink" href="/#precios">Precios</Link></li>
            <li><a className="text-muted hover:text-ink" href={BRAND.exampleUrl} target="_blank" rel="noreferrer">Ver un ejemplo</a></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Cuenta</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="text-muted hover:text-ink" href="/registro">Crear cuenta</Link></li>
            <li><Link className="text-muted hover:text-ink" href="/ingresar">Ingresar</Link></li>
            <li><Link className="text-muted hover:text-ink" href="/recuperar">Recuperar contraseña</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Legal y contacto</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="text-muted hover:text-ink" href="/terminos">Términos y condiciones</Link></li>
            <li><Link className="text-muted hover:text-ink" href="/privacidad">Tratamiento de datos</Link></li>
            <li><a className="text-muted hover:text-ink" href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-page px-4 py-5 text-[12.5px] leading-relaxed text-muted sm:px-6">
          Herramienta de estudio independiente. No está afiliada a la DIAN, la CNSC ni al operador del concurso, y no usa ni reproduce
          pruebas reales (son reservadas, Ley 909 de 2004, art. 31). Verifica siempre la información oficial en SIMO y en cnsc.gov.co.
          © {new Date().getFullYear()} {BRAND.legalName}.
        </div>
      </div>
    </footer>
  );
}
