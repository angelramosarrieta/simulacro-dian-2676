import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsForm, type Settings } from "@/components/admin/SettingsForm";
import { requireAdminPage } from "@/lib/admin/auth";
import { DEFAULT_LIMITS, mergeLimits } from "@/lib/generation/limits";
import { integrationStatus } from "@/lib/env";
import { emailConfigured } from "@/lib/email/send";

export default async function Page() {
  const { admin } = await requireAdminPage();
  const { data } = await admin.from("app_settings").select("key, value");
  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  const settings: Settings = {
    price_first_cop: Number(map.get("price_first_cop") ?? 29900),
    price_next_cop: Number(map.get("price_next_cop") ?? 20000),
    questions_per_generation: Number(map.get("questions_per_generation") ?? 120),
    order_pending_ttl_minutes: Number(map.get("order_pending_ttl_minutes") ?? 60),
    admin_emails: Array.isArray(map.get("admin_emails")) ? (map.get("admin_emails") as string[]) : [],
    generation_limits: mergeLimits(map.get("generation_limits") ?? DEFAULT_LIMITS),
  };
  const s = integrationStatus();
  const rows: [string, boolean, string][] = [
    ["Base de datos (Supabase)", s.supabase, "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY"],
    [`Inteligencia artificial (${s.aiProvider})`, s.ai, s.aiProvider === "openai" ? "OPENAI_API_KEY, OPENAI_MODEL" : "ANTHROPIC_API_KEY (opcional AI_MODEL)"],
    [`Pagos Wompi (${s.wompiEnv})`, s.wompi, "NEXT_PUBLIC_WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY, WOMPI_INTEGRITY_SECRET, WOMPI_EVENTS_SECRET, WOMPI_ENV"],
    ["Correos (Resend)", emailConfigured(), "RESEND_API_KEY, EMAIL_FROM, ADMIN_ALERT_EMAIL"],
    ["Captcha (Turnstile)", Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY), "NEXT_PUBLIC_TURNSTILE_SITE_KEY + secreto en Supabase Auth"],
    ["Jobs internos", s.internalSecret, "INTERNAL_JOB_SECRET"],
    ["Cron diario", Boolean(process.env.CRON_SECRET), "CRON_SECRET"],
  ];
  return (
    <>
      <PageHeader eyebrow="Administración" title="Configuración" description="Precios, límites y administradores. Las llaves secretas se cargan en Vercel por seguridad; aquí ves si están listas." />
      <section className="card mb-6 overflow-hidden">
        <h2 className="border-b border-line px-5 py-4 font-medium">Integraciones</h2>
        <ul className="divide-y divide-line text-[14px]">
          {rows.map(([label, ok, vars]) => (
            <li key={label} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${ok ? "bg-ok" : "bg-bad"}`} aria-hidden />
                {label} <span className="sr-only">{ok ? "configurado" : "pendiente"}</span>
              </span>
              <span className="font-mono text-[12px] text-muted">{ok ? "Listo" : vars}</span>
            </li>
          ))}
        </ul>
      </section>
      <SettingsForm initial={settings} />
    </>
  );
}
