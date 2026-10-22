"use client";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";

export function EmailForm({ current }: { current: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await createClient().auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${window.location.origin}/auth/callback?next=/panel/cuenta` });
    setBusy(false);
    if (error) return setMsg({ tone: "error", text: authErrorMessage(error.message, error.code) });
    setMsg({ tone: "success", text: "Te enviamos enlaces de confirmación al correo actual y al nuevo. El cambio se aplica al confirmar." });
    setEmail("");
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <p className="text-[14px] text-muted">Correo actual: <b className="text-ink">{current}</b></p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="new-email" className="sr-only">Nuevo correo</label>
        <input id="new-email" type="email" className="input" placeholder="nuevo@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" className="btn-secondary shrink-0" disabled={busy || !email.includes("@")}>
          {busy && <Spinner />} Cambiar correo
        </button>
      </div>
    </form>
  );
}
