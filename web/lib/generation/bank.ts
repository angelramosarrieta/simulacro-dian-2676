import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BankInfo = { cargo: string; nivel: string; modalidad: string; questions: number; ejes: string[] };

/** Banco reutilizable de la biblioteca para una OPEC (solo si el admin no lo retiró). */
export async function findBank(admin: SupabaseClient, opec: string): Promise<BankInfo | null> {
  const { data } = await admin.from("job_banks").select("cargo, nivel, modalidad, question_count, ejes").eq("opec", opec).eq("enabled", true).maybeSingle();
  if (!data) return null;
  return { cargo: data.cargo, nivel: data.nivel, modalidad: data.modalidad, questions: data.question_count, ejes: Array.isArray(data.ejes) ? (data.ejes as string[]) : [] };
}
