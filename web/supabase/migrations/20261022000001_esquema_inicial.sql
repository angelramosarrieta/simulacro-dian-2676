-- =====================================================================
-- Simulacro 2676 · esquema inicial
--
-- Principios:
-- * Cada tabla de usuario tiene RLS: un usuario solo LEE sus filas.
-- * Las escrituras sensibles (compras, créditos, generaciones, consumo)
--   solo las hace el servidor con la service role, a través de funciones
--   SECURITY DEFINER que validan el estado. El navegador nunca puede
--   cambiar un estado de compra, sumarse créditos ni tocar sus límites.
-- * Los créditos son un libro contable (credit_ledger): el saldo es la
--   suma de movimientos y cada movimiento tiene una llave única que evita
--   duplicarlo (una compra acredita una sola vez, una generación consume
--   una sola vez, un reembolso ocurre una sola vez).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Configuración editable desde el backend (precios, límites, modelos)
-- ---------------------------------------------------------------------
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  description text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
-- Solo las llaves marcadas como públicas (precios) se pueden leer desde el navegador.
create policy app_settings_public_read on public.app_settings
  for select using (is_public);

insert into public.app_settings (key, value, is_public, description) values
  ('price_first_cop', '29900', true, 'Precio en COP de la primera compra (activación inicial con una generación).'),
  ('price_next_cop', '20000', true, 'Precio en COP de cada generación adicional.'),
  ('questions_per_generation', '120', true, 'Preguntas nuevas del empleo por generación (además del banco común).'),
  ('generation_limits', jsonb_build_object(
      'max_input_tokens', 400000,
      'max_output_tokens', 160000,
      'max_cost_usd', 3.0,
      'max_tokens_per_call', 16000,
      'max_attempts_per_step', 3,
      'max_steps', 30,
      'max_running_per_user', 1,
      'max_generations_per_user_per_day', 5,
      'max_upload_mb', 15
    ), false, 'Límites duros de consumo por generación. Solo el servidor los lee.'),
  ('order_pending_ttl_minutes', '60', false, 'Minutos durante los que se reutiliza una orden pendiente antes de crear otra.');

-- ---------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  city text not null default '',
  -- Datos del concurso que se precargan en el asistente de generación
  default_cargo text not null default '',
  default_nivel text not null default '',
  default_modalidad text not null default '',
  marketing_opt_in boolean not null default false,
  onboarding_completed boolean not null default false,
  accepted_terms_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles for select using (id = auth.uid());
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- El usuario solo puede editar estas columnas (no email, ni fechas de aceptación ni id).
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone, city, default_cargo, default_nivel, default_modalidad, marketing_opt_in, onboarding_completed, updated_at)
  on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, accepted_terms_at)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data->>'full_name', ''), 120),
    case when (new.raw_user_meta_data->>'accepted_terms') = 'true' then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = coalesce(new.email, ''), updated_at = now() where id = new.id;
  end if;
  return new;
end $$;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------
-- Generaciones
-- ---------------------------------------------------------------------
create type public.generation_status as enum (
  'draft',        -- creada, el usuario está subiendo documentos
  'queued',       -- crédito consumido, esperando al worker
  'analyzing',    -- fase 1: análisis del manual y los indicadores
  'generating',   -- fase 2: preguntas por bloques
  'assembling',   -- armando el simulador final
  'completed',
  'failed',
  'cancelled'
);

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.generation_status not null default 'draft',
  -- Datos del empleo (validados en el servidor)
  cargo text not null,
  nivel text not null,
  opec text not null,
  modalidad text not null,
  target_questions int not null,
  -- Archivos en el bucket privado "documents" (ruta: <user_id>/<generation_id>/...)
  manual_path text,
  manual_mime text,
  indicadores_path text,
  indicadores_mime text,
  -- Resultado de cada fase
  analysis jsonb,
  plan jsonb,                 -- [{eje, cantidad, generadas}]
  questions jsonb not null default '[]'::jsonb,
  progress int not null default 0 check (progress between 0 and 100),
  current_step text,
  error_code text,
  error_message text,
  -- Consumo acumulado (lo escribe el worker)
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cost_usd numeric(12,6) not null default 0,
  ai_provider text,
  ai_model text,
  steps_run int not null default 0,
  step_attempts int not null default 0,  -- reintentos de la etapa actual
  -- Control de concurrencia del worker: solo quien tenga el lease avanza.
  lease_until timestamptz,
  lease_token uuid,
  credit_consumed boolean not null default false,
  credit_refunded boolean not null default false,
  simulator_html_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index generations_user_idx on public.generations (user_id, created_at desc);
