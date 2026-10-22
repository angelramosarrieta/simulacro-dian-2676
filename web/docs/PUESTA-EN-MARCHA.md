# Puesta en marcha (checklist para mañana)

Tiempo estimado: 1 a 2 horas. Haz los pasos en orden; cada uno dice cómo verificarlo.

## 1. Supabase de producción (15 min)

La organización de Supabase está en el plan **Free**, que permite **2 proyectos activos** y hoy ya tiene 2 (los de CENTRA). Elige una opción:

- **A.** Pausar un proyecto que no uses (por ejemplo, uno de pruebas) y crear `simulacro-2676`, gratis.
- **B.** Pasar la organización a Pro (≈ US$25 al mes, incluye más proyectos y backups).
- No reutilices la base de CENTRA: las tablas y los datos de los clientes deben quedar separados.

Luego, desde `web/`:

```bash
npx supabase login
npx supabase link --project-ref <ref-del-proyecto-nuevo>
npx supabase db push          # crea tablas, funciones, políticas y buckets
npx supabase config push      # plantillas de correo en español y reglas de contraseña
```

En el panel de Supabase, **Authentication → URL Configuration**:
- Site URL: `https://<tu-dominio>`
- Redirect URLs: `https://<tu-dominio>/**`

En **Authentication → Emails → SMTP**: configura un remitente propio (Resend, Brevo o el de tu dominio). El correo integrado de Supabase solo envía unos pocos mensajes por hora y no sirve para vender.

✅ Verificación: en **Table Editor** debes ver `profiles`, `orders`, `credit_ledger`, `generations`, `usage_events`, `payment_events` y `app_settings`, y en **Storage** los buckets `documents` y `simulators`, ambos privados.

## 2. Vercel (15 min)

1. Entra a vercel.com → **Add New → Project** → importa `angelramosarrieta/simulacro-dian-2676`.
2. **Root Directory: `web`**. Framework: Next.js.
3. Carga las variables de [.env.example](../.env.example): Supabase, `INTERNAL_JOB_SECRET` (genérala con `openssl rand -hex 32`), `NEXT_PUBLIC_SITE_URL` y los datos de contacto.
4. Verifica que **Fluid Compute** esté activo (Settings → Functions). La generación usa funciones de hasta 300 s.
5. Despliega. Agrega tu dominio en **Settings → Domains** y actualiza `NEXT_PUBLIC_SITE_URL`.

> La rama con todo esto es `plataforma-saas`. Fusiónala a `main` cuando quieras publicar. El simulador de ejemplo (`index.html` en la raíz) no se toca.

✅ Verificación: abre el dominio, crea una cuenta, confirma el correo y llega a `/panel/bienvenida`.

## 3. IA (10 min)

1. En console.anthropic.com crea una API key y carga saldo. Con US$20 alcanza para unas 10 a 15 generaciones con Opus 5.5, o unas 25 con Sonnet 5.5.
2. En Vercel agrega `ANTHROPIC_API_KEY`. Opcional: `AI_MODEL=claude-sonnet-5-5` para reducir el costo a la mitad.
   - Si prefieres OpenAI: `AI_PROVIDER=openai`, `OPENAI_API_KEY` y `OPENAI_MODEL`.
3. Redeploy.

✅ Verificación: el aviso amarillo "Estamos terminando la configuración" ya no dice "El generador se está conectando".

## 4. Wompi en sandbox (20 min)

1. Dashboard de Wompi → modo **Pruebas** → **Desarrolladores**: copia la llave pública, la llave privada, el secreto de **Integridad** y el secreto de **Eventos**.
2. En Vercel: `WOMPI_ENV=sandbox`, `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET` y `WOMPI_EVENTS_SECRET`. Redeploy.
3. En Wompi → **URL de eventos** (pruebas): `https://<tu-dominio>/api/webhooks/wompi`.
4. Haz una compra de prueba:
   - Tarjeta `4242 4242 4242 4242` (fecha futura y cualquier CVC) → **aprobada**.
   - Tarjeta `4111 1111 1111 1111` → **rechazada**.
   - Nequi `3991111111` → aprobada; `3992222222` → rechazada.

✅ Verificación: después de pagar vuelves a `/panel/pagos/resultado` con "¡Pago aprobado!". En **Compras y créditos** aparece la compra y +1 generación. En Supabase, `payment_events` tiene el evento con `processed_at` lleno. Un pago rechazado no suma créditos.

## 5. Prueba completa de generación (20 min)

Con un crédito de prueba, sube un manual real y tus indicadores y genera. Revisa:
- que el progreso avance en `/panel/simuladores/<id>`;
- que el simulador abra en el celular y tenga preguntas de tus ejes;
- el costo real en `usage_events` (columna `cost_usd`) y en `generations.cost_usd`.

Si el costo por generación es más alto de lo esperado, ajusta `AI_MODEL` o los límites (ver [LIMITES.md](LIMITES.md)).

## 6. Pasar a producción (10 min)

1. En Wompi → modo **Producción**: copia las llaves de producción y la URL de eventos de producción.
2. En Vercel: `WOMPI_ENV=production` y las llaves `pub_prod_…` y `prv_prod_…`, más los secretos de producción. Redeploy.
3. Haz una compra real de bajo riesgo, por ejemplo con tu propia tarjeta, y confirma que se acredita.
4. Completa los textos legales: `NEXT_PUBLIC_LEGAL_NAME` y una revisión de `/terminos` y `/privacidad`.

> Seguridad: con `WOMPI_ENV=production` el checkout se bloquea solo si falta la llave de IA, para no cobrar algo que no se puede entregar.
