# Pendientes

## Bloqueantes para vender (requieren tus credenciales o decisiones)

1. **Proyecto de Supabase de producción**: la organización Free ya tiene 2 proyectos activos (ver PUESTA-EN-MARCHA, paso 1).
2. **SMTP propio** en Supabase para los correos de confirmación y recuperación.
3. **API key de IA** con saldo (Anthropic u OpenAI).
4. **Llaves de Wompi** (sandbox y luego producción) y la URL de eventos.
5. **Primera generación real** para validar la calidad de las preguntas y el costo. El flujo está probado con un proveedor simulado en las pruebas automáticas, pero **no** contra la API real porque no había llave.
6. **Revisión legal** de `/terminos` y `/privacidad`: nombre o razón social del responsable (`NEXT_PUBLIC_LEGAL_NAME`), correo de soporte y política de reembolsos.

## Recomendado antes de escalar

- **Captcha** (Cloudflare Turnstile) en el registro y la recuperación, contra cuentas falsas.
- **Panel de administración** para ver órdenes y generaciones, reintentar y hacer ajustes de créditos. Hoy se hace por SQL; el libro admite el motivo `admin_adjustment`.
- **Alertas**: notificar por correo al usuario cuando su simulador está listo y avisar al administrador si falla una generación o un webhook (`payment_events.error`).
- **Conciliación de órdenes pendientes**: `findTransactionsByReference` ya existe en `lib/payments/wompi.ts`; falta un cron diario que la use para órdenes `pending` de más de 1 hora.
- **Analítica de conversión** (Vercel Analytics o similar) en la landing y el asistente.
- **CSP** para la app principal (hoy solo el simulador tiene CSP estricta; la app tiene los demás encabezados de seguridad).
- **Sincronizar el progreso** del simulador con la cuenta (hoy se guarda en el dispositivo, igual que la plantilla original).
- **Regenerar o ampliar** un simulador existente (por ejemplo, +40 preguntas de un eje) como producto de menor precio.
