import { ChevronDown } from "lucide-react";
import { cop } from "@/lib/format";
import type { Pricing } from "@/lib/pricing";

export function Faq({ pricing }: { pricing: Pricing }) {
  const items = [
    {
      q: "¿Qué documentos necesito?",
      a: "Dos: el manual de funciones de tu empleo (la ficha del MERF, Resolución DIAN 067 de 2024) y tus indicadores. Puedes subirlos en PDF o como pantallazo (PNG o JPG), de hasta 15 MB cada uno.",
    },
    {
      q: "¿Dónde consigo mis indicadores?",
      a: "En la consulta de indicadores del operador del concurso, con tu número de inscripción. El enlace está en la sección 4.3 de la Guía de Orientación al Aspirante. Toma un pantallazo de la lista completa.",
    },
    {
      q: "¿Cuánto tarda en estar listo?",
      a: "Normalmente entre 10 y 20 minutos. Puedes cerrar la página: el proceso sigue y tu simulador aparece en tu panel cuando termina.",
    },
    {
      q: "¿Son las preguntas del examen real?",
      a: "No. Las pruebas de la CNSC son reservadas (Ley 909 de 2004, art. 31). Creamos preguntas originales con el mismo formato (juicio situacional con 3 opciones) a partir de tus funciones y de normas públicas vigentes.",
    },
    {
      q: "¿Y si la generación falla?",
      a: "Si el proceso no se completa por un problema nuestro o de tus archivos, el crédito vuelve automáticamente a tu cuenta para que lo intentes de nuevo sin pagar otra vez.",
    },
    {
      q: "¿Cuánto cuesta?",
      a: `Crear la cuenta es gratis. El primer simulador cuesta ${cop(pricing.first)} y cada generación adicional ${cop(pricing.next)}. Es un pago único, sin suscripciones ni cobros automáticos.`,
    },
    {
      q: "¿Qué medios de pago aceptan?",
      a: "Todos los de Wompi: PSE, Nequi, botón Bancolombia y tarjetas débito y crédito. El pago se procesa en la página segura de Wompi; nosotros nunca vemos los datos de tu tarjeta.",
    },
    {
      q: "¿Qué pasa con mis documentos?",
      a: "Se usan solo para crear tu simulador y se eliminan automáticamente al terminar. Tu simulador queda en tu cuenta y solo tú puedes abrirlo.",
    },
    {
      q: "¿Las respuestas pueden tener errores?",
      a: "Revisamos el formato de cada pregunta y descartamos las que no cumplen, pero el contenido lo redacta una IA y puede equivocarse, sobre todo en plazos y cifras. Compara siempre con la norma citada.",
    },
    {
      q: "¿Esto es oficial?",
      a: "No. Es una herramienta de estudio independiente, sin relación con la DIAN, la CNSC ni el operador del concurso.",
    },
  ];
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-bg/40">
      {items.map((it) => (
        <details key={it.q} className="group px-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg">
            {it.q}
            <ChevronDown className="h-4 w-4 shrink-0 text-muted transition group-open:rotate-180" aria-hidden />
          </summary>
          <p className="pb-5 pr-6 text-[14.5px] leading-relaxed text-muted">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
