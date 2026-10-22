# Arquitectura

## Recorrido del usuario

```
Landing (/) → /registro → correo de confirmación → /panel/bienvenida (perfil)
  → /panel/nueva: 1) datos del empleo  2) manual + indicadores  3) pagar (Wompi) o generar con un crédito
  → /panel/simuladores/:id (progreso en vivo) → /s/:id (simulador, solo el dueño)
```

Registrarse no cobra nada. La compra se hace cuando el usuario ya subió sus documentos, en el paso 3; al volver de Wompi continúa donde quedó.

## Rutas

| Ruta | Qué hace |
|---|---|
| `/`, `/terminos`, `/privacidad` | Públicas |
| `/registro`, `/ingresar`, `/recuperar`, `/restablecer`, `/verifica-tu-correo`, `/auth/*` | Autenticación (Supabase Auth, PKCE) |
| `/panel/*` | Privadas: resumen, nuevo, simuladores, compras, consumo, cuenta, comprar, resultado del pago |
| `/s/:id` | Sirve el HTML del simulador solo al dueño (`?descargar=1` lo descarga) |
| `POST /api/checkout` | Crea o reutiliza una orden y devuelve la URL de Wompi |
| `POST /api/webhooks/wompi` | Eventos de Wompi (firma + re-consulta) |
| `POST /api/generations` | Crea el borrador (valida los datos del empleo) |
| `POST /api/generations/:id/upload-url` | URL firmada para subir al bucket privado (la ruta la decide el servidor) |
| `POST /api/generations/:id/start` | Verifica los archivos (tipo real), consume el crédito e inicia |
| `GET /api/generations/:id` | Estado para el panel; reanuda la generación si está detenida |
| `POST /api/internal/generations/:id/run` | Continuación del worker (`INTERNAL_JOB_SECRET`) |
| `PATCH /api/profile` | Edita el perfil propio |

## Modelo de datos

- `profiles`: datos del usuario. El usuario solo puede editar algunas columnas (privilegios por columna).
- `orders`: compras. Producto, monto en centavos, estado, referencia única y transacción única de Wompi.
- `credit_ledger`: movimientos de créditos (+1 por compra, −1 por generación, +1 por reembolso). Índices únicos impiden que un movimiento se repita.
- `generations`: estado, análisis, plan, preguntas, consumo acumulado y *lease* del worker.
- `usage_events`: cada llamada a la IA con tokens, costo y resultado.
- `payment_events`: eventos de webhook (idempotencia y auditoría). Sin acceso para usuarios.
- `app_settings`: precios (públicos) y límites (privados).

## Seguridad (resumen de la revisión)

- **RLS** en todas las tablas: cada usuario solo **lee** sus filas. Las escrituras de compras, créditos, generaciones y consumo solo las hace el servidor con funciones `SECURITY DEFINER` que el navegador no puede ejecutar (probado en `tests/db.test.ts`).
- **Pagos**: el monto lo fija la BD, la firma de integridad se calcula en el servidor, el webhook valida el checksum y el estado siempre se re-consulta a Wompi. También se valida el monto y la moneda, y la aprobación es idempotente y no reversible.
- **Créditos**: el consumo es atómico y serializado por usuario (`pg_advisory_xact_lock`). Las solicitudes simultáneas gastan un solo crédito (probado).
- **Archivos**: buckets privados sin políticas para el navegador. Las subidas usan URL firmada con una ruta decidida por el servidor y el tipo real se verifica por su firma binaria. Los documentos se borran al terminar.
- **Simulador**: servido solo al dueño, con CSP estricta (`connect-src 'none'`), `noindex` y todos los textos de la IA escapados (JSON seguro para `<script>` y `esc()` en la plantilla).
- **CSRF**: los métodos que cambian estado exigen el mismo origen. Las cookies de sesión son SameSite=Lax.
- **Redirecciones**: `safeNext` solo acepta rutas internas.
- **Secretos**: solo en variables de entorno del servidor; `.env*` está en `.gitignore`. El navegador solo recibe la llave anon de Supabase y la llave pública de Wompi.
- **Inyección de instrucciones**: los documentos se tratan como datos (instrucción de sistema), la salida se fuerza a un esquema JSON y se valida; nada de lo que genera la IA se ejecuta.
