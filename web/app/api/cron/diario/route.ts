import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDailyMaintenance } from "@/lib/maintenance/daily";
import { loadMetrics } from "@/lib/admin/metrics";
import { alertAdmin } from "@/lib/email/send";
import { cop } from "@/lib/format";
import { safeEqual } from "@/lib/security";

export const maxDuration = 300;

/** Cron diario de Vercel (vercel.json). Vercel envía "Authorization: Bearer <CRON_SECRET>". */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeEqual(request.headers.get("authorization"), `Bearer ${secret}`)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const admin = createAdminClient();
  const report = await runDailyMaintenance(admin);
  const m = await loadMetrics(admin);
  await alertAdmin(`Resumen diario: ${cop(m.revenue24h)} hoy`, [
    `Ventas últimas 24 h: ${cop(m.revenue24h)} · Total: ${cop(m.revenue)} (${m.sales} ventas)`,
    `Usuarios: ${m.usersTotal} (+${m.users24h} hoy) · Conversión: ${(m.conversion * 100).toFixed(1)} %`,
    `Simuladores: ${m.generations.completed} listos · ${m.generations.failed} fallidos · ${m.generations.active} en curso`,
    `Costo IA total: US$${m.aiCostUsd.toFixed(2)} · Promedio por simulador: US$${m.avgCostUsd.toFixed(2)}`,
    `Mantenimiento: ${report.reconciled} pagos conciliados, ${report.resumed} generaciones reanudadas, ${report.expired} vencidas, ${report.purgedDrafts} borradores limpiados.`,
  ]);
  return NextResponse.json(report);
}
