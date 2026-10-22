import type { Metadata } from "next";
import { Check, Lock } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { CheckoutButton } from "@/components/panel/CheckoutButton";
import { getBalance, getQuote } from "@/lib/data/account";
import { integrationStatus } from "@/lib/env";
import { cop } from "@/lib/format";

export const metadata: Metadata = { title: "Comprar generación" };

export default async function Page() {
  const [quote, balance] = await Promise.all([getQuote(), getBalance()]);
  const status = integrationStatus();
  return (
    <>
      <PageHeader eyebrow="Comprar" title={quote.hasPaid ? "Compra otra generación" : "Activa tu primer simulador"} description="Pago único. Cada compra suma una generación a tu cuenta." />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-6 sm:p-7">
          <p className="text-[14px] text-muted">{quote.hasPaid ? "Generación adicional" : "Primer simulador (activación)"}</p>
          <p className="mt-2 text-[40px] font-semibold tracking-tight">{cop(quote.amount)}</p>
          <p className="text-[13px] text-muted">COP · pago único · sin suscripción</p>
          <ul className="mt-6 space-y-2.5 text-[14px]">
            {[
              `${quote.pricing.questions} preguntas nuevas de tus ejes oficiales`,
              "Banco común y afirmaciones comportamentales incluidos",
              "Simulacros cronometrados, repaso de errores y progreso por eje",
              "Si la generación falla, el crédito vuelve a tu cuenta",
            ].map((x) => (
              <li key={x} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />{x}</li>
            ))}
          </ul>
          <div className="mt-7">
            {!status.wompi && (
              <div className="mb-4">
                <Alert tone="warning">Los pagos se habilitan en las próximas horas.</Alert>
              </div>
            )}
            <CheckoutButton label={`Pagar ${cop(quote.amount)} con Wompi`} disabled={!status.wompi} />
            <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-muted">
              <Lock className="h-3.5 w-3.5" aria-hidden /> PSE, Nequi, botón Bancolombia o tarjeta. No guardamos datos de pago.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-[13px] text-muted">Tienes ahora</p>
            <p className="mt-1 text-[28px] font-semibold">{balance} <span className="text-[15px] font-normal text-muted">{balance === 1 ? "generación" : "generaciones"}</span></p>
          </div>
          <div className="card p-5 text-[14px]">
            <p className="font-medium">Así cobramos</p>
            <ul className="mt-3 space-y-2 text-muted">
              <li>· Primer simulador: {cop(quote.pricing.first)}.</li>
              <li>· Cada generación posterior: {cop(quote.pricing.next)}.</li>
              <li>· Crear tu cuenta no tiene costo.</li>
              <li>· Un pago pendiente o rechazado no habilita generaciones.</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
