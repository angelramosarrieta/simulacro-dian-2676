/** @type {import('next').NextConfig} */
// Rutas de CENTRA (antes en centrahoy.online, ahora en app.centrahoy.online).
// Si alguien llega con un enlace o un acceso directo viejo, se le lleva a CENTRA.
const CENTRA_URL = "https://app.centrahoy.online";
const CENTRA_PATHS = [
  "login", "dashboard", "onboarding", "bloqueado", "compartir", "fitness", "offline", "prestamos", "suscripcion",
  "automatizaciones", "calendario", "capturas", "compartido", "configuracion", "cuentas", "deudas", "distribucion",
  "entretenimiento", "finanzas", "gastos-fijos", "ingresos", "metas", "patrimonio", "proyeccion", "tareas", "viajes",
  "auth/recuperar", "auth/nueva-contrasena",
];
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // La plantilla del simulador se lee del disco en el servidor: hay que
  // incluirla explícitamente en el bundle de las funciones de Vercel.
  outputFileTracingIncludes: {
    "/api/**/*": ["./lib/simulator/plantilla.html"],
  },
  // /mi-simulador: el index.html original (antes en la raíz del dominio), para
  // que quien ya lo usaba conserve su PIN y su progreso en el navegador. Se
  // genera con `npm run sync:plantilla`. (/ejemplo es una página de la app.)
  async redirects() {
    return CENTRA_PATHS.flatMap((p) => [
      { source: `/${p}`, destination: `${CENTRA_URL}/${p}`, permanent: false },
      { source: `/${p}/:path*`, destination: `${CENTRA_URL}/${p}/:path*`, permanent: false },
    ]);
  },
  async rewrites() {
    return [
      { source: "/mi-simulador", destination: "/mi-simulador/index.html" },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
      { source: "/mi-simulador/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/mi-simulador", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
