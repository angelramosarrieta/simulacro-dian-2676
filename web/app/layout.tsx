import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: `${BRAND.name} · Simulador personalizado DIAN 2676`, template: `%s · ${BRAND.name}` },
  description:
    "Sube tu manual de funciones y tus indicadores y recibe un simulador de la prueba escrita DIAN 2676 hecho para tu empleo: casos de juicio situacional con justificación y norma.",
  applicationName: BRAND.name,
  openGraph: {
    title: `${BRAND.name} · Tu simulador para la prueba DIAN 2676`,
    description: "Preguntas tipo examen creadas a partir de tu manual de funciones y tus ejes oficiales.",
    locale: "es_CO",
    type: "website",
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F6F3" },
    { media: "(prefers-color-scheme: dark)", color: "#0D0F12" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh font-sans text-[15px] leading-relaxed">{children}</body>
    </html>
  );
}
