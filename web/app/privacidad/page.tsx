import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Política de tratamiento de datos" };

export default function Page() {
  return (
    <LegalPage title="Política de tratamiento de datos personales" updated="22 de octubre de 2026">
      <p>
        Esta política explica cómo {BRAND.legalName} trata los datos personales de quienes usan {BRAND.name}, en cumplimiento de la Ley 1581 de 2012, el
        Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y demás normas aplicables.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li>Responsable: {BRAND.legalName}{BRAND.legalId ? `, identificación ${BRAND.legalId}` : ""}.</li>
        {BRAND.legalAddress && <li>Domicilio: {BRAND.legalAddress}.</li>}
        <li>Correo para ejercer tus derechos: {BRAND.supportEmail}.</li>
      </ul>

      <h2>2. Datos que tratamos</h2>
      <ul>
        <li><b>Cuenta:</b> nombre, correo electrónico y, si los das, celular y ciudad.</li>
        <li><b>Concurso:</b> denominación del empleo, nivel, modalidad y número de OPEC.</li>
        <li><b>Documentos:</b> el manual de funciones y los indicadores que subes, que pueden incluir tu número de inscripción.</li>
        <li><b>Estudio:</b> respuestas, aciertos e historial de simulacros, para mostrarte tu progreso.</li>
        <li><b>Compras:</b> referencia, valor, estado y medio de pago informado por Wompi. No recibimos ni guardamos números de tarjeta ni claves bancarias.</li>
        <li><b>Uso técnico:</b> datos necesarios para la seguridad y el funcionamiento (por ejemplo, registros de acceso y errores).</li>
        <li><b>Visitas al sitio:</b> páginas vistas, sitio o campaña desde donde llegaste, tipo de dispositivo y navegador, y ciudad aproximada. Se asocian a un identificador aleatorio guardado en tu navegador, no a tu nombre; si inicias sesión, se relacionan con tu cuenta. No guardamos tu dirección IP. Puedes evitarlo activando &quot;No rastrear&quot; en tu navegador o borrando los datos del sitio.</li>
      </ul>
      <p>No tratamos datos sensibles ni datos de menores de edad.</p>

      <h2>3. Finalidades</h2>
      <ul>
        <li>Crear y administrar tu cuenta.</li>
        <li>Analizar tus documentos y generar tu simulador.</li>
        <li>Procesar pagos, emitir comprobantes, prevenir fraudes y cumplir obligaciones contables y legales.</li>
        <li>Enviarte mensajes del servicio (verificación de correo, comprobantes, aviso de simulador listo, recuperación de contraseña).</li>
        <li>Atender peticiones, quejas y reclamos, y mejorar el Servicio, incluido medir cuántas personas lo visitan y de dónde llegan.</li>
        <li>Enviarte recordatorios de estudio y novedades del concurso, <b>solo si lo autorizas</b>. Puedes retirar esa autorización en cualquier momento desde tu cuenta.</li>
      </ul>

      <h2>4. Autorización</h2>
      <p>
        Al crear tu cuenta autorizas de forma previa, expresa e informada el tratamiento de tus datos para las finalidades descritas. Guardamos la fecha de esa
        autorización como prueba.
      </p>

      <h2>5. Tus documentos</h2>
      <ul>
        <li>Se guardan en almacenamiento privado al que solo tú y el sistema de generación tienen acceso.</li>
        <li>Se eliminan automáticamente cuando termina la generación. Si dejas una solicitud sin completar, se eliminan en las 24 horas siguientes.</li>
        <li>Las preguntas generadas para un empleo (OPEC) pueden reutilizarse para otros aspirantes del mismo empleo. Esas preguntas no contienen tus datos personales, y tus documentos no se comparten.</li>
      </ul>

      <h2>6. Encargados y transferencias</h2>
      <p>
        Para prestar el Servicio usamos proveedores que tratan datos por nuestra cuenta, con obligaciones de confidencialidad y seguridad: alojamiento web y base
        de datos (Vercel y Supabase), inteligencia artificial para generar las preguntas (OpenAI o Anthropic), envío de correos (Resend) y pagos (Wompi). Algunos
        de ellos tratan la información en servidores fuera de Colombia, en países con niveles adecuados de protección o bajo garantías contractuales, lo que
        autorizas al aceptar esta política. Los proveedores de inteligencia artificial reciben tus documentos solo para generar el simulador.
      </p>

      <h2>7. Tus derechos</h2>
      <p>Como titular puedes:</p>
      <ul>
        <li>Conocer, actualizar y rectificar tus datos.</li>
        <li>Pedir prueba de la autorización que diste.</li>
        <li>Saber qué uso se ha dado a tus datos.</li>
        <li>Revocar la autorización o pedir que suprimamos tus datos, salvo cuando debamos conservarlos por una obligación legal o contractual.</li>
        <li>Presentar quejas ante la Superintendencia de Industria y Comercio, después de haber agotado el trámite con nosotros.</li>
        <li>Acceder gratis a tus datos.</li>
      </ul>

      <h2>8. Cómo ejercerlos</h2>
      <ul>
        <li>Escribe a {BRAND.supportEmail} desde el correo de tu cuenta, indicando tu nombre, lo que solicitas y, si es un reclamo, los hechos y documentos que lo soportan.</li>
        <li><b>Consultas:</b> respondemos en máximo 10 días hábiles, prorrogables 5 días hábiles más avisándote el motivo.</li>
        <li><b>Reclamos</b> (corrección, actualización, supresión o revocatoria): respondemos en máximo 15 días hábiles, prorrogables 8 días hábiles más avisándote el motivo.</li>
      </ul>

      <h2>9. Conservación</h2>
      <ul>
        <li>Los datos de tu cuenta, tus simuladores y tu progreso se conservan mientras tengas la cuenta activa. Si pides eliminarla, se suprimen, salvo los registros que la ley obliga a conservar.</li>
        <li>Los registros de compras se conservan durante el tiempo que exigen las normas contables y comerciales (hasta 10 años).</li>
        <li>Las estadísticas de visitas se borran automáticamente a los 6 meses.</li>
      </ul>

      <h2>10. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y administrativas razonables: control de acceso por usuario, cifrado de la información en tránsito, almacenamiento privado,
        cifrado de las llaves de integración y eliminación automática de documentos. Solo tú puedes ver tus simuladores, documentos y compras.
      </p>

      <h2>11. Cookies</h2>
      <p>
        Usamos cookies técnicas necesarias para mantener tu sesión iniciada y proteger la cuenta, y el almacenamiento local del navegador para el
        identificador anónimo de visitas descrito arriba. No usamos cookies publicitarias ni vendemos información a terceros.
      </p>

      <h2>12. Vigencia y cambios</h2>
      <p>
        Esta política rige desde su publicación. Los cambios sustanciales se informarán en esta página y, cuando corresponda, por correo antes de aplicarse. Las
        bases de datos se mantendrán vigentes mientras se cumplan las finalidades descritas.
      </p>
    </LegalPage>
  );
}
