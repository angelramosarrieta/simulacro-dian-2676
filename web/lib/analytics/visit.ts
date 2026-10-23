/**
 * Lectura de una visita (sin datos personales): tipo de dispositivo, navegador,
 * de dónde llegó y si es un robot. Funciones puras, probadas en tests/visits.test.ts.
 */
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|vercel|lighthouse|headless|curl|wget|python|axios|node-fetch|go-http|monitor|uptime/i;

export function isBot(ua: string) {
  return !ua || BOT.test(ua);
}

export function deviceOf(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android/i.test(ua)) return "mobile";
  return "desktop";
}

export function browserOf(ua: string) {
  if (/edg\//i.test(ua)) return "Edge";
  if (/samsungbrowser/i.test(ua)) return "Samsung";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/fbav|fban|instagram/i.test(ua)) return "Facebook/Instagram";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return "Otro";
}

/** Dominio de origen legible; vacío si viene del mismo sitio. */
export function referrerHost(referrer: string | undefined, ownHost: string) {
  if (!referrer) return null;
  try {
    const h = new URL(referrer).hostname.replace(/^www\./, "").replace(/^(l|lm|m)\.facebook\.com$/, "facebook.com");
    if (!h || h === ownHost.replace(/^www\./, "") || h.endsWith(".centrahoy.online") || h === "centrahoy.online") return null;
    if (/(^|\.)google\./.test(h)) return "google";
    return h.slice(0, 100);
  } catch {
    return null;
  }
}

/** Las rutas privadas no se registran con detalle (identificadores en la URL). */
export function cleanPath(path: string) {
  const p = path.split("?")[0].slice(0, 200) || "/";
  return p.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id");
}

export function decodeHeader(v: string | null) {
  if (!v) return null;
  try {
    return decodeURIComponent(v).slice(0, 80);
  } catch {
    return v.slice(0, 80);
  }
}
