"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

type Values = {
  full_name: string;
  phone: string;
  city: string;
  default_cargo: string;
  default_nivel: string;
  default_modalidad: string;
  marketing_opt_in: boolean;
};

export function ProfileForm({ initial, onboarding = false }: { initial: Values; onboarding?: boolean }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...v, ...(onboarding ? { onboarding_completed: true } : {}) }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ tone: "error", text: data?.error?.message ?? "No pudimos guardar." });
    if (onboarding) {
      router.push("/panel/nueva");
      router.refresh();
    } else {
      setMsg({ tone: "success", text: "Cambios guardados." });
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="full_name" className="label">Nombre completo</label>
          <input id="full_name" className="input" autoComplete="name" value={v.full_name} maxLength={120} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
        </div>
        <div>
          <label htmlFor="phone" className="label">Celular <span className="font-normal text-muted">(opcional)</span></label>
          <input id="phone" className="input" inputMode="tel" autoComplete="tel" placeholder="3001234567" value={v.phone} maxLength={20} onChange={(e) => setV({ ...v, phone: e.target.value })} />
          <p className="hint">Lo usa Wompi para prellenar el pago.</p>
        </div>
        <div>
          <label htmlFor="city" className="label">Ciudad <span className="font-normal text-muted">(opcional)</span></label>
          <input id="city" className="input" autoComplete="address-level2" value={v.city} maxLength={80} onChange={(e) => setV({ ...v, city: e.target.value })} />
        </div>
      </div>

      <fieldset className="space-y-5 border-t border-line pt-5">
        <legend className="text-[15px] font-medium">Tu empleo en el concurso</legend>
        <p className="-mt-3 text-[13px] text-muted">Lo usamos para prellenar el asistente de generación.</p>
        <div>
          <label htmlFor="default_cargo" className="label">Denominación, código y grado</label>
          <input id="default_cargo" className="input" placeholder="Ej.: Gestor I 301-01" value={v.default_cargo} maxLength={120} onChange={(e) => setV({ ...v, default_cargo: e.target.value })} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="default_nivel" className="label">Nivel</label>
            <select id="default_nivel" className="input" value={v.default_nivel} onChange={(e) => setV({ ...v, default_nivel: e.target.value })}>
              <option value="">Selecciona…</option>
              <option>Asistencial</option>
              <option>Técnico</option>
              <option>Profesional</option>
            </select>
          </div>
          <div>
            <label htmlFor="default_modalidad" className="label">Modalidad</label>
            <select id="default_modalidad" className="input" value={v.default_modalidad} onChange={(e) => setV({ ...v, default_modalidad: e.target.value })}>
              <option value="">Selecciona…</option>
              <option>Ingreso</option>
              <option>Ascenso</option>
            </select>
          </div>
        </div>
      </fieldset>

      <label className="flex items-start gap-3 border-t border-line pt-5 text-[14px]">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-[rgb(var(--brand))]" checked={v.marketing_opt_in} onChange={(e) => setV({ ...v, marketing_opt_in: e.target.checked })} />
        <span>
          Quiero recibir recordatorios de estudio y novedades del concurso por correo.
          <span className="block text-[13px] text-muted">Puedes cambiarlo cuando quieras.</span>
        </span>
      </label>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={busy || v.full_name.trim().length < 2}>
          {busy && <Spinner />} {onboarding ? "Guardar y continuar" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
