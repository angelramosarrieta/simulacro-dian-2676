"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";

export function RefreshButton({ label = "Actualizar estado" }: { label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn-primary" onClick={() => start(() => router.refresh())} disabled={pending}>
      <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} aria-hidden /> {label}
    </button>
  );
}
