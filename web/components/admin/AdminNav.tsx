"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Métricas", exact: true },
  { href: "/admin/ordenes", label: "Órdenes" },
  { href: "/admin/generaciones", label: "Generaciones" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/configuracion", label: "Configuración" },
  { href: "/admin/auditoria", label: "Auditoría" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administración" className="-mx-1 flex gap-1 overflow-x-auto">
      {ITEMS.map((it) => {
        const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} className={`whitespace-nowrap rounded-lg px-3 py-2 text-[14px] ${active ? "bg-brandSoft font-medium text-brandInk" : "text-muted hover:bg-soft hover:text-ink"}`}>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
