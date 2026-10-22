const GEN: Record<string, [string, string]> = {
  draft: ["Borrador", "bg-soft text-muted"],
  queued: ["En cola", "bg-brandSoft text-brandInk"],
  analyzing: ["Analizando", "bg-brandSoft text-brandInk"],
  generating: ["Generando", "bg-brandSoft text-brandInk"],
  assembling: ["Armando", "bg-brandSoft text-brandInk"],
  completed: ["Listo", "bg-okSoft text-ok"],
  failed: ["No completada", "bg-badSoft text-bad"],
  cancelled: ["Descartada", "bg-soft text-muted"],
};
const ORDER: Record<string, [string, string]> = {
  pending: ["Pendiente", "bg-warnSoft text-warn"],
  approved: ["Aprobado", "bg-okSoft text-ok"],
  declined: ["Rechazado", "bg-badSoft text-bad"],
  voided: ["Anulado", "bg-soft text-muted"],
  error: ["Error", "bg-badSoft text-bad"],
  expired: ["Vencido", "bg-soft text-muted"],
};

export function GenerationBadge({ status }: { status: string }) {
  const [label, cls] = GEN[status] ?? [status, "bg-soft text-muted"];
  return <span className={`badge ${cls}`}>{label}</span>;
}
export function OrderBadge({ status }: { status: string }) {
  const [label, cls] = ORDER[status] ?? [status, "bg-soft text-muted"];
  return <span className={`badge ${cls}`}>{label}</span>;
}
export const ACTIVE_STATUSES = ["queued", "analyzing", "generating", "assembling"];
