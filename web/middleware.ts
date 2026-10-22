import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_PAGES, isPrivatePath } from "@/lib/routes";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname, search } = request.nextUrl;

  if (!url || !anon) {
    // Sin Supabase configurado no hay sesiones: las rutas privadas no se abren.
    if (isPrivatePath(pathname)) return NextResponse.redirect(new URL("/ingresar", request.url));
    return response;
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isPrivatePath(pathname)) {
    const to = new URL("/ingresar", request.url);
    to.searchParams.set("next", pathname + search);
    return NextResponse.redirect(to);
  }
  if (user && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/panel", request.url));
  }
  return response;
}

export const config = {
  matcher: [
    // Todo menos estáticos, imágenes, webhooks y jobs internos (se autentican solos).
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|api/webhooks|api/internal|api/cron|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
