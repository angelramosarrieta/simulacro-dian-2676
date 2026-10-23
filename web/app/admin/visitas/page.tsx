import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { VisitsChart, type DayPoint } from "@/components/admin/VisitsChart";
import { requireAdminPage } from "@/lib/admin/auth";
import { dateTime } from "@/lib/format";

type Traffic = {
  visitantes: number;
  sesiones: number;
  paginas: number;
  registrados: number;
  por_dia: DayPoint[];
  paginas_top: { path: string; n: number; visitantes: number }[];
  fuentes: { fuente: string; n: number }[];
  ciudades: { ciudad: string; pais: string; n: number }[];
  dispositivos: { device: string; n: number }[];
  recientes: { session_id: string; inicio: string; paginas: number; city: string | null; country: string | null; device: string; fuente: string; entrada: string; email: string | null }[];
};

const PERIODS: [number, string][] = [[1, "Hoy"], [7, "7 días"], [30, "30 días"], [90, "90 días"]];
const DEVICE: Record<string, string> = { mobile: "Celular", tablet: "Tableta", desktop: "Computador" };
const PATH: Record<string, string> = { "/": "Inicio", "/ejemplo": "Simulador de ejemplo", "/registro": "Registro", "/ingresar": "Ingresar", "/terminos": "Términos", "/privacidad": "Datos personales" };

/** Días calendario de Colombia del periodo (para mostrar también los días sin visitas). */
function fillDays(points: DayPoint[], days: number) {
  const byDay = new Map(points.map((p) => [p.dia, p]));
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return byDay.get(key) ?? { dia: key, visitantes: 0, paginas: 0 };
  });
}

function Ranking({ title, rows, empty }: { title: string; rows: { label: string; detail?: string; n: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-medium">{title}</h2>
      {rows.length ? (
        <ul className="mt-4 space-y-3 text-[14px]">
          {rows.map((r) => (
            <li key={r.label + (r.detail ?? "")}>
              <div className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{r.label}{r.detail && <span className="text-muted"> · {r.detail}</span>}</span>
                <span className="shrink-0 font-mono text-muted">{r.n}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-soft" aria-hidden>
                <div className="h-full rounded-full bg-brand" style={{ width: `${(r.n / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[14px] text-muted">{empty}</p>
      )}
    </section>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { dias } = await searchParams;
  const days = PERIODS.some(([d]) => String(d) === dias) ? Number(dias) : 7;
  const { admin } = await requireAdminPage();
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const [{ data }, { count: nuevas }, { count: compras }] = await Promise.all([
    admin.rpc("admin_traffic", { p_days: days }),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
    admin.from("orders").select("id", { count: "exact", head: true }).eq("status", "approved").gte("created_at", since),
  ]);
  const t = (data ?? {}) as Traffic;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Visitas"
        description="Personas que entraron al sitio, aunque no se hayan registrado. Son anónimas: se ve de dónde llegaron, desde qué ciudad y dispositivo y qué páginas vieron, nunca su identidad (salvo si después crean una cuenta)."
      />
      <nav aria-label="Periodo" className="mb-6 flex flex-wrap gap-1">
        {PERIODS.map(([d, label]) => (
          <Link key={d} href={`/admin/visitas?dias=${d}`} aria-current={d === days ? "page" : undefined} className={`rounded-lg px-3 py-1.5 text-[14px] ${d === days ? "bg-brandSoft font-medium text-brandInk" : "text-muted hover:bg-soft hover:text-ink"}`}>
            {label}
          </Link>
        ))}
      </nav>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Visitantes únicos", t.visitantes ?? 0, `${t.sesiones ?? 0} visitas · ${t.paginas ?? 0} páginas vistas`],
          ["Cuentas nuevas", nuevas ?? 0, `${pct(nuevas ?? 0, t.visitantes ?? 0)} de los visitantes`],
          ["Compras aprobadas", compras ?? 0, `${pct(compras ?? 0, nuevas ?? 0)} de las cuentas nuevas`],
          ["Visitantes que ya tienen cuenta", t.registrados ?? 0, "Entraron con su sesión iniciada"],
        ].map(([label, value, hint]) => (
          <div key={String(label)} className="card p-5">
            <p className="text-[13px] text-muted">{label}</p>
            <p className="mt-1 text-[26px] font-semibold tabular-nums">{value}</p>
            <p className="text-[12.5px] text-muted">{hint}</p>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <VisitsChart days={fillDays(t.por_dia ?? [], days)} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Ranking title="De dónde llegaron" empty="Sin datos todavía." rows={(t.fuentes ?? []).map((f) => ({ label: f.fuente === "Directo" ? "Directo (escribieron la dirección o un enlace sin origen)" : f.fuente, n: f.n }))} />
        <Ranking title="Páginas más vistas" empty="Sin datos todavía." rows={(t.paginas_top ?? []).map((p) => ({ label: PATH[p.path] ?? p.path, detail: `${p.visitantes} visitantes`, n: p.n }))} />
        <Ranking title="Ciudades" empty="Sin datos todavía." rows={(t.ciudades ?? []).map((c) => ({ label: c.ciudad, detail: c.pais || undefined, n: c.n }))} />
        <Ranking title="Dispositivos" empty="Sin datos todavía." rows={(t.dispositivos ?? []).map((d) => ({ label: DEVICE[d.device] ?? d.device, n: d.n }))} />
      </div>

      <section className="card overflow-x-auto">
        <h2 className="px-5 pt-5 font-medium sm:px-6">Últimas visitas</h2>
        <table className="mt-3 w-full min-w-[760px] text-left text-[13.5px]">
          <thead className="text-[12px] text-muted"><tr className="border-b border-line">
            {["Hora", "Ciudad", "Dispositivo", "Llegó desde", "Entró por", "Páginas", "Cuenta"].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-line">
            {(t.recientes ?? []).map((s) => (
              <tr key={s.session_id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted">{dateTime(s.inicio)}</td>
                <td className="px-4 py-2.5">{s.city ?? "—"}{s.country ? <span className="text-muted"> · {s.country}</span> : null}</td>
                <td className="px-4 py-2.5">{DEVICE[s.device] ?? s.device}</td>
                <td className="px-4 py-2.5">{s.fuente}</td>
                <td className="px-4 py-2.5">{PATH[s.entrada] ?? s.entrada}</td>
                <td className="px-4 py-2.5 font-mono">{s.paginas}</td>
                <td className="max-w-[200px] truncate px-4 py-2.5">{s.email ?? <span className="text-muted">Anónimo</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!t.recientes?.length && <p className="px-4 py-10 text-center text-muted">Aún no hay visitas registradas. Se empiezan a contar desde que se publicó esta función.</p>}
      </section>
      <p className="mt-4 text-[12.5px] text-muted">
        Para saber qué publicidad funciona, comparte enlaces con etiquetas, por ejemplo <code>centrahoy.online/?utm_source=facebook&amp;utm_campaign=lanzamiento</code>: aparecerán en &quot;De dónde llegaron&quot;.
      </p>
    </>
  );
}
