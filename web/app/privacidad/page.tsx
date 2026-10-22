import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Política de tratamiento de datos" };

// Borrador base conforme a la Ley 1581 de 2012. Revisar con asesoría legal (ver docs/PENDIENTES.md).
export default function Page() {
  return (
    <LegalPage title="Política de tratamiento de datos personales" updated="22 de octubre de 2026">
      <p>
        En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, {BRAND.legalName} informa cómo trata los datos personales de los usuarios
        de {BRAND.name}.
      </p>
      <h2>1. Responsable</h2>
      <p>{BRAND.legalName}. Correo de contacto: {BRAND.supportEmail}.</p>
      <h2>2. Datos que tratamos</h2>
      <ul>
        <li>Datos de cuenta: nombre, correo, celular y ciudad (opcionales los dos últimos).</li>
        <li>Datos del concurso: empleo, nivel, modalidad y OPEC.</li>
        <li>Documentos que subes (manual de funciones e indicadores), que pueden contener tu número de inscripción.</li>
        <li>Datos de compras: referencia, valor, estado y medio de pago informado por Wompi. No recibimos ni guardamos números de tarjeta.</li>
      </ul>
      <h2>3. Finalidades</h2>
      <ul>
        <li>Crear y administrar tu cuenta y generar tus simuladores.</li>
        <li>Procesar pagos, prevenir fraude y atender peticiones, quejas y reclamos.</li>
        <li>Enviar comunicaciones de estudio y novedades, solo si lo autorizas.</li>
      </ul>
      <h2>4. Documentos y proveedores</h2>
      <ul>
        <li>Tus documentos se procesan con un proveedor de inteligencia artificial para generar las preguntas y se eliminan automáticamente al terminar la generación.</li>
        <li>Las preguntas generadas para un empleo (OPEC) pueden reutilizarse para otros aspirantes del mismo empleo. No contienen tus datos personales y tus documentos no se comparten ni se conservan.</li>
        <li>Usamos proveedores de infraestructura (alojamiento, base de datos y correo) y Wompi para pagos, que pueden tratar datos fuera de Colombia con garantías adecuadas.</li>
      </ul>
      <h2>5. Tus derechos</h2>
      <p>
        Puedes conocer, actualizar, rectificar y suprimir tus datos, revocar la autorización y presentar quejas ante la Superintendencia de Industria y Comercio.
        Escríbenos a {BRAND.supportEmail}; respondemos consultas en máximo 10 días hábiles y reclamos en máximo 15 días hábiles.
      </p>
      <h2>6. Seguridad</h2>
      <p>Aplicamos controles de acceso por usuario, cifrado en tránsito y almacenamiento privado. Solo tú puedes ver tus simuladores y compras.</p>
    </LegalPage>
  );
}
