"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Check, CreditCard, FileText, ImageIcon, Lock, Sparkles, UploadCloud, X } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { track } from "@vercel/analytics";
import { createClient } from "@/lib/supabase/client";
import { cop } from "@/lib/format";

type DocKind = "manual" | "indicadores";
type DocState = { status: "empty" | "uploading" | "done" | "error"; name?: string; size?: number; mime?: string | null; error?: string; progress?: number };

type Draft = {
  id: string;
  cargo: string;
  nivel: string;
  opec: string;
  modalidad: string;
  manual: { mime: string | null } | null;
  indicadores: { mime: string | null } | null;
};

const NIVELES = ["Asistencial", "Técnico", "Profesional"];
const MODALIDADES = ["Ingreso", "Ascenso"];
const ACCEPT = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const MAX_MB = 15;
// La API de Claude acepta imágenes de hasta 5 MB; los PDF pueden pesar más.
const MAX_IMAGE_MB = 5;

async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Ocurrió un error. Intenta de nuevo.");
  return data as T;
}

export function Wizard(props: {
  defaults: { cargo: string; nivel: string; modalidad: string };
  draft: Draft | null;
  balance: number;
  price: number;
  hasPaid: boolean;
  aiReady: boolean;
  paymentsReady: boolean;
}) {
  const router = useRouter();
  const d = props.draft;
  const [genId, setGenId] = useState<string | null>(d?.id ?? null);
  const [step, setStep] = useState<1 | 2 | 3>(d ? (d.manual && d.indicadores ? 3 : 2) : 1);
  const [form, setForm] = useState({
    cargo: d?.cargo ?? props.defaults.cargo ?? "",
    nivel: d?.nivel ?? (NIVELES.includes(props.defaults.nivel) ? props.defaults.nivel : ""),
    opec: d?.opec ?? "",
    modalidad: d?.modalidad ?? (MODALIDADES.includes(props.defaults.modalidad) ? props.defaults.modalidad : ""),
  });
  const [docs, setDocs] = useState<Record<DocKind, DocState>>({
    manual: d?.manual ? { status: "done", name: "Manual de funciones (subido)", mime: d.manual.mime } : { status: "empty" },
    indicadores: d?.indicadores ? { status: "done", name: "Indicadores (subido)", mime: d.indicadores.mime } : { status: "empty" },
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Datos con los que se creó el borrador actual (para no crear otro si no cambian).
  const [saved, setSaved] = useState(d ? { cargo: d.cargo, nivel: d.nivel, opec: d.opec, modalidad: d.modalidad } : null);

  const formValid = form.cargo.trim().length >= 2 && form.nivel && /^[0-9]{3,10}$/.test(form.opec.trim()) && form.modalidad;
  const docsReady = docs.manual.status === "done" && docs.indicadores.status === "done";

  async function saveData(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return setError("Completa todos los datos. La OPEC lleva solo números.");
    setError(null);
    setBusy(true);
    try {
      // Si cambian los datos se crea un borrador nuevo (el anterior se descarta).
      const next = { ...form, cargo: form.cargo.trim(), opec: form.opec.trim() };
      const changed = !saved || saved.cargo !== next.cargo || saved.nivel !== next.nivel || saved.opec !== next.opec || saved.modalidad !== next.modalidad;
      if (!genId || changed) {
        const { id } = await api<{ id: string }>("/api/generations", next);
        setGenId(id);
        setSaved(next);
        setDocs({ manual: { status: "empty" }, indicadores: { status: "empty" } });
        track("borrador_creado");
      }
      setStep(2);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function upload(kind: DocKind, file: File) {
    setError(null);
    if (!ACCEPT.includes(file.type)) {
      setDocs((s) => ({ ...s, [kind]: { status: "error", error: "Formato no admitido. Usa PDF, PNG, JPG o WEBP." } }));
      return;
    }
    const limit = file.type.startsWith("image/") ? MAX_IMAGE_MB : MAX_MB;
    if (file.size > limit * 1024 * 1024) {
      const tip = file.type.startsWith("image/") ? " Toma el pantallazo en JPG o recórtalo." : "";
      setDocs((s) => ({ ...s, [kind]: { status: "error", error: `El archivo pesa más de ${limit} MB.${tip}` } }));
      return;
    }
    setDocs((s) => ({ ...s, [kind]: { status: "uploading", name: file.name, size: file.size, mime: file.type } }));
    try {
      const signed = await api<{ path: string; token: string }>(`/api/generations/${genId}/upload-url`, { kind, mime: file.type, size: file.size });
      const { error } = await createClient().storage.from("documents").uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type, upsert: true });
      if (error) throw new Error("No se pudo subir el archivo. Revisa tu conexión e intenta de nuevo.");
      setDocs((s) => ({ ...s, [kind]: { status: "done", name: file.name, size: file.size, mime: file.type } }));
    } catch (err) {
      setDocs((s) => ({ ...s, [kind]: { status: "error", name: file.name, error: (err as Error).message } }));
    }
  }

  async function start() {
    setError(null);
    setBusy(true);
    try {
      await api(`/api/generations/${genId}/start`);
      track("generacion_iniciada");
      router.push(`/panel/simuladores/${genId}?nuevo=1`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function pay() {
    setError(null);
    setBusy(true);
    try {
      const { url } = await api<{ url: string }>("/api/checkout");
      track("checkout_iniciado", { origen: "asistente", precio: props.price });
      window.location.assign(url);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <ol className="flex gap-2 lg:flex-col lg:gap-1" aria-label="Pasos">
        {[
          { n: 1, t: "Datos del empleo" },
          { n: 2, t: "Documentos" },
          { n: 3, t: props.balance > 0 ? "Generar" : "Pago y generación" },
        ].map((s) => {
          const done = step > s.n;
          const current = step === s.n;
          return (
            <li key={s.n} className="flex-1 lg:flex-none">
              <button
                type="button"
                disabled={s.n > step || busy}
                onClick={() => setStep(s.n as 1 | 2 | 3)}
                aria-current={current ? "step" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-[13px] sm:text-[14px] ${current ? "bg-surface font-medium shadow-card ring-1 ring-line" : "text-muted"} disabled:cursor-default`}
              >
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-medium ${done ? "bg-ok text-white" : current ? "bg-brand text-onBrand" : "bg-soft text-muted"}`}>
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : s.n}
                </span>
                <span className="hidden sm:inline">{s.t}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="card p-5 sm:p-7">
        {error && (
          <div className="mb-5">
            <Alert tone="error">{error}</Alert>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={saveData} className="space-y-5" noValidate>
            <div>
              <h2 className="text-[18px] font-semibold">Datos de tu empleo</h2>
              <p className="mt-1 text-[14px] text-muted">Tal como aparecen en SIMO y en tu manual de funciones.</p>
            </div>
            <div>
              <label htmlFor="cargo" className="label">Denominación, código y grado</label>
              <input id="cargo" className="input" placeholder="Ej.: Gestor I 301-01" value={form.cargo} maxLength={120} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="opec" className="label">OPEC o número de empleo</label>
                <input id="opec" className="input font-mono" inputMode="numeric" placeholder="Ej.: 236762" value={form.opec} maxLength={10} onChange={(e) => setForm({ ...form, opec: e.target.value.replace(/\D/g, "") })} />
              </div>
              <div>
                <label htmlFor="nivel" className="label">Nivel jerárquico</label>
                <select id="nivel" className="input" value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })}>
                  <option value="">Selecciona…</option>
                  {NIVELES.map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <fieldset>
              <legend className="label">Modalidad</legend>
              <div className="grid grid-cols-2 gap-3">
                {MODALIDADES.map((m) => (
                  <label key={m} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-3 text-[14.5px] ${form.modalidad === m ? "border-brand bg-brandSoft/50" : "border-line"}`}>
                    <input type="radio" name="modalidad" value={m} checked={form.modalidad === m} onChange={() => setForm({ ...form, modalidad: m })} className="accent-[rgb(var(--brand))]" />
                    {m}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex justify-end pt-2">
              <button type="submit" className="btn-primary" disabled={busy || !formValid}>
                {busy && <Spinner />} Continuar
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[18px] font-semibold">Sube tus 2 documentos</h2>
              <p className="mt-1 text-[14px] text-muted">PDF (máx. {MAX_MB} MB) o imagen PNG, JPG o WEBP (máx. {MAX_IMAGE_MB} MB). Se eliminan al terminar la generación.</p>
            </div>
            <DocUpload
              kind="manual"
              title="Manual de funciones"
              hint="La ficha del MERF de tu empleo (Resolución DIAN 067 de 2024)."
              state={docs.manual}
              onFile={(f) => upload("manual", f)}
              onClear={() => setDocs((s) => ({ ...s, manual: { status: "empty" } }))}
            />
            <DocUpload
              kind="indicadores"
              title="Tus indicadores"
              hint="Pantallazo de la lista completa en la consulta del operador (sección 4.3 de la Guía)."
              state={docs.indicadores}
              onFile={(f) => upload("indicadores", f)}
              onClear={() => setDocs((s) => ({ ...s, indicadores: { status: "empty" } }))}
            />
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
              <button type="button" className="btn-ghost" onClick={() => setStep(1)}>Atrás</button>
              <button type="button" className="btn-primary" disabled={!docsReady} onClick={() => setStep(3)}>Continuar</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-[18px] font-semibold">{props.balance > 0 ? "Todo listo para generar" : "Paga y genera tu simulador"}</h2>
              <p className="mt-1 text-[14px] text-muted">Revisa los datos antes de continuar.</p>
            </div>
            <dl className="grid gap-x-6 gap-y-3 rounded-xl bg-soft/70 p-4 text-[14px] sm:grid-cols-2">
              <div><dt className="text-muted">Empleo</dt><dd className="font-medium">{form.cargo}</dd></div>
              <div><dt className="text-muted">OPEC</dt><dd className="font-mono font-medium">{form.opec}</dd></div>
              <div><dt className="text-muted">Nivel y modalidad</dt><dd className="font-medium">{form.nivel} · {form.modalidad}</dd></div>
              <div><dt className="text-muted">Documentos</dt><dd className="font-medium">Manual e indicadores cargados</dd></div>
            </dl>

            {!props.aiReady && (
              <Alert tone="warning" title="El generador se está configurando">
                Tus datos y documentos quedan guardados. Cuando el servicio esté activo podrás generar desde aquí.
                {props.balance > 0 ? " Tu crédito no se consume hasta entonces." : ""}
              </Alert>
            )}

            {props.balance > 0 ? (
              <div className="flex flex-col gap-4 rounded-xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-[14px]">
                  <Sparkles className="h-4 w-4 text-brandInk" aria-hidden />
                  Usarás 1 de tus {props.balance} {props.balance === 1 ? "generación disponible" : "generaciones disponibles"}.
                </p>
                <button type="button" className="btn-primary" onClick={start} disabled={busy || !props.aiReady}>
                  {busy && <Spinner />} {busy ? "Iniciando…" : "Generar mi simulador"}
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-line p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[13px] text-muted">{props.hasPaid ? "Generación adicional" : "Primer simulador"}</p>
                    <p className="text-[26px] font-semibold tracking-tight">{cop(props.price)} <span className="text-[13px] font-normal text-muted">COP · pago único</span></p>
                  </div>
                  <button type="button" className="btn-primary" onClick={pay} disabled={busy || !props.paymentsReady}>
                    {busy ? <Spinner /> : <CreditCard className="h-4 w-4" aria-hidden />} {busy ? "Abriendo Wompi…" : "Pagar con Wompi"}
                  </button>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-muted">
                  <Lock className="h-3.5 w-3.5" aria-hidden /> Te llevamos a la página segura de Wompi (PSE, Nequi, Bancolombia o tarjeta). Al aprobarse el pago vuelves aquí para generar.
                </p>
                {!props.paymentsReady && <p className="mt-2 text-[13px] text-warn">Los pagos se habilitan en las próximas horas.</p>}
              </div>
            )}
            <button type="button" className="btn-ghost" onClick={() => setStep(2)} disabled={busy}>Atrás</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DocUpload({ kind, title, hint, state, onFile, onClear }: { kind: DocKind; title: string; hint: string; state: DocState; onFile: (f: File) => void; onClear: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const Icon = state.mime?.startsWith("image/") ? ImageIcon : FileText;
  const inputId = `file-${kind}`;

  if (state.status === "done" || state.status === "uploading")
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line p-4">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${state.status === "done" ? "bg-okSoft text-ok" : "bg-soft text-muted"}`}>
          {state.status === "uploading" ? <Spinner className="h-4 w-4" /> : <Icon className="h-5 w-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-muted">{title}</p>
          <p className="truncate text-[14px] font-medium">{state.name}</p>
          {state.size ? <p className="text-[12.5px] text-muted">{(state.size / 1024 / 1024).toFixed(1)} MB{state.status === "uploading" ? " · subiendo…" : ""}</p> : null}
        </div>
        {state.status === "done" && (
          <button type="button" onClick={onClear} className="btn-ghost btn-sm" aria-label={`Reemplazar ${title}`}>
            <X className="h-4 w-4" aria-hidden /> Cambiar
          </button>
        )}
      </div>
    );

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition ${drag ? "border-brand bg-brandSoft/40" : state.status === "error" ? "border-bad/50" : "border-line hover:border-brand/50 hover:bg-soft/50"}`}
      >
        <UploadCloud className="h-6 w-6 text-muted" aria-hidden />
        <span className="mt-2 font-medium">{title}</span>
        <span className="mt-1 max-w-sm text-[13px] text-muted">{hint}</span>
        <span className="btn-secondary btn-sm mt-4">Elegir archivo</span>
      </label>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept=".pdf,image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {state.status === "error" && <p className="mt-2 text-[13px] text-bad">{state.error}</p>}
    </div>
  );
}
