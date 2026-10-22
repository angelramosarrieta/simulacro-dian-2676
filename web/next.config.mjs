/** @type {import('next').NextConfig} */
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
  // /ejemplo: demostración pública generada desde el index.html de la raíz
  // (Analista II) con su propio espacio de guardado y sin PIN.
  // /mi-simulador: el index.html original (antes en la raíz del dominio), para
  // que quien ya lo usaba conserve su PIN y su progreso en el navegador.
  // Ambos se generan con `npm run sync:plantilla`.
  async rewrites() {
    return [
      { source: "/ejemplo", destination: "/ejemplo/index.html" },
      { source: "/mi-simulador", destination: "/mi-simulador/index.html" },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/mi-simulador/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/mi-simulador", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
