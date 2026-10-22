import "server-only";

/**
 * Envío de correos transaccionales con Resend (el mismo proveedor y dominio
 * verificado que usa CENTRA). Sin RESEND_API_KEY no envía nada y devuelve
 * false: los avisos son un complemento, nunca bloquean el flujo principal.
 */
export type Email = { to: string; subject: string; html: string; text: string };

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(mail: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !mail.to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Simulacro 2676 <no-reply@centrahoy.online>",
        to: [mail.to],
        reply_to: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || undefined,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("Resend respondió", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("No se pudo enviar el correo:", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Alerta para el administrador (ADMIN_ALERT_EMAIL). */
export async function alertAdmin(subject: string, lines: string[]) {
  const to = process.env.ADMIN_ALERT_EMAIL;
  if (!to) return false;
  const text = lines.join("\n");
  return sendEmail({ to, subject: `[Simulacro 2676] ${subject}`, text, html: `<pre style="font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap">${escapeHtml(text)}</pre>` });
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
