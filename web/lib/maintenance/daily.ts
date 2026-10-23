import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchContinuation } from "@/lib/generation/dispatch";
import { notifyGenerationFinished } from "@/lib/email/notify";
import { reconcilePendingOrders } from "@/lib/payments/reconcile";

const ACTIVE = ["queued", "analyzing", "generating", "assembling"];

/**
 * Mantenimiento diario (cron):
 * 1. Concilia pagos pendientes con Wompi.
 * 2. Reanuda generaciones detenidas (sin lease y sin cambios hace 5+ min).
 * 3. Da por fallidas (y reembolsa) las que llevan 3+ horas sin terminar.
 * 4. Borra los documentos de borradores abandonados hace 24+ horas.
 * 5. Borra las visitas registradas hace más de 6 meses.
 */
/** Días que se conservan las visitas anónimas (ver /privacidad). */
export const VISITS_RETENTION_DAYS = 183;

export async function runDailyMaintenance(admin: SupabaseClient, now = Date.now()) {
  const report = { reconciled: 0, resumed: 0, expired: 0, purgedDrafts: 0 };
  report.reconciled = await reconcilePendingOrders(undefined, 50);

  const { data: active } = await admin.from("generations").select("id, status, lease_until, updated_at, started_at").in("status", ACTIVE).limit(200);
  for (const g of active ?? []) {
    const started = g.started_at ? new Date(g.started_at).getTime() : now;
    const leaseFree = !g.lease_until || new Date(g.lease_until).getTime() < now;
    if (now - started > 3 * 3_600_000 && leaseFree) {
      await admin
        .from("generations")
        .update({ status: "failed", error_code: "tiempo_agotado", error_message: "La generación tardó demasiado y se detuvo.", current_step: "No se pudo completar", finished_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() })
        .eq("id", g.id)
        .in("status", ACTIVE);
      await admin.rpc("refund_generation", { p_generation_id: g.id, p_note: "Reembolso: tiempo_agotado" });
      await notifyGenerationFinished(admin, g.id);
      report.expired++;
    } else if (leaseFree && now - new Date(g.updated_at).getTime() > 5 * 60_000) {
      await dispatchContinuation(g.id);
      report.resumed++;
    }
  }

  const cutoff = new Date(now - 86_400_000).toISOString();
  const { data: drafts } = await admin.from("generations").select("id, manual_path, indicadores_path").eq("status", "draft").lt("updated_at", cutoff).limit(500);
  const files = (drafts ?? []).flatMap((d) => [d.manual_path, d.indicadores_path]).filter((p): p is string => Boolean(p));
  if (files.length) await admin.storage.from("documents").remove(files);
  if (drafts?.length) {
    await admin.from("generations").update({ status: "cancelled", updated_at: new Date(now).toISOString() }).in("id", drafts.map((d) => d.id));
    report.purgedDrafts = drafts.length;
  }
  await admin.from("page_views").delete().lt("created_at", new Date(now - VISITS_RETENTION_DAYS * 86_400_000).toISOString());
  return report;
}
