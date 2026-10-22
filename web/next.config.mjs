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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
