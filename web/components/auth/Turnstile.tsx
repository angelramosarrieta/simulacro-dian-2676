"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

/**
 * Captcha de Cloudflare Turnstile (mismo patrón que CENTRA). El token se envía
 * a Supabase Auth en `options.captchaToken`; Supabase lo verifica del lado del
 * servidor cuando la protección contra bots está activa (Auth → Bot protection).
 * Sin NEXT_PUBLIC_TURNSTILE_SITE_KEY no se muestra nada (entorno local).
 */
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, o: { sitekey: string; language?: string; callback: (t: string) => void; "error-callback"?: () => void; "expired-callback"?: () => void }) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
    __s2676Turnstile?: Promise<void>;
  }
}

export const TURNSTILE_ENABLED = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!window.__s2676Turnstile) {
    window.__s2676Turnstile = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("turnstile"));
      document.head.appendChild(s);
    });
  }
  return window.__s2676Turnstile;
}

export type TurnstileHandle = { reset: () => void };

export const Turnstile = forwardRef<TurnstileHandle, { onToken: (token: string | null) => void }>(function Turnstile({ onToken }, ref) {
  const el = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    // Reiniciar nunca debe tumbar el envío del formulario (problema visto en CENTRA).
    reset: () => {
      try {
        if (id.current && window.turnstile) window.turnstile.reset(id.current);
      } catch {}
      onToken(null);
    },
  }));

  useEffect(() => {
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!sitekey) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !el.current || !window.turnstile) return;
        id.current = window.turnstile.render(el.current, {
          sitekey,
          language: "es",
          callback: (t) => onToken(t),
          "expired-callback": () => onToken(null),
          "error-callback": () => setError("No se pudo validar que eres una persona. Recarga la página."),
        });
      })
      .catch(() => setError("No se pudo cargar la verificación. Revisa tu conexión."));
    return () => {
      cancelled = true;
      try {
        if (id.current && window.turnstile) window.turnstile.remove(id.current);
      } catch {}
    };
    // onToken es estable en los formularios (setState).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!TURNSTILE_ENABLED) return null;
  return (
    <div>
      <div ref={el} className="min-h-[65px]" />
      {error && <p className="mt-1 text-[13px] text-bad">{error}</p>}
    </div>
  );
});
