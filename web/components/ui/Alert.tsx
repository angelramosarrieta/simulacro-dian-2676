import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

const STYLES = {
  info: { box: "bg-brandSoft/70 border-brand/20 text-ink", icon: Info, iconColor: "text-brandInk" },
  success: { box: "bg-okSoft border-ok/25 text-ink", icon: CheckCircle2, iconColor: "text-ok" },
  warning: { box: "bg-warnSoft border-warn/25 text-ink", icon: AlertTriangle, iconColor: "text-warn" },
  error: { box: "bg-badSoft border-bad/25 text-ink", icon: XCircle, iconColor: "text-bad" },
} as const;

export function Alert({ tone = "info", title, children, action }: { tone?: keyof typeof STYLES; title?: string; children?: ReactNode; action?: ReactNode }) {
  const s = STYLES[tone];
  const Icon = s.icon;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-3 rounded-xl border px-4 py-3 text-[14px] ${s.box}`}>
      <Icon className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${s.iconColor}`} aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? "mt-0.5 text-muted" : ""}>{children}</div>}
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  );
}
