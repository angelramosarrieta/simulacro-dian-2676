import Link from "next/link";
import { ArrowRight, CalendarClock, Check, CreditCard, FilePlus2, Library, Sparkles } from "lucide-react";
import { GenerationProgress } from "@/components/panel/GenerationProgress";
import { Alert } from "@/components/ui/Alert";
import { GenerationBadge, ACTIVE_STATUSES } from "@/components/ui/StatusBadge";
import { firstName, getBalance, getGenerations, getProfile, getQuote } from "@/lib/data/account";
import { BRAND } from "@/lib/brand";
import { cop, dateTime, daysUntil } from "@/lib/format";
import { integrationStatus } from "@/lib/env";

export default async function Resumen() {
  const [profile, balance, generations, quote] = await Promise.all([getProfile(), getBalance(), getGenerations(20), getQuote()]);
  const active = generations.find((g) => ACTIVE_STATUSES.includes(g.status));
  const completed = generations.filter((g) => g.status === "completed");
  const days = daysUntil(BRAND.examDate);
  const status = await integrationStatus();

  const steps = [
    { done: true, label: "Crear tu cuenta" },
    { done: profile.onboarding_completed, label: "Completar tu perfil", href: "/panel/bienvenida" },
    { done: quote.hasPaid || balance > 0, label: "Comprar tu simulador", href: "/panel/comprar" },
    { done: generations.some((g) => g.status !== "draft"), label: "Subir tus documentos y generar", href: "/panel/nueva" },
    { done: completed.length > 0, label: "Empezar a practicar", href: completed[0] ? `/s/${completed[0].id}` : undefined },
  ];
  const pending = steps.filter((s) => !s.done).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Resumen</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Hola, {firstName(profile)}</h1>
        </div>
        {days > 0 && (
          <p className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] text-muted sm:self-auto">
            <CalendarClock className="h-4 w-4 text-brandInk" aria-hidden /> Faltan <b className="text-ink">{days} días</b> para la prueba
          </p>
        )}
      </div>

      {(!status.ai || !status.wompi) && (
        <Alert tone="warning" title="Estamos terminando la configuración">
          {!status.wompi && "Los pagos se habilitan en las próximas horas. "}
          {!status.ai && "El generador se está conectando; ninguna compra se consume hasta que esté activo."}
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat label="Generaciones disponibles" value={String(balance)} hint={balance ? "Listas para usar" : "Compra una para empezar"} icon={Sparkles} highlight={balance > 0} />
        <Stat label="Simuladores listos" value={String(completed.length)} hint={completed.length ? "En Mis simuladores" : "Aún no tienes"} icon={Library} />
        <Stat wide label={quote.hasPaid ? "Generación adicional" : "Primer simulador"} value={cop(quote.amount)} hint="Pago único con Wompi" icon={CreditCard} />
      </div>

      {active ? (
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">En proceso</p>
              <p className="mt-0.5 truncate font-medium">{active.cargo} · OPEC {active.opec}</p>
            </div>
            <Link href={`/panel/simuladores/${active.id}`} className="link shrink-0 text-[14px]">Ver detalle</Link>
          </div>
          <GenerationProgress id={active.id} initial={{ status: active.status, progress: active.progress, currentStep: active.current_step }} />
        </section>
      ) : (
        <section className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brandSoft text-brandInk">
              <FilePlus2 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="font-medium">{balance > 0 ? `Tienes ${balance === 1 ? "una generación disponible" : `${balance} generaciones disponibles`}` : quote.hasPaid ? "¿Necesitas otro simulador?" : "Crea tu primer simulador"}</p>
              <p className="mt-0.5 text-[14px] text-muted">
                {balance > 0
                  ? "Sube tu manual de funciones y tus indicadores para generarlo."
                  : quote.hasPaid
                    ? `Cada generación adicional cuesta ${cop(quote.pricing.next)}.`
                    : `Sube tus documentos, paga ${cop(quote.pricing.first)} y empieza a practicar en minutos.`}
              </p>
            </div>
          </div>
          <Link href={balance > 0 ? "/panel/nueva" : quote.hasPaid ? "/panel/comprar" : "/panel/nueva"} className="btn-primary shrink-0">
            {balance > 0 || !quote.hasPaid ? "Crear simulador" : "Comprar generación"} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-medium">Simuladores recientes</h2>
            <Link href="/panel/simuladores" className="link text-[14px]">Ver todos</Link>
          </div>
          {generations.filter((g) => g.status !== "draft").length === 0 ? (
            <p className="px-5 py-10 text-center text-[14px] text-muted">Aquí verás tus simuladores cuando generes el primero.</p>
          ) : (
            <ul className="divide-y divide-line">
              {generations.filter((g) => g.status !== "draft").slice(0, 4).map((g) => (
                <li key={g.id}>
                  <Link href={`/panel/simuladores/${g.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-soft/60">
                    <div className="min-w-0">
                      <p className="truncate text-[14.5px] font-medium">{g.cargo}</p>
                      <p className="text-[13px] text-muted">OPEC {g.opec} · {dateTime(g.created_at)}</p>
                    </div>
                    <GenerationBadge status={g.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Primeros pasos</h2>
            <span className="text-[13px] text-muted">{pending ? `${steps.length - pending} de ${steps.length}` : "Completo"}</span>
          </div>
          <ol className="mt-4 space-y-1">
            {steps.map((s) => {
              const content = (
                <>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${s.done ? "border-ok bg-ok text-white" : "border-line text-transparent"}`}>
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className={s.done ? "text-muted line-through decoration-line" : ""}>{s.label}</span>
                </>
              );
              return (
                <li key={s.label}>
                  {!s.done && s.href ? (
                    <Link href={s.href} className="flex items-center gap-3 rounded-lg px-2 py-2 text-[14px] hover:bg-soft">{content}</Link>
                  ) : (
                    <div className="flex items-center gap-3 px-2 py-2 text-[14px]">{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, icon: Icon, highlight = false, wide = false }: { label: string; value: string; hint: string; icon: typeof Sparkles; highlight?: boolean; wide?: boolean }) {
  return (
    <div className={`card p-4 sm:p-5 ${wide ? "col-span-2 sm:col-span-1" : ""} ${highlight ? "border-brand/30 ring-1 ring-brand/15" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted">{label}</p>
        <Icon className="h-4 w-4 text-faint" aria-hidden />
      </div>
      <p className="mt-1 text-[24px] font-semibold tracking-tight sm:mt-2 sm:text-[28px]">{value}</p>
      <p className="text-[13px] text-muted">{hint}</p>
    </div>
  );
}
