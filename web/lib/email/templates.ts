import { escapeHtml } from "@/lib/email/send";

/** Plantilla base de los correos (mismo estilo que las de Supabase Auth). */
export function layout(p: { title: string; body: string; cta?: { label: string; url: string }; foot?: string }) {
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#F6F6F3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#15171B">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border:1px solid #E3E3DE;border-radius:16px;padding:32px"><tr><td>
<div style="display:inline-block;background:#0E6B58;color:#fff;font-weight:700;font-family:Menlo,monospace;border-radius:10px;padding:6px 9px;font-size:14px">26</div>
<span style="font-weight:600;font-size:15px;margin-left:8px">Simulacro 2676</span>
<h1 style="font-size:22px;line-height:1.25;margin:28px 0 8px">${escapeHtml(p.title)}</h1>
<div style="font-size:15px;line-height:1.55;color:#4b5058;margin:0 0 24px">${p.body}</div>
${p.cta ? `<a href="${escapeHtml(p.cta.url)}" style="display:inline-block;background:#0E6B58;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:12px">${escapeHtml(p.cta.label)}</a>` : ""}
${p.foot ? `<p style="font-size:13px;line-height:1.5;color:#6A6F77;margin:28px 0 0">${p.foot}</p>` : ""}
</td></tr></table>
<p style="font-size:12px;color:#8E949C;margin:16px 0 0">Herramienta de estudio independiente, sin afiliación con la DIAN ni la CNSC.</p>
</td></tr></table></body></html>`;
  return html;
}

export function simulatorReadyEmail(p: { name: string; cargo: string; opec: string; questions: number; url: string }) {
  const subject = "Tu simulador está listo · Simulacro 2676";
  const body = `<p>Hola, ${escapeHtml(p.name)}. Terminamos tu simulador para <b>${escapeHtml(p.cargo)}</b> (OPEC ${escapeHtml(p.opec)}), con <b>${p.questions} preguntas</b> de tus ejes, además del banco común.</p><p>Ábrelo desde el celular y agrégalo a la pantalla de inicio para estudiar cuando quieras.</p>`;
  return {
    subject,
    html: layout({ title: "Tu simulador está listo", body, cta: { label: "Abrir mi simulador", url: p.url }, foot: "Las preguntas las redacta una IA a partir de normas públicas y pueden tener errores: compáralas siempre con la norma citada." }),
    text: `Hola, ${p.name}. Tu simulador para ${p.cargo} (OPEC ${p.opec}) está listo con ${p.questions} preguntas de tus ejes.\nÁbrelo aquí: ${p.url}`,
  };
}

export function generationFailedEmail(p: { name: string; cargo: string; reason: string; refunded: boolean; url: string }) {
  const subject = "No pudimos completar tu simulador · Simulacro 2676";
  const body = `<p>Hola, ${escapeHtml(p.name)}. La generación de tu simulador para <b>${escapeHtml(p.cargo)}</b> no se pudo completar.</p><p><b>Motivo:</b> ${escapeHtml(p.reason)}</p>${p.refunded ? "<p>Te devolvimos la generación a tu cuenta: puedes intentarlo de nuevo sin pagar otra vez.</p>" : ""}`;
  return {
    subject,
    html: layout({ title: "No pudimos completar tu simulador", body, cta: { label: "Intentar de nuevo", url: p.url }, foot: "Si el problema sigue, responde este correo y te ayudamos." }),
    text: `Hola, ${p.name}. La generación de tu simulador para ${p.cargo} no se completó. Motivo: ${p.reason}.${p.refunded ? " Te devolvimos la generación a tu cuenta." : ""}\nIntentar de nuevo: ${p.url}`,
  };
}

export function paymentReceiptEmail(p: { name: string; product: string; amount: string; reference: string; method: string | null; url: string }) {
  const subject = "Recibimos tu pago · Simulacro 2676";
  const body = `<p>Hola, ${escapeHtml(p.name)}. Tu pago fue aprobado y ya tienes una generación disponible.</p>
<table role="presentation" style="font-size:14px;color:#15171B;border-collapse:collapse;width:100%;margin-top:8px">
<tr><td style="padding:6px 0;color:#6A6F77">Producto</td><td style="padding:6px 0;text-align:right">${escapeHtml(p.product)}</td></tr>
<tr><td style="padding:6px 0;color:#6A6F77">Valor</td><td style="padding:6px 0;text-align:right"><b>${escapeHtml(p.amount)}</b></td></tr>
${p.method ? `<tr><td style="padding:6px 0;color:#6A6F77">Medio</td><td style="padding:6px 0;text-align:right">${escapeHtml(p.method)}</td></tr>` : ""}
<tr><td style="padding:6px 0;color:#6A6F77">Referencia</td><td style="padding:6px 0;text-align:right;font-family:Menlo,monospace;font-size:12px">${escapeHtml(p.reference)}</td></tr></table>`;
  return {
    subject,
    html: layout({ title: "Pago aprobado", body, cta: { label: "Crear mi simulador", url: p.url }, foot: "Este correo es un comprobante de tu compra. Guárdalo para cualquier consulta." }),
    text: `Hola, ${p.name}. Tu pago de ${p.amount} (${p.product}) fue aprobado. Referencia ${p.reference}.\nCrea tu simulador: ${p.url}`,
  };
}
