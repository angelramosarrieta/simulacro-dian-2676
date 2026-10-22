"use client";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";

export function RecoverForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/restablecer`,
    });
    setLoading(false);
    // Por privacidad, el mensaje es el mismo exista o no la cuenta.
    if (error && error.code !== "user_not_found") return setError(authErrorMessage(error.message, error.code));
    setSent(true);
  }

  if (sent)
    return (
      <Alert tone="success" title="Revisa tu correo">
        Si existe una cuenta con <b>{email}</b>, te enviamos un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.
      </Alert>
    );

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <Field id="email" label="Correo electrónico" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <button type="submit" className="btn-primary w-full" disabled={loading || !email}>
        {loading && <Spinner />} {loading ? "Enviando…" : "Enviar enlace"}
      </button>
    </form>
  );
}
