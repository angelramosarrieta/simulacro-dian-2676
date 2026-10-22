"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CreditCard, FilePlus2, LayoutGrid, Library, UserRound } from "lucide-react";

export const NAV = [
  { href: "/panel", label: "Resumen", short: "Inicio", icon: LayoutGrid, exact: true },
  { href: "/panel/nueva", label: "Nuevo simulador", short: "Nuevo", icon: FilePlus2 },
  { href: "/panel/simuladores", label: "Mis simuladores", short: "Simuladores", icon: Library },
  { href: "/panel/compras", label: "Compras y créditos", short: "Compras", icon: CreditCard },
  { href: "/panel/consumo", label: "Consumo", short: "Consumo", icon: Activity },
  { href: "/panel/cuenta", label: "Mi cuenta", short: "Cuenta", icon: UserRound },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Panel" className="space-y-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] transition ${active ? "bg-brandSoft font-medium text-brandInk" : "text-muted hover:bg-soft hover:text-ink"}`}
          >
            <item.icon className="h-[18px] w-[18px]" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

const MOBILE = [NAV[0], NAV[1], NAV[2], NAV[3], NAV[5]];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Panel" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {MOBILE.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${active ? "text-brandInk" : "text-muted"}`}>
                <item.icon className="h-5 w-5" aria-hidden />
                <span className="leading-none">{item.short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
