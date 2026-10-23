"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Registra cada página vista para /admin/visitas. Usa un identificador
 * aleatorio del navegador (no una cookie ni datos personales) y otro por
 * sesión; respeta "No rastrear" del navegador.
 */
function id(store: Storage | null, key: string) {
  try {
    let v = store?.getItem(key);
    if (!v) {
      v = crypto.randomUUID();
      store?.setItem(key, v);
    }
    return v;
  } catch {
    return crypto.randomUUID();
  }
}

export function PageTracker() {
  const pathname = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    if (navigator.doNotTrack === "1" || pathname.startsWith("/admin")) return;
    const utm = (k: string) => params.get(`utm_${k}`) ?? undefined;
    const body = JSON.stringify({
      vid: id(typeof localStorage !== "undefined" ? localStorage : null, "s2676:vid"),
      sid: id(typeof sessionStorage !== "undefined" ? sessionStorage : null, "s2676:sid"),
      path: pathname,
      ref: document.referrer || undefined,
      utm_source: utm("source"),
      utm_medium: utm("medium"),
      utm_campaign: utm("campaign"),
    });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }))) return;
    } catch {}
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }, [pathname, params]);
  return null;
}
