import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Simulator } from "@/components/simulator/Simulator";
import { buildSimData, type RawQuestion } from "@/lib/simulator/engine";
import { getUser } from "@/lib/supabase/server";
import demo from "@/lib/simulator/data/demo.json";

export const metadata: Metadata = {
  title: "Simulador de ejemplo",
  description: "Prueba gratis un simulador real de la prueba escrita DIAN 2676: casos de juicio situacional, simulacros cronometrados y progreso por eje.",
};

// El ejemplo ya trae el banco común dentro de sus preguntas (es un simulador completo).
const data = buildSimData({ cargo: demo.cargo, opec: demo.opec, ejes: demo.ejes, jobQuestions: demo.questions as RawQuestion[], includeCommon: false });

export default async function Page() {
  const { user } = await getUser();
  return (
    <>
      <SiteHeader signedIn={Boolean(user)} />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-brand/25 bg-brandSoft/50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brandInk" aria-hidden />
            <p className="text-[14.5px]">
              <b className="font-semibold">Este es un simulador de ejemplo</b> para el empleo {demo.cargo}. El tuyo se crea con tu manual de funciones y tus indicadores, y tu progreso queda guardado en tu cuenta.
            </p>
          </div>
          <Link href={user ? "/panel/nueva" : "/registro"} className="btn-primary shrink-0">
            Crear el mío <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="mb-6">
          <p className="eyebrow mb-1.5">Simulador de ejemplo · OPEC {demo.opec}</p>
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight sm:text-[28px]">{demo.cargo}</h1>
          <p className="mt-1 text-[14px] text-muted">{data.questions.length} preguntas · {demo.ejes.length} ejes oficiales</p>
        </div>
        <Simulator data={data} persistence={{ kind: "local", namespace: "simulacrodemo-ejemplo" }} />
      </main>
      <SiteFooter />
    </>
  );
}
