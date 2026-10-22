# Límites de consumo

Se guardan en la tabla `app_settings` (llave `generation_limits`). Solo el servidor los lee: el navegador no los ve ni los puede cambiar. Si la fila falta, se usan los valores por defecto de `lib/generation/limits.ts`.

| Límite | Valor inicial | Por qué |
|---|---|---|
| `max_input_tokens` | 400.000 por generación | Análisis (≈20–40 k con los documentos) más unos 12 bloques de ≈8–15 k |
| `max_output_tokens` | 160.000 por generación | 120 preguntas × ≈450 tokens, más razonamiento y reintentos |
| `max_cost_usd` | 3,0 USD por generación | Estimado: Opus 5.5 ≈1,5–2,5 USD y Sonnet 5.5 ≈0,8–1,2 USD por generación (confirmar con la primera generación real). Deja margen sobre los $20.000 |
| `max_tokens_per_call` | 16.000 | Una respuesta por bloque, sin cortes |
| `max_attempts_per_step` | 3 | Reintentos de una etapa ante errores transitorios (429, 5xx, JSON inválido) |
| `max_steps` | 30 | Tope de llamadas al modelo por generación |
| `max_running_per_user` | 1 | Una generación activa por usuario |
| `max_generations_per_user_per_day` | 5 | Freno anti-abuso |
| `max_upload_mb` | 15 | Por archivo PDF (el bucket también lo limita a 15 MB). Las imágenes se limitan a 5 MB porque la API de Claude no acepta imágenes más pesadas |

Otros valores en `app_settings`: `price_first_cop` (29900), `price_next_cop` (20000), `questions_per_generation` (120) y `order_pending_ttl_minutes` (60).

**Qué pasa al llegar al límite**: si ya hay al menos el 60 % de las preguntas, se entrega el simulador con lo que hay. Si no, la generación falla y el crédito vuelve a la cuenta. Todo queda registrado en `usage_events` (tokens y costo por llamada) y en los totales de `generations`.

**Cambiar un valor** (SQL Editor de Supabase):

```sql
update app_settings set value = jsonb_set(value, '{max_cost_usd}', '2.0') where key = 'generation_limits';
update app_settings set value = '25000' where key = 'price_next_cop';
```
