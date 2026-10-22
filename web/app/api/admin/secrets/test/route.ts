import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { jsonError, readJson, requireUser } from "@/lib/api";
import { getAdmin } from "@/lib/admin/auth";
import { cfg, loadRuntimeConfig } from "@/lib/config/runtime";
import { aiProvider } from "@/lib/env";
import { testWompi } from "@/lib/payments/wompi";
import { sendEmail } from "@/lib/email/send";

const schema = z.object({ group: z.enum(["ia", "wompi", "correo"]) });

/** Prueba las llaves sin cobrar ni generar nada (lista modelos, consulta el comercio o envía un correo de prueba). */
export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const ctx = await getAdmin();
  if (!ctx || ctx.user.id !== auth.user.id) return jsonError(404, "no_encontrado", "No encontrado.");
  let parsed;
  try {
    parsed = schema.safeParse(await readJson(request));
  } catch {
    return jsonError(400, "json_invalido", "Solicitud inválida.");
  }
  if (!parsed.success) return jsonError(422, "datos_invalidos", "Solicitud inválida.");
  await loadRuntimeConfig(true);

  if (parsed.data.group === "wompi") return NextResponse.json(await testWompi());

  if (parsed.data.group === "correo") {
    const to = cfg("ADMIN_ALERT_EMAIL") || auth.user.email || "";
    if (!cfg("RESEND_API_KEY")) return NextResponse.json({ ok: false, message: "Falta la API key de Resend." });
    const ok = await sendEmail({
      to,
      subject: "Prueba de correo · Simulacro 2676",
      text: "Si recibes este correo, Resend quedó bien configurado.",
      html: "<p>Si recibes este correo, <b>Resend</b> quedó bien configurado.</p>",
    });
    return NextResponse.json({ ok, message: ok ? `Correo de prueba enviado a ${to}.` : "Resend rechazó el envío. Revisa la API key y que el dominio del remitente esté verificado." });
  }

  try {
    if (aiProvider() === "openai") {
      const key = cfg("OPENAI_API_KEY");
      if (!key) return NextResponse.json({ ok: false, message: "Falta la API key de OpenAI." });
      const client = new OpenAI({ apiKey: key, maxRetries: 0, timeout: 15_000 });
      const model = cfg("OPENAI_MODEL");
      if (!model) return NextResponse.json({ ok: false, message: "Falta el modelo de OpenAI." });
      await client.models.retrieve(model);
      return NextResponse.json({ ok: true, message: `OpenAI respondió y el modelo ${model} está disponible.` });
    }
    const key = cfg("ANTHROPIC_API_KEY");
    if (!key) return NextResponse.json({ ok: false, message: "Falta la API key de Anthropic." });
    const model = cfg("AI_MODEL") || "claude-opus-5-5";
    const client = new Anthropic({ apiKey: key, maxRetries: 0, timeout: 15_000 });
    await client.models.retrieve(model);
    return NextResponse.json({ ok: true, message: `Anthropic respondió y el modelo ${model} está disponible.` });
  } catch (e) {
    const status = (e as { status?: number }).status;
    const message = status === 401 ? "La API key no es válida." : status === 404 ? "El modelo no existe o la cuenta no tiene acceso a él." : `El proveedor respondió con un error${status ? ` (${status})` : ""}.`;
    return NextResponse.json({ ok: false, message });
  }
}
