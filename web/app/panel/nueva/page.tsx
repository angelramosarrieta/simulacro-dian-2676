import Link from "next/link";
import type { Metadata } from "next";
import { Wizard } from "@/components/panel/Wizard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { ACTIVE_STATUSES } from "@/components/ui/StatusBadge";
import { getBalance, getProfile, getQuote, requireSession } from "@/lib/data/account";
import { integrationStatus } from "@/lib/env";
import { getHelpLinks } from "@/lib/pricing";
import { findBank } from "@/lib/generation/bank";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Nuevo simulador" };

export default async function Page() {
  const { supabase } = await requireSession();
  const [profile, balance, quote] = await Promise.all([getProfile(), getBalance(), getQuote()]);
  const { data: rows } = await supabase
    .from("generations")
    .select("id, status, cargo, nivel, opec, modalidad, manual_path, manual_mime, indicadores_path, indicadores_mime")
    .in("status", ["draft", ...ACTIVE_STATUSES])
    .order("created_at", { ascending: false })
    .limit(5);
  const active = rows?.find((r) => ACTIVE_STATUSES.includes(r.status));
  const draft = rows?.find((r) => r.status === "draft");
  const status = await integrationStatus();
  const [helpLinks, bank] = await Promise.all([getHelpLinks(), draft && status.supabase ? findBank(createAdminClient(), draft.opec) : Promise.resolve(null)]);

  return (
    <>
      <PageHeader eyebrow="Nuevo simulador" title="Crea tu simulador" description="Tres pasos: los datos de tu empleo, tus dos documentos y la generación." />
      {active ? (
        <Alert tone="info" title="Ya tienes un simulador en proceso" action={<Link href={`/panel/simuladores/${active.id}`} className="btn-primary btn-sm">Ver progreso</Link>}>
          Cuando termine podrás crear otro.
        </Alert>
      ) : (
        <Wizard
          defaults={{ cargo: profile.default_cargo, nivel: profile.default_nivel, modalidad: profile.default_modalidad }}
          draft={
            draft
              ? {
                  id: draft.id,
                  cargo: draft.cargo,
                  nivel: draft.nivel,
                  opec: draft.opec,
                  modalidad: draft.modalidad,
                  manual: draft.manual_path ? { mime: draft.manual_mime } : null,
                  indicadores: draft.indicadores_path ? { mime: draft.indicadores_mime } : null,
                }
              : null
          }
          balance={balance}
          price={quote.amount}
          hasPaid={quote.hasPaid}
          aiReady={status.ai}
          paymentsReady={status.wompi}
          bank={bank}
          helpLinks={helpLinks}
        />
      )}
    </>
  );
}
