import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { BRAND } from "@/lib/brand";
import { cop } from "@/lib/format";
import { getPublicPricing } from "@/lib/pricing";

export const metadata: Metadata = { title: "Términos y condiciones" };
export const revalidate = 3600;

export default async function Page() {
  const pricing = await getPublicPricing();
  const operador = `${BRAND.legalName}${BRAND.legalId ? ` (identificación ${BRAND.legalId})` : ""}`;
  return (
    <LegalPage title="Términos y condiciones" updated="22 de octubre de 2026">
      <p>
        Estos términos regulan el acceso y uso de {BRAND.name} (en adelante, el &quot;Servicio&quot;), operado por {operador}. Al crear una cuenta o comprar
        en el Servicio declaras que los leíste y los aceptas. Si no estás de acuerdo, no uses el Servicio.
      </p>

      <h2>1. Qué es el Servicio</h2>
      <ul>
        <li>Una herramienta de estudio en línea que genera simuladores personalizados para la prueba escrita del Proceso de Selección DIAN 2676, a partir del manual de funciones y los indicadores que sube cada usuario, o del banco ya construido para su empleo (OPEC).</li>
        <li>Es un servicio <b>independiente</b>: no tiene relación, convenio ni aval de la Dirección de Impuestos y Aduanas Nacionales (DIAN), de la Comisión Nacional del Servicio Civil (CNSC) ni del operador del concurso.</li>
        <li>Las preguntas son <b>originales</b>, redactadas con apoyo de inteligencia artificial a partir de normas públicas. No son ni reproducen las preguntas del examen, que son reservadas (Ley 909 de 2004, art. 31).</li>
        <li>El Servicio <b>no garantiza</b> un puntaje, la aprobación de la prueba ni un resultado en el concurso.</li>
      </ul>

      <h2>2. Contenido generado con inteligencia artificial</h2>
      <ul>
        <li>El contenido puede contener errores u omisiones, en especial en plazos, cifras, porcentajes y artículos citados. Es material de práctica y debe contrastarse con la norma vigente y con la información oficial publicada en SIMO y por la CNSC.</li>
        <li>Si encuentras un error puedes reportarlo a {BRAND.supportEmail}. Corregirlo no da derecho a una nueva generación, salvo lo previsto en el numeral 7.</li>
      </ul>

      <h2>3. Cuenta</h2>
      <ul>
        <li>Para usar el Servicio debes ser mayor de edad y crear una cuenta con información veraz.</li>
        <li>La cuenta es personal e intransferible. Eres responsable de mantener la confidencialidad de tu contraseña y de la actividad hecha con tu cuenta.</li>
        <li>Solo puedes subir documentos propios o que tengas autorización para usar.</li>
      </ul>

      <h2>4. Precios y pagos</h2>
      <ul>
        <li>Crear una cuenta es gratis. El primer simulador cuesta <b>{cop(pricing.first)}</b> y cada generación adicional <b>{cop(pricing.next)}</b>, en pesos colombianos. Se cobra el precio publicado al momento del pago.</li>
        <li>Los pagos se procesan por medio de Wompi, pasarela autorizada en Colombia. El Servicio no recibe ni almacena números de tarjeta.</li>
        <li>Cada compra aprobada suma una generación a tu cuenta. Los pagos pendientes, rechazados o anulados no habilitan generaciones.</li>
        <li>No hay suscripciones ni cobros automáticos o recurrentes.</li>
      </ul>

      <h2>5. Entrega del simulador</h2>
      <ul>
        <li>El simulador es un contenido digital que se entrega dentro de tu cuenta. Una generación con documentos tarda normalmente entre 10 y 30 minutos; te avisamos por correo cuando está listo.</li>
        <li>Si tu empleo (OPEC) ya tiene un banco en la biblioteca del Servicio, puedes recibirlo de inmediato o generar uno nuevo con tus documentos.</li>
        <li>El simulador estará disponible en tu cuenta al menos hasta la fecha de la prueba escrita y en todo caso mientras el Servicio esté en operación.</li>
      </ul>

      <h2>6. Derecho de retracto</h2>
      <ul>
        <li>De acuerdo con el artículo 47 de la Ley 1480 de 2011 (Estatuto del Consumidor), puedes retractarte de una compra dentro de los <b>5 días hábiles</b> siguientes al pago, siempre que no hayas iniciado la generación con esa compra.</li>
        <li>El derecho de retracto no aplica una vez iniciada la generación, porque se trata de un servicio cuya prestación comienza con tu acuerdo y de un contenido digital que se entrega de inmediato.</li>
        <li>Para ejercerlo escribe a {BRAND.supportEmail} con la referencia de tu compra. El dinero se devuelve por el mismo medio de pago dentro de los 30 días calendario siguientes.</li>
      </ul>

      <h2>7. Fallas y devoluciones</h2>
      <ul>
        <li>Si una generación no se completa por una falla del Servicio o porque los documentos no se pudieron procesar, la generación se devuelve automáticamente a tu cuenta para que la uses de nuevo.</li>
        <li>Si el simulador presenta un defecto grave que impide usarlo, escríbenos y lo revisaremos para corregirlo, regenerarlo o devolver el pago, según corresponda.</li>
        <li>La reversión del pago procede en los casos y con el procedimiento del artículo 51 de la Ley 1480 de 2011 y del Decreto 587 de 2016.</li>
      </ul>

      <h2>8. Uso permitido</h2>
      <p>No está permitido:</p>
      <ul>
        <li>Revender, publicar, compartir o distribuir los simuladores o sus preguntas, total o parcialmente.</li>
        <li>Acceder a cuentas ajenas, intentar eludir pagos o límites de uso, o automatizar el uso del Servicio.</li>
        <li>Subir archivos con contenido malicioso, ilegal o que no corresponda a lo solicitado.</li>
        <li>Afectar la seguridad, disponibilidad o funcionamiento del Servicio.</li>
      </ul>
      <p>El incumplimiento permite suspender o cerrar la cuenta, sin perjuicio de las acciones legales que correspondan.</p>

      <h2>9. Propiedad intelectual</h2>
      <p>
        El software, el diseño, la marca, la plantilla del simulador y el banco común de preguntas pertenecen a {BRAND.legalName}. Con cada compra recibes una
        licencia personal, no exclusiva e intransferible para usar tu simulador con fines de estudio. Las preguntas generadas para un empleo pueden ofrecerse a
        otros aspirantes del mismo empleo, sin incluir tus documentos ni tus datos.
      </p>

      <h2>10. Responsabilidad</h2>
      <ul>
        <li>El Servicio se presta con diligencia, pero puede tener interrupciones por mantenimiento o por fallas de proveedores externos (alojamiento, inteligencia artificial, pagos o correo).</li>
        <li>En lo permitido por la ley, la responsabilidad por el Servicio se limita al valor pagado por la compra relacionada con el reclamo. No se responde por decisiones tomadas con base en el contenido de práctica ni por el resultado obtenido en el concurso.</li>
      </ul>

      <h2>11. Datos personales</h2>
      <p>
        El tratamiento de tus datos se rige por la <Link href="/privacidad" className="link">Política de tratamiento de datos personales</Link>.
      </p>

      <h2>12. Cambios en los términos</h2>
      <p>
        Estos términos pueden actualizarse. La versión vigente siempre estará publicada en esta página con su fecha de actualización. Los cambios no afectan
        las compras ya realizadas.
      </p>

      <h2>13. Peticiones, quejas y reclamos</h2>
      <p>
        Puedes presentar peticiones, quejas y reclamos a {BRAND.supportEmail}. Respondemos dentro de los 15 días hábiles siguientes. Si no quedas conforme,
        puedes acudir a la Superintendencia de Industria y Comercio.
      </p>

      <h2>14. Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de la República de Colombia.</p>

      <h2>15. Contacto</h2>
      <p>
        {BRAND.supportEmail}
        {BRAND.legalAddress ? ` · ${BRAND.legalAddress}` : ""}
      </p>
    </LegalPage>
  );
}
