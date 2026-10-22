"use client";
import { useRef, useState } from "react";
import { Turnstile, TURNSTILE_ENABLED, type TurnstileHandle } from "@/components/auth/Turnstile";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";

export function ResendConfirmation({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle>(null);
  async function resend() {
    setState("sending");
    const { error } = await createClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/panel/bienvenida`, captchaToken: captcha ?? undefined },
    });
    captchaRef.current?.reset();
    if (error) {
      setMsg(authErrorMessage(error.message, error.code));
      setState("error");
    } else setState("sent");
  }
  return (
    <div className="mt-5 text-[14px]">
      {state === "sent" ? (
        <p className="text-ok">Listo, te enviamos otro correo.</p>
      ) : (
        <>
        <Turnstile ref={captchaRef} onToken={setCaptcha} />
        <button type="button" onClick={resend} disabled={state === "sending" || (TURNSTILE_ENABLED && !captcha)} className="link">
          {state === "sending" ? "Enviando…" : "Reenviar el correo"}
        </button>
        </>
      )}
      {state === "error" && <p className="mt-2 text-bad">{msg}</p>}
    </div>
  );
}
