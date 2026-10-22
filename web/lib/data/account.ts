import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getUser } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  city: string;
  default_cargo: string;
  default_nivel: string;
  default_modalidad: string;
  marketing_opt_in: boolean;
  onboarding_completed: boolean;
  created_at: string;
};

export type OrderRow = {
  id: string;
  product: "first_generation" | "additional_generation";
  amount_in_cents: number;
  status: string;
  reference: string;
  payment_method_type: string | null;
  created_at: string;
  paid_at: string | null;
};

export type GenerationRow = {
  id: string;
  status: string;
  cargo: string;
  nivel: string;
  opec: string;
  modalidad: string;
  progress: number;
  current_step: string | null;
  error_message: string | null;
  target_questions: number;
  created_at: string;
  finished_at: string | null;
  credit_refunded: boolean;
  input_tokens: number;
  output_tokens: number;
};

/** Sesión obligatoria para páginas del panel (cacheada por solicitud). */
export const requireSession = cache(async () => {
  const { user, supabase } = await getUser();
  if (!user) redirect("/ingresar");
  return { user, supabase };
});

export const getProfile = cache(async () => {
  const { user, supabase } = await requireSession();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  return data ?? ({ id: user.id, email: user.email ?? "", full_name: "", phone: "", city: "", default_cargo: "", default_nivel: "", default_modalidad: "", marketing_opt_in: false, onboarding_completed: false, created_at: user.created_at } as Profile);
});

export const getBalance = cache(async () => {
  const { supabase } = await requireSession();
  const { data } = await supabase.rpc("my_credit_balance");
  return Number(data ?? 0);
});

export async function getOrders(limit = 50) {
  const { supabase } = await requireSession();
  const { data } = await supabase.from("orders").select("id, product, amount_in_cents, status, reference, payment_method_type, created_at, paid_at").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as OrderRow[];
}

export async function getGenerations(limit = 50) {
  const { supabase } = await requireSession();
  const { data } = await supabase
    .from("generations")
    .select("id, status, cargo, nivel, opec, modalidad, progress, current_step, error_message, target_questions, created_at, finished_at, credit_refunded, input_tokens, output_tokens")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as GenerationRow[];
}

export const PRODUCT_LABEL: Record<string, string> = {
  first_generation: "Primer simulador",
  additional_generation: "Generación adicional",
};

export function firstName(p: Profile) {
  return (p.full_name || p.email.split("@")[0]).split(" ")[0];
}

/** Precio que le corresponde al usuario hoy (misma regla que quote_for_user en la BD). */
export async function getQuote() {
  const { getPublicPricing } = await import("@/lib/pricing");
  const [pricing, orders] = await Promise.all([getPublicPricing(), getOrders(100)]);
  const hasPaid = orders.some((o) => o.status === "approved");
  return { hasPaid, product: hasPaid ? "additional_generation" : "first_generation", amount: hasPaid ? pricing.next : pricing.first, pricing } as const;
}
