/** Traduce errores de Supabase Auth a mensajes claros en español. */
export function authErrorMessage(message?: string | null, code?: string | null): string {
  const m = `${code ?? ""} ${message ?? ""}`.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed") || m.includes("email_not_confirmed")) return "Primero confirma tu correo. Revisa tu bandeja de entrada (y la de spam).";
  if (m.includes("already registered") || m.includes("user_already_exists")) return "Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.";
  if (m.includes("weak_password") || m.includes("password should")) return "La contraseña debe tener al menos 8 caracteres, con letras y números.";
  if (m.includes("rate limit") || m.includes("over_email_send_rate_limit") || m.includes("too many")) return "Hiciste demasiados intentos. Espera un momento e intenta de nuevo.";
  if (m.includes("same_password") || m.includes("different from the old")) return "La nueva contraseña debe ser distinta a la anterior.";
  if (m.includes("otp_expired") || m.includes("expired")) return "El enlace venció o ya se usó. Pide uno nuevo.";
  if (m.includes("invalid email") || m.includes("email_address_invalid")) return "Escribe un correo válido.";
  if (m.includes("fetch") || m.includes("network")) return "No hay conexión. Revisa tu internet e intenta de nuevo.";
  return "No pudimos completar la solicitud. Intenta de nuevo.";
}

export function passwordProblem(p: string): string | null {
  if (p.length < 8) return "Usa al menos 8 caracteres.";
  if (!/[a-zA-Z]/.test(p) || !/\d/.test(p)) return "Combina letras y números.";
  if (p.length > 72) return "Usa máximo 72 caracteres.";
  return null;
}
