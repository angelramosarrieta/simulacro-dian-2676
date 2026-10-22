"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Turnstile, TURNSTILE_ENABLED, type TurnstileHandle } from "@/components/auth/Turnstile";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { track } from "@vercel/analytics";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, passwordProblem } from "@/lib/auth-errors";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle>(null);

  const pwError = touched ? passwordProblem(password) : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (name.trim().length < 2) return setError("Escribe tu nombre.");
    if (passwordProblem(password)) return;
    if (!accepted) return setError("Debes aceptar los términos y la política de tratamiento de datos.");
    setLoading(true);
    const { data, error } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim().slice(0, 120), accepted_terms: true },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/panel/bienvenida`,
        captchaToken: captcha ?? undefined,
      },
    });
    captchaRef.current?.reset();
    setLoading(false);
    if (error) return setError(authErrorMessage(error.message, error.code));
    track("registro");
    // Con confirmación de correo activa no hay sesión hasta verificar.
    if (!data.session) router.push(`/verifica-tu-correo?email=${encodeURIComponent(email.trim())}`);
    else {
      router.replace("/panel/bienvenida");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <Field id="name" label="Nombre completo" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
      <Field id="email" label="Correo electrónico" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field
        id="password"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onBlur={() => password && setTouched(true)}
        hint="Mínimo 8 caracteres, con letras y números."
        error={pwError ?? undefined}
      />
      <label className="flex items-start gap-3 text-[14px] text-muted">
        <input type="checkbox" className="mt-1 h-4 w-4 rounded border-line accent-[rgb(var(--brand))]" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <span>
          Acepto los <Link href="/terminos" className="link" target="_blank">términos y condiciones</Link> y autorizo el tratamiento de mis datos según la{" "}
          <Link href="/privacidad" className="link" target="_blank">política de privacidad</Link>.
        </span>
      </label>
      <Turnstile ref={captchaRef} onToken={setCaptcha} />
      <button type="submit" className="btn-primary w-full" disabled={loading || (TURNSTILE_ENABLED && !captcha)}>
        {loading && <Spinner />} {loading ? "Creando tu cuenta…" : "Crear cuenta gratis"}
      </button>
      <p className="text-center text-[13px] text-muted">No cobramos por registrarte. Pagas solo cuando generes tu simulador.</p>
    </form>
  );
}