create index generations_active_idx on public.generations (status) where status in ('queued','analyzing','generating','assembling');
alter table public.generations enable row level security;
create policy generations_select_own on public.generations for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Compras (órdenes de pago con Wompi)
-- ---------------------------------------------------------------------
create type public.order_status as enum ('pending', 'approved', 'declined', 'voided', 'error', 'expired');
create type public.order_product as enum ('first_generation', 'additional_generation');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product public.order_product not null,
  credits int not null default 1 check (credits > 0),
  amount_in_cents bigint not null check (amount_in_cents > 0),
  currency text not null default 'COP',
  status public.order_status not null default 'pending',
  reference text not null unique,
  provider text not null default 'wompi',
  provider_transaction_id text unique,
  provider_status text,
  payment_method_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);
create index orders_user_idx on public.orders (user_id, created_at desc);
alter table public.orders enable row level security;
create policy orders_select_own on public.orders for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Libro de créditos
-- ---------------------------------------------------------------------
create type public.credit_reason as enum ('purchase', 'generation', 'refund', 'admin_adjustment');

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null check (delta <> 0),
  reason public.credit_reason not null,
  order_id uuid references public.orders(id),
  generation_id uuid references public.generations(id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);
-- Una compra acredita una sola vez; una generación consume y reembolsa una sola vez.
create unique index credit_ledger_purchase_once on public.credit_ledger (order_id) where reason = 'purchase';
create unique index credit_ledger_generation_once on public.credit_ledger (generation_id) where reason = 'generation';
create unique index credit_ledger_refund_once on public.credit_ledger (generation_id) where reason = 'refund';
alter table public.credit_ledger enable row level security;
create policy credit_ledger_select_own on public.credit_ledger for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Consumo de IA por operación
-- ---------------------------------------------------------------------
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_id uuid references public.generations(id) on delete cascade,
  step text not null,
  provider text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cost_usd numeric(12,6) not null default 0,
  ok boolean not null default true,
  error text,
  duration_ms int,
  created_at timestamptz not null default now()
);
create index usage_events_user_idx on public.usage_events (user_id, created_at desc);
create index usage_events_generation_idx on public.usage_events (generation_id);
alter table public.usage_events enable row level security;
create policy usage_events_select_own on public.usage_events for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Eventos de webhook (idempotencia y auditoría). Sin acceso de usuarios.
-- ---------------------------------------------------------------------
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  provider text not null default 'wompi',
  transaction_id text,
  reference text,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
alter table public.payment_events enable row level security;

-- ---------------------------------------------------------------------
-- Privilegios: el navegador (anon/authenticated) solo lee lo suyo.
-- ---------------------------------------------------------------------
revoke insert, update, delete on public.generations, public.orders, public.credit_ledger,
  public.usage_events, public.payment_events, public.app_settings from anon, authenticated;
revoke all on public.payment_events from anon, authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

