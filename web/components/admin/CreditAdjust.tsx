"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

export function CreditAdjust({ userId }: { userId: string }) {
  const router = useRouter();
  const [delta, setDelta] = useState(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`¿Confirmas ${delta > 0 ? "sumar" : "restar"} ${Math.abs(delta)} generación(es) a este usuario?`)) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/credits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, delta, note }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ tone: "error", text: data?.error?.message ?? "No se pudo ajustar." });
    setMsg({ tone: "success", text: `Listo. Nuevo saldo: ${data.balance}.` });
    setNote("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <div className="flex gap-3">
        <div className="w-28">
          <label htmlFor="delta" className="label">Ajuste</label>
          <input id="delta" type="number" min={-20} max={20} className="input font-mono" value={delta} onChange={(e) => setDelta(Number(e.target.value))} />
        </div>
        <div className="flex-1">
          <label htmlFor="note" className="label">Motivo (queda en la auditoría)</label>
          <input id="note" className="input" maxLength={300} placeholder="Ej.: cortesía por falla del 22/10" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <button type="submit" className="btn-primary btn-sm" disabled={busy || !delta || note.trim().length < 3}>
        {busy && <Spinner />} Aplicar ajuste
      </button>
    </form>
  );
}
