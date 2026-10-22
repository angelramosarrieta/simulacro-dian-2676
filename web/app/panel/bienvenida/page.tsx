import type { Metadata } from "next";
import { ProfileForm } from "@/components/panel/ProfileForm";
import { getProfile } from "@/lib/data/account";
import { firstName } from "@/lib/data/account";

export const metadata: Metadata = { title: "Bienvenida" };

export default async function Page() {
  const profile = await getProfile();
  return (
    <div className="mx-auto max-w-2xl">
      <p className="eyebrow">Paso 1 de 2 · Configura tu perfil</p>
      <h1 className="mt-1 text-[28px] font-semibold tracking-tight">¡Bienvenido, {firstName(profile)}!</h1>
      <p className="mt-2 text-[15px] text-muted">
        Tu cuenta está lista y es gratis. Confirma tus datos y los de tu empleo; después subes tus documentos y, cuando quieras, pagas tu simulador.
      </p>
      <section className="card mt-8 p-5 sm:p-7">
        <ProfileForm
          onboarding
          initial={{
            full_name: profile.full_name,
            phone: profile.phone,
            city: profile.city,
            default_cargo: profile.default_cargo,
            default_nivel: profile.default_nivel,
            default_modalidad: profile.default_modalidad,
            marketing_opt_in: profile.marketing_opt_in,
          }}
        />
      </section>
    </div>
  );
}
