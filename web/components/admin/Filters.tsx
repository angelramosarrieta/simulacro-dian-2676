import Link from "next/link";

/** Filtros por estado como enlaces (sin JS) + búsqueda por correo. */
export function StatusFilter({ base, current, options, q }: { base: string; current?: string; options: [string, string][]; q?: string }) {
  const href = (estado?: string) => {
    const p = new URLSearchParams();
    if (estado) p.set("estado", estado);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        <Link href={href()} className={`badge px-3 py-1 ${!current ? "bg-brand text-onBrand" : "bg-soft text-muted"}`}>Todos</Link>
        {options.map(([v, label]) => (
          <Link key={v} href={href(v)} className={`badge px-3 py-1 ${current === v ? "bg-brand text-onBrand" : "bg-soft text-muted"}`}>{label}</Link>
        ))}
      </div>
      <form className="flex gap-2" action={base}>
        {current && <input type="hidden" name="estado" value={current} />}
        <label htmlFor="q" className="sr-only">Buscar por correo</label>
        <input id="q" name="q" defaultValue={q} placeholder="correo@…" className="input h-9 w-56 text-[14px]" />
        <button className="btn-secondary btn-sm">Buscar</button>
      </form>
    </div>
  );
}
