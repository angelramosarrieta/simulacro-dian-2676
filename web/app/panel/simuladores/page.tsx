import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, FilePlus2, Library } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { GenerationBadge } from "@/components/ui/StatusBadge";
import { getGenerations } from "@/lib/data/account";
import { dateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Mis simuladores" };

export default async function Page() {
  const items = (await getGenerations(100)).filter((g) => g.status !== "draft");
  return (
    <>
      <PageHeader
        eyebrow="Historial"
        title="Mis simuladores"
        description="Todas tus generaciones, con su estado. Los simuladores listos se abren en una pestaña nueva."
        action={<Link href="/panel/nueva" className="btn-primary"><FilePlus2 className="h-4 w-4" aria-hidden /> Nuevo simulador</Link>}
      />
      {items.length === 0 ? (
        <div className="card">
          <EmptyState icon={Library} title="Todavía no tienes simuladores" action={<Link href="/panel/nueva" className="btn-primary">Crear mi primer simulador</Link>}>
            Sube tu manual de funciones y tus indicadores para generar el primero.
          </EmptyState>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((g) => (
            <li key={g.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{g.cargo}</p>
                  <p className="mt-0.5 text-[13px] text-muted">OPEC {g.opec} · {g.nivel} · {g.modalidad}</p>
                </div>
                <GenerationBadge status={g.status} />
              </div>
              <p className="mt-3 text-[13px] text-muted">
                {g.status === "completed" ? `Listo el ${dateTime(g.finished_at)}` : g.status === "failed" ? g.error_message || "No se completó" : `Iniciado el ${dateTime(g.created_at)} · ${g.progress}%`}
              </p>
              <div className="mt-4 flex gap-2 border-t border-line pt-4">
                {g.status === "completed" && (
                  <Link href={`/panel/simuladores/${g.id}`} className="btn-primary btn-sm">
                    Estudiar <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                )}
                {g.status !== "completed" && <Link href={`/panel/simuladores/${g.id}`} className="btn-secondary btn-sm">Ver detalle</Link>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
