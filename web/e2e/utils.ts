import { readFileSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(path.join(__dirname, "../.env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

export const adminDb = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const MAILPIT = process.env.MAILPIT_URL || "http://127.0.0.1:54324";

/** Busca en Mailpit (correo local de Supabase) el último enlace enviado a `to`. */
export async function lastEmailLink(to: string, timeoutMs = 20_000): Promise<string> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const data = (await res.json()) as { messages?: { ID: string }[] };
    if (data.messages?.length) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${data.messages[0].ID}`)).json()) as { HTML: string; Text: string };
      const link = (msg.HTML + msg.Text).match(/https?:\/\/[^\s"'<>]+verify[^\s"'<>]*/)?.[0];
      if (link) return link.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  throw new Error(`No llegó correo a ${to}`);
}

export const uniqueEmail = (tag: string) => `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@e2e.local`;
