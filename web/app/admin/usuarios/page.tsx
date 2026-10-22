import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { GenerationBadge, OrderBadge } from "@/components/ui/StatusBadge";
import { CreditAdjust } from "@/components/admin/CreditAdjust";
import { requireAdminPage } from "@/lib/admin/auth";
import { cop, dateTime } from "@/lib/format";
import { UUID_RE } from "@/lib/security";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; id?: string }> }) {
  const { q, id } = await searchParams;
  const { admin } = await requireAdminPage();

  let list = admin.from("profiles").select("id, email, full_name, phone, created_at").order("created_at", { ascending: false }).limit(100);
  if (q) list = list.ilike("email", `%${q.replace(/[%_,()]/g, "")}%`);
  const { data: users } = await list;
  const ids = (users ?? []).map((u) => u.id);
  const { data: ledger } = ids.length ? await admin.from("credit_ledger").select("user_id, delta").in("user_id", ids) : { data: [] };
  const balance = new Map<string, number>();
  for (const l of ledger ?? []) balance.set(l.user_id, (balance.get(l.user_id) ?? 0) + l.delta);

  const selected = id && UUID_RE.test(id) ? id : null;
  const detail = selected
    ? await Promise.all([
        admin.from("profiles").select("*").eq("id", selected).maybeSingle(),
        admin.from("orders").select("id, product, amount_in_cents, status, created_at, reference").eq("user_id", selected).order("created_at", { ascending: false }).limit(20),
        admin.from("generations").select("id, cargo, status, created_at, cost_usd").eq("user_id", selected).neq("status", "cancelled").order("created_at", { ascending: false }).limit(20),
        admin.from("credit_ledger").select("id, delta, reason, note, created_at").eq("user_id", selected).order("created_at", { ascending: false }).limit(30),
      ])
    : null;

  return (
    <>
      <PageHeader eyebrow="Administración" title="Usuarios" description="Busca por correo, revisa saldo e historial y ajusta créditos." />
      <form className="mb-5 flex gap-2" action="/admin/usuarios">
        <label htmlFor="q" className="sr-only">Buscar por correo</label>
        <input id="q" name="q" defaultValue={q} placeholder="correo@…" className="input h-10 max-w-xs" />
        <button className="btn-secondary">Buscar</button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {(users ?? []).map((u) => (
              <li key={u.id}>
                <Link href={`/admin/usuarios?${new URLSearchParams({ ...(q ? { q } : {}), id: u.id })}`} className={`flex items-center justify-between gap-3 px-4 py-3 hover:bg-soft/60 ${selected === u.id ? "bg-brandSoft/50" : ""}`}>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium">{u.email}</p>
                    <p className="text-[12.5px] text-muted">{u.full_name || "Sin nombre"} · {dateTime(u.created_at)}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[13px]">{balance.get(u.id) ?? 0} cr.</span>
                </Link>
              </li>
            ))}
          </ul>
          {!users?.length && <p className="px-4 py-10 text-center text-muted">Sin resultados.</p>}
        </div>

        {detail && detail[0].data ? (
          <div className="space-y-4">
            <section className="card p-5">
              <p className="font-medium">{detail[0].data.full_name || detail[0].data.email}</p>
              <p className="text-[13px] text-muted">{detail[0].data.email} · {detail[0].data.phone || "sin celular"} · {detail[0].data.default_cargo || "sin empleo"}</p>
              <p className="mt-3 text-[14px]">Saldo: <b>{balance.get(selected!) ?? (detail[3].data ?? []).reduce((s, l) => s + l.delta, 0)}</b> generaciones</p>
              <div className="mt-4 border-t border-line pt-4">
                <CreditAdjust userId={selected!} />
              </div>
            </section>
            <section className="card p-5 text-[13.5px]">
              <h2 className="mb-3 font-medium">Compras</h2>
              {(detail[1].data ?? []).map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="text-muted">{dateTime(o.created_at)}</span><span>{cop(Number(o.amount_in_cents) / 100)}</span><OrderBadge status={o.status} />
                </div>
              ))}
              {!detail[1].data?.length && <p className="text-muted">Sin compras.</p>}
            </section>
            <section className="card p-5 text-[13.5px]">
              <h2 className="mb-3 font-medium">Generaciones</h2>
              {(detail[2].data ?? []).map((g) => (
                <div key={g.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="truncate">{g.cargo}</span><span className="font-mono text-muted">US${Number(g.cost_usd).toFixed(2)}</span><GenerationBadge status={g.status} />
                </div>
              ))}
              {!detail[2].data?.length && <p className="text-muted">Sin generaciones.</p>}
            </section>
            <section className="card p-5 text-[13.5px]">
              <h2 className="mb-3 font-medium">Movimientos de créditos</h2>
              {(detail[3].data ?? []).map((l) => (
                <div key={l.id} className="flex justify-between gap-2 py-1">
                  <span className="truncate text-muted">{dateTime(l.created_at)} · {l.reason} · {l.note}</span>
                  <span className={`font-mono ${l.delta > 0 ? "text-ok" : ""}`}>{l.delta > 0 ? `+${l.delta}` : l.delta}</span>
                </div>
              ))}
            </section>
          </div>
        ) : (
          <div className="card grid place-items-center p-10 text-[14px] text-muted">Selecciona un usuario para ver el detalle.</div>
        )}
      </div>
    </>
  );
}
