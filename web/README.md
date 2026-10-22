# Simulacro 2676 · plataforma web

Plataforma comercial para vender simuladores personalizados de la prueba escrita DIAN 2676:
landing → registro → perfil → documentos → pago con Wompi → generación con IA → simulador en el celular.

| Pieza | Tecnología |
|---|---|
| App | Next.js 15 (App Router) + Tailwind, desplegable en Vercel |
| Datos, cuentas y archivos | Supabase (Auth, Postgres con RLS, Storage privado) |
| Pagos | Wompi Web Checkout + webhook de eventos |
| Generación | Claude (Anthropic) u OpenAI, por etapas, con límites de tokens y costo |
| Simulador | `lib/simulator/plantilla.html` (copia de `../plantilla.html`) con el empleo y las preguntas inyectadas |

## Desarrollo local

```bash
cd web
npm install
npx supabase start          # Supabase local con Docker (BD, auth, storage y correo en http://127.0.0.1:54324)
npx supabase db reset       # aplica supabase/migrations
cp .env.example .env.local  # y pega las llaves locales que imprime `supabase start`
npm run dev                 # http://localhost:3000
```

## Pruebas

```bash
npm run typecheck
npm run lint
npm test                    # unitarias + BD + worker + webhook + checkout (requiere Supabase local)
npm run test:e2e            # navegador: registro, correo, perfil, asistente, seguridad, móvil (requiere npm run dev)
```

## Documentación

- [docs/PUESTA-EN-MARCHA.md](docs/PUESTA-EN-MARCHA.md): pasos exactos para salir a producción.
- [docs/INTEGRACIONES.md](docs/INTEGRACIONES.md): Wompi, IA y Supabase en detalle.
- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md): flujos, modelo de datos y seguridad.
- [docs/LIMITES.md](docs/LIMITES.md): límites de consumo y cómo cambiarlos.
- [docs/PENDIENTES.md](docs/PENDIENTES.md): lo que falta y mejoras sugeridas.
