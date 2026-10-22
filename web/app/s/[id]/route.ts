import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UUID_RE } from "@/lib/security";

/**
 * Entrega el archivo del simulador (?descargar=1) SOLO a su dueño, para
 * abrirlo sin conexión. Sin ese parámetro redirige al simulador del panel.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const download = new URL(request.url).searchParams.get("descargar") === "1";
  // El simulador ahora vive dentro del panel; /s/:id solo entrega el archivo para usar sin conexión.
  if (!download && UUID_RE.test(id)) return NextResponse.redirect(new URL(`/panel/simuladores/${id}`, request.url));
  const { user, supabase } = await getUser();
  if (!user) return NextResponse.redirect(new URL(`/ingresar?next=/s/${id}`, request.url));
  if (!UUID_RE.test(id)) return new NextResponse("No encontrado", { status: 404 });

  const { data: gen } = await supabase.from("generations").select("id, status, simulator_html_path, cargo").eq("id", id).maybeSingle();
  if (!gen || gen.status !== "completed" || !gen.simulator_html_path) return new NextResponse("No encontrado", { status: 404 });
  // Defensa adicional: la ruta del archivo siempre empieza por el id del dueño.
  if (!gen.simulator_html_path.startsWith(`${user.id}/`)) return new NextResponse("No encontrado", { status: 404 });

  const { data: file, error } = await createAdminClient().storage.from("simulators").download(gen.simulator_html_path);
  if (error || !file) return new NextResponse("No disponible", { status: 503 });

  // El archivo descargado es autónomo: su progreso queda solo en ese dispositivo.
  const html = await file.text();
  const filename = `simulacro-${gen.cargo.normalize("NFD").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().slice(0, 50)}.html`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy":
        "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
