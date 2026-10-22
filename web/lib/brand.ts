// Identidad comercial en un solo lugar: cambiar el nombre o el contacto
// aquí lo cambia en la landing, el panel, los correos y las políticas.
export const BRAND = {
  name: "Simulacro 2676",
  shortName: "S·2676",
  tagline: "Tu simulador personalizado para la prueba escrita DIAN 2676",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "soporte@centrahoy.online",
  whatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "",
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME || "Simulacro 2676",
  examDate: "2026-11-08",
  examDateText: "domingo 8 de noviembre de 2026",
  exampleUrl: "https://simulacro.centrahoy.online",
} as const;
