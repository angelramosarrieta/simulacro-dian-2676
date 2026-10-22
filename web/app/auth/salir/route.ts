import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new NextResponse("No permitido", { status: 403 });
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/ingresar?aviso=sesion-cerrada", request.url), { status: 303 });
}
