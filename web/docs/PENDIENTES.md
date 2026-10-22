# Pendientes

## Configuración externa (requiere tus credenciales o paneles)

1. **Supabase centra-log**: URL del sitio, SMTP de Resend, plantillas en español, captcha y tu usuario admin (PUESTA-EN-MARCHA, paso 1). La base de datos ya está lista.
2. **Vercel**: crear el proyecto, cargar las variables y elegir el dominio.
3. **API key de IA** con saldo.
4. **Llaves de Wompi** y la URL de eventos.
5. **Primera generación real** para validar la calidad y el costo. El flujo está probado con una IA simulada, no contra la API real.
6. **Revisión legal** de `/terminos` y `/privacidad`. Conviene decir allí que las preguntas generadas para una OPEC se reutilizan para otros aspirantes del mismo empleo (no se guardan los documentos, solo las preguntas).
7. **Enlace de consulta de indicadores**: pega en `/admin/configuracion → Enlaces de ayuda` la URL exacta que publica el operador (sección 4.3 de la Guía de Orientación). Mientras esté vacío, la ayuda remite a la Guía.

## Hecho en esta segunda tanda

- Panel de administración `/admin`: métricas, órdenes, generaciones, usuarios, ajuste de créditos con auditoría y estado de las integraciones.
- Correos con Resend: comprobante de pago, simulador listo, generación fallida con crédito devuelto, alertas y resumen diario al administrador.
- Cron diario: concilia pagos con Wompi, reanuda generaciones detenidas, vence las atascadas (con reembolso) y borra borradores viejos y sus archivos.
- Captcha de Cloudflare Turnstile en registro, ingreso, recuperación y reenvío de correo (vía Supabase Auth).
- Vercel Analytics con eventos de conversión (registro, borrador, checkout y generación).
- Progreso del simulador sincronizado con la cuenta para estudiar en varios dispositivos.

## Hecho en la tercera tanda

- Biblioteca de empleos por OPEC (`/admin/biblioteca` para revisar, ver usos y retirar bancos).
- Ayuda “¿Dónde consigo…?” en cada documento con enlaces a SIMO, la Guía de la CNSC y la página del concurso; los enlaces se editan desde `/admin/configuracion`.

## Ideas para después

- **Ampliar un simulador** (por ejemplo +40 preguntas de un eje) como producto de menor precio. Requiere definir el precio.
- **CSP** para la app principal (el simulador ya tiene una estricta).
- **Recordatorios de estudio** por correo para quienes aceptaron `marketing_opt_in`.
- **Exportar a Excel** desde el panel de administración.
