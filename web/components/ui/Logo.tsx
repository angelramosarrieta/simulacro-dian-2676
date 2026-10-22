import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-grid place-items-center rounded-[10px] bg-brand font-mono font-semibold text-onBrand tracking-tight"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      26
    </span>
  );
}

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
      <LogoMark />
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight">
          Simulacro <span className="text-brandInk">2676</span>
          <span className="sr-only"> — {BRAND.tagline}</span>
        </span>
      )}
    </Link>
  );
}