-- ---------------------------------------------------------------------
-- Vista de saldo
-- ---------------------------------------------------------------------
create or replace function public.credit_balance(p_user_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from public.credit_ledger where user_id = p_user_id;
$$;
revoke execute on function public.credit_balance(uuid) from public, anon, authenticated;

-- El usuario consulta su propio saldo (nunca el de otro).
create or replace function public.my_credit_balance()
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from public.credit_ledger where user_id = auth.uid();
$$;
revoke execute on function public.my_credit_balance() from public, anon;
grant execute on function public.my_credit_balance() to authenticated;

-- ---------------------------------------------------------------------
-- Funciones de negocio (solo service role)
-- ---------------------------------------------------------------------

-- Precio que le corresponde al usuario AHORA: primera compra si nunca tuvo
-- una orden aprobada, adicional en caso contrario.
create or replace function public.quote_for_user(p_user_id uuid)
returns table (product public.order_product, amount_cop int)
language plpgsql stable security definer set search_path = public as $$
declare
  v_has_paid boolean;
begin
  select exists (select 1 from public.orders o where o.user_id = p_user_id and o.status = 'approved') into v_has_paid;
  if v_has_paid then
    return query select 'additional_generation'::public.order_product,
      (select (value #>> '{}')::int from public.app_settings where key = 'price_next_cop');
  else
    return query select 'first_generation'::public.order_product,
      (select (value #>> '{}')::int from public.app_settings where key = 'price_first_cop');
  end if;
end $$;

-- Crea (o reutiliza) la orden pendiente del usuario. Serializado por usuario
-- con un advisory lock para que dos clics simultáneos no creen dos órdenes.
create or replace function public.create_or_reuse_order(p_user_id uuid, p_reference text)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_quote record;
  v_ttl int;
  v_order public.orders;
begin
  perform pg_advisory_xact_lock(hashtextextended('order:' || p_user_id::text, 0));

  select * into v_quote from public.quote_for_user(p_user_id);
  if v_quote.amount_cop is null or v_quote.amount_cop <= 0 then
    raise exception 'precio_no_configurado';
  end if;
  select coalesce((value #>> '{}')::int, 60) into v_ttl from public.app_settings where key = 'order_pending_ttl_minutes';

  -- Las pendientes viejas se marcan como vencidas. Si después Wompi las
  -- aprueba (el usuario sí pagó), el webhook igual las acredita.
  update public.orders set status = 'expired', updated_at = now()
   where user_id = p_user_id and status = 'pending'
     and created_at < now() - make_interval(mins => v_ttl);

  select * into v_order from public.orders
   where user_id = p_user_id and status = 'pending'
     and product = v_quote.product and amount_in_cents = v_quote.amount_cop::bigint * 100
   order by created_at desc limit 1;
  if found then
    return v_order;
  end if;

  -- Si había una pendiente con otro precio (cambió la configuración), se vence.
  update public.orders set status = 'expired', updated_at = now()
   where user_id = p_user_id and status = 'pending';

  insert into public.orders (user_id, product, credits, amount_in_cents, reference)
  values (p_user_id, v_quote.product, 1, v_quote.amount_cop::bigint * 100, p_reference)
  returning * into v_order;
  return v_order;
end $$;

-- Aplica el resultado VERIFICADO de una transacción (el servidor ya la
-- consultó en la API de Wompi). Idempotente: aprobar dos veces acredita una.
-- Valida monto y moneda: si no coinciden, la orden queda en 'error' y no acredita.
create or replace function public.apply_payment_result(
  p_reference text,
  p_transaction_id text,
  p_provider_status text,
  p_amount_in_cents bigint,
  p_currency text,
  p_payment_method_type text
)
returns table (order_id uuid, user_id uuid, status public.order_status, credited boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
  v_new public.order_status;
  v_credited boolean := false;
begin
  select * into v_order from public.orders o where o.reference = p_reference for update;
  if not found then
    raise exception 'orden_no_encontrada';
  end if;

  v_new := case upper(p_provider_status)
    when 'APPROVED' then 'approved'::public.order_status
    when 'DECLINED' then 'declined'::public.order_status
    when 'VOIDED' then 'voided'::public.order_status
    when 'ERROR' then 'error'::public.order_status
    else 'pending'::public.order_status
  end;

  if v_new = 'approved' and (p_amount_in_cents <> v_order.amount_in_cents or upper(p_currency) <> v_order.currency) then
    v_new := 'error';
  end if;

  -- Una orden aprobada nunca retrocede (un evento viejo PENDING/DECLINED que
  -- llegue tarde no la puede revertir). Una transacción distinta a la ya
  -- registrada tampoco puede reescribirla.
  if v_order.status = 'approved' then
    return query select v_order.id, v_order.user_id, v_order.status, false;
    return;
  end if;
  if v_order.provider_transaction_id is not null and v_order.provider_transaction_id <> p_transaction_id and v_new <> 'approved' then
    return query select v_order.id, v_order.user_id, v_order.status, false;
    return;
  end if;

  if v_new = 'pending' and v_order.status = 'expired' then
    v_new := 'expired';
  end if;

  update public.orders o set
    status = v_new,
    provider_transaction_id = p_transaction_id,
    provider_status = upper(p_provider_status),
    payment_method_type = coalesce(p_payment_method_type, o.payment_method_type),
    paid_at = case when v_new = 'approved' then now() else o.paid_at end,
    updated_at = now()
  where o.id = v_order.id;

  if v_new = 'approved' then
    insert into public.credit_ledger (user_id, delta, reason, order_id, note)
    values (v_order.user_id, v_order.credits, 'purchase', v_order.id, 'Ref. ' || v_order.reference)
    on conflict do nothing;
    v_credited := found;
  end if;

  return query select v_order.id, v_order.user_id, v_new, v_credited;
end $$;

-- Inicia una generación: consume un crédito de forma atómica. Serializado por
-- usuario para que dos solicitudes simultáneas no gasten el mismo crédito ni
-- arranquen dos generaciones.
create or replace function public.start_generation(p_user_id uuid, p_generation_id uuid)
returns public.generations
language plpgsql security definer set search_path = public as $$
declare
  v_gen public.generations;
  v_limits jsonb;
  v_running int;
  v_today int;
  v_balance int;
begin
  perform pg_advisory_xact_lock(hashtextextended('credits:' || p_user_id::text, 0));

  select * into v_gen from public.generations where id = p_generation_id and user_id = p_user_id for update;
  if not found then raise exception 'generacion_no_encontrada'; end if;
  if v_gen.status <> 'draft' then raise exception 'generacion_ya_iniciada'; end if;
  if v_gen.manual_path is null or v_gen.indicadores_path is null then raise exception 'faltan_documentos'; end if;

  select value into v_limits from public.app_settings where key = 'generation_limits';

  select count(*) into v_running from public.generations
   where user_id = p_user_id and status in ('queued','analyzing','generating','assembling');
  if v_running >= coalesce((v_limits->>'max_running_per_user')::int, 1) then
    raise exception 'generacion_en_curso';
  end if;

  select count(*) into v_today from public.generations
   where user_id = p_user_id and started_at > now() - interval '24 hours';
  if v_today >= coalesce((v_limits->>'max_generations_per_user_per_day')::int, 5) then
    raise exception 'limite_diario';
  end if;

  select coalesce(sum(delta), 0) into v_balance from public.credit_ledger where user_id = p_user_id;
  if v_balance < 1 then raise exception 'sin_creditos'; end if;

  insert into public.credit_ledger (user_id, delta, reason, generation_id, note)
  values (p_user_id, -1, 'generation', p_generation_id, v_gen.cargo);

  update public.generations set
    status = 'queued', credit_consumed = true, started_at = now(), updated_at = now(),
    progress = 2, current_step = 'En cola'
  where id = p_generation_id
  returning * into v_gen;
  return v_gen;
end $$;

-- Reembolsa el crédito de una generación que falló por causas del sistema.
create or replace function public.refund_generation(p_generation_id uuid, p_note text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_gen public.generations;
begin
  select * into v_gen from public.generations where id = p_generation_id for update;
  if not found or not v_gen.credit_consumed or v_gen.credit_refunded then return false; end if;
  insert into public.credit_ledger (user_id, delta, reason, generation_id, note)
  values (v_gen.user_id, 1, 'refund', p_generation_id, left(coalesce(p_note, ''), 300))
  on conflict do nothing;
  update public.generations set credit_refunded = true, updated_at = now() where id = p_generation_id;
  return true;
end $$;

-- Toma el lease de una generación activa. Devuelve el token si lo obtuvo.
create or replace function public.acquire_generation_lease(p_generation_id uuid, p_seconds int)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_token uuid := gen_random_uuid();
begin
  update public.generations set lease_until = now() + make_interval(secs => p_seconds), lease_token = v_token
   where id = p_generation_id
     and status in ('queued','analyzing','generating','assembling')
     and (lease_until is null or lease_until < now());
  if found then return v_token; end if;
  return null;
end $$;

create or replace function public.release_generation_lease(p_generation_id uuid, p_token uuid)
returns void
language sql security definer set search_path = public as $$
  update public.generations set lease_until = null, lease_token = null
   where id = p_generation_id and lease_token = p_token;
$$;

revoke execute on function public.quote_for_user(uuid) from public, anon, authenticated;
revoke execute on function public.create_or_reuse_order(uuid, text) from public, anon, authenticated;
revoke execute on function public.apply_payment_result(text, text, text, bigint, text, text) from public, anon, authenticated;
revoke execute on function public.start_generation(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.refund_generation(uuid, text) from public, anon, authenticated;
revoke execute on function public.acquire_generation_lease(uuid, int) from public, anon, authenticated;
revoke execute on function public.release_generation_lease(uuid, uuid) from public, anon, authenticated;
grant execute on function public.quote_for_user(uuid), public.create_or_reuse_order(uuid, text),
  public.apply_payment_result(text, text, text, bigint, text, text), public.start_generation(uuid, uuid),
  public.refund_generation(uuid, text), public.acquire_generation_lease(uuid, int),
  public.release_generation_lease(uuid, uuid), public.credit_balance(uuid) to service_role;

-- ---------------------------------------------------------------------
-- Storage: bucket privado para documentos y simuladores generados.
-- Sin políticas para authenticated: todo acceso pasa por el servidor
-- (URLs firmadas de subida creadas tras validar la generación).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 15728640, array['application/pdf','image/png','image/jpeg','image/webp']),
  ('simulators', 'simulators', false, 10485760, array['text/html'])
on conflict (id) do nothing;
