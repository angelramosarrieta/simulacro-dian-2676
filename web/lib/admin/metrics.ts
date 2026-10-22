import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const DAY = 86_400_000;

/** Métricas del negocio para el panel de administración (consultas con service role). */
export async function loadMetrics(admin: SupabaseClient) {
  const now = Date.now();
  const iso = (ms: number) => new Date(now - ms).toISOString();
  const head = { count: "exact" as const, head: true };
  const [{ count: usersTotal }, { count: users7d }, { count: users24h }] = await Promise.all([
    admin.from("profiles").select("id", head),
    admin.from("profiles").select("id", head).gte("created_at", iso(7 * DAY)),
    admin.from("profiles").select("id", head).gte("created_at", iso(DAY)),
  ]);

  const { data: approved } = await admin.from("orders").select("user_id, amount_in_cents, paid_at").eq("status", "approved").limit(10000);
  const revenue = (approved ?? []).reduce((s, o) => s + Number(o.amount_in_cents) / 100, 0);
  const revenue24h = (approved ?? []).filter((o) => o.paid_at && new Date(o.paid_at).getTime() > now - DAY).reduce((s, o) => s + Number(o.amount_in_cents) / 100, 0);
  const buyers = new Set((approved ?? []).map((o) => o.user_id)).size;

  const { data: gens } = await admin.from("generations").select("status, cost_usd, created_at, finished_at, started_at").neq("status", "draft").neq("status", "cancelled").limit(10000);
  const by = (st: string) => (gens ?? []).filter((g) => g.status === st).length;
  const aiCost = (gens ?? []).reduce((s, g) => s + Number(g.cost_usd), 0);
  const completed = (gens ?? []).filter((g) => g.status === "completed");
  const avgCost = completed.length ? completed.reduce((s, g) => s + Number(g.cost_usd), 0) / completed.length : 0;
  const durations = completed.filter((g) => g.started_at && g.finished_at).map((g) => (new Date(g.finished_at!).getTime() - new Date(g.started_at!).getTime()) / 60000);
  const avgMinutes = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  const usdCop = Number(process.env.USD_COP_RATE) || 4000;
  const [{ count: pendingOld }, { count: webhookErrors }, { count: failed24h }] = await Promise.all([
    admin.from("orders").select("id", head).eq("status", "pending").lt("created_at", iso(60 * 60 * 1000)),
    admin.from("payment_events").select("id", head).not("error", "is", null).is("processed_at", null),
    admin.from("generations").select("id", head).eq("status", "failed").gte("finished_at", iso(DAY)),
  ]);

  return {
    usersTotal: usersTotal ?? 0,
    users7d: users7d ?? 0,
    users24h: users24h ?? 0,
    buyers,
    conversion: usersTotal ? buyers / usersTotal : 0,
    sales: approved?.length ?? 0,
    revenue,
    revenue24h,
    generations: { completed: by("completed"), failed: by("failed"), active: (gens ?? []).filter((g) => ["queued", "analyzing", "generating", "assembling"].includes(g.status)).length },
    aiCostUsd: aiCost,
    aiCostCop: aiCost * usdCop,
    avgCostUsd: avgCost,
    avgMinutes,
    margin: revenue - aiCost * usdCop,
    usdCop,
    alerts: { pendingOld: pendingOld ?? 0, webhookErrors: webhookErrors ?? 0, failed24h: failed24h ?? 0 },
  };
}
