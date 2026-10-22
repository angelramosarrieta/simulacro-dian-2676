# Integraciones

## Wompi (pagos)

**Flujo**
1. `POST /api/checkout` (con sesión): la BD decide producto y precio (`quote_for_user`: $29.900 si nunca tuvo una compra aprobada, $20.000 si ya tuvo), crea o reutiliza la orden pendiente (`create_or_reuse_order`, serializada por usuario) y devuelve la URL de **Web Checkout** con la firma de integridad calculada en el servidor.
2. El usuario paga en `checkout.wompi.co` y vuelve a `/panel/pagos/resultado?id=<transacción>`.
3. La página de resultado **y** el webhook `POST /api/webhooks/wompi` consultan la transacción en la API de Wompi (nunca confían en la URL ni en el payload) y llaman a `apply_payment_result`, que:
   - valida que monto y moneda coincidan con la orden (si no, queda en `error` y no acredita);
   - acredita una sola vez (índice único `credit_ledger(order_id) where reason='purchase'`);
   - nunca revierte una orden aprobada por un evento tardío.

**Variables**: `WOMPI_ENV`, `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`.
**Código**: `lib/payments/wompi-core.ts` (puro y probado), `lib/payments/wompi.ts` (red), `app/api/checkout`, `app/api/webhooks/wompi`, `app/panel/pagos/resultado`.

**Pendiente de verificar con credenciales reales**: el flujo completo en sandbox (paso 4 de PUESTA-EN-MARCHA). La firma, el webhook y la lógica de acreditación están cubiertos por pruebas automáticas con una API de Wompi simulada.

## IA (generación)

**Proveedor**: `AI_PROVIDER=anthropic` (por defecto) u `openai`. Interfaz común en `lib/ai/types.ts`, con una implementación por proveedor en `lib/ai/anthropic.ts` y `lib/ai/openai.ts`. Salida JSON con esquema estricto (structured outputs) y validación adicional con zod.

- Anthropic: modelo por defecto `claude-opus-5-5` (`AI_MODEL` para cambiarlo, por ejemplo `claude-sonnet-5-5`), `AI_EFFORT=medium`, *prompt caching* del marco normativo y *fallback* del lado del servidor si el modelo declina.
- OpenAI: requiere `OPENAI_MODEL`. Si el modelo no está en la tabla de precios de `lib/ai/pricing.ts`, define `AI_PRICE_INPUT_PER_MTOK` y `AI_PRICE_OUTPUT_PER_MTOK`; si no, el control de costo usa precios altos a propósito y corta antes.

**Flujo** (`lib/generation/worker.ts`):
1. `start_generation` consume 1 crédito de forma atómica: sin crédito, con otra generación en curso o pasado el límite diario, no arranca.
2. **Análisis**: se envían el PDF o la imagen del manual y de los indicadores. Devuelve las funciones, los ejes y su peso. Si los documentos no sirven, falla con un mensaje claro y **devuelve el crédito**.
3. **Plan**: reparte las N preguntas entre los ejes (`lib/generation/plan.ts`). Los ejes que ya cubre el banco común reciben menos.
4. **Bloques** de 10 preguntas por eje: cada pregunta se valida (3 opciones distintas, justificaciones, norma) y se descartan los duplicados.
5. **Armado**: inyecta CONFIG y las preguntas en la plantilla (`lib/simulator/assemble.ts`), lo guarda en el bucket privado `simulators` y **borra los documentos**.

Cada etapa es una invocación corta con *lease* en la BD. Si una función se corta, el panel la reanuda al consultar el estado y el endpoint interno `/api/internal/generations/:id/run` (protegido con `INTERNAL_JOB_SECRET`) encadena las etapas.

**Sin credencial**: la UI muestra "El generador se está configurando", el botón Generar queda deshabilitado y `/api/generations/:id/start` responde 503 **sin consumir créditos**. No hay respuestas simuladas en la app.

## Supabase

- Migración: `supabase/migrations/20261022000001_esquema_inicial.sql`.
- Plantillas de correo en español: `supabase/templates/*.html` (se suben con `supabase config push`).
- Reglas de auth en `supabase/config.toml`: confirmación de correo obligatoria y contraseña de mínimo 8 caracteres con letras y números.
