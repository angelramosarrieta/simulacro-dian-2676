"use client";
import { useState } from "react";

export type DayPoint = { dia: string; visitantes: number; paginas: number };

const fmtDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" });

/** Visitantes únicos por día: una sola serie (color de marca), con tooltip y vista de tabla. */
export function VisitsChart({ days }: { days: DayPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...days.map((d) => d.visitantes));
  const ticks = [max, Math.round(max / 2), 0];
  const h = hover != null ? days[hover] : null;
  return (
    <figure className="card p-5 sm:p-6">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-medium">Visitantes únicos por día</span>
        <button type="button" className="text-[13px] text-brandInk underline-offset-4 hover:underline" onClick={() => setTable((t) => !t)}>
          {table ? "Ver gráfica" : "Ver tabla"}
        </button>
      </figcaption>
      {!days.length ? (
        <p className="mt-6 text-[14px] text-muted">Aún no hay visitas en este periodo.</p>
      ) : table ? (
        <table className="mt-4 w-full text-left text-[13.5px]">
          <thead className="text-[12px] text-muted"><tr><th className="py-1.5 font-medium">Día</th><th className="py-1.5 font-medium">Visitantes</th><th className="py-1.5 font-medium">Páginas vistas</th></tr></thead>
          <tbody className="divide-y divide-line">
            {days.map((d) => <tr key={d.dia}><td className="py-1.5">{fmtDay(d.dia)}</td><td className="py-1.5 font-mono">{d.visitantes}</td><td className="py-1.5 font-mono">{d.paginas}</td></tr>)}
          </tbody>
        </table>
      ) : (
        <div className="mt-5 grid grid-cols-[auto_1fr] gap-x-3">
          <div className="flex h-44 flex-col justify-between text-right font-mono text-[11px] text-muted" aria-hidden>
            {ticks.map((t, i) => <span key={i}>{t}</span>)}
          </div>
          <div className="relative h-44" onMouseLeave={() => setHover(null)}>
            {ticks.map((_, i) => <div key={i} className="absolute inset-x-0 border-t border-line/70" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} aria-hidden />)}
            <div className="absolute inset-0 flex items-end gap-[2px]" role="img" aria-label={`Visitantes por día: ${days.map((d) => `${fmtDay(d.dia)} ${d.visitantes}`).join(", ")}`}>
              {days.map((d, i) => (
                <div key={d.dia} className="flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0}>
                  <div className={`w-full rounded-t-[4px] ${hover === i ? "bg-brandInk" : "bg-brand"}`} style={{ height: `${Math.max(d.visitantes ? 2 : 0, (d.visitantes / max) * 100)}%` }} />
                </div>
              ))}
            </div>
            {h && hover != null && (
              <div className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] shadow-pop" style={{ left: `${((hover + 0.5) / days.length) * 100}%` }}>
                <p className="font-medium">{fmtDay(h.dia)}</p>
                <p className="text-muted"><span className="font-mono text-ink">{h.visitantes}</span> visitantes · <span className="font-mono text-ink">{h.paginas}</span> páginas</p>
              </div>
            )}
          </div>
          <span />
          <div className="mt-2 flex justify-between text-[11px] text-muted">
            <span>{fmtDay(days[0].dia)}</span>
            {days.length > 2 && <span>{fmtDay(days[days.length - 1].dia)}</span>}
          </div>
        </div>
      )}
    </figure>
  );
}
