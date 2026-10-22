import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson, requireUser } from "@/lib/api";

const text = (max: number) => z.string().transform((s) => s.replace(/[\u0000-\u001f<>]/g, "").trim()).pipe(z.string().max(max));

const schema = z
  .object({
    full_name: text(120).pipe(z.string().min(2, "Escribe tu nombre.")),
    phone: text(20).refine((v) => v === "" || /^[0-9+ ]{7,20}$/.test(v), "Teléfono inválido."),
    city: text(80),
    default_cargo: text(120),
    default_nivel: z.enum(["", "Asistencial", "Técnico", "Profesional"]),
    default_modalidad: z.enum(["", "Ingreso", "Ascenso"]),
    marketing_opt_in: z.boolean(),
    onboarding_completed: z.boolean(),
  })
  .partial();

/** Actualiza el perfil propio. Pasa por RLS (cliente con sesión) y solo columnas permitidas. */
export async function PATCH(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  let parsed;
  try {
    parsed = schema.safeParse(await readJson(request));
  } catch {
    return jsonError(400, "json_invalido", "Solicitud inválida.");
  }
  if (!parsed.success) return jsonError(422, "datos_invalidos", parsed.error.issues[0]?.message ?? "Revisa los datos.");
  const { error } = await auth.supabase
    .from("profiles")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", auth.user.id);
  if (error) return jsonError(500, "no_guardado", "No pudimos guardar los cambios.");
  return NextResponse.json({ ok: true });
}
