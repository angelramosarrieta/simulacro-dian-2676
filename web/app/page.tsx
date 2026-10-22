import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  Check,
  FileText,
  Gauge,
  ListChecks,
  Lock,
  RotateCcw,
  Scale,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Upload,
  UserPlus,
  CreditCard,
} from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Faq } from "@/components/landing/Faq";
import { BRAND } from "@/lib/brand";
import { cop, daysUntil } from "@/lib/format";
import { getPublicPricing } from "@/lib/pricing";
import { getUser } from "@/lib/supabase/server";


export default async function Home() {
  const [pricing, session] = await Promise.all([getPublicPricing(), getUser().catch(() => ({ user: null }))]);
  const days = daysUntil(BRAND.examDate);
  const signedIn = Boolean(session.user);
  const cta = signedIn ? "/panel/nueva" : "/registro";

  return (
    <>
      <SiteHeader signedIn={signedIn} />
      <main id="contenido">
        {/* ---------------------------------------------------------------- Hero */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgb(var(--brand)/0.10),transparent_70%)]" />
          <div className="relative mx-auto grid max-w-page items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24">
            <div className="animate-fade-up">
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[13px] text-muted shadow-card">
                <CalendarClock className="h-4 w-4 text-brandInk" aria-hidden />
                Prueba escrita: {BRAND.examDateText}
                {days > 0 && <span className="font-medium text-ink">· faltan {days} días</span>}
              </p>
              <h1 className="mt-5 text-[38px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[52px]">
                Practica con preguntas hechas <span className="text-brandInk">para tu empleo</span>, no para cualquiera.
              </h1>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
                Sube tu manual de funciones y tus indicadores. En minutos recibes un simulador de la prueba DIAN 2676 con casos de
                juicio situacional de tus ejes oficiales, cada respuesta justificada con la norma.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={cta} className="btn-primary btn-lg">
                  Crear mi simulador <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <a href={BRAND.exampleUrl} target="_blank" rel="noreferrer" className="btn-secondary btn-lg">
                  Ver un simulador de ejemplo
                </a>
              </div>
              <ul className="mt-8 grid gap-2.5 text-[14px] text-muted sm:grid-cols-3">
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brandInk" aria-hidden /> Pago seguro con Wompi</li>
                <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brandInk" aria-hidden /> Listo en unos 15 minutos</li>
                <li className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-brandInk" aria-hidden /> Estudia desde el celular</li>
              </ul>
            </div>
            <QuestionPreview />
          </div>
        </section>

        {/* ------------------------------------------------------ Problema/valor */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-page gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
            {[
              { k: "Tu manual", v: "Las situaciones salen de tus funciones esenciales y de tu nivel, no de un cargo genérico." },
              { k: "Tus ejes", v: "Las preguntas se reparten por los ejes de tus indicadores, con más peso donde más se evalúa." },
              { k: "La norma", v: "Cada opción explica por qué es correcta o incorrecta y cita el artículo que la sustenta." },
            ].map((x) => (
              <div key={x.k}>
                <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-brandInk">{x.k}</p>
                <p className="mt-2 text-[17px] leading-snug">{x.v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------- Cómo funciona */}
        <section id="como-funciona" className="mx-auto max-w-page scroll-mt-20 px-4 py-20 sm:px-6">
          <SectionTitle eyebrow="Cómo funciona" title="Cuatro pasos y empiezas a practicar" description="Sin instalar nada y sin saber de tecnología. Todo desde tu cuenta." />
          <ol className="mt-12 grid gap-4 md:grid-cols-4">
            {[
              { icon: UserPlus, t: "Crea tu cuenta", d: "Gratis. Solo correo y contraseña. No cobramos por registrarte." },
              { icon: Upload, t: "Sube 2 documentos", d: "Tu manual de funciones (ficha MERF) y el pantallazo de tus indicadores, en PDF o imagen." },
              { icon: CreditCard, t: "Paga tu simulador", d: "Con PSE, Nequi, Bancolombia o tarjeta a través de Wompi. Pago único." },
              { icon: BookOpenCheck, t: "Estudia", d: "Analizamos tus documentos y armamos tu banco. Lo abres en el celular cuando quieras." },
            ].map((s, i) => (
              <li key={s.t} className="card relative p-6">
                <span className="font-mono text-[13px] text-faint">0{i + 1}</span>
                <span className="mt-3 grid h-10 w-10 place-items-center rounded-xl bg-brandSoft text-brandInk">
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-4 font-medium">{s.t}</p>
                <p className="mt-1.5 text-[14px] text-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* -------------------------------------------------------- Qué incluye */}
        <section id="que-incluye" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="mx-auto max-w-page px-4 py-20 sm:px-6">
            <SectionTitle eyebrow="Qué incluye" title="Todo lo que necesitas para llegar con ritmo al 8 de noviembre" />
            <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Target, t: `${pricing.questions} preguntas de tu empleo`, d: "Casos de juicio situacional y preguntas directas de tus ejes oficiales, creados a partir de tu manual." },
                { icon: Scale, t: "Justificación con la norma", d: "Por qué cada opción es correcta o incorrecta, con el artículo que la sustenta. Corte normativo: 19 de junio de 2026." },
                { icon: ListChecks, t: "Banco común incluido", d: "77 preguntas de Constitución, CPACA, disciplinario, DIAN y razonamiento, más 17 afirmaciones comportamentales." },
                { icon: Gauge, t: "Simulacros cronometrados", d: "Puntaje de 0 a 100 con dos decimales truncados, frente al mínimo aprobatorio de 70,00." },
                { icon: RotateCcw, t: "Repaso de errores y progreso", d: "Practica por eje, repite lo que fallaste y mira qué ejes debes reforzar antes del examen." },
                { icon: Smartphone, t: "En tu celular", d: "Se agrega a la pantalla de inicio, funciona en modo claro y oscuro y guarda tu progreso." },
              ].map((f) => (
                <div key={f.t} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brandSoft text-brandInk">
                    <f.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-medium">{f.t}</p>
                    <p className="mt-1 text-[14px] text-muted">{f.d}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16 overflow-hidden rounded-2xl border border-line">
              <table className="w-full text-left text-[14px]">
                <caption className="sr-only">Comparación con un banco genérico</caption>
                <thead className="bg-soft text-[13px] text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium sm:px-6"> </th>
                    <th scope="col" className="px-4 py-3 font-medium sm:px-6">Banco genérico</th>
                    <th scope="col" className="px-4 py-3 font-medium text-brandInk sm:px-6">{BRAND.name}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[
                    ["Situaciones de tu cargo y nivel", false, true],
                    ["Reparto por tus ejes oficiales", false, true],
                    ["Justificación de cada opción con la norma", "A veces", true],
                    ["Simulacro con puntaje frente al 70,00", "A veces", true],
                    ["Pago único, sin suscripción", "Depende", true],
                  ].map(([label, a, b]) => (
                    <tr key={String(label)}>
                      <th scope="row" className="px-4 py-3 font-normal sm:px-6">{label}</th>
                      <td className="px-4 py-3 text-muted sm:px-6">{a === false ? "No" : String(a)}</td>
                      <td className="px-4 py-3 sm:px-6">{b ? <Check className="h-4 w-4 text-ok" aria-label="Sí" /> : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ Precios */}
        <section id="precios" className="mx-auto max-w-page scroll-mt-20 px-4 py-20 sm:px-6">
          <SectionTitle eyebrow="Precios" title="Pagas por simulador. Sin suscripciones." description="Crear la cuenta es gratis. Solo pagas cuando vas a generar tu simulador." />
          <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
            <div className="card relative flex flex-col border-brand/40 p-7 ring-1 ring-brand/20">
              <span className="badge absolute right-5 top-5 bg-brandSoft text-brandInk">Para empezar</span>
              <p className="font-medium">Primer simulador</p>
              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="text-[40px] font-semibold tracking-tight">{cop(pricing.first)}</span>
                <span className="text-sm text-muted">COP · pago único</span>
              </p>
              <p className="mt-2 text-[14px] text-muted">Activación de tu cuenta con una generación completa para tu empleo.</p>
              <ul className="mt-6 space-y-2.5 text-[14px]">
                {[
                  `${pricing.questions} preguntas nuevas de tus ejes`,
                  "Banco común y afirmaciones comportamentales",
                  "Simulacros cronometrados y repaso de errores",
                  "Acceso desde tu cuenta y descarga del archivo",
                  "Si la generación falla, te devolvemos el crédito",
                ].map((x) => (
                  <li key={x} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />{x}</li>
                ))}
              </ul>
              <Link href={cta} className="btn-primary mt-8 w-full">Crear mi simulador</Link>
            </div>
            <div className="card flex flex-col p-7">
              <p className="font-medium">Simulador adicional</p>
              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="text-[40px] font-semibold tracking-tight">{cop(pricing.next)}</span>
                <span className="text-sm text-muted">COP · por generación</span>
              </p>
              <p className="mt-2 text-[14px] text-muted">Después de tu primera compra, cada generación nueva tiene este valor.</p>
              <ul className="mt-6 space-y-2.5 text-[14px]">
                {[
                  "Otro empleo u otra OPEC a la que te inscribiste",
                  "Un banco nuevo con preguntas distintas",
                  "Mismas funciones del simulador completo",
                  "Queda en tu historial junto a los anteriores",
                ].map((x) => (
                  <li key={x} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />{x}</li>
                ))}
              </ul>
              <Link href={signedIn ? "/panel/comprar" : "/registro"} className="btn-secondary mt-8 w-full">
                {signedIn ? "Comprar una generación" : "Crear cuenta gratis"}
              </Link>
            </div>
          </div>
          <p className="mx-auto mt-6 flex max-w-xl items-center justify-center gap-2 text-center text-[13px] text-muted">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Pagos procesados por Wompi (Bancolombia): PSE, Nequi, botón Bancolombia y tarjetas. No guardamos datos de tarjetas.
          </p>
        </section>

        {/* -------------------------------------------------------------- FAQ */}
        <section id="preguntas" className="scroll-mt-20 border-t border-line bg-surface">
          <div className="mx-auto grid max-w-page gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
            <div>
              <SectionTitle eyebrow="Preguntas frecuentes" title="Lo que suelen preguntarnos" align="left" />
              <p className="mt-4 text-[15px] text-muted">
                ¿Otra duda? Escríbenos a <a className="link" href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>.
              </p>
            </div>
            <Faq pricing={pricing} />
          </div>
        </section>

        {/* -------------------------------------------------------- CTA final */}
        <section className="mx-auto max-w-page px-4 py-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-brand px-6 py-14 text-center text-onBrand sm:px-12">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_0%,rgb(255_255_255/0.14),transparent)]" />
            <h2 className="relative text-[30px] font-semibold leading-tight tracking-tight sm:text-[36px]">
              {days > 0 ? `Faltan ${days} días. Cada día de práctica cuenta.` : "Prepárate con preguntas de tu empleo."}
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-[16px] opacity-90">
              Crea tu cuenta gratis, sube tus documentos y empieza a practicar hoy mismo.
            </p>
            <Link href={cta} className="btn relative mt-8 h-12 bg-surface px-6 text-base text-ink hover:bg-surface/90">
              Crear mi simulador <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function SectionTitle({ eyebrow, title, description, align = "center" }: { eyebrow: string; title: string; description?: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : ""}>
      <p className="eyebrow text-brandInk">{eyebrow}</p>
      <h2 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.02em] sm:text-[36px]">{title}</h2>
      {description && <p className="mt-3 text-[16px] text-muted">{description}</p>}
    </div>
  );
}

/** Vista previa ilustrativa del simulador (contenido de ejemplo, no de un usuario). */
function QuestionPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md animate-fade-up [animation-delay:120ms]" aria-label="Ejemplo de una pregunta del simulador">
      <div className="card p-5 shadow-pop sm:p-6">
        <div className="flex items-center justify-between text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" aria-hidden /> Caso 14 de 30 · Fiscalización</span>
          <span className="font-mono">42:18</span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-soft">
          <div className="h-full w-[46%] rounded-full bg-brand" />
        </div>
        <p className="mt-5 rounded-xl bg-soft p-4 text-[14px] leading-relaxed">
          Durante una diligencia de verificación, el contribuyente solicita al gestor que el requerimiento ordinario se le notifique
          únicamente por correo electrónico, aunque no ha informado una dirección electrónica en el RUT.
        </p>
        <p className="mt-4 text-[14.5px] font-medium">Con base en lo anterior, al gestor le corresponde</p>
        <ul className="mt-3 space-y-2 text-[14px]">
          <li className="flex gap-3 rounded-xl border border-ok/40 bg-okSoft px-3.5 py-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
            notificar en la forma prevista por la norma y orientarlo para registrar la dirección electrónica.
          </li>
          <li className="rounded-xl border border-line px-3.5 py-3 text-muted">acceder a la solicitud, porque prima la voluntad del contribuyente.</li>
          <li className="rounded-xl border border-line px-3.5 py-3 text-muted">suspender la diligencia hasta que el contribuyente actualice el RUT.</li>
        </ul>
        <p className="mt-4 border-t border-line pt-4 text-[13px] text-muted">
          <span className="font-medium text-ink">Correcta.</span> La notificación electrónica procede cuando el contribuyente informó la
          dirección… <span className="whitespace-nowrap text-brandInk">ET arts. 565 y 566-1</span>
        </p>
      </div>
      <div className="card absolute -top-16 right-4 hidden items-center gap-3 px-4 py-3 shadow-pop sm:flex">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-okSoft font-mono text-[13px] font-semibold text-ok">78</span>
        <div className="text-[12.5px] leading-tight">
          <p className="font-medium">Simulacro aprobado</p>
          <p className="text-muted">Mínimo 70,00</p>
        </div>
      </div>
    </div>
  );
}
