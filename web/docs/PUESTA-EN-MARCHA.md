# Puesta en marcha

Tiempo estimado: 1 a 2 horas. Haz los pasos en orden; cada uno dice cómo verificarlo.

## 1. Supabase: proyecto `centra-log` ✅ base de datos lista

Ya están aplicadas las 3 migraciones (`supabase/migrations/`) en el proyecto **centra-log** (`nnfudjmautufeswvkytd`), que estaba vacío:
10 tablas con RLS, funciones de negocio, buckets privados `documents` y `simulators`, y la configuración de precios y límites. El asesor de seguridad de Supabase no reporta problemas.

Falta configurar en el panel de Supabase de **centra-log**:

**a) Authentication → URL Configuration**
- Site URL: `https://<tu-dominio>` (por ejemplo `https://simulacro.centrahoy.online`)
- Redirect URLs: `https://<tu-dominio>/**`

**b) Authentication → Sign In / Providers → Email**
- Confirm email: **activado**
- Minimum password length: **8**, Password requirements: **letras y números**

**c) Authentication → Emails → SMTP Settings** (los mismos datos de CENTRA, ver su proyecto):
- Enable custom SMTP: activado
- Sender email: `no-reply@centrahoy.online` · Sender name: `Simulacro 2676`
- Host: `smtp.resend.com` · Port: `465`
- Username: `resend` ← en CENTRA un error aquí causó `535 Invalid username`
- Password: tu API key de Resend (`re_…`)

**d) Authentication → Emails → Templates**: copia el asunto y el HTML de cada archivo de `supabase/templates/`:

| Plantilla | Archivo | Asunto |
|---|---|---|
| Confirm signup | `confirmation.html` | Confirma tu correo · Simulacro 2676 |
| Reset password | `recovery.html` | Restablece tu contraseña · Simulacro 2676 |
| Change email address | `email_change.html` | Confirma tu nuevo correo · Simulacro 2676 |
| Magic link | `magic_link.html` | Tu enlace para ingresar · Simulacro 2676 |

**e) Authentication → Attack Protection → Bot protection (captcha)**: activa Cloudflare Turnstile y pega la **secret key**. Puede ser el mismo widget de CENTRA si agregas el dominio nuevo en Cloudflare → Turnstile → tu widget → Hostnames.

**f) Tu cuenta de administrador** ya está configurada: `angelramosarrieta@gmail.com` está en la lista `admin_emails`. Regístrate en el sitio con ese correo y, en cuanto lo verifiques, verás "Administración" en tu panel. Desde **/admin/configuracion** cambias precios, límites, preguntas por simulador y otros administradores, sin SQL.

✅ Verificación: al registrarte llega el correo en español desde `no-reply@centrahoy.online` y, tras confirmar, entras a `/panel/bienvenida`. Con la fila de admin, en el panel aparece el enlace "Administración".

## 2. Vercel (15 min)

1. vercel.com → **Add New → Project** → importa `angelramosarrieta/simulacro-dian-2676`, rama `plataforma-saas` (o fusiónala a `main`).
2. **Root Directory: `web`**. Framework: Next.js.
3. Variables (ver `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API de centra-log), `NEXT_PUBLIC_SITE_URL`, `INTERNAL_JOB_SECRET`, `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_ALERT_EMAIL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_SUPPORT_EMAIL` y `NEXT_PUBLIC_LEGAL_NAME`.
4. **Settings → Functions**: Fluid Compute activo (la generación usa funciones de hasta 300 s).
5. **Domains**: agrega `simulacro.centrahoy.online` (o el que elijas). En el DNS de `centrahoy.online`, crea el CNAME que indique Vercel.
   > El simulador de ejemplo que estaba en la raíz del dominio ahora vive en `/ejemplo` (mismo dominio, así que quien lo usaba conserva su progreso).
6. El cron diario (`vercel.json`, 7:00 a. m. de Colombia) se activa solo al desplegar.

✅ Verificación: en `/admin`, todos los indicadores de integración salen en verde salvo IA y Wompi, que se configuran en los pasos siguientes.

## Llaves desde el panel (recomendado)

Desde **/admin/configuracion → Llaves de integración** puedes guardar las llaves de la IA, Wompi y Resend sin entrar a Vercel. Se guardan **cifradas** (AES-256-GCM con `SECRETS_ENCRYPTION_KEY`, que solo existe en Vercel), solo los administradores pueden cambiarlas, nunca se vuelven a mostrar completas y cada cambio queda en la auditoría. Cada grupo tiene **Probar conexión**: verifica la llave de IA, consulta tu comercio en Wompi o te envía un correo de prueba. Lo guardado en el panel tiene prioridad sobre las variables de Vercel y se aplica en máximo 1 minuto, sin redeploy.

> No cambies `SECRETS_ENCRYPTION_KEY` en Vercel: las llaves guardadas dejarían de poder descifrarse y habría que volver a ingresarlas.

## 3. IA (10 min)

`ANTHROPIC_API_KEY` en Vercel. Opcional: `AI_MODEL=claude-sonnet-5-5`, que cuesta la mitad. Para OpenAI: `AI_PROVIDER=openai`, `OPENAI_API_KEY` y `OPENAI_MODEL`. Redeploy.

## 4. Wompi en sandbox (20 min)

1. Wompi → modo **Pruebas** → Desarrolladores: copia la llave pública, la llave privada, el secreto de Integridad y el secreto de Eventos.
2. En Vercel: `WOMPI_ENV=sandbox`, `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET` y `WOMPI_EVENTS_SECRET`. Redeploy.
3. URL de eventos (pruebas): `https://<tu-dominio>/api/webhooks/wompi`.
4. Pruebas:
   - Tarjeta `4242 4242 4242 4242` → aprobada; `4111 1111 1111 1111` → rechazada.
   - Nequi `3991111111` → aprobado; `3992222222` → rechazado.

✅ Verificación: "¡Pago aprobado!" al volver, +1 generación en Compras, el comprobante llega por correo y la venta aparece en `/admin/ordenes`.

## 5. Primera generación real (20 min)

Genera con tu manual y tus indicadores. Debe llegarte el correo "Tu simulador está listo". Revisa la calidad de las preguntas y el costo en `/admin/generaciones`.

## 6. Producción

Llaves `pub_prod_…` y `prv_prod_…`, `WOMPI_ENV=production` y la URL de eventos de producción en Wompi. Haz una compra real pequeña y revisa los textos de `/terminos` y `/privacidad`.
