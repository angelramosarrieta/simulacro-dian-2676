"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-[60dvh] place-items-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-[24px] font-semibold tracking-tight">Algo salió mal</h1>
        <p className="mt-2 text-muted">Tuvimos un problema al cargar esta página. Tus datos y compras están seguros.</p>
        {error.digest && <p className="mt-2 font-mono text-[12px] text-faint">Código: {error.digest}</p>}
        <button onClick={reset} className="btn-primary mt-6">Intentar de nuevo</button>
      </div>
    </main>
  );
}
