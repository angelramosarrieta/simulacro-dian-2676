/**
 * Llaves que se pueden administrar desde /admin/configuracion. Las marcadas
 * como `secret` nunca se vuelven a mostrar (solo sus últimos 4 caracteres).
 */
export type ConfigField = {
  key: string;
  label: string;
  group: "ia" | "wompi" | "correo";
  secret: boolean;
  hint?: string;
  options?: string[];
  /** Lista desplegable que se llena en vivo desde el proveedor (además de "Otro"). */
  dynamicOptions?: "openai";
  pattern?: RegExp;
  placeholder?: string;
};

export const CONFIG_FIELDS: ConfigField[] = [
  { key: "AI_PROVIDER", label: "Proveedor de IA", group: "ia", secret: false, options: ["anthropic", "openai"] },
  { key: "ANTHROPIC_API_KEY", label: "API key de Anthropic (Claude)", group: "ia", secret: true, pattern: /^sk-ant-[A-Za-z0-9_\-]{20,}$/, placeholder: "sk-ant-…", hint: "console.anthropic.com → API Keys" },
  { key: "AI_MODEL", label: "Modelo de Claude", group: "ia", secret: false, options: ["claude-opus-5-5", "claude-sonnet-5-5"], hint: "Sonnet 5.5 cuesta aprox. la mitad." },
  { key: "OPENAI_API_KEY", label: "API key de OpenAI", group: "ia", secret: true, pattern: /^sk-[A-Za-z0-9_\-]{20,}$/, placeholder: "sk-…", hint: "Solo si el proveedor es OpenAI." },
  { key: "OPENAI_MODEL", label: "Modelo de OpenAI", group: "ia", secret: false, pattern: /^[A-Za-z0-9._\-]{2,64}$/, dynamicOptions: "openai", hint: "Lista de los modelos de chat de tu cuenta de OpenAI. Obligatorio si el proveedor es OpenAI." },
  { key: "OPENAI_PRICE_INPUT", label: "Precio de entrada de OpenAI (USD por millón de tokens)", group: "ia", secret: false, pattern: /^\d{1,3}(\.\d{1,4})?$/, placeholder: "0.25", hint: "Opcional. Si lo dejas vacío se usa la tabla interna (gpt-5-mini: 0,25). Consulta openai.com/api/pricing." },
  { key: "OPENAI_PRICE_OUTPUT", label: "Precio de salida de OpenAI (USD por millón de tokens)", group: "ia", secret: false, pattern: /^\d{1,3}(\.\d{1,4})?$/, placeholder: "2.00", hint: "Opcional, junto con el de entrada. Sirve para que el límite de costo por generación sea exacto." },
  { key: "OPENAI_PRICE_CACHED", label: "Precio de entrada en caché de OpenAI (USD por millón)", group: "ia", secret: false, pattern: /^\d{1,3}(\.\d{1,4})?$/, placeholder: "0.025", hint: "Opcional." },
  { key: "WOMPI_ENV", label: "Ambiente de Wompi", group: "wompi", secret: false, options: ["sandbox", "production"], hint: "sandbox = pruebas, production = cobros reales." },
  { key: "WOMPI_PUBLIC_KEY", label: "Llave pública", group: "wompi", secret: false, pattern: /^pub_(test|prod)_[A-Za-z0-9]{8,}$/, placeholder: "pub_test_…" },
  { key: "WOMPI_PRIVATE_KEY", label: "Llave privada", group: "wompi", secret: true, pattern: /^prv_(test|prod)_[A-Za-z0-9]{8,}$/, placeholder: "prv_test_…" },
  { key: "WOMPI_INTEGRITY_SECRET", label: "Secreto de integridad", group: "wompi", secret: true, pattern: /^[A-Za-z0-9_\-]{8,}$/, placeholder: "test_integrity_…" },
  { key: "WOMPI_EVENTS_SECRET", label: "Secreto de eventos", group: "wompi", secret: true, pattern: /^[A-Za-z0-9_\-]{8,}$/, placeholder: "test_events_…" },
  { key: "WOMPI_FORWARD_URL", label: "Reenviar eventos de otras apps (CENTRA)", group: "wompi", secret: false, pattern: /^https:\/\/[^\s"'<>]+$/, placeholder: "https://app.centrahoy.online/api/webhooks/wompi", hint: "La cuenta de Wompi es compartida: los eventos de pagos que no son del simulador se reenvían intactos a esta URL." },
  { key: "RESEND_API_KEY", label: "API key de Resend", group: "correo", secret: true, pattern: /^re_[A-Za-z0-9_]{10,}$/, placeholder: "re_…", hint: "resend.com → API Keys (la de CENTRA sirve)." },
  { key: "EMAIL_FROM", label: "Remitente", group: "correo", secret: false, pattern: /^[^<>]{0,60}<?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>?$/, placeholder: "Simulacro 2676 <no-reply@centrahoy.online>" },
  { key: "ADMIN_ALERT_EMAIL", label: "Correo para alertas y resumen diario", group: "correo", secret: false, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
];

export const CONFIG_KEYS = new Set(CONFIG_FIELDS.map((f) => f.key));

export function hintFor(field: ConfigField, value: string) {
  return field.secret ? `…${value.slice(-4)}` : value;
}
