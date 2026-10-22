import { PageHeader } from "@/components/ui/PageHeader";
import { requireAdminPage } from "@/lib/admin/auth";
import { emailsFor } from "@/lib/admin/users";
import { dateTime } from "@/lib/format";

export default async function Page() {
  const { admin } = await requireAdminPage();
  const { data: rows } = await admin.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(200);
  const emails = await emailsFor(admin, (rows ?? []).flatMap((r) => [r.admin_id, r.target_user_id].filter(Boolean)));
  return (
    <>
      <PageHeader eyebrow="Administración" title="Auditoría" description="Cada acción de un administrador queda registrada." />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13.5px]">
          <thead className="text-[12px] text-muted"><tr className="border-b border-line">
            {["Fecha", "Administrador", "Acción", "Usuario", "Detalle"].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-line">
            {(rows ?? []).map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted">{dateTime(r.created_at)}</td>
                <td className="px-4 py-2.5">{emails.get(r.admin_id) ?? r.admin_id}</td>
                <td className="px-4 py-2.5">{r.action}</td>
                <td className="px-4 py-2.5">{r.target_user_id ? emails.get(r.target_user_id) ?? r.target_user_id : "—"}</td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-muted">{JSON.stringify(r.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows?.length && <p className="px-4 py-10 text-center text-muted">Sin acciones registradas.</p>}
      </div>
    </>
  );
}
