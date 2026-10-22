"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

type Limits = {
  max_input_tokens: number;
  max_output_tokens: number;
  max_cost_usd: number;
  max_tokens_per_call: number;
  max_attempts_per_step: number;
  max_steps: number;
  max_running_per_user: number;
  max_generations_per_user_per_day: number;
  max_upload_mb: number;
};
export type Settings = {
  price_first_cop: number;
  price_next_cop: number;
  questions_per_generation: number;
  order_pending_ttl_minutes: number;
  admin_emails: string[];
  generation_limits: Limits;
  help_links: { simo: string; guia: string; dian: string; indicadores: string };
};

const LINKS: [keyof Settings["help_links"], string, string][] = [
  ["indicadores", "Consulta de indicadores del operador", "El enlace de la sección 4.3 de la Guía. Si lo dejas vacío, al aspirante se le indica buscarlo en la Guía."],
  ["guia", "Guía de Orientación al Aspirante", "Página o PDF de la CNSC."],
  ["simo", "SIMO", "Donde está la ficha del empleo (manual de funciones)."],
  ["dian", "Página del concurso en la DIAN", "Opcional."],
];

const LIMIT_FIELDS: [keyof Limits, string, string, number?][] = [
  ["max_cost_usd", "Costo máximo por generación (USD)", "Si se alcanza, se entrega lo generado (si hay al menos el 60 %) o se devuelve la generación al usuario.", 0.1],
  ["max_input_tokens", "Tokens de entrada por generación", "Lectura de documentos y contexto."],
  ["max_output_tokens", "Tokens de salida por generación", "Texto generado, incluido el razonamiento."],
  ["max_tokens_per_call", "Tokens de salida por llamada", "Tope de cada bloque de preguntas."],
  ["max_attempts_per_step", "Reintentos por etapa", "Ante errores transitorios del proveedor."],
  ["max_steps", "Llamadas máximas al modelo", "Por generación."],
  ["max_running_per_user", "Generaciones simultáneas por usuario", ""],
  ["max_generations_per_user_per_day", "Generaciones por usuario al día", "Freno anti-abuso."],
  ["max_upload_mb", "Tamaño máximo de PDF (MB)", "Las imágenes siempre se limitan a 5 MB."],
];

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [emails, setEmails] = useState(initial.admin_emails.join("\n"));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("¿Guardar los cambios? Los precios nuevos aplican a las próximas órdenes.")) return;
    setBusy(true);
    setMsg(null);
    const body = { ...s, admin_emails: emails.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean) };
    const res = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ tone: "error", text: data?.error?.message ?? "No se pudo guardar." });
    setMsg({ tone: "success", text: "Configuración guardada. El cambio quedó en la auditoría." });
    router.refresh();
  }

  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <form onSubmit={save} className="space-y-6">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      <section className="card p-5 sm:p-6">
        <h2 className="font-medium">Precios</h2>
        <p className="mt-1 text-[13px] text-muted">En pesos colombianos. Aplican a las órdenes nuevas; las pendientes con otro precio se reemplazan automáticamente.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="pf" className="label">Primer simulador</label>
            <input id="pf" type="number" min={1000} step={100} className="input font-mono" value={s.price_first_cop} onChange={(e) => setS({ ...s, price_first_cop: num(e.target.value) })} />
          </div>
          <div>
            <label htmlFor="pn" className="label">Generación adicional</label>
            <input id="pn" type="number" min={1000} step={100} className="input font-mono" value={s.price_next_cop} onChange={(e) => setS({ ...s, price_next_cop: num(e.target.value) })} />
          </div>
          <div>
            <label htmlFor="ttl" className="label">Vigencia de orden pendiente (min)</label>
            <input id="ttl" type="number" min={10} className="input font-mono" value={s.order_pending_ttl_minutes} onChange={(e) => setS({ ...s, order_pending_ttl_minutes: num(e.target.value) })} />
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-medium">Generación</h2>
        <div className="mt-5 max-w-xs">
          <label htmlFor="qpg" className="label">Preguntas nuevas por simulador</label>
          <input id="qpg" type="number" min={20} max={200} className="input font-mono" value={s.questions_per_generation} onChange={(e) => setS({ ...s, questions_per_generation: num(e.target.value) })} />
          <p className="hint">Más preguntas = más costo y tiempo. Recomendado: 100 a 150.</p>
        </div>
        <h3 className="mt-6 text-[14px] font-medium">Límites de consumo</h3>
        <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {LIMIT_FIELDS.map(([k, label, hint, step]) => (
            <div key={k}>
              <label htmlFor={k} className="label">{label}</label>
              <input id={k} type="number" step={step ?? 1} className="input font-mono" value={s.generation_limits[k]} onChange={(e) => setS({ ...s, generation_limits: { ...s.generation_limits, [k]: num(e.target.value) } })} />
              {hint && <p className="hint">{hint}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-medium">Enlaces de ayuda para los documentos</h2>
        <p className="mt-1 text-[13px] text-muted">Aparecen en el paso de subir documentos, en “¿Dónde consigo…?”.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {LINKS.map(([k, label, hint]) => (
            <div key={k}>
              <label htmlFor={`link-${k}`} className="label">{label}</label>
              <input id={`link-${k}`} type="url" className="input text-[14px]" placeholder="https://…" value={s.help_links[k]} onChange={(e) => setS({ ...s, help_links: { ...s.help_links, [k]: e.target.value } })} />
              <p className="hint">{hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-medium">Administradores</h2>
        <p className="mt-1 text-[13px] text-muted">Un correo por línea. Obtienen acceso al iniciar sesión con ese correo ya verificado.</p>
        <label htmlFor="emails" className="sr-only">Correos de administradores</label>
        <textarea id="emails" rows={3} className="input mt-4 h-auto py-2.5 font-mono text-[14px]" value={emails} onChange={(e) => setEmails(e.target.value)} />
      </section>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy && <Spinner />} Guardar configuración
        </button>
      </div>
    </form>
  );
}
