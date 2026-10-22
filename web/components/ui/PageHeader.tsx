import type { ReactNode } from "react";

export function PageHeader({ title, description, action, eyebrow }: { title: string; description?: ReactNode; action?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
