export function cop(amount: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amount);
}

export function dateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" }).format(new Date(iso));
}

export function dateOnly(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "America/Bogota" }).format(new Date(iso));
}

export function daysUntil(isoDate: string) {
  const target = new Date(`${isoDate}T08:00:00-05:00`).getTime();
  return Math.max(0, Math.ceil((target - Date.now()) / 86_400_000));
}

export function compactNumber(n: number) {
  return new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
