"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

export function LibraryToggle({ opec, enabled }: { opec: string; enabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function toggle() {
    if (enabled && !confirm(`¿Retirar el banco de la OPEC ${opec}? Los próximos aspirantes de este empleo generarán uno nuevo con IA.`)) return;
    setBusy(true);
    const res = await fetch("/api/admin/library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opec, enabled: !enabled }) });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert("No se pudo actualizar.");
  }
  return (
    <button type="button" onClick={toggle} disabled={busy} className={enabled ? "btn-ghost btn-sm text-bad" : "btn-secondary btn-sm"}>
      {busy && <Spinner />} {enabled ? "Retirar" : "Activar"}
    </button>
  );
}
