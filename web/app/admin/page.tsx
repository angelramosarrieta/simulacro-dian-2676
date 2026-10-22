import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireAdminPage } from "@/lib/admin/auth";
import { loadMetrics } from "@/lib/admin/metrics";
import { integrationStatus } from "@/lib/env";
import { emailConfigured } from "@/lib/email/send";
import { cop } from "@/lib/format";

export default async function Page() {
  const { admin } = await requireAdminPage();
  const m = await loadMetrics(admin);
  const s = integrationStatus();
  const alerts = [
    m.alerts.failed24h && { text: `${m.alerts.failed24h} generaciones fallidas en las últimas 24 h`, href: "/admin/generaciones?estado=failed" },
    m.alerts.pendingOld && { text: `${m.alerts.pendingOld} órdenes pendientes hace más de 1 hora`, href: "/admin/ordenes?estado=pending" },
    m.alerts.webhookErrors && { text: `${m.alerts.webhookErrors} eventos de Wompi con error sin procesar`, href: "/admin/ordenes" },
  ].filter(Boolean) as { text: string; href: string }[];

  return (
    <>
      <PageHeader eyebrow="Administración" title="Métricas del negocio" description="Ventas, generaciones y costo de IA en tiempo real." />

      <div className="mb-6 flex flex-wrap gap-2 text-[13px]">
        {[
          ["Supabase", s.supabase],
          [`IA (${s.aiProvider})`, s.ai],
          [`Wompi (${s.wompiEnv})`, s.wompi],
          ["Correos (Resend)", emailConfigured()],
          ["Jobs internos", s.internalSecret],
          ["Cron diario", Boolean(process.env.CRON_SECRET)],
        ].map(([label, ok]) => (
          <span key={String(label)} className={`badge ${ok ? "bg-okSoft text-ok" : "bg-badSoft text-bad"}`}>{ok ? "●" : "○"} {label}</span>
        ))}
      </div>

      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((a) => (
            <Link key={a.text} href={a.href} className="flex items-center gap-2 rounded-xl border border-warn/30 bg-warnSoft px-4 py-3 text-[14px]">
              <AlertTriangle className="h-4 w-4 text-warn" aria-hidden /> {a.text}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Ingresos totales" value={cop(m.revenue)} hint={`${m.sales} ventas · hoy ${cop(m.revenue24h)}`} />
        <Kpi label="Usuarios" value={String(m.usersTotal)} hint={`+${m.users24h} hoy · +${m.users7d} en 7 días`} />
        <Kpi label="Conversión a compra" value={`${(m.conversion * 100).toFixed(1)} %`} hint={`${m.buyers} compradores`} />
        <Kpi label="Margen estimado" value={cop(m.margin)} hint={`Ingresos − IA (TRM ${m.usdCop})`} />
        <Kpi label="Simuladores listos" value={String(m.generations.completed)} hint={`${m.generations.active} en curso · ${m.generations.failed} fallidos`} />
        <Kpi label="Costo IA total" value={`US$${m.aiCostUsd.toFixed(2)}`} hint={`≈ ${cop(m.aiCostCop)}`} />
        <Kpi label="Costo por simulador" value={`US$${m.avgCostUsd.toFixed(2)}`} hint="Promedio de los completados" />
        <Kpi label="Tiempo de generación" value={`${m.avgMinutes.toFixed(1)} min`} hint="Promedio de los completados" />
      </div>
    </>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card p-5">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1.5 text-[24px] font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-[12.5px] text-muted">{hint}</p>
    </div>
  );
}
