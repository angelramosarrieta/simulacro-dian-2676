import "server-only";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/security";

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Exige sesión válida (y mismo origen en métodos que cambian estado). */
export async function requireUser(request: Request) {
  if (request.method !== "GET" && !sameOrigin(request)) {
    return { error: jsonError(403, "origen_invalido", "Solicitud no permitida.") } as const;
  }
  const { user, supabase } = await getUser();
  if (!user) return { error: jsonError(401, "no_autenticado", "Inicia sesión para continuar.") } as const;
  return { user, supabase } as const;
}

export async function readJson(request: Request, maxBytes = 20_000): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxBytes) throw new Error("payload_grande");
  return text ? JSON.parse(text) : {};
}
