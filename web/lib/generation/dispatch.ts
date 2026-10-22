import "server-only";
import { siteUrl } from "@/lib/env";

/**
 * Pide a otra invocación que siga avanzando la generación (las funciones
 * serverless tienen tiempo máximo). El endpoint interno se autentica con
 * INTERNAL_JOB_SECRET. Si esta llamada se pierde, el panel del usuario la
 * reanuda en su siguiente consulta de estado (ver /api/generations/[id]).
 */
export async function dispatchContinuation(generationId: string) {
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!secret) return false;
  try {
    await fetch(`${siteUrl()}/api/internal/generations/${generationId}/run`, {
      method: "POST",
      headers: { "x-internal-secret": secret },
      // Basta con que la solicitud llegue; la otra función sigue por su cuenta.
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Timeout esperado mientras la otra invocación trabaja.
  }
  return true;
}
