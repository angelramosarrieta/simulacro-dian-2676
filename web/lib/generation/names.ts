/**
 * Nombres legibles. Los indicadores del operador vienen en MAYÚSCULAS y sin
 * tildes ("GESTION DOCUMENTAL…"); se pasan a forma de oración conservando las
 * siglas y recuperando las tildes más comunes. Un nombre que ya trae
 * minúsculas se deja igual.
 */
const ACRONYMS = new Set(["DIAN", "IVA", "UIAF", "ROS", "LA/FT", "LAFT", "CNSC", "DUR", "AGN", "RUT", "UVT", "CPACA", "MIPG", "NIIF", "NIT", "PQRSF", "SIMO", "MERF", "TIC", "ET"]);
const ACCENTS: Record<string, string> = {
  matematico: "matemático", matematica: "matemática", publico: "público", publica: "pública", juridico: "jurídico", juridica: "jurídica",
  tecnico: "técnico", tecnica: "técnica", economico: "económico", economica: "económica", especifico: "específico", logistica: "logística",
  estadistica: "estadística", basico: "básico", basica: "básica", auditoria: "auditoría", regimen: "régimen", codigo: "código",
  credito: "crédito", analisis: "análisis", practica: "práctica", politica: "política", tramite: "trámite", tramites: "trámites",
  administracion: "administración", informacion: "información", atencion: "atención", gestion: "gestión", metodos: "métodos", metodo: "método", etica: "ética", etico: "ético", organica: "orgánica", numero: "número", unico: "único",
};

function fixWord(w: string, first: boolean) {
  const upper = w.toUpperCase();
  if (ACRONYMS.has(upper)) return upper === "LAFT" ? "LA/FT" : upper;
  let lower = w.toLowerCase();
  if (ACCENTS[lower]) lower = ACCENTS[lower];
  // Palabras agudas terminadas en -ión (gestión, liquidación, fiscalización); el plural (-iones) no lleva tilde.
  else if (lower.length > 4 && lower.endsWith("ion")) lower = `${lower.slice(0, -3)}ión`;
  return first ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
}

export function displayName(name: string) {
  const s = name.replace(/\s+/g, " ").trim();
  if (/[a-záéíóúñ]/.test(s)) return s; // ya tiene minúsculas: se respeta
  return s
    .split(" ")
    .map((w, i) => fixWord(w, i === 0))
    .join(" ");
}

/** "Analista II 202 02" → "analista"; "Gestor I 301-01" → "gestor". */
export function roleNoun(cargo: string) {
  const words = cargo.replace(/\s+/g, " ").trim().split(" ");
  const out: string[] = [];
  for (const w of words) {
    if (/\d/.test(w) || /^[IVXL]+$/.test(w)) break;
    out.push(w.toLowerCase());
  }
  return out.join(" ") || "servidor";
}

const ACRONYM_FIX: [RegExp, string][] = [
  [/\bla\s*\/\s*ft\b|\blaft\b/gi, "LA/FT"],
  [/\b(uiaf|ros|dian|iva|cnsc|agn|rut|uvt|cpaca|mipg|niif|pqrsf|simo)\b/gi, "$&"],
];

/** Pone en mayúscula las siglas que el modelo a veces escribe en minúscula ("uiaf", "ros"). */
export function fixAcronyms(text: string) {
  let out = text.replace(ACRONYM_FIX[0][0], ACRONYM_FIX[0][1]);
  out = out.replace(ACRONYM_FIX[1][0], (m) => m.toUpperCase());
  return out;
}
