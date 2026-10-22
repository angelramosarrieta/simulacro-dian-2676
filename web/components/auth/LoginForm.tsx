"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resent, setResent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnconfirmed(false);
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setLoading(false);
      setUnconfirmed(error.code === "email_not_confirmed");
      setError(authErrorMessage(error.message, error.code));
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function resend() {
    const { error } = await createClient().auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/panel/bienvenida` },
    });
    if (error) setError(authErrorMessage(error.message, error.code));
    else setResent(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {notice && <Alert tone="success">{notice}</Alert>}
      {error && (
        <Alert tone="error" action={unconfirmed && !resent ? <button type="button" onClick={resend} className="link text-[14px]">Reenviar correo de confirmación</button> : undefined}>
          {error}
        </Alert>
      )}
      {resent && <Alert tone="success">Te enviamos un nuevo correo de confirmación.</Alert>}
      <Field id="email" label="Correo electrónico" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
          <Link href="/recuperar" className="text-[13px] link">¿La olvidaste?</Link>
        </div>
        <input id="password" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={loading || !email || !password}>
        {loading && <Spinner />} {loading ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
