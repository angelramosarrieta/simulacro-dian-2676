import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { BRAND } from "@/lib/brand";
import { cop } from "@/lib/format";
import { getPublicPricing } from "@/lib/pricing";

export const metadata: Metadata = { title: "Términos y condiciones" };
export const revalidate = 3600;

// Borrador base. Revisar con asesoría legal antes de operar a escala (ver docs/PENDIENTES.md).
export default async function Page() {
  const pricing = await getPublicPricing();
  return (
    <LegalPage title="Términos y condiciones" updated="22 de octubre de 2026">
      <p>
        Estos términos regulan el uso de {BRAND.name} (el &quot;Servicio&quot;), una herramienta de estudio que genera simuladores personalizados para la
        prueba escrita del Proceso de Selección DIAN 2676. Al crear una cuenta aceptas estos términos.
      </p>
      <h2>1. Naturaleza del Servicio</h2>
      <ul>
        <li>Es una herramienta independiente, sin relación con la DIAN, la CNSC ni el operador del concurso.</li>
        <li>Las preguntas son originales, redactadas con inteligencia artificial a partir de tus documentos y de normas públicas. No son las preguntas del examen, que son reservadas (Ley 909 de 2004, art. 31).</li>
        <li>El contenido puede contener errores, en especial en plazos, cifras y artículos. Debes contrastarlo con la norma vigente. El Servicio no garantiza resultados en el concurso.</li>
      </ul>
      <h2>2. Cuenta</h2>
      <ul>
        <li>Debes dar información veraz y mantener la confidencialidad de tu contraseña.</li>
        <li>La cuenta es personal. No puedes revender ni redistribuir los simuladores generados.</li>
      </ul>
      <h2>3. Precios y pagos</h2>
      <ul>
        <li>Crear una cuenta es gratis. El primer simulador cuesta {cop(pricing.first)} y cada generación adicional {cop(pricing.next)}, en pesos colombianos.</li>
        <li>Los pagos se procesan a través de Wompi. Una compra aprobada suma una generación a tu cuenta; los pagos pendientes, rechazados o anulados no habilitan generaciones.</li>
        <li>No hay suscripciones ni cobros automáticos.</li>
      </ul>
      <h2>4. Generaciones, fallas y reembolsos</h2>
      <ul>
        <li>Cada generación iniciada usa una de tus generaciones disponibles.</li>
        <li>Si la generación no se completa por una falla del Servicio o porque los documentos no se pudieron procesar, la generación se devuelve automáticamente a tu cuenta.</li>
        <li>Puedes pedir el reembolso de una compra cuya generación no hayas usado escribiendo a {BRAND.supportEmail} dentro de los 5 días hábiles siguientes al pago. Una generación completada no es reembolsable, salvo lo que disponga la ley.</li>
      </ul>
      <h2>5. Uso aceptable</h2>
      <p>No puedes usar el Servicio para subir documentos de terceros sin autorización, intentar acceder a cuentas ajenas, eludir los límites de uso o afectar su funcionamiento.</p>
      <h2>6. Propiedad intelectual</h2>
      <p>El software, el diseño y el banco común son de {BRAND.legalName}. Recibes una licencia personal y no exclusiva para usar los simuladores que generes.</p>
      <h2>7. Contacto</h2>
      <p>Para dudas, peticiones, quejas o reclamos escríbenos a {BRAND.supportEmail}.</p>
    </LegalPage>
  );
}
