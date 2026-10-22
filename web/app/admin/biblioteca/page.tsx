import { PageHeader } from "@/components/ui/PageHeader";
import { LibraryToggle } from "@/components/admin/LibraryToggle";
import { requireAdminPage } from "@/lib/admin/auth";
import { dateTime } from "@/lib/format";

export default async function Page() {
  const { admin } = await requireAdminPage();
  const { data: banks } = await admin
    .from("job_banks")
    .select("opec, cargo, nivel, modalidad, ejes, question_count, uses, enabled, created_at, updated_at, source_generation_id")
    .order("uses", { ascending: false })
    .limit(500);
  const totalUses = (banks ?? []).reduce((s, b) => s + b.uses, 0);
  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Biblioteca de empleos"
        description="Cada simulador generado con IA queda guardado por OPEC. Los siguientes aspirantes del mismo empleo lo reciben al instante, sin costo de IA. Retira un banco si su calidad no es buena: el próximo aspirante generará uno nuevo."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><p className="text-[13px] text-muted">Empleos en la biblioteca</p><p className="mt-1 text-[26px] font-semibold">{banks?.length ?? 0}</p></div>
        <div className="card p-5"><p className="text-[13px] text-muted">Simuladores entregados desde la biblioteca</p><p className="mt-1 text-[26px] font-semibold">{totalUses}</p></div>
        <div className="card p-5"><p className="text-[13px] text-muted">Retirados</p><p className="mt-1 text-[26px] font-semibold">{(banks ?? []).filter((b) => !b.enabled).length}</p></div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-[13.5px]">
          <thead className="text-[12px] text-muted"><tr className="border-b border-line">
            {["OPEC", "Empleo", "Preguntas", "Ejes", "Usos", "Actualizado", "Estado", ""].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-line">
            {(banks ?? []).map((b) => (
              <tr key={b.opec} className="align-top">
                <td className="px-4 py-2.5 font-mono">{b.opec}</td>
                <td className="max-w-[240px] px-4 py-2.5"><span className="line-clamp-2">{b.cargo}</span><span className="text-[12px] text-muted">{b.nivel} · {b.modalidad}</span></td>
                <td className="px-4 py-2.5 font-mono">{b.question_count}</td>
                <td className="max-w-[260px] px-4 py-2.5 text-[12.5px] text-muted">{Array.isArray(b.ejes) ? (b.ejes as string[]).join(" · ") : ""}</td>
                <td className="px-4 py-2.5 font-mono">{b.uses}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted">{dateTime(b.updated_at)}</td>
                <td className="px-4 py-2.5">{b.enabled ? <span className="badge bg-okSoft text-ok">Activo</span> : <span className="badge bg-soft text-muted">Retirado</span>}</td>
                <td className="px-4 py-2.5"><LibraryToggle opec={b.opec} enabled={b.enabled} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!banks?.length && <p className="px-4 py-10 text-center text-muted">Aún no hay empleos en la biblioteca. Se agregan solos cuando se completa una generación con IA.</p>}
      </div>
    </>
  );
}
