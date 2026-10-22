"use client";
import { useState } from "react";
import { CreditCard } from "lucide-react";
import { track } from "@vercel/analytics";
import { Spinner } from "@/components/ui/Spinner";

export function CheckoutButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || "No pudimos abrir el pago.");
      track("checkout_iniciado", { origen: "comprar" });
      window.location.assign(data.url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div>
      <button type="button" className="btn-primary w-full" onClick={go} disabled={busy || disabled}>
        {busy ? <Spinner /> : <CreditCard className="h-4 w-4" aria-hidden />} {busy ? "Abriendo Wompi…" : label}
      </button>
      {error && <p role="alert" className="mt-2 text-[13px] text-bad">{error}</p>}
    </div>
  );
}
