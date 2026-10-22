import { cfg } from "@/lib/config/runtime";

/**
 * La cuenta de Wompi es compartida con CENTRA y Wompi admite una sola URL de
 * eventos. Este simulador la recibe y reenvía, sin tocar el cuerpo (así la
 * firma sigue siendo válida), los eventos de transacciones que no son suyas.
 */
export const OWN_REFERENCE = /^S2676-/;

export function forwardTarget(requestUrl: string): string | null {
  const target = cfg("WOMPI_FORWARD_URL");
  if (!target) return null;
  try {
    const t = new URL(target);
    // Nunca reenviar a sí mismo (evita bucles si se configura mal).
    if (t.protocol !== "https:" || t.host === new URL(requestUrl).host) return null;
    return t.toString();
  } catch {
    return null;
  }
}

export async function forwardEvent(target: string, raw: string, headers: Headers): Promise<Response> {
  const res = await fetch(target, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(headers.get("x-event-checksum") ? { "X-Event-Checksum": headers.get("x-event-checksum")! } : {}),
    },
    body: raw,
    signal: AbortSignal.timeout(15_000),
  });
  // Se devuelve el estado del destino para que Wompi reintente si el destino falla.
  return new Response(await res.text(), { status: res.status, headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" } });
}
