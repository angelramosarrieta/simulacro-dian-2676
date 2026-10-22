import type { ReactNode } from "react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-[14px] text-muted">Última actualización: {updated}</p>
        <div className="mt-10 space-y-6 text-[15px] leading-relaxed [&_h2]:mt-10 [&_h2]:text-[18px] [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-ink/90 [&_ul]:space-y-1.5">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
