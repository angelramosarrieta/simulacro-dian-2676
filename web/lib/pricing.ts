import "server-only";
import { createClient } from "@supabase/supabase-js";

export const DEFAULT_PRICING = { first: 29_900, next: 20_000, questions: 120 };
export type Pricing = typeof DEFAULT_PRICING;

/** Precios públicos (tabla app_settings, llaves marcadas is_public). */
export async function getPublicPricing(): Promise<Pricing> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return DEFAULT_PRICING;
  try {
    const sb = createClient(url, anon, { auth: { persistSession: false } });
    const { data } = await sb.from("app_settings").select("key, value").in("key", ["price_first_cop", "price_next_cop", "questions_per_generation"]);
    const map = Object.fromEntries((data ?? []).map((r) => [r.key, Number(r.value)]));
    return {
      first: map.price_first_cop > 0 ? map.price_first_cop : DEFAULT_PRICING.first,
      next: map.price_next_cop > 0 ? map.price_next_cop : DEFAULT_PRICING.next,
      questions: map.questions_per_generation > 0 ? map.questions_per_generation : DEFAULT_PRICING.questions,
    };
  } catch {
    return DEFAULT_PRICING;
  }
}

export type HelpLinks = { simo?: string; guia?: string; dian?: string; indicadores?: string };

/** Enlaces para conseguir los documentos (app_settings.help_links, editables desde el admin). */
export async function getHelpLinks(): Promise<HelpLinks> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return {};
  try {
    const sb = createClient(url, anon, { auth: { persistSession: false } });
    const { data } = await sb.from("app_settings").select("value").eq("key", "help_links").maybeSingle();
    const v = (data?.value ?? {}) as Record<string, unknown>;
    const clean = (x: unknown) => (typeof x === "string" && /^https:\/\/[^\s"'<>]+$/.test(x) ? x : undefined);
    return { simo: clean(v.simo), guia: clean(v.guia), dian: clean(v.dian), indicadores: clean(v.indicadores) };
  } catch {
    return {};
  }
}
