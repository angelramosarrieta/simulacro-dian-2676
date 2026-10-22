"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, passwordProblem } from "@/lib/auth-errors";

export function ResetForm({ redirectTo = "/panel", submitLabel = "Guardar contraseña" }: { redirectTo?: string; submitLabel?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError("Las contraseñas no coinciden.");
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(authErrorMessage(error.message, error.code));
    setDone(true);
    setPassword("");
    setConfirm("");
    if (redirectTo) {
      router.replace(redirectTo);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      {done && !redirectTo && <Alert tone="success">Tu contraseña se actualizó.</Alert>}
      <Field id="new-password" label="Contraseña nueva" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="Mínimo 8 caracteres, con letras y números." />
      <Field id="confirm-password" label="Confirma la contraseña" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={loading || !password || !confirm}>
        {loading && <Spinner />} {loading ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
