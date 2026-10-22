// Rutas privadas: requieren sesión. El middleware redirige a /ingresar y
// cada página/endpoint vuelve a verificar al usuario en el servidor.
export const PRIVATE_PREFIXES = ["/panel", "/s/"];
export const AUTH_PAGES = ["/ingresar", "/registro"];

export function isPrivatePath(pathname: string) {
  return PRIVATE_PREFIXES.some((p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p.endsWith("/") ? p : `${p}/`));
}

/** Evita redirecciones abiertas: solo rutas internas. */
export function safeNext(next: string | null | undefined, fallback = "/panel") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
