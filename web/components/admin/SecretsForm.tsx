"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, FlaskConical, KeyRound, XCircle } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export type SecretRow = {
  key: string;
  label: string;
  group: "ia" | "wompi" | "correo";
  secret: boolean;
  hint?: string;
  options?: string[];
  dynamicOptions?: "openai";
  placeholder?: string;
  source: "panel" | "vercel" | null;
  display: string | null; // últimos 4 caracteres o valor (si no es secreto)
};

const GROUPS: { id: SecretRow["group"]; title: string; text: string }[] = [
  { id: "ia", title: "Inteligencia artificial", text: "La llave con la que se generan los simuladores." },
  { id: "wompi", title: "Pagos (Wompi)", text: "Dashboard de Wompi → Desarrolladores. Usa las de pruebas hasta validar el flujo." },
  { id: "correo", title: "Correos (Resend)", text: "Comprobantes, avisos de simulador listo y alertas para ti." },
];

export function SecretsForm({ rows, encryption }: { rows: SecretRow[]; encryption: boolean }) {
  return (
    <div className="space-y-6">
      {!encryption && (
        <p className="rounded-xl border border-warn/30 bg-warnSoft px-4 py-3 text-[14px]">
          Falta <code>SECRETS_ENCRYPTION_KEY</code> en Vercel: no se pueden guardar llaves desde aquí.
        </p>
      )}
      {GROUPS.map((g) => (
        <Group key={g.id} title={g.title} text={g.text} group={g.id} rows={rows.filter((r) => r.group === g.id)} disabled={!encryption} />
      ))}
    </div>
  );
}

function Group({ title, text, group, rows, disabled }: { title: string; text: string; group: SecretRow["group"]; rows: SecretRow[]; disabled: boolean }) {
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  async function runTest() {
    setTesting(true);
    setTest(null);
    const res = await fetch("/api/admin/secrets/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group }) });
    const data = await res.json().catch(() => ({}));
    setTesting(false);
    setTest(res.ok ? data : { ok: false, message: data?.error?.message ?? "No se pudo probar." });
  }
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-medium">{title}</h2>
          <p className="text-[13px] text-muted">{text}</p>
        </div>
        <button type="button" className="btn-secondary btn-sm shrink-0" onClick={runTest} disabled={testing}>
          {testing ? <Spinner /> : <FlaskConical className="h-4 w-4" aria-hidden />} Probar conexión
        </button>
      </div>
      {test && (
        <p role="status" className={`flex items-center gap-2 border-b border-line px-5 py-3 text-[14px] ${test.ok ? "bg-okSoft" : "bg-badSoft"}`}>
          {test.ok ? <CheckCircle2 className="h-4 w-4 text-ok" aria-hidden /> : <XCircle className="h-4 w-4 text-bad" aria-hidden />} {test.message}
        </p>
      )}
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <SecretField key={r.key} row={r} disabled={disabled} />
        ))}
      </ul>
    </section>
  );
}

function SecretField({ row, disabled }: { row: SecretRow; disabled: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(row.options || row.dynamicOptions ? row.display ?? "" : "");
  const [models, setModels] = useState<{ list: string[]; note?: string } | null>(null);
  const [custom, setCustom] = useState(false);
  useEffect(() => {
    if (!row.dynamicOptions) return;
    let alive = true;
    fetch("/api/admin/models")
      .then((r) => r.json())
      .then((d) => alive && setModels({ list: Array.isArray(d.models) ? d.models : [], note: d.message }))
      .catch(() => alive && setModels({ list: [], note: "No se pudo cargar la lista de modelos." }));
    return () => {
      alive = false;
    };
  }, [row.dynamicOptions]);
  const modelOptions = models ? [...models.list, ...(value && !models.list.includes(value) ? [value] : [])] : [];
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const id = `cfg-${row.key}`;

  async function call(method: "POST" | "DELETE") {
    if (method === "DELETE" && !confirm(`¿Quitar "${row.label}" del panel?${row.source ? " Se usará el valor de Vercel si existe." : ""}`)) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/secrets", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: row.key, value: method === "POST" ? value : undefined }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: data?.error?.message ?? "No se pudo guardar." });
    setMsg({ ok: true, text: method === "POST" ? "Guardado y cifrado." : "Quitado." });
    if (!row.options) setValue("");
    router.refresh();
  }

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="flex items-center gap-2 text-[14px] font-medium">
          {row.secret && <KeyRound className="h-3.5 w-3.5 text-muted" aria-hidden />} {row.label}
        </label>
        <span className={`badge ${row.source === "panel" ? "bg-okSoft text-ok" : row.source === "vercel" ? "bg-brandSoft text-brandInk" : "bg-soft text-muted"}`}>
          {row.source === "panel" ? `Guardada aquí ${row.display ?? ""}` : row.source === "vercel" ? `Desde Vercel ${row.secret ? "" : row.display ?? ""}` : "Sin configurar"}
        </span>
      </div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        {row.dynamicOptions && !custom ? (
          <select
            id={id}
            className="input"
            value={value}
            onChange={(e) => {
              if (e.target.value === "__otro") {
                setCustom(true);
                setValue("");
              } else setValue(e.target.value);
            }}
            disabled={disabled || !models}
          >
            <option value="">{models ? "Selecciona un modelo…" : "Cargando modelos…"}</option>
            {modelOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            <option value="__otro">Otro (escribirlo)…</option>
          </select>
        ) : row.options ? (
          <select id={id} className="input" value={value} onChange={(e) => setValue(e.target.value)} disabled={disabled}>
            <option value="">Selecciona…</option>
            {row.options.map((o) => <option key={o}>{o}</option>)}
          </select>
        ) : (
          <input
            id={id}
            className="input font-mono text-[14px]"
            type={row.secret ? "password" : "text"}
            autoComplete="off"
            spellCheck={false}
            placeholder={row.source && row.secret ? "Escribe una nueva para reemplazarla" : row.placeholder ?? (row.display ?? "")}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
          />
        )}
        <div className="flex gap-2">
          <button type="button" className="btn-primary btn-sm h-11 px-4" onClick={() => call("POST")} disabled={disabled || busy || !value.trim()}>
            {busy && <Spinner />} Guardar
          </button>
          {row.source === "panel" && (
            <button type="button" className="btn-ghost btn-sm h-11" onClick={() => call("DELETE")} disabled={busy}>
              Quitar
            </button>
          )}
        </div>
      </div>
      {row.hint && <p className="hint">{row.hint}</p>}
      {row.dynamicOptions && models?.note && <p className="hint text-warn">{models.note}</p>}
      {row.dynamicOptions && custom && (
        <button type="button" className="mt-1 text-[13px] text-brandInk underline-offset-4 hover:underline" onClick={() => setCustom(false)}>
          Volver a la lista
        </button>
      )}
      {msg && <p className={`mt-1.5 text-[13px] ${msg.ok ? "text-ok" : "text-bad"}`}>{msg.text}</p>}
    </li>
  );
}
