// Temas del banco común que ya trae la plantilla (campo t). Si un eje del
// usuario equivale a uno de estos, se usa el nombre EXACTO para que esas
// preguntas cuenten en su eje.
export const COMMON_TOPICS = [
  "Constitución y Estado",
  "Peticiones y CPACA",
  "CPACA: notificaciones y recursos",
  "PQRSF y servicio al ciudadano",
  "Disciplinario y ética",
  "Estructura organizacional de la DIAN",
  "Misionalidad de la DIAN",
  "Gestión pública y DIAN",
  "Buen gobierno y herramientas",
  "Evasión, elusión y contrabando",
  "Razonamiento matemático",
] as const;

export const NIVELES = ["Asistencial", "Técnico", "Profesional"] as const;
export const MODALIDADES = ["Ingreso", "Ascenso"] as const;

export const ACCEPTED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;
export type AcceptedMime = (typeof ACCEPTED_MIME)[number];

/** Preguntas por llamada al modelo: equilibra calidad, tiempo y costo de reintento. */
export const BATCH_SIZE = 10;
