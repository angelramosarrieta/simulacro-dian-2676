import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="text-center">
        <Logo />
        <p className="mt-10 font-mono text-[13px] text-muted">404</p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight">No encontramos esta página</h1>
        <p className="mt-2 text-muted">Puede que el enlace esté mal escrito o que ya no exista.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn-secondary">Ir al inicio</Link>
          <Link href="/panel" className="btn-primary">Ir a mi panel</Link>
        </div>
      </div>
    </main>
  );
}
