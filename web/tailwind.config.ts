import type { Config } from "tailwindcss";

// Los colores salen de variables CSS (app/globals.css) para que el modo
// oscuro y el claro compartan las mismas clases. Paleta alineada con el
// simulador que recibe el usuario (verde 0E6B58), para que la plataforma
// y la app de estudio se sientan como un mismo producto.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        soft: token("soft"),
        line: token("line"),
        ink: token("ink"),
        muted: token("muted"),
        faint: token("faint"),
        brand: token("brand"),
        brandInk: token("brand-ink"),
        brandSoft: token("brand-soft"),
        onBrand: token("on-brand"),
        ok: token("ok"),
        okSoft: token("ok-soft"),
        bad: token("bad"),
        badSoft: token("bad-soft"),
        warn: token("warn"),
        warnSoft: token("warn-soft"),
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: { xl: "14px", "2xl": "18px", "3xl": "24px" },
      boxShadow: {
        card: "0 1px 2px rgb(16 24 20 / 0.04), 0 1px 1px rgb(16 24 20 / 0.03)",
        pop: "0 12px 32px -12px rgb(16 24 20 / 0.18), 0 2px 6px rgb(16 24 20 / 0.06)",
      },
      maxWidth: { page: "1120px" },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: { "fade-up": "fade-up .35s ease-out both" },
    },
  },
  plugins: [],
};
export default config;
